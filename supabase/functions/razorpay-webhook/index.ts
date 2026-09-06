import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type, x-razorpay-signature',
};

/* This table used to be the only source of truth here, with no
   annual plan and Indian prices only — so an annual purchase became
   thirty days, and a family in Dubai paying AED 35 was recorded as
   having paid 199 rupees.

   The order now carries duration_days, amount_paid and currency in
   its notes, taken from the pricing table when the order was made.
   Those are used when present; this is only a last resort. */
const PLANS: Record<string, { days: number; amount: number }> = {
  monthly:    { days: 30,  amount: 199  },
  quarterly:  { days: 90,  amount: 549  },
  halfyearly: { days: 180, amount: 1099 },
  annual:     { days: 365, amount: 1999 },
};

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY     = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
  const WEBHOOK_SECRET  = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const rawBody  = await req.text();
    const signature = req.headers.get('x-razorpay-signature') ?? '';

    // Verify webhook signature
    if (WEBHOOK_SECRET) {
      const valid = await verifySignature(rawBody, signature, WEBHOOK_SECRET);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    const event = JSON.parse(rawBody);
    console.log('Razorpay webhook event:', event.event);

    // Handle payment captured
    if (event.event === 'payment.captured') {
      const payment   = event.payload.payment.entity;
      const paymentId = payment.id;
      const orderId   = payment.order_id;
      const notes     = payment.notes || {};
      const studentId = notes.student_id;
      const plan      = notes.plan || 'monthly';

      if (!studentId) {
        console.error('No student_id in payment notes');
        return new Response(JSON.stringify({ error: 'No student_id' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }

      const p = PLANS[plan] || PLANS.monthly;

      // Expire any existing active subscription
      await sb.from('subscriptions')
        .update({ status: 'expired' })
        .eq('student_id', studentId)
        .eq('status', 'active');

      /* Prefer what the order actually said over the table above. */
      const days = Number(notes.duration_days) > 0
        ? Number(notes.duration_days) : p.days;
      const paid = Number(notes.amount_paid) > 0
        ? Number(notes.amount_paid)
        : (payment.amount ? Number(payment.amount) / 100 : p.amount);

      /* created_by is a uuid column and this was the string 'parent',
         so Postgres rejected the whole row — the payment succeeded and
         nothing was recorded. The payer is the student themselves. */
      const row: Record<string, unknown> = {
        student_id:          studentId,
        plan,
        amount:              paid,
        status:              'active',
        payment_method:      'razorpay',
        razorpay_payment_id: paymentId,
        razorpay_order_id:   orderId || null,
        starts_at:           new Date().toISOString(),
        expires_at:          addDays(days),
        created_by:          studentId,
      };

      // currency was added later, so it is tried and then dropped
      // rather than being allowed to reject the whole row
      let ins = await sb.from('subscriptions')
        .insert({ ...row, currency: notes.currency || 'INR' }).select();

      if (ins.error && /column .* does not exist|Could not find/i.test(ins.error.message || '')) {
        ins = await sb.from('subscriptions').insert(row).select();
      }
      if (ins.error) throw ins.error;
      if (!ins.data || !ins.data.length) {
        throw new Error('The subscription row was refused — check the policies on subscriptions');
      }

      console.log('Subscription recorded for', studentId, plan, days, 'days');

      // Send welcome notification to student
      await sb.from('notifications').insert({
        user_id: studentId,
        type:    'subscription',
        title:   '✅ Subscription activated!',
        message: `Your ${p.days === 30 ? 'monthly' : 'half-yearly'} subscription is now active. Happy learning! 🌟`,
      });

      console.log(`✅ Subscription activated for student ${studentId}`);
    }

    // Handle payment failed
    if (event.event === 'payment.failed') {
      const payment   = event.payload.payment.entity;
      const notes     = payment.notes || {};
      const studentId = notes.student_id;
      if (studentId) {
        await sb.from('notifications').insert({
          user_id: studentId,
          type:    'subscription',
          title:   '❌ Payment failed',
          message: 'Your payment could not be processed. Please try again.',
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
});

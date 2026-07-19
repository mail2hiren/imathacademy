import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type, x-razorpay-signature',
};

const PLANS: Record<string, { days: number; amount: number }> = {
  monthly:    { days: 30,  amount: 199  },
  halfyearly: { days: 180, amount: 1099 },
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

      // Create new subscription
      const { error } = await sb.from('subscriptions').insert({
        student_id:          studentId,
        plan,
        amount:              p.amount,
        status:              'active',
        payment_method:      'razorpay',
        razorpay_payment_id: paymentId,
        razorpay_order_id:   orderId || null,
        starts_at:           new Date().toISOString(),
        expires_at:          addDays(p.days),
        created_by:          'parent',
      });

      if (error) throw error;

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

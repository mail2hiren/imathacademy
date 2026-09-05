/* ============================================================
   iMathAcademy — Create a Razorpay order
   ------------------------------------------------------------
   Checkout was being opened without an order, so payments arrived
   as "authorized" and sat waiting to be captured by hand. The
   payment.captured event never fired, so the webhook never ran, so
   no subscription was written — a parent paid and nothing happened.

   An order created here with payment_capture: 1 is taken
   immediately. The webhook then writes the subscription within a
   second or two, and the family has access straight away.

   The amount is read from the pricing table, never from the
   browser. A price sent by the client is a price the client can
   change.
   ============================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RZP_KEY_ID    = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RZP_KEY_SECRET= Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

const ZERO_DECIMAL = ["JPY", "KRW", "VND"];
const CURRENCY: Record<string, string> = {
  IN: "INR", AE: "AED", US: "USD", GB: "GBP", SG: "SGD",
  AU: "AUD", CA: "CAD", MY: "MYR", NZ: "NZD", ZA: "ZAR",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
    return json({ error: "Payments are not configured — the Razorpay keys are missing" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Who is paying, from their own token
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Please sign in first" }, 401);

  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: "Please sign in first" }, 401);

  let body: { plan_code?: string; student_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  const planCode = body.plan_code;
  if (!planCode) return json({ error: "Which plan?" }, 400);

  // A parent may pay for their child; anyone else pays for themselves
  let studentId = body.student_id || caller.user.id;
  if (studentId !== caller.user.id) {
    const { data: link } = await admin
      .from("parent_students").select("student_id")
      .eq("parent_id", caller.user.id).eq("student_id", studentId).maybeSingle();
    if (!link) {
      const { data: me } = await admin
        .from("users").select("role").eq("id", caller.user.id).single();
      if (!me || (me.role !== "admin" && me.role !== "teacher")) {
        return json({ error: "That is not your child" }, 403);
      }
    }
  }

  const { data: student } = await admin
    .from("users").select("id, full_name, email, phone, country_code")
    .eq("id", studentId).single();
  if (!student) return json({ error: "No such student" }, 404);

  const country = (student.country_code || "IN").toUpperCase();

  // The price comes from the table, not from the browser
  const { data: plan } = await admin
    .from("pricing_plans")
    .select("plan_code, plan_name, amount, duration_days, is_active")
    .eq("plan_code", planCode).eq("country_code", country).maybeSingle();

  if (!plan || plan.is_active === false) {
    return json({ error: "That plan is not available for " + country }, 400);
  }

  const currency = CURRENCY[country] ?? "INR";
  const amount = ZERO_DECIMAL.includes(currency)
    ? Math.round(Number(plan.amount))
    : Math.round(Number(plan.amount) * 100);

  // payment_capture: 1 is the whole point — take the money now rather
  // than leaving it authorized for somebody to capture by hand.
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic " + btoa(RZP_KEY_ID + ":" + RZP_KEY_SECRET),
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt: "sub_" + studentId.slice(0, 8) + "_" + Date.now(),
      payment_capture: 1,
      notes: {
        student_id: studentId,
        student_name: student.full_name ?? "",
        plan_code: plan.plan_code,
        duration_days: String(plan.duration_days ?? 30),
        country,
      },
    }),
  });

  const order = await orderRes.json();
  if (!orderRes.ok) {
    console.error("Razorpay refused the order:", order);
    return json({ error: order?.error?.description || "Could not start the payment" }, 400);
  }

  return json({
    ok: true,
    order_id: order.id,
    amount, currency,
    key_id: RZP_KEY_ID,
    plan: { code: plan.plan_code, name: plan.plan_name,
            amount: plan.amount, days: plan.duration_days },
    student: { id: student.id, name: student.full_name,
               email: student.email, phone: student.phone },
  });
});

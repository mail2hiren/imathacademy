import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/* ============================================================
   iMathAcademy — Tell somebody an enquiry has arrived
   ------------------------------------------------------------
   wa.me cannot ping anyone by itself — it needs a person to tap.
   So this is the part that actually reaches a phone.

   The assigned teacher is told. Megha is told as well, because she
   runs the business and needs to know what is coming in — but she is
   told once, not twice, if the enquiry is her own.

   A device that has gone away is removed rather than retried
   forever.
   ============================================================ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC   = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE  = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT  = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@imathacademy.net";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: "Notifications are not configured — the VAPID keys are missing" }, 500);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { enquiry_id?: string };
  try { body = await req.json(); }
  catch { return json({ error: "Bad request" }, 400); }

  if (!body.enquiry_id) return json({ error: "Which enquiry?" }, 400);

  const { data: enq } = await admin
    .from("enquiries")
    .select("id, child_name, parent_name, city, assigned_to, source")
    .eq("id", body.enquiry_id).single();

  if (!enq) return json({ error: "No such enquiry" }, 404);

  // The teacher it belongs to, plus every admin
  const recipients = new Set<string>();
  if (enq.assigned_to) recipients.add(enq.assigned_to);

  const { data: admins } = await admin
    .from("users").select("id")
    .eq("role", "admin").eq("is_active", true);
  (admins ?? []).forEach((a) => recipients.add(a.id));

  if (!recipients.size) return json({ ok: true, sent: 0, note: "Nobody to tell" });

  // Anyone who has asked not to be interrupted is skipped
  const { data: people } = await admin
    .from("users").select("id, notify_enquiries")
    .in("id", Array.from(recipients));
  const willing = (people ?? [])
    .filter((p) => p.notify_enquiries !== false)
    .map((p) => p.id);

  if (!willing.length) return json({ ok: true, sent: 0 });

  const { data: subs } = await admin
    .from("push_subscriptions").select("*").in("user_id", willing);

  if (!subs?.length) return json({ ok: true, sent: 0, note: "No devices signed up yet" });

  const child  = enq.child_name  || "a child";
  const parent = enq.parent_name || "Someone";
  const payload = JSON.stringify({
    title: "New enquiry",
    body: `${parent} asked about ${child}${enq.city ? " · " + enq.city : ""}`,
    url: "/portal/teacher/enquiries.html",
    tag: "enquiry-" + enq.id,
  });

  let sent = 0;
  const gone: string[] = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      // 404 or 410 means the browser has dropped it — an uninstalled
      // app or cleared data. Keeping it would mean retrying forever.
      const code = (err as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) gone.push(s.endpoint);
    }
  }));

  if (gone.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", gone);
  }

  return json({ ok: true, sent, removed: gone.length });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ============================================================
   iMathAcademy — Change a person's email or password
   ------------------------------------------------------------
   users.email is app data; the real email and the password live in
   auth.users, which only a service-role key may touch. So editing a
   student's email in the admin screen changed the app copy and left
   the login untouched — someone then had to go into the database and
   fix it by hand every time.

   This changes both together, or neither.

   Only a teacher or an admin may call it, and that is checked from
   the caller's own token — not from anything the browser claims.
   ============================================================ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Payload = {
  user_id: string;
  email?: string | null;
  password?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── who is asking? ────────────────────────────────────────
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Not signed in" }, 401);

  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json({ error: "Not signed in" }, 401);

  const { data: me } = await admin
    .from("users").select("role").eq("id", caller.user.id).single();

  if (!me || (me.role !== "admin" && me.role !== "teacher")) {
    return json({ error: "Only a teacher or admin can change sign-in details" }, 403);
  }

  // ── what is being changed? ────────────────────────────────
  let body: Payload;
  try { body = await req.json(); }
  catch { return json({ error: "Bad request" }, 400); }

  const { user_id, email, password, full_name, phone } = body ?? {};
  if (!user_id) return json({ error: "Which user?" }, 400);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "That does not look like an email address" }, 400);
  }
  if (password && password.length < 6) {
    return json({ error: "A password needs at least 6 characters" }, 400);
  }
  if (!email && !password && !full_name && phone === undefined) {
    return json({ error: "Nothing to change" }, 400);
  }

  // ── the login first ───────────────────────────────────────
  // If this fails there is nothing to undo. Doing it the other way
  // round could leave the app and the login disagreeing, which is
  // the very thing this function exists to prevent.
  const authPatch: Record<string, unknown> = {};
  if (email)    authPatch.email = email;
  if (password) authPatch.password = password;
  if (email)    authPatch.email_confirm = true;   // no confirmation round trip

  if (Object.keys(authPatch).length) {
    const { error } = await admin.auth.admin.updateUserById(user_id, authPatch);
    if (error) {
      const msg = /already been registered|already exists/i.test(error.message)
        ? "Another account already uses that email address"
        : error.message;
      return json({ error: msg }, 400);
    }
  }

  // ── then the app's own copy ───────────────────────────────
  const appPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (email)                 appPatch.email = email;
  if (full_name)             appPatch.full_name = full_name;
  if (phone !== undefined)   appPatch.phone = phone;

  const { data: updated, error: appErr } = await admin
    .from("users").update(appPatch).eq("id", user_id).select().single();

  if (appErr) {
    // The login has already changed, so say so plainly rather than
    // leaving the caller thinking nothing happened.
    return json({
      error: "The sign-in was updated but the profile was not: " + appErr.message,
      partial: true,
    }, 500);
  }

  return json({
    ok: true,
    user: { id: user_id, email: updated?.email, full_name: updated?.full_name },
    changed: {
      email: !!email,
      password: !!password,
      profile: !!(full_name || phone !== undefined),
    },
  });
});

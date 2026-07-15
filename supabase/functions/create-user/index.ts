import { Resend } from "npm:resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PORTAL_URL = "https://imathacademy.net";
const FROM_EMAIL = "noreply@imathacademy.net";

type UserRole = "student" | "teacher" | "parent";

type CreateUserPayload = {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  program?: string | null;
  current_level?: number | null;
  mode?: string | null;
  batch_id?: string | null;
  fee_amount?: number | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapEmail(content: string) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f6f8fc;padding:24px;color:#1f2937">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
        <div style="font-size:28px;font-weight:800;color:#111827;margin-bottom:8px">iMathAcademy</div>
        <div style="font-size:14px;line-height:1.7;color:#4b5563">${content}</div>
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
          This email was sent automatically by iMathAcademy.
        </div>
      </div>
    </div>
  `;
}

function buildWelcomeEmail(payload: CreateUserPayload) {
  const safeName = escapeHtml(payload.full_name);
  const safeEmail = escapeHtml(payload.email);
  const safePassword = escapeHtml(payload.password);
  const safeProgram = escapeHtml(payload.program || "your enrolled");

  if (payload.role === "teacher") {
    return {
      subject: `Welcome to iMathAcademy, ${payload.full_name}`,
      html: wrapEmail(`
        <h1 style="font-size:24px;margin:0 0 12px;color:#0f172a">Welcome to the team</h1>
        <p style="margin:0 0 16px">Hi <strong>${safeName}</strong>, your teacher account is ready.</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:20px">
          <div><strong>Email:</strong> ${safeEmail}</div>
          <div><strong>Password:</strong> ${safePassword}</div>
          <div><strong>Teacher portal:</strong> <a href="${PORTAL_URL}/portal/teacher/dashboard.html">${PORTAL_URL}/portal/teacher/dashboard.html</a></div>
        </div>
        <p style="margin:0">Log in to review your batches, students, and class schedule.</p>
      `),
    };
  }

  if (payload.role === "parent") {
    return {
      subject: `Welcome to iMathAcademy, ${payload.full_name}`,
      html: wrapEmail(`
        <h1 style="font-size:24px;margin:0 0 12px;color:#0f172a">Your parent account is ready</h1>
        <p style="margin:0 0 16px">Hi <strong>${safeName}</strong>, your parent portal access has been created.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:20px">
          <div><strong>Email:</strong> ${safeEmail}</div>
          <div><strong>Password:</strong> ${safePassword}</div>
          <div><strong>Portal:</strong> <a href="${PORTAL_URL}/login.html">${PORTAL_URL}/login.html</a></div>
        </div>
        <p style="margin:0">Use the portal to track your child’s learning, homework, and fee status.</p>
      `),
    };
  }

  return {
    subject: `Welcome to iMathAcademy, ${payload.full_name}`,
    html: wrapEmail(`
      <h1 style="font-size:24px;margin:0 0 12px;color:#0f172a">Welcome to iMathAcademy</h1>
      <p style="margin:0 0 16px">Hi <strong>${safeName}</strong>, your student account has been created and you are ready to begin.</p>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-bottom:20px">
        <div><strong>Email:</strong> ${safeEmail}</div>
        <div><strong>Password:</strong> ${safePassword}</div>
        <div><strong>Portal:</strong> <a href="${PORTAL_URL}/login.html">${PORTAL_URL}/login.html</a></div>
      </div>
      <p style="margin:0 0 12px">You are enrolled in <strong>${safeProgram}</strong>.</p>
      <p style="margin:0">Log in to view your classes, practice work, and progress.</p>
    `),
  };
}

async function sendWelcomeEmail(resend: Resend, payload: CreateUserPayload) {
  const email = buildWelcomeEmail(payload);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: [payload.email],
    subject: email.subject,
    html: email.html,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
  }

  const payload = (await req.json()) as CreateUserPayload;
  const { email, password, full_name, role, phone, program, current_level, mode, batch_id, fee_amount } = payload;

  if (!email || !password || !full_name || !role) {
    return jsonResponse({ error: "email, password, full_name and role are required" }, 400);
  }

  if (!["student", "teacher", "parent"].includes(role)) {
    return jsonResponse({ error: "Unsupported role" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      role,
    },
  });

  if (authError || !authData.user) {
    return jsonResponse({ error: authError?.message || "Unable to create auth user" }, 400);
  }

  const userId = authData.user.id;

  try {
    const userInsert = {
      id: userId,
      email,
      full_name,
      role,
      phone: phone || null,
      program: role === "student" ? program || null : null,
      current_level: role === "student" ? current_level || 1 : 1,
      mode: role === "student" ? mode || "online" : "online",
      is_active: true,
      xp_points: 0,
      streak_days: 0,
    };

    const { error: userError } = await supabase.from("users").insert(userInsert);
    if (userError) {
      throw userError;
    }

    if (role === "student" && batch_id) {
      const { error: batchStudentError } = await supabase
        .from("batch_students")
        .insert({ batch_id, student_id: userId });
      if (batchStudentError) {
        throw batchStudentError;
      }
    }

    if (role === "teacher" && batch_id) {
      const { error: teacherBatchError } = await supabase
        .from("batches")
        .update({ teacher_id: userId })
        .eq("id", batch_id);
      if (teacherBatchError) {
        throw teacherBatchError;
      }
    }

    if (role === "student" && fee_amount) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1, 1);
      const { error: feeError } = await supabase.from("fees").insert({
        student_id: userId,
        amount: fee_amount,
        currency: "INR",
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
      });
      if (feeError) {
        throw feeError;
      }
    }

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: userId,
      type: "welcome",
      title: "Welcome to iMathAcademy!",
      message: `Welcome ${full_name}! Your ${role} account is ready.`,
    });
    if (notificationError) {
      throw notificationError;
    }

    let email_sent = false;
    let email_error: string | null = null;

    if (!resend) {
      email_error = "RESEND_API_KEY is not configured";
    } else {
      try {
        await sendWelcomeEmail(resend, payload);
        email_sent = true;
      } catch (error) {
        email_error = error instanceof Error ? error.message : String(error);
      }
    }

    return jsonResponse({
      user: authData.user,
      email_sent,
      email_error,
    });
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to create user" },
      400,
    );
  }
});

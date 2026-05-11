/**
 * ============================================================
 * iMathAcademy — Email Automation System
 * Session 13 — js/notifications.js
 * 
 * Uses Brevo (formerly Sendinblue) free tier — 300 emails/day
 * All functions are called from the portal pages automatically
 * No server needed — runs from browser via Brevo API
 * ============================================================
 */

// ── CONFIGURATION ─────────────────────────────────────────
// Replace with your actual Brevo API key from brevo.com
const BREVO_API_KEY = 'YOUR_BREVO_API_KEY_HERE';
const BREVO_URL     = 'https://api.brevo.com/v3/smtp/email';

const FROM_EMAIL = 'hello@imathacademy.com';
const FROM_NAME  = 'iMathAcademy';
const PORTAL_URL = 'https://mail2hiren.github.io/imathacademy';

// ── CORE EMAIL SENDER ──────────────────────────────────────
/**
 * Sends an email via Brevo API
 * @param {string} toEmail    - Recipient email
 * @param {string} toName     - Recipient name
 * @param {string} subject    - Email subject
 * @param {string} htmlBody   - Full HTML email body
 * @returns {Promise<boolean>} - true if sent, false if failed
 */
async function sendEmail(toEmail, toName, subject, htmlBody) {
  try {
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'api-key':       BREVO_API_KEY,
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlBody,
      }),
    });

    if (response.ok) {
      console.log(`✅ Email sent to ${toEmail}: ${subject}`);
      return true;
    } else {
      const err = await response.json();
      console.error('❌ Brevo error:', err);
      return false;
    }
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return false;
  }
}

// ── EMAIL TEMPLATE WRAPPER ─────────────────────────────────
/**
 * Wraps content in the branded iMathAcademy email template
 */
function wrapEmail(content, footerNote = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iMathAcademy</title>
</head>
<body style="margin:0;padding:0;background:#F7F8FF;font-family:'Nunito',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FF;padding:24px 0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

          <!-- HEADER -->
          <tr>
            <td style="background:#1B5E20;border-radius:16px 16px 0 0;padding:20px 28px;text-align:center">
              <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.3px">
                iMath<span style="color:#FB8C00">Academy</span>
              </div>
              <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;font-weight:600">
                Vedic Maths &amp; Abacus Learning Portal
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:28px 28px 20px;border-left:2px solid #E8EAF6;border-right:2px solid #E8EAF6">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#F7F8FF;border:2px solid #E8EAF6;border-top:none;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center">
              <div style="font-size:11px;color:#9090B0;line-height:1.6">
                ${footerNote || 'This is an automated message from iMathAcademy.'}
                <br>Questions? Reply to this email or contact us at
                <a href="mailto:hello@imathacademy.com" style="color:#43A047">hello@imathacademy.com</a>
                <br><br>
                <a href="${PORTAL_URL}" style="color:#43A047;font-weight:700">Visit portal</a>
                &nbsp;·&nbsp;
                <a href="${PORTAL_URL}/login.html" style="color:#43A047;font-weight:700">Login</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── HELPER: CTA BUTTON ─────────────────────────────────────
function ctaButton(text, url, color = '#43A047') {
  return `
    <div style="text-align:center;margin:20px 0">
      <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:13px 28px;border-radius:30px;font-weight:800;font-size:15px;text-decoration:none;font-family:Arial,sans-serif">
        ${text}
      </a>
    </div>`;
}

// ── HELPER: STAT BOXES ─────────────────────────────────────
function statBoxes(stats) {
  const boxes = stats.map(s => `
    <td style="text-align:center;padding:12px 8px;background:${s.bg || '#F7F8FF'};border-radius:10px">
      <div style="font-size:22px;font-weight:900;color:${s.color || '#1A1A2E'};font-family:Arial">${s.value}</div>
      <div style="font-size:11px;font-weight:700;color:#9090B0;margin-top:2px">${s.label}</div>
    </td>
    <td style="width:8px"></td>`).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
      <tr>${boxes}</tr>
    </table>`;
}

// ── HELPER: TOPIC BAR ──────────────────────────────────────
function topicBar(name, pct, color) {
  return `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:700;color:#1A1A2E">${name}</span>
        <span style="font-size:12px;font-weight:800;color:${color}">${pct}%</span>
      </div>
      <div style="background:#E8EAF6;border-radius:4px;height:8px;overflow:hidden">
        <div style="background:${color};height:100%;width:${pct}%;border-radius:4px"></div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  EMAIL TEMPLATES — ONE FUNCTION PER EMAIL TYPE
// ══════════════════════════════════════════════════════════

// ── 1. WELCOME EMAIL (new student) ────────────────────────
/**
 * Sent when admin creates a new student account
 */
async function sendWelcomeEmail(studentEmail, studentName, program, loginPassword) {
  const subject = `Welcome to iMathAcademy, ${studentName}! 🎉`;

  const content = `
    <h1 style="font-family:Arial;font-size:24px;font-weight:900;color:#1B5E20;margin:0 0 8px">
      Welcome to iMathAcademy! 🌟
    </h1>
    <p style="font-size:15px;color:#4A4A6A;margin:0 0 20px;line-height:1.6">
      Hi <strong>${studentName}</strong>, your account has been created and you are ready to start learning!
    </p>

    <div style="background:#E8F5E9;border:2px solid #A5D6A7;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:800;color:#1B5E20;margin-bottom:10px">Your login details</div>
      <div style="font-size:13px;color:#2E7D32;line-height:1.8">
        📧 <strong>Email:</strong> ${studentEmail}<br>
        🔑 <strong>Password:</strong> ${loginPassword}<br>
        🌐 <strong>Portal:</strong> <a href="${PORTAL_URL}/login.html" style="color:#43A047">${PORTAL_URL}/login.html</a>
      </div>
    </div>

    <div style="font-size:13px;font-weight:800;color:#1A1A2E;margin-bottom:8px">What to do first</div>
    <div style="background:#F7F8FF;border-radius:10px;padding:14px;margin-bottom:20px">
      <div style="font-size:13px;color:#4A4A6A;line-height:2">
        1️⃣ &nbsp;Log in at the portal link above<br>
        2️⃣ &nbsp;Change your password in Settings<br>
        3️⃣ &nbsp;Watch your first lesson video<br>
        4️⃣ &nbsp;Complete your first practice session — earn XP! ⚡<br>
        5️⃣ &nbsp;Check your schedule for live class timings
      </div>
    </div>

    <div style="background:#FFF3E0;border:2px solid #FFCC80;border-radius:10px;padding:12px;margin-bottom:20px">
      <div style="font-size:13px;color:#E65100;font-weight:600">
        📚 You are enrolled in the <strong>${program}</strong> program.
        Your teacher will be in touch shortly with your batch details and first class schedule.
      </div>
    </div>

    ${ctaButton('Login to your portal →', `${PORTAL_URL}/login.html`)}`;

  const html = wrapEmail(content, 'You received this because your account was created by iMathAcademy admin.');
  return await sendEmail(studentEmail, studentName, subject, html);
}

// ── 2. HOMEWORK ASSIGNED ───────────────────────────────────
/**
 * Sent to student when teacher assigns homework
 */
async function sendHomeworkAssigned(studentEmail, studentName, hwTitle, topic, questionCount, dueDate, teacherName) {
  const subject = `📋 New homework assigned — ${hwTitle}`;

  const content = `
    <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#1A1A2E;margin:0 0 6px">
      New homework assigned! 📋
    </h1>
    <p style="font-size:14px;color:#4A4A6A;margin:0 0 20px">
      Hi <strong>${studentName}</strong>, ${teacherName} has assigned new homework for you.
    </p>

    <div style="background:#E3F2FD;border:2px solid #90CAF9;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:900;color:#0D47A1;margin-bottom:8px">${hwTitle}</div>
      <div style="font-size:13px;color:#1565C0;line-height:1.8">
        📖 <strong>Topic:</strong> ${topic}<br>
        🔢 <strong>Questions:</strong> ${questionCount}<br>
        📅 <strong>Due date:</strong> ${dueDate}<br>
        👨‍🏫 <strong>Assigned by:</strong> ${teacherName}
      </div>
    </div>

    <div style="background:#F7F8FF;border-radius:10px;padding:12px;margin-bottom:20px;font-size:13px;color:#4A4A6A">
      💡 <strong>Tip:</strong> Complete your homework a day early! You earn <strong>+80 XP</strong> for submitting on time, 
      and <strong>+150 XP</strong> if you score 100%. The abacus practice screen is available anytime you need extra practice first.
    </div>

    ${ctaButton('Do homework now →', `${PORTAL_URL}/portal/student/homework.html`, '#FB8C00')}`;

  const html = wrapEmail(content);
  return await sendEmail(studentEmail, studentName, subject, html);
}

// ── 3. HOMEWORK DUE REMINDER ───────────────────────────────
/**
 * Sent 24 hours before homework is due
 */
async function sendHomeworkReminder(studentEmail, studentName, parentEmail, parentName, hwTitle, dueDate) {
  const subject = `⏰ Homework due tomorrow — ${hwTitle}`;

  const content = `
    <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#E65100;margin:0 0 6px">
      Homework due tomorrow! ⏰
    </h1>
    <p style="font-size:14px;color:#4A4A6A;margin:0 0 20px">
      Hi <strong>${studentName}</strong>, just a reminder that you have homework due tomorrow.
    </p>

    <div style="background:#FFF3E0;border:2px solid #FFCC80;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:900;color:#E65100;margin-bottom:6px">${hwTitle}</div>
      <div style="font-size:13px;color:#E65100">📅 Due: <strong>${dueDate}</strong></div>
    </div>

    <p style="font-size:14px;color:#4A4A6A;margin:0 0 16px;line-height:1.6">
      Don't forget — submitting on time earns you <strong style="color:#43A047">+80 XP</strong>! 
      If you score 100%, you get a bonus <strong style="color:#43A047">+150 XP</strong> too! 🌟
    </p>

    ${ctaButton('Complete homework now →', `${PORTAL_URL}/portal/student/homework.html`, '#E65100')}`;

  const html = wrapEmail(content);

  // Send to student
  await sendEmail(studentEmail, studentName, subject, html);

  // Also notify parent
  if (parentEmail) {
    const parentContent = `
      <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#E65100;margin:0 0 6px">
        Homework reminder for ${studentName} 👋
      </h1>
      <p style="font-size:14px;color:#4A4A6A;margin:0 0 16px;line-height:1.6">
        Hi <strong>${parentName}</strong>, this is a gentle reminder that <strong>${studentName}</strong> 
        has homework due tomorrow: <strong>${hwTitle}</strong>.
      </p>
      <p style="font-size:14px;color:#4A4A6A;margin:0;line-height:1.6">
        Please encourage them to complete it today! Submitting on time earns bonus XP points.
      </p>`;
    await sendEmail(parentEmail, parentName, `Reminder: ${studentName}'s homework due tomorrow`, wrapEmail(parentContent));
  }
}

// ── 4. HOMEWORK RESULT (to parent) ────────────────────────
/**
 * Sent to parent when student submits homework
 */
async function sendHomeworkResult(parentEmail, parentName, studentName, hwTitle, score, total, xpEarned) {
  const pct       = Math.round((score / total) * 100);
  const emoji     = pct >= 90 ? '🏆' : pct >= 75 ? '🌟' : pct >= 60 ? '👍' : '📚';
  const message   = pct >= 90 ? 'Outstanding!' : pct >= 75 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep practising!';
  const color     = pct >= 75 ? '#43A047' : pct >= 50 ? '#FB8C00' : '#E53935';
  const subject   = `${emoji} ${studentName} scored ${score}/${total} on homework`;

  const content = `
    <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#1A1A2E;margin:0 0 6px">
      Homework submitted! ${emoji}
    </h1>
    <p style="font-size:14px;color:#4A4A6A;margin:0 0 20px">
      Hi <strong>${parentName}</strong>, <strong>${studentName}</strong> just submitted their homework.
    </p>

    <div style="background:#F7F8FF;border:2px solid #E8EAF6;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
      <div style="font-size:13px;color:#9090B0;margin-bottom:6px;font-weight:700">${hwTitle}</div>
      <div style="font-size:48px;font-weight:900;color:${color};font-family:Arial">${score}/${total}</div>
      <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:8px">${message}</div>
      <div style="font-size:13px;color:#9090B0">Accuracy: ${pct}% &nbsp;·&nbsp; +${xpEarned} XP earned</div>
    </div>

    ${pct < 60 ? `
    <div style="background:#FFF3E0;border:2px solid #FFCC80;border-radius:10px;padding:12px;margin-bottom:20px;font-size:13px;color:#E65100">
      The portal has automatically assigned extra revision homework on the topics where ${studentName} 
      needs more practice. No action needed from you — it will appear on their portal automatically.
    </div>` : ''}

    ${ctaButton('View full results on portal →', `${PORTAL_URL}/portal/parent/dashboard.html`, color)}`;

  const html = wrapEmail(content, `You received this because ${studentName} submitted homework on iMathAcademy.`);
  return await sendEmail(parentEmail, parentName, subject, html);
}

// ── 5. INACTIVITY RE-ENGAGEMENT ───────────────────────────
/**
 * Sent when student has not logged in for 3+ days
 */
async function sendInactivityEmail(studentEmail, studentName, daysMissed, currentStreak) {
  const subject = `We miss you, ${studentName}! 🌟 Your streak is waiting`;

  const content = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:48px;margin-bottom:8px">🧮</div>
      <h1 style="font-family:Arial;font-size:24px;font-weight:900;color:#1A1A2E;margin:0 0 8px">
        Come back, ${studentName}!
      </h1>
      <p style="font-size:14px;color:#4A4A6A;margin:0">
        You have not practised in <strong>${daysMissed} days</strong>. Your abacus misses you! 
      </p>
    </div>

    ${currentStreak > 0 ? `
    <div style="background:#FFF3E0;border:2px solid #FFCC80;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="font-size:13px;color:#E65100;font-weight:700;margin-bottom:4px">Your current streak</div>
      <div style="font-size:36px;font-weight:900;color:#FB8C00">🔥 ${currentStreak} days</div>
      <div style="font-size:13px;color:#E65100">Don't let it reset — log in today to keep it going!</div>
    </div>` : `
    <div style="background:#E8F5E9;border:2px solid #A5D6A7;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="font-size:13px;color:#1B5E20;font-weight:600">
        Start a new streak today! Even 10 minutes of practice counts. 
        Every session earns you XP and keeps your skills sharp. 💪
      </div>
    </div>`}

    <div style="background:#F7F8FF;border-radius:10px;padding:14px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:800;color:#1A1A2E;margin-bottom:8px">What you can do right now</div>
      <div style="font-size:13px;color:#4A4A6A;line-height:2">
        ⚡ &nbsp;Complete a 10-question practice session (10 minutes)<br>
        📋 &nbsp;Check if you have any pending homework<br>
        🎯 &nbsp;Watch the next lesson video<br>
        🏅 &nbsp;Earn a new badge!
      </div>
    </div>

    ${ctaButton('Start practising now →', `${PORTAL_URL}/portal/student/dashboard.html`)}`;

  const html = wrapEmail(content, 'You received this because you have an account on iMathAcademy.');
  return await sendEmail(studentEmail, studentName, subject, html);
}

// ── 6. LEVEL UP CERTIFICATE ───────────────────────────────
/**
 * Sent when student completes a level and earns a belt
 */
async function sendLevelUpEmail(studentEmail, studentName, parentEmail, parentName, levelName, beltName, xpTotal, nextLevel) {
  const subject = `🏆 ${studentName} earned the ${beltName}!`;

  const content = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:60px;margin-bottom:12px">🏆</div>
      <h1 style="font-family:Arial;font-size:26px;font-weight:900;color:#1B5E20;margin:0 0 8px">
        Congratulations, ${studentName}!
      </h1>
      <p style="font-size:16px;color:#4A4A6A;margin:0">
        You have completed <strong>${levelName}</strong> and earned the <strong style="color:#FB8C00">${beltName}</strong>!
      </p>
    </div>

    <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center;color:#ffffff">
      <div style="font-size:13px;opacity:0.8;margin-bottom:4px;font-weight:700">CERTIFICATE OF ACHIEVEMENT</div>
      <div style="font-size:20px;font-weight:900;margin-bottom:4px">${studentName}</div>
      <div style="font-size:14px;opacity:0.9;margin-bottom:12px">has successfully completed</div>
      <div style="font-size:22px;font-weight:900;color:#FFC107">${levelName}</div>
      <div style="font-size:14px;opacity:0.8;margin-top:4px">and earned the <strong>${beltName}</strong></div>
      <div style="margin-top:12px;background:rgba(255,255,255,0.15);border-radius:20px;display:inline-block;padding:6px 18px;font-size:13px;font-weight:800">
        Total XP: ${xpTotal.toLocaleString()}
      </div>
    </div>

    <p style="font-size:14px;color:#4A4A6A;margin:0 0 16px;line-height:1.6;text-align:center">
      ${nextLevel ? `Keep going! <strong>${nextLevel}</strong> is waiting for you. 🚀` : 
        'You are now a <strong>Grand Master</strong>! The highest achievement in iMathAcademy! 🌟'}
    </p>

    ${ctaButton('Continue to next level →', `${PORTAL_URL}/portal/student/dashboard.html`)}`;

  const html = wrapEmail(content, `Congratulations on this achievement from everyone at iMathAcademy!`);

  await sendEmail(studentEmail, studentName, subject, html);

  // Also email parent
  if (parentEmail) {
    const parentContent = `
      <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#1B5E20;margin:0 0 8px">
        ${studentName} earned the ${beltName}! 🏆
      </h1>
      <p style="font-size:14px;color:#4A4A6A;margin:0 0 16px;line-height:1.6">
        Hi <strong>${parentName}</strong>, we are thrilled to share that <strong>${studentName}</strong> 
        has successfully completed <strong>${levelName}</strong> and earned their <strong>${beltName}</strong>!
      </p>
      <p style="font-size:14px;color:#4A4A6A;margin:0 0 16px;line-height:1.6">
        This is a significant achievement. Please do congratulate them — they have worked really hard for this! 🌟
      </p>
      ${ctaButton('View progress on parent portal →', `${PORTAL_URL}/portal/parent/dashboard.html`)}`;
    await sendEmail(parentEmail, parentName, `${studentName} earned the ${beltName}! 🏆`, wrapEmail(parentContent));
  }
}

// ── 7. FEE REMINDER ───────────────────────────────────────
/**
 * Sent to parent when fee is due or overdue
 */
async function sendFeeReminder(parentEmail, parentName, studentName, amount, dueDate, isOverdue, daysOverdue) {
  const subject = isOverdue
    ? `⚠️ Fee overdue — ${studentName} · Rs. ${amount}`
    : `📅 Fee reminder — ${studentName} · Rs. ${amount} due ${dueDate}`;

  const headerColor  = isOverdue ? '#B71C1C' : '#E65100';
  const headerBg     = isOverdue ? '#FFEBEE' : '#FFF3E0';
  const borderColor  = isOverdue ? '#FFCDD2' : '#FFCC80';

  const content = `
    <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:${headerColor};margin:0 0 6px">
      ${isOverdue ? '⚠️ Fee payment overdue' : '📅 Fee payment reminder'}
    </h1>
    <p style="font-size:14px;color:#4A4A6A;margin:0 0 20px">
      Hi <strong>${parentName}</strong>, this is a reminder about the monthly fee for <strong>${studentName}</strong>.
    </p>

    <div style="background:${headerBg};border:2px solid ${borderColor};border-radius:12px;padding:16px;margin-bottom:20px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td><div style="font-size:13px;color:${headerColor};font-weight:700">Amount</div><div style="font-size:22px;font-weight:900;color:${headerColor}">Rs. ${amount}</div></td>
          <td style="text-align:right"><div style="font-size:13px;color:${headerColor};font-weight:700">Due date</div><div style="font-size:15px;font-weight:800;color:${headerColor}">${dueDate}</div>
          ${isOverdue ? `<div style="font-size:12px;color:${headerColor}">${daysOverdue} days overdue</div>` : ''}
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size:14px;color:#4A4A6A;margin:0 0 16px;line-height:1.6">
      You can pay instantly via GPay, PhonePe, Paytm, or any UPI app. 
      A receipt will be emailed to you automatically within seconds of payment.
    </p>

    ${ctaButton('Pay now via UPI →', `${PORTAL_URL}/portal/parent/dashboard.html`, headerColor)}

    <div style="text-align:center;margin-top:8px;font-size:12px;color:#9090B0">
      UPI ID: imathacademy@razorpay &nbsp;·&nbsp; Or scan QR code in the parent portal
    </div>`;

  const html = wrapEmail(content, `You received this fee reminder from iMathAcademy.`);
  return await sendEmail(parentEmail, parentName, subject, html);
}

// ── 8. FEE RECEIPT ────────────────────────────────────────
/**
 * Sent immediately after payment is confirmed
 */
async function sendFeeReceipt(parentEmail, parentName, studentName, amount, paymentMethod, receiptNumber, month) {
  const subject = `✅ Payment confirmed — Receipt #${receiptNumber}`;

  const content = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:48px;margin-bottom:8px">✅</div>
      <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#1B5E20;margin:0 0 6px">
        Payment received!
      </h1>
      <p style="font-size:14px;color:#4A4A6A;margin:0">Thank you, ${parentName}.</p>
    </div>

    <div style="background:#E8F5E9;border:2px solid #A5D6A7;border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:800;color:#1B5E20;margin-bottom:12px;text-align:center">PAYMENT RECEIPT</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13px;color:#2E7D32;padding:4px 0;font-weight:700">Receipt number</td><td style="font-size:13px;color:#1A1A2E;text-align:right;font-weight:800">#${receiptNumber}</td></tr>
        <tr><td style="font-size:13px;color:#2E7D32;padding:4px 0;font-weight:700">Student</td><td style="font-size:13px;color:#1A1A2E;text-align:right;font-weight:800">${studentName}</td></tr>
        <tr><td style="font-size:13px;color:#2E7D32;padding:4px 0;font-weight:700">Period</td><td style="font-size:13px;color:#1A1A2E;text-align:right;font-weight:800">${month}</td></tr>
        <tr><td style="font-size:13px;color:#2E7D32;padding:4px 0;font-weight:700">Payment method</td><td style="font-size:13px;color:#1A1A2E;text-align:right;font-weight:800">${paymentMethod}</td></tr>
        <tr><td style="font-size:13px;color:#2E7D32;padding:4px 0;font-weight:700">Date</td><td style="font-size:13px;color:#1A1A2E;text-align:right;font-weight:800">${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</td></tr>
        <tr style="border-top:2px solid #A5D6A7"><td style="font-size:16px;color:#1B5E20;padding:8px 0 0;font-weight:900">Amount paid</td><td style="font-size:20px;color:#1B5E20;text-align:right;padding:8px 0 0;font-weight:900">Rs. ${amount}</td></tr>
      </table>
    </div>

    <p style="font-size:13px;color:#9090B0;text-align:center;margin:0">
      Please keep this email as your payment confirmation. 
      Next month's fee will be due on 1st of the month.
    </p>`;

  const html = wrapEmail(content, 'This is your official fee receipt from iMathAcademy.');
  return await sendEmail(parentEmail, parentName, subject, html);
}

// ── 9. MONTHLY PROGRESS REPORT ─────────────────────────────
/**
 * Sent to parent at end of each month with full progress summary
 */
async function sendMonthlyReport(parentEmail, parentName, studentName, month, reportData) {
  const { accuracy, sessions, hwCompletion, attendance, badges, streak, topics } = reportData;
  const subject = `📊 ${studentName}'s progress report — ${month}`;

  const topicsHtml = (topics || []).map(t => topicBar(t.name, t.acc, t.acc >= 75 ? '#43A047' : t.acc >= 55 ? '#1E88E5' : t.acc >= 35 ? '#FB8C00' : '#E53935')).join('');

  const content = `
    <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#1A1A2E;margin:0 0 6px">
      Monthly progress report 📊
    </h1>
    <p style="font-size:14px;color:#4A4A6A;margin:0 0 20px">
      Hi <strong>${parentName}</strong>, here is <strong>${studentName}</strong>'s learning summary for <strong>${month}</strong>.
    </p>

    ${statBoxes([
      { value: accuracy + '%', label: 'Avg accuracy',   color: '#43A047', bg: '#E8F5E9' },
      { value: sessions,       label: 'Sessions done',  color: '#1E88E5', bg: '#E3F2FD' },
      { value: hwCompletion + '%', label: 'HW completion', color: '#FB8C00', bg: '#FFF3E0' },
      { value: attendance + '%',   label: 'Attendance',    color: '#8E24AA', bg: '#F3E5F5' },
    ])}

    ${topics && topics.length > 0 ? `
    <div style="font-size:13px;font-weight:800;color:#1A1A2E;margin:16px 0 10px">Topic accuracy this month</div>
    ${topicsHtml}` : ''}

    <div style="background:#F7F8FF;border-radius:10px;padding:14px;margin:16px 0">
      <div style="font-size:13px;color:#4A4A6A;line-height:1.8">
        🏅 <strong>Badges earned this month:</strong> ${badges}<br>
        🔥 <strong>Best streak:</strong> ${streak} days
      </div>
    </div>

    ${ctaButton('View full report on parent portal →', `${PORTAL_URL}/portal/parent/dashboard.html`)}`;

  const html = wrapEmail(content, `Auto-generated monthly report from iMathAcademy — sent every month end.`);
  return await sendEmail(parentEmail, parentName, subject, html);
}

// ── 10. TEACHER WELCOME ────────────────────────────────────
/**
 * Sent when admin creates a new teacher account
 */
async function sendTeacherWelcome(teacherEmail, teacherName, batchDetails, loginPassword) {
  const subject = `Welcome to iMathAcademy team, ${teacherName}! 👨‍🏫`;

  const content = `
    <h1 style="font-family:Arial;font-size:22px;font-weight:900;color:#0D47A1;margin:0 0 8px">
      Welcome to the team! 👨‍🏫
    </h1>
    <p style="font-size:14px;color:#4A4A6A;margin:0 0 20px;line-height:1.6">
      Hi <strong>${teacherName}</strong>, your teacher account has been created. 
      You can now access the teacher dashboard and start managing your classes.
    </p>

    <div style="background:#E3F2FD;border:2px solid #90CAF9;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:800;color:#0D47A1;margin-bottom:10px">Your login credentials</div>
      <div style="font-size:13px;color:#1565C0;line-height:1.8">
        📧 <strong>Email:</strong> ${teacherEmail}<br>
        🔑 <strong>Password:</strong> ${loginPassword}<br>
        🌐 <strong>Teacher portal:</strong> <a href="${PORTAL_URL}/portal/teacher/dashboard.html" style="color:#1E88E5">${PORTAL_URL}/portal/teacher/dashboard.html</a>
      </div>
    </div>

    ${batchDetails ? `
    <div style="background:#F7F8FF;border-radius:10px;padding:14px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:800;color:#1A1A2E;margin-bottom:6px">Your assigned batches</div>
      <div style="font-size:13px;color:#4A4A6A;line-height:1.8">${batchDetails}</div>
    </div>` : ''}

    <div style="font-size:13px;font-weight:800;color:#1A1A2E;margin-bottom:8px">Quick start guide</div>
    <div style="font-size:13px;color:#4A4A6A;line-height:2;margin-bottom:20px">
      1️⃣ &nbsp;Log in and explore your dashboard<br>
      2️⃣ &nbsp;Check your class roster and student profiles<br>
      3️⃣ &nbsp;Assign your first homework (takes 90 seconds!)<br>
      4️⃣ &nbsp;Schedule your first live class
    </div>

    ${ctaButton('Go to teacher portal →', `${PORTAL_URL}/portal/teacher/dashboard.html`, '#1E88E5')}`;

  const html = wrapEmail(content, 'You received this because your teacher account was created by iMathAcademy admin.');
  return await sendEmail(teacherEmail, teacherName, subject, html);
}

// ── 11. BADGE EARNED NOTIFICATION ─────────────────────────
/**
 * Sent when student earns a new badge
 */
async function sendBadgeEarned(studentEmail, studentName, badgeIcon, badgeLabel, xpAwarded, totalXP) {
  const subject = `${badgeIcon} You earned the "${badgeLabel}" badge! +${xpAwarded} XP`;

  const content = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:64px;margin-bottom:10px">${badgeIcon}</div>
      <h1 style="font-family:Arial;font-size:24px;font-weight:900;color:#1A1A2E;margin:0 0 6px">
        New badge earned!
      </h1>
      <div style="font-size:18px;font-weight:800;color:#F9A825;margin-bottom:4px">${badgeLabel}</div>
      <div style="font-size:13px;color:#9090B0">+${xpAwarded} XP added to your total</div>
    </div>

    <div style="background:#FFFDE7;border:2px solid #FFE082;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="font-size:13px;color:#F57F17;font-weight:700;margin-bottom:4px">Your total XP</div>
      <div style="font-size:32px;font-weight:900;color:#F9A825">${totalXP.toLocaleString()} XP</div>
    </div>

    <p style="font-size:14px;color:#4A4A6A;text-align:center;margin:0 0 16px;line-height:1.6">
      Keep practising to unlock more badges and level up to your next belt! 🚀
    </p>

    ${ctaButton('See all your badges →', `${PORTAL_URL}/portal/student/progress.html`, '#F9A825')}`;

  const html = wrapEmail(content);
  return await sendEmail(studentEmail, studentName, subject, html);
}

// ══════════════════════════════════════════════════════════
//  SCHEDULED CHECKS
//  These run via Supabase Edge Functions (set up separately)
//  Or can be triggered by calling checkDailyAutomation()
// ══════════════════════════════════════════════════════════

/**
 * Master automation runner — call this daily
 * In production this runs as a Supabase Edge Function on a schedule
 */
async function checkDailyAutomation(supabaseClient) {
  const sb = supabaseClient;
  console.log('🤖 Running daily automation checks...');

  // 1. Check for homework due tomorrow → send reminders
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: dueTomorrow } = await sb
    .from('homework')
    .select(`*, batches(*, batch_students(*, users!student_id(*)))`)
    .eq('due_date', tomorrow)
    .eq('is_active', true);

  if (dueTomorrow) {
    for (const hw of dueTomorrow) {
      for (const bs of (hw.batches?.batch_students || [])) {
        const student = bs.users;
        if (student && student.email) {
          await sendHomeworkReminder(
            student.email, student.full_name,
            null, null, // parent email — fetch separately in production
            hw.title, hw.due_date
          );
        }
      }
    }
  }

  // 2. Check for inactive students → send re-engagement
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: inactive } = await sb
    .from('users')
    .select('*')
    .eq('role', 'student')
    .eq('is_active', true)
    .lt('last_active', threeDaysAgo);

  if (inactive) {
    for (const student of inactive) {
      if (student.email) {
        const daysMissed = Math.floor((Date.now() - new Date(student.last_active)) / (24 * 60 * 60 * 1000));
        await sendInactivityEmail(student.email, student.full_name, daysMissed, student.streak_days || 0);
      }
    }
  }

  // 3. Check for overdue fees → send reminders
  const today = new Date().toISOString().split('T')[0];
  const { data: overdue } = await sb
    .from('fees')
    .select(`*, users!student_id(*)`)
    .eq('status', 'pending')
    .lt('due_date', today);

  if (overdue) {
    for (const fee of overdue) {
      const student = fee.users;
      if (student && student.email) {
        const daysOver = Math.floor((Date.now() - new Date(fee.due_date)) / (24 * 60 * 60 * 1000));
        await sendFeeReminder(
          student.email, student.full_name,
          student.full_name, fee.amount,
          fee.due_date, true, daysOver
        );
      }
    }
  }

  console.log('✅ Daily automation complete');
}

// ══════════════════════════════════════════════════════════
//  SUPABASE EDGE FUNCTION SCRIPT
//  Copy this to your Supabase Edge Functions dashboard
//  Go to: Supabase → Edge Functions → New Function → "daily-automation"
// ══════════════════════════════════════════════════════════
const EDGE_FUNCTION_CODE = `
// ── Supabase Edge Function: daily-automation ──
// Schedule: Every day at 8:00 AM IST (2:30 AM UTC)
// Deploy: supabase functions deploy daily-automation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BREVO_KEY  = Deno.env.get('BREVO_API_KEY');
const PORTAL_URL = 'https://mail2hiren.github.io/imathacademy';
const FROM       = { email: 'hello@imathacademy.com', name: 'iMathAcademy' };

async function sendBrevoEmail(to, toName, subject, html) {
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
    body: JSON.stringify({ sender: FROM, to: [{ email: to, name: toName }], subject, htmlContent: html }),
  });
}

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const today     = new Date().toISOString().split('T')[0];
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const threeDays = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

  // Homework reminders
  const { data: hw } = await sb.from('homework').select('*, batches(batch_students(users!student_id(*)))').eq('due_date', tomorrow).eq('is_active', true);
  for (const h of hw || []) {
    for (const bs of h.batches?.batch_students || []) {
      const s = bs.users;
      if (s?.email) await sendBrevoEmail(s.email, s.full_name, 'Homework due tomorrow', '<p>Your homework is due tomorrow. Log in to complete it!</p>');
    }
  }

  // Inactivity nudges
  const { data: inactive } = await sb.from('users').select('*').eq('role','student').eq('is_active',true).lt('last_active', threeDays);
  for (const s of inactive || []) {
    if (s.email) await sendBrevoEmail(s.email, s.full_name, 'We miss you!', '<p>Come back and keep your learning streak going!</p>');
  }

  // Overdue fees
  const { data: fees } = await sb.from('fees').select('*, users!student_id(*)').eq('status','pending').lt('due_date', today);
  for (const f of fees || []) {
    const s = f.users;
    if (s?.email) await sendBrevoEmail(s.email, s.full_name, 'Fee payment overdue', '<p>Your fee payment is overdue. Please pay via UPI on the parent portal.</p>');
  }

  return new Response(JSON.stringify({ ok: true, ran: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json' } });
});
`;

// ── EXPORT ALL FUNCTIONS ────────────────────────────────────
// These are called from other portal files like this:
//
// import { sendHomeworkAssigned } from '../js/notifications.js';
// await sendHomeworkAssigned(email, name, title, topic, count, dueDate, teacher);
//
// Or include this file with a <script> tag and call directly:
// <script src="../../js/notifications.js"></script>
// sendWelcomeEmail(email, name, program, password);

console.log('✅ iMathAcademy notification system loaded');
console.log('   Available email functions:');
console.log('   - sendWelcomeEmail()');
console.log('   - sendHomeworkAssigned()');
console.log('   - sendHomeworkReminder()');
console.log('   - sendHomeworkResult()');
console.log('   - sendInactivityEmail()');
console.log('   - sendLevelUpEmail()');
console.log('   - sendFeeReminder()');
console.log('   - sendFeeReceipt()');
console.log('   - sendMonthlyReport()');
console.log('   - sendTeacherWelcome()');
console.log('   - sendBadgeEarned()');
console.log('   - checkDailyAutomation()');

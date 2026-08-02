/* ============================================================
   iMathAcademy — Parent: money and milestones
   ------------------------------------------------------------
   Two things the parent portal never showed: what is owed, and
   what has been earned.

   The distinction matters and parents get it wrong constantly,
   so the screen names it plainly:

     Class fees    what you pay Megha for teaching
     Subscription  what keeps the app working for your child

   A child can be fully paid up on fees and still locked out of
   the app because the subscription lapsed. Saying so once, in
   plain words, saves a confused phone call.
   ============================================================ */

var PLAN_LABEL = {
  monthly:    'Monthly',
  halfyearly: 'Half-yearly',
  annual:     'Annual'
};

function money(n) {
  if (n === null || n === undefined || n === '') return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function shortDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN',
    { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(d) {
  if (!d) return null;
  var ms = new Date(d).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.round(ms / 86400000);
}

/* ── Loading ─────────────────────────────────────────────────
   Each query is wrapped on its own. If a parent has no rows for
   one of them — or row level security has not been applied yet —
   that section says so rather than the whole tab going blank.
   ────────────────────────────────────────────────────────── */
async function loadParentMoney(childId) {
  var out = { fees: [], subscription: null, certificates: [], errors: [] };

  try {
    var f = await sb.from('fees')
      .select('id, amount, due_date, status, paid_at, notes')
      .eq('student_id', childId)
      .order('due_date', { ascending: false });
    if (f.error) throw f.error;
    out.fees = f.data || [];
  } catch (e) { out.errors.push('fees'); }

  try {
    var s = await sb.from('subscriptions')
      .select('plan, amount, status, expires_at')
      .eq('student_id', childId)
      .order('expires_at', { ascending: false })
      .limit(1);
    if (s.error) throw s.error;
    out.subscription = (s.data || [])[0] || null;
  } catch (e) { out.errors.push('subscription'); }

  try {
    var c = await sb.from('student_level_completions')
      .select('level_code, certificate_number, completed_at, test_score')
      .eq('student_id', childId)
      .order('completed_at', { ascending: false });
    if (c.error) throw c.error;
    out.certificates = c.data || [];
  } catch (e) { out.errors.push('certificates'); }

  return out;
}

/* ── Subscription ─────────────────────────────────────────── */
function subscriptionCard(sub, childName) {
  if (!sub) {
    return card('#FFF3E0', '#E65100',
      '📱 App subscription',
      'No subscription on record. ' + childName + ' may not be able to sign in.',
      'Speak to Megha about setting one up.');
  }

  var left   = daysUntil(sub.expires_at);
  var active = sub.status === 'active' && (left === null || left >= 0);

  var tone   = active ? (left !== null && left <= 7 ? 'warn' : 'ok') : 'bad';
  var bg     = tone === 'ok' ? '#E8F5E9' : tone === 'warn' ? '#FFF8E1' : '#FFEBEE';
  var fg     = tone === 'ok' ? '#1B5E20' : tone === 'warn' ? '#E65100' : '#B71C1C';

  var head = active
    ? (left !== null && left <= 7
        ? 'Ends in ' + left + ' day' + (left === 1 ? '' : 's')
        : 'Active')
    : 'Expired';

  var detail = (PLAN_LABEL[sub.plan] || sub.plan || 'Plan') +
               (sub.amount ? ' · ' + money(sub.amount) : '') +
               (sub.expires_at ? ' · until ' + shortDate(sub.expires_at) : '');

  var note = active
    ? 'This is what keeps the app working. It is separate from class fees.'
    : childName + ' cannot sign in until this is renewed.';

  var action = (!active || (left !== null && left <= 7))
    ? '<a href="../student/subscription.html" style="display:inline-block;margin-top:9px;' +
      'padding:9px 16px;border-radius:9px;background:' + fg + ';color:#fff;' +
      'text-decoration:none;font-size:.82rem;font-weight:900;">Renew now →</a>'
    : '';

  return card(bg, fg, '📱 App subscription — ' + head, detail, note, action);
}

/* ── Class fees ───────────────────────────────────────────── */
function feesCard(fees) {
  if (!fees.length) {
    return card('#F0F4FF', '#1565C0', '💰 Class fees',
      'Nothing recorded yet.',
      'Megha adds fees here as they fall due.');
  }

  var pending = fees.filter(function (f) { return f.status !== 'paid'; });
  var owed    = pending.reduce(function (s, f) { return s + (Number(f.amount) || 0); }, 0);

  var rows = fees.slice(0, 8).map(function (f) {
    var paid = f.status === 'paid';
    var late = !paid && daysUntil(f.due_date) < 0;
    var tone = paid ? '#2E7D32' : late ? '#C62828' : '#E65100';
    var word = paid ? 'Paid ' + shortDate(f.paid_at) : late ? 'Overdue' : 'Due';

    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;' +
             'border-bottom:1px solid var(--border,#E4E7F2);">' +
             '<div style="flex:1;min-width:0;">' +
               '<div style="font-size:.86rem;font-weight:800;">' + money(f.amount) + '</div>' +
               '<div style="font-size:.72rem;color:#888;">' +
                 (f.notes ? f.notes + ' · ' : '') + 'due ' + shortDate(f.due_date) + '</div>' +
             '</div>' +
             '<div style="font-size:.74rem;font-weight:900;color:' + tone + ';flex-shrink:0;">' +
               word + '</div>' +
           '</div>';
  }).join('');

  var head = owed > 0
    ? money(owed) + ' outstanding'
    : 'All paid up ✓';

  return '<div class="pm-card" style="background:#fff;border:1.5px solid ' +
           (owed > 0 ? '#FFCC80' : '#C8E6C9') + ';border-radius:14px;padding:14px;margin-bottom:12px;">' +
           '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
             '<div style="font-size:.92rem;font-weight:900;">💰 Class fees</div>' +
             '<div style="font-size:.8rem;font-weight:900;color:' +
               (owed > 0 ? '#E65100' : '#2E7D32') + ';">' + head + '</div>' +
           '</div>' +
           '<div style="font-size:.74rem;color:#888;margin-bottom:8px;">' +
             'What you pay Megha for teaching. Paid directly to her, not through the app.</div>' +
           rows +
         '</div>';
}

/* ── Certificates ─────────────────────────────────────────── */
function certificatesCard(certs, childName) {
  if (!certs.length) {
    return card('#F3E5F5', '#4A148C', '🎓 Certificates',
      'None yet.',
      childName + ' earns one for each level finished — all the worksheets done, ' +
      'enough practice, and a pass in the level test.');
  }

  var rows = certs.map(function (c) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;' +
             'border-bottom:1px solid var(--border,#E4E7F2);">' +
             '<div style="font-size:1.3rem;flex-shrink:0;">🎓</div>' +
             '<div style="flex:1;min-width:0;">' +
               '<div style="font-size:.86rem;font-weight:800;">Level ' +
                 (c.level_code || '').replace('L', '') + ' completed</div>' +
               '<div style="font-size:.72rem;color:#888;">' + shortDate(c.completed_at) +
                 (c.certificate_number ? ' · ' + c.certificate_number : '') + '</div>' +
             '</div>' +
             (c.test_score != null
               ? '<div style="font-size:.78rem;font-weight:900;color:#2E7D32;flex-shrink:0;">' +
                 c.test_score + '%</div>'
               : '') +
           '</div>';
  }).join('');

  return '<div class="pm-card" style="background:#fff;border:1.5px solid #CE93D8;' +
           'border-radius:14px;padding:14px;margin-bottom:12px;">' +
           '<div style="font-size:.92rem;font-weight:900;margin-bottom:4px;">🎓 Certificates</div>' +
           '<div style="font-size:.74rem;color:#888;margin-bottom:8px;">' +
             'Ask Megha for a printed copy of any of these.</div>' +
           rows +
         '</div>';
}

/* ── A simple coloured card ───────────────────────────────── */
function card(bg, fg, title, line, note, action) {
  return '<div class="pm-card" style="background:' + bg + ';border-radius:14px;' +
           'padding:14px;margin-bottom:12px;color:' + fg + ';">' +
           '<div style="font-size:.92rem;font-weight:900;margin-bottom:3px;">' + title + '</div>' +
           '<div style="font-size:.84rem;font-weight:800;margin-bottom:4px;">' + line + '</div>' +
           (note ? '<div style="font-size:.75rem;opacity:.85;line-height:1.5;">' + note + '</div>' : '') +
           (action || '') +
         '</div>';
}

/* ── Render the tab ───────────────────────────────────────── */
async function renderParentMoney(childId, childName) {
  var slot = document.getElementById('tab-money');
  if (!slot) return;

  slot.innerHTML = '<div style="padding:20px;text-align:center;color:#888;font-size:.85rem;">Loading…</div>';

  var data = await loadParentMoney(childId);
  var name = (childName || 'Your child').split(' ')[0];

  var html =
    subscriptionCard(data.subscription, name) +
    feesCard(data.fees) +
    certificatesCard(data.certificates, name);

  if (data.errors.length) {
    html += '<div style="background:#FFEBEE;border-radius:12px;padding:11px 13px;' +
            'font-size:.76rem;color:#B71C1C;line-height:1.5;">' +
            'Some of this could not be loaded (' + data.errors.join(', ') + '). ' +
            'If it stays empty, ask Megha to check the portal settings.</div>';
  }

  slot.innerHTML = html;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function loadSubscriptions() {
  try {
    const { data: subs } = await sb.from('subscriptions')
      .select('*, users!student_id(full_name, email)')
      .order('created_at', { ascending: false });

    allSubs = subs || [];

    // Stats
    const now = new Date();
    const weekFromNow = new Date(); weekFromNow.setDate(weekFromNow.getDate() + 7);
    const active  = allSubs.filter(s => s.status === 'active' && new Date(s.expires_at) > now);
    const expired = allSubs.filter(s => s.status !== 'active' || new Date(s.expires_at) <= now);
    const due     = allSubs.filter(s => s.status === 'active' && new Date(s.expires_at) > now && new Date(s.expires_at) <= weekFromNow);

    // Revenue this month
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const revenue = allSubs.filter(s => new Date(s.created_at) >= monthStart).reduce((sum,s) => sum + (s.amount||0), 0);

    document.getElementById('sub-active').textContent   = active.length;
    document.getElementById('sub-expired').textContent  = expired.length;
    document.getElementById('sub-duetoday').textContent = due.length;
    document.getElementById('sub-revenue').textContent  = `₹${revenue.toLocaleString('en-IN')}`;

    renderSubs(allSubs);

    // Populate student dropdown
    const sel = document.getElementById('sub-student');
    if (sel) {
      sel.innerHTML = '<option value="">— Select student —</option>' +
        allStudents.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');
    }
  } catch(err) {
    console.error('loadSubscriptions error:', err);
  }
}

function filterSubs(filter, btn) {
  subsFilter = filter;
  document.querySelectorAll('[onclick^="filterSubs"]').forEach(b => {
    b.className = 'btn btn-ghost btn-sm';
  });
  if (btn) btn.className = 'btn btn-blue btn-sm';

  const now = new Date();
  const weekFromNow = new Date(); weekFromNow.setDate(weekFromNow.getDate() + 7);

  const filtered = filter === 'all'     ? allSubs
    : filter === 'active'  ? allSubs.filter(s => s.status === 'active' && new Date(s.expires_at) > now)
    : filter === 'expired' ? allSubs.filter(s => s.status !== 'active' || new Date(s.expires_at) <= now)
    : allSubs.filter(s => s.status === 'active' && new Date(s.expires_at) > now && new Date(s.expires_at) <= weekFromNow);

  renderSubs(filtered);
}

function renderSubs(subs) {
  const tbody = document.getElementById('subsTbody');
  if (!subs?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No subscriptions found</td></tr>';
    return;
  }
  const now = new Date();
  tbody.innerHTML = subs.map(s => {
    const expired = !s.status === 'active' || new Date(s.expires_at) <= now;
    const statusCls = expired ? 'pill-r' : 'pill-g';
    const statusTxt = expired ? '🔒 Blocked' : 'Active';
    const plan = SUB_PLANS[s.plan] || { label: s.plan, amount: s.amount };
    return `<tr class="${expired ? 'inactive' : ''}">
      <td>
        <div style="font-weight:800">${s.users?.full_name || '—'}</div>
        <div style="font-size:.72rem;color:var(--text3)">${s.users?.email || ''}</div>
      </td>
      <td><span class="pill pill-b">${plan.label}</span></td>
      <td><span class="pill ${statusCls}">${statusTxt}</span></td>
      <td style="font-size:.82rem">${new Date(s.expires_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
      <td style="font-weight:800">₹${(s.amount||0).toLocaleString('en-IN')}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${expired ? `<button class="btn btn-green btn-sm" onclick="extendSub('${s.student_id}','${s.id}')">Mark paid</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="changeExpiry('${s.id}','${s.student_id}','${s.users?.full_name}','${s.expires_at || ''}')">Change expiry date</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function addManualSub() {
  const studentId = document.getElementById('sub-student').value;
  const plan      = document.getElementById('sub-plan').value;
  const method    = document.getElementById('sub-method').value;
  const ref       = document.getElementById('sub-ref').value.trim();
  const dateVal   = document.getElementById('sub-date').value;

  if (!studentId) { toast('Please select a student', 'error'); return; }

  const p = SUB_PLANS[plan];
  const now = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();
  const expires = new Date(dateVal || new Date());
  expires.setDate(expires.getDate() + p.days);

  try {
    // Mark previous active subscription expired
    await sb.from('subscriptions').update({ status: 'expired' })
      .eq('student_id', studentId).eq('status', 'active');

    const { error } = await sb.from('subscriptions').insert({
      student_id:     studentId,
      plan,
      amount:         p.amount,
      status:         'active',
      payment_method: method,
      reference:      ref || null,
      starts_at:      now,
      expires_at:     expires.toISOString(),
      created_by:     'admin',
    });
    if (error) throw error;

    toast(`✅ Payment recorded — access activated!`, 'success');
    document.getElementById('sub-student').value = '';
    document.getElementById('sub-ref').value = '';
    await loadSubscriptions();
  } catch(err) {
    toast('❌ ' + err.message, 'error');
  }
}

async function extendSub(studentId, oldId) {
  try {
    await sb.from('subscriptions').update({ status: 'expired' }).eq('id', oldId);
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const { error } = await sb.from('subscriptions').insert({
      student_id:     studentId,
      plan:           'monthly',
      amount:         199,
      status:         'active',
      payment_method: 'admin_override',
      starts_at:      new Date().toISOString(),
      expires_at:     expires.toISOString(),
      created_by:     'admin',
    });
    if (error) throw error;
    toast('✅ Subscription extended by 30 days!', 'success');
    await loadSubscriptions();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

/* Megha thinks in dates — "until the 31st" — not in numbers of days.
   The old version asked how many days and counted from today, so
   extending a subscription that still had two months left actually
   shortened it. And it wrote plan "monthly" at 199 rupees, recording a
   payment nobody made.

   This changes the date on the existing subscription and nothing else. */
async function changeExpiry(subId, studentId, name, currentExpiry) {
  var cur = currentExpiry ? new Date(currentExpiry) : new Date();
  var iso = isNaN(cur.getTime()) ? '' : cur.toISOString().slice(0, 10);

  var old = document.getElementById('expiryBox');
  if (old) old.remove();

  var ov = document.createElement('div');
  ov.id = 'expiryBox';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(20,24,40,.5);z-index:999;' +
    'display:flex;align-items:center;justify-content:center;padding:18px;';
  ov.onclick = function (e) { if (e.target === ov) ov.remove(); };

  ov.innerHTML =
    '<div style="background:#fff;border-radius:18px;padding:22px;max-width:380px;width:100%;">' +
      '<div style="font-size:1.05rem;font-weight:900;">' + (name || 'This student') + '</div>' +
      '<div style="font-size:.82rem;color:#8892A4;margin-top:3px;">' +
        (iso ? 'Access runs to ' + cur.toLocaleDateString('en-IN',
               { day:'numeric', month:'long', year:'numeric' }) : 'No end date set') + '</div>' +

      '<label style="display:block;font-size:.78rem;font-weight:900;color:#555;' +
        'margin:16px 0 6px;">New end date</label>' +
      '<input id="newExpiry" type="date" value="' + iso + '" ' +
        'style="width:100%;padding:13px;border:1.5px solid #E4E7F2;border-radius:11px;' +
        'font-family:inherit;font-size:1rem;">' +

      '<div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap;">' +
        '<button class="btn btn-ghost btn-sm" onclick="bumpExpiry(1)">+1 month</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="bumpExpiry(3)">+3 months</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="bumpExpiry(12)">+1 year</button>' +
      '</div>' +

      '<div style="display:flex;gap:9px;margin-top:18px;">' +
        '<button class="btn btn-ghost" style="flex:1;" ' +
          'onclick="document.getElementById(\'expiryBox\').remove()">Cancel</button>' +
        '<button class="btn btn-blue" style="flex:1;" ' +
          'onclick="saveExpiry(\'' + subId + '\', \'' + studentId + '\')">Save</button>' +
      '</div>' +
      '<div style="font-size:.74rem;color:#8892A4;margin-top:11px;line-height:1.5;">' +
        'This only changes when access ends. No payment is recorded.</div>' +
    '</div>';
  document.body.appendChild(ov);
}

/* The quick buttons move from the date shown, not from today, so
   adding a month to a subscription that runs to December gives
   January — not next month. */
function bumpExpiry(months) {
  var el = document.getElementById('newExpiry');
  if (!el) return;
  var base = el.value ? new Date(el.value) : new Date();
  if (isNaN(base.getTime())) base = new Date();
  base.setMonth(base.getMonth() + months);
  el.value = base.toISOString().slice(0, 10);
}

async function saveExpiry(subId, studentId) {
  var el = document.getElementById('newExpiry');
  var val = el && el.value;
  if (!val) { toast('Please choose a date', 'error'); return; }

  // End of that day, so access lasts the whole date she picked
  var when = new Date(val + 'T23:59:59');

  try {
    var res;
    if (subId && subId !== 'undefined' && subId !== 'null') {
      res = await sb.from('subscriptions')
        .update({ expires_at: when.toISOString(), status: 'active' })
        .eq('id', subId).select();
    } else {
      // No subscription at all — give them one, at no charge
      res = await sb.from('subscriptions').insert({
        student_id: studentId,
        plan: 'trial', amount: 0, status: 'active',
        payment_method: 'admin', reference: 'Set by admin',
        starts_at: new Date().toISOString(),
        expires_at: when.toISOString()
      }).select();
    }
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) {
      throw new Error('Nothing was saved — check your permissions');
    }
    document.getElementById('expiryBox').remove();
    toast('Access now runs to ' + when.toLocaleDateString('en-IN',
          { day:'numeric', month:'short', year:'numeric' }), 'success');
    await loadSubscriptions();
  } catch (e) {
    toast('Could not save: ' + e.message, 'error');
  }
}

async function logout() {
  // Local only. A full signOut revokes the refresh token, which breaks
  // the saved PIN sign-in for everyone on this device.
  try {
    if (typeof Profiles !== 'undefined' && Profiles.leave) await Profiles.leave();
    else await sb.auth.signOut({ scope: 'local' });
  } catch (e) { try { await sb.auth.signOut({ scope: 'local' }); } catch (e2) {} }
  window.location.href = '../../login.html';
}

// ── INIT ────────────────────────────────────────────────────
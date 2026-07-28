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
          <button class="btn btn-ghost btn-sm" onclick="extendSubCustom('${s.student_id}','${s.users?.full_name}')">Extend</button>
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

async function extendSubCustom(studentId, name) {
  const days = parseInt(prompt(`Extend ${name}'s subscription by how many days?`, '30'));
  if (!days || isNaN(days)) return;
  try {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    await sb.from('subscriptions').update({ status: 'expired' })
      .eq('student_id', studentId).eq('status', 'active');
    const { error } = await sb.from('subscriptions').insert({
      student_id:     studentId,
      plan:           days >= 180 ? 'halfyearly' : 'monthly',
      amount:         days >= 180 ? 1099 : 199,
      status:         'active',
      payment_method: 'admin_override',
      starts_at:      new Date().toISOString(),
      expires_at:     expires.toISOString(),
      created_by:     'admin',
    });
    if (error) throw error;
    toast(`✅ Extended by ${days} days!`, 'success');
    await loadSubscriptions();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = '../../login.html';
}

// ── INIT ────────────────────────────────────────────────────
async function init() {
  // Set DOB max date (today) and sensible min (15 years ago)
  const dobInput = document.getElementById('s-dob');
  if (dobInput) {
    const today = new Date();
    dobInput.max = today.toISOString().split('T')[0];
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 15);
    dobInput.min = minDate.toISOString().split('T')[0];
  }
  document.getElementById('topbarDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = '../../login.html'; return; }
    const { data: profile } = await sb.from('users').select('full_name, role').eq('id', session.user.id).single();
    if (!profile || profile.role !== 'admin') { window.location.href = '../../login.html'; return; }
    const name = profile.full_name || 'Admin';
    document.getElementById('adminAv').textContent   = initials(name);
    document.getElementById('adminName').textContent = name;
    await loadAll();
  } catch(err) {
    console.error('Init error:', err);
    if (err?.message?.includes('not authenticated')) window.location.href = '../../login.html';
  }
}

init();

function filterBatchLevels(programId) {
  var abacusGrp = document.getElementById('abacus-levels');
  var vedicGrp  = document.getElementById('vedic-levels');
  var levelSel  = document.getElementById('b-level');
  if (!abacusGrp || !vedicGrp) return;
  if (programId === '503089d2-3d04-4071-8200-b411d0429ae6') {
    abacusGrp.style.display = '';
    vedicGrp.style.display  = 'none';
  } else if (programId === '237e82b5-212c-49be-98fb-8561f33624e0') {
    abacusGrp.style.display = 'none';
    vedicGrp.style.display  = '';
  } else {
    abacusGrp.style.display = '';
    vedicGrp.style.display  = '';
  }
  if (levelSel) levelSel.value = '';
}


// ── PRICING MANAGER ──────────────────────────────────────────
var allPricing = [];
var currentPricingCountry = 'IN';

const COUNTRIES = {
  IN: { name: 'India',    flag: '🇮🇳', symbol: '₹',   code: 'INR' },
  US: { name: 'USA',      flag: '🇺🇸', symbol: '$',   code: 'USD' },
  AE: { name: 'UAE',      flag: '🇦🇪', symbol: 'AED', code: 'AED' },
  GB: { name: 'UK',       flag: '🇬🇧', symbol: '£',   code: 'GBP' },
};

const PLAN_ICONS = {
  monthly:    '📅',
  halfyearly: '📆',
  annual:     '🗓️',
};

const PLAN_NAMES = {
  monthly:    'Monthly',
  halfyearly: 'Half-yearly',
  annual:     'Annual',
};
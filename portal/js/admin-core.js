// ── SUPABASE CLIENT ─────────────────────────────────────────
const SURL = 'https://bhullfoajenhkxlkiubs.supabase.co';
const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodWxsZm9hamVuaGt4bGtpdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzcwMjUsImV4cCI6MjA5MzExMzAyNX0.RUcKFGluRhu9H8sZdLb-ow4ORoCd2-oIzYXJqyNZ5Uc';
const sb = supabase.createClient(SURL, SKEY);

// ── GLOBAL SHARED STATE ──────────────────────────────────────
// Declared here so all split JS files can access them
var allStudents  = [];
var allTeachers  = [];
var allParents   = [];
var allBatches   = [];
var allFees      = [];
var allLevels    = [];
var allPrograms  = [];
var allPricing   = [];
var currentTab   = 'overview';
var confirmCallback = null;
var currentPricingCountry = 'IN';
var allSubs      = [];
var allEnquiries = [];

// Subscription plans reference
const SUB_PLANS = {
  monthly:    { label: 'Monthly',     days: 30,  amount: 199  },
  halfyearly: { label: 'Half-yearly', days: 180, amount: 1099 },
  annual:     { label: 'Annual',      days: 365, amount: 1999 },
};

function toast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── MODAL ───────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// ── CONFIRM DIALOG ──────────────────────────────────────────
function showConfirm(title, msg, onOk, okLabel = 'Confirm', danger = true) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  const btn = document.getElementById('confirmOkBtn');
  btn.textContent = okLabel;
  btn.className   = `btn ${danger ? 'btn-red' : 'btn-green'}`;
  confirmCallback = onOk;
  openModal('confirmDialog');
}
function closeConfirm() { closeModal('confirmDialog'); confirmCallback = null; }
function doConfirm()    { closeConfirm(); if (confirmCallback) confirmCallback(); }

// ── TAB NAVIGATION ──────────────────────────────────────────
function showTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  var tabEl = document.getElementById('tab-' + name);
  if (tabEl) tabEl.classList.add('active'); else console.warn('Tab not found: tab-' + name);
  if (btn) btn.classList.add('active');
  currentTab = name;
  const titles = { overview:'Dashboard', students:'Students', teachers:'Teachers', parents:'Parents', batches:'Batches', associations:'Associations', lessons:'Lessons', fees:'Fees', subscriptions:'Subscriptions', pricing:'🌍 Global Pricing' };
  document.getElementById('topbarTitle').textContent = titles[name] || 'Admin';
  // Load data for the tab
  if (name === 'students')     renderStudents();
  if (name === 'teachers')     renderTeachers();
  if (name === 'parents')      renderParents();
  if (name === 'batches')      renderBatches();
  if (name === 'associations') { renderAssociations(); renderStudentBatches(); renderTeacherBatches(); renderPrograms(); }
  if (name === 'lessons')      renderLessons();
  if (name === 'fees')         renderFees();
    if (name === 'subscriptions') loadSubscriptions();
  if (name === 'enquiries') loadEnquiries();
  if (name === 'pricing') loadPricing();
}

// ── SEARCH / FILTER ─────────────────────────────────────────
function filterTable(tbodyId, q) {
  const rows = document.getElementById(tbodyId).querySelectorAll('tr');
  const s = q.toLowerCase();
  rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(s) ? '' : 'none'; });
}

// ── HELPERS ─────────────────────────────────────────────────
function initials(name) { return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2); }
function fmt(date) { return date ? new Date(date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '—'; }
function calcAgeGroup(profile) {
  if (profile.age_group) return profile.age_group;
  if (profile.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age <= 7) return 'tiny';
    if (age <= 10) return 'rising';
    return 'champions';
  }
  const lv = profile.current_level || 1;
  if (lv <= 1) return 'tiny';
  if (lv <= 4) return 'rising';
  return 'champions';
}

function statusPill(active) {
  const isActive = active !== false && active !== 'false';
  return `<span class="pill ${isActive?'pill-g':'pill-r'}">${isActive?'Active':'Inactive'}</span>`;
}

// ── LOAD ALL DATA ───────────────────────────────────────────
async function loadAll() {
  // Users and batches first — fees loaded separately to avoid breaking everything
  const [uRes, bRes] = await Promise.all([
    sb.from('users').select('*').order('created_at', { ascending: false }),
    sb.from('batches').select('*, users!teacher_id(full_name), batch_students(student_id)'),
  ]);
  // Fees: graceful fallback if table not yet created
  let fRes = { data: [] };
  try {
    const { data: fData, error: fErr } = await sb.from('fees')
      .select('*, users!student_id(full_name, email)').order('due_date', { ascending: false });
    if (!fErr) fRes = { data: fData || [] };
  } catch(e) { console.warn('fees table not ready:', e.message); }
  allStudents = (uRes.data || []).filter(u => u.role === 'student');
  allTeachers = (uRes.data || []).filter(u => u.role === 'teacher');
  allParents  = (uRes.data || []).filter(u => u.role === 'parent');
  allBatches  = bRes.data || [];
  allFees     = fRes.data || [];

  // Overview stats
  document.getElementById('ov-students').textContent = allStudents.length;
  document.getElementById('ov-teachers').textContent = allTeachers.length;
  document.getElementById('ov-parents').textContent  = allParents.length;
  const overdue = allFees.filter(f => f.status === 'overdue').length;
  document.getElementById('ov-overdue').textContent  = overdue;

  // Populate dropdowns
  populateDropdowns();

  // Recent activity
  const { data: notifs } = await sb.from('notifications').select('title,created_at').order('created_at', { ascending: false }).limit(8);
  const actEl = document.getElementById('recentActivity');
  if (notifs && notifs.length) {
    actEl.innerHTML = notifs.map(n => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-weight:700;font-size:.875rem">${n.title}</span>
        <span style="font-size:.72rem;color:var(--text3)">${fmt(n.created_at)}</span>
      </div>`).join('');
  } else {
    actEl.innerHTML = '<div class="empty">No recent activity</div>';
  }
}

function populateDropdowns() {
  // Teacher dropdown for batch
  const bTeacher = document.getElementById('b-teacher');
  bTeacher.innerHTML = '<option value="">— Select teacher —</option>' +
    allTeachers.map(t => `<option value="${t.id}">${t.full_name}</option>`).join('');

  // Student/batch dropdowns for batch assignment
  const absStudent = document.getElementById('abs-student');
  absStudent.innerHTML = '<option value="">— Select student —</option>' +
    allStudents.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');
  const absBatch = document.getElementById('abs-batch');
  absBatch.innerHTML = '<option value="">— Select batch —</option>' +
    allBatches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

  // Association dropdowns — parent↔student
  const aParent = document.getElementById('assoc-parent');
  aParent.innerHTML = '<option value="">— Select parent —</option>' +
    allParents.map(p => `<option value="${p.id}">${p.full_name}</option>`).join('');
  const aStudent = document.getElementById('assoc-student');
  aStudent.innerHTML = '<option value="">— Select student —</option>' +
    allStudents.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');

  // Student ↔ Batch dropdowns
  const sbStudent = document.getElementById('sb-student');
  if (sbStudent) sbStudent.innerHTML = '<option value="">— Select student —</option>' +
    allStudents.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');
  const sbBatch = document.getElementById('sb-batch');
  if (sbBatch) sbBatch.innerHTML = '<option value="">— Select batch —</option>' +
    allBatches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

  // Teacher ↔ Batch dropdowns
  const tbTeacher = document.getElementById('tb-teacher');
  if (tbTeacher) tbTeacher.innerHTML = '<option value="">— Select teacher —</option>' +
    allTeachers.map(t => `<option value="${t.id}">${t.full_name}</option>`).join('');
  const tbBatch = document.getElementById('tb-batch');
  if (tbBatch) tbBatch.innerHTML = '<option value="">— Select batch —</option>' +
    allBatches.map(b => `<option value="${b.id}">${b.name} (${b.users?.full_name||'No teacher'})</option>`).join('');

  // Student ↔ Program dropdown
  const spStudent = document.getElementById('sp-student');
  if (spStudent) spStudent.innerHTML = '<option value="">— Select student —</option>' +
    allStudents.map(s => `<option value="${s.id}">${s.full_name} (${s.program||'—'} L${s.current_level||1})</option>`).join('');
}

// ── CREATE USER ─────────────────────────────────────────────
async function createUser(role) {
  const prefix = role === 'student' ? 's' : role === 'teacher' ? 't' : 'p';
  const name  = document.getElementById(`${prefix}-name`).value.trim();
  const email = document.getElementById(`${prefix}-email`).value.trim();
  const phone = document.getElementById(`${prefix}-phone`)?.value.trim() || '';
  const pwd   = document.getElementById(`${prefix}-pwd`).value;
  if (!name || !email || !pwd) { toast('Please fill all required fields', 'error'); return; }
  if (pwd.length < 6)          { toast('Password must be at least 6 characters', 'error'); return; }

  const btn = document.getElementById(`create${role.charAt(0).toUpperCase()+role.slice(1)}Btn`);
  btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const payload = { email, password: pwd, full_name: name, role, phone: phone || null };
    if (role === 'student') {
      payload.program       = document.getElementById('s-program').value;
      payload.current_level = parseInt(document.getElementById('s-level').value);
      payload.date_of_birth = document.getElementById('s-dob')?.value || null;
      payload.age_group     = document.getElementById('s-agegroup')?.value || null;
      // Validate DOB
      if (!payload.date_of_birth) {
        toast('Please enter date of birth', 'error');
        btn.disabled = false; btn.textContent = '➕ Create student';
        return;
      }
    }
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(CREATE_USER_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': SUPABASE_KEY },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error || 'Failed to create user';
      if (msg.toLowerCase().includes('already')) throw new Error('This email is already registered. Check existing users.');
      throw new Error(msg);
    }
    toast(`✅ ${name} created successfully!`, 'success');
    [`${prefix}-name`,`${prefix}-email`,`${prefix}-phone`,`${prefix}-pwd`].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    await loadAll();
    if (role === 'student') renderStudents();
    if (role === 'teacher') renderTeachers();
    if (role === 'parent')  renderParents();
  } catch(err) {
    toast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = `➕ Create ${role}`;
  }
}

// ── RENDER STUDENTS ─────────────────────────────────────────
const SURL = 'https://bhullfoajenhkxlkiubs.supabase.co';
const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodWxsZm9hamVuaGt4bGtpdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzcwMjUsImV4cCI6MjA5MzExMzAyNX0.RUcKFGluRhu9H8sZdLb-ow4ORoCd2-oIzYXJqyNZ5Uc';
const sb = supabase.createClient(SURL, SKEY);

function go(url) { location.href = url; }

// ── HELPERS ─────────────────────────────────────────────────
function initials(name) { return (name||'S').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2); }
function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function toast(msg, type='success') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── AGE GROUP ────────────────────────────────────────────────
// Priority: 1) admin override (age_group field)
//           2) calculated from date_of_birth
//           3) fallback from current_level
function getGroup(profile) {
  // 1. Admin override takes highest priority
  if (profile.age_group) return profile.age_group;

  // 2. Calculate from date of birth
  if (profile.date_of_birth) {
    const dob  = new Date(profile.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age <= 7)  return 'tiny';
    if (age <= 10) return 'rising';
    return 'champions';
  }

  // 3. Fallback: use current_level
  const level = profile.current_level || 1;
  if (level <= 1) return 'tiny';
  if (level <= 4) return 'rising';
  return 'champions';
}

function getAgeFromDOB(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function groupLabel(group) {
  return group === 'tiny' ? '🐣 Tiny Champs' : group === 'rising' ? '🌟 Rising Stars' : '🚀 Champions';
}

// ── SUBSCRIPTION CHECK ───────────────────────────────────────
async function checkSubscription(userId) {
  const { data: subs } = await sb.from('subscriptions')
    .select('id, expires_at, status')
    .eq('student_id', userId)
    .eq('status', 'active')
    .order('expires_at', { ascending: false })
    .limit(1);
  const sub = subs?.[0];
  const expired = !sub || new Date(sub.expires_at) < new Date();
  if (expired) { window.location.href = 'subscription.html'; return false; }
  return true;
}

// ── NOTIFICATIONS ────────────────────────────────────────────
// ── NOTIFICATIONS (live from DB) ─────────────────────────────
async function loadNotifications(userId) {
  try {
    const { data: notifs } = await sb.from('notifications')
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20);

    const unread = (notifs||[]).filter(n => !n.is_read);
    const dot = document.getElementById('notifDot');
    const btn = document.getElementById('notifBtn');
    if (dot) dot.style.display = unread.length > 0 ? 'block' : 'none';
    if (btn) btn.setAttribute('data-count', unread.length);

    // Store for dropdown
    window._notifs = notifs || [];
  } catch(e) { console.error('loadNotifications:', e); }
}

function toggleNotif() {
  let panel = document.getElementById('notifPanel');
  if (panel) { panel.remove(); return; }

  const notifs = window._notifs || [];
  panel = document.createElement('div');
  panel.id = 'notifPanel';
  panel.style.cssText = 'position:fixed;top:60px;right:12px;width:320px;max-width:calc(100vw - 24px);background:#fff;border:2px solid #E8EAF6;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:9999;overflow:hidden;max-height:400px;overflow-y:auto;';

  const header = `<div style="padding:12px 16px;border-bottom:2px solid #E8EAF6;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:.875rem;font-weight:800;color:#1A1A2E;">Notifications</div>
    <button onclick="markAllRead()" style="font-size:.72rem;font-weight:700;color:#1E88E5;background:none;border:none;cursor:pointer;">Mark all read</button>
  </div>`;

  const items = notifs.length === 0
    ? '<div style="padding:24px;text-align:center;color:#9090B0;font-size:.82rem;">No notifications yet</div>'
    : notifs.map(n => `
      <div style="padding:11px 16px;border-bottom:1px solid #F0F0F8;display:flex;gap:10px;align-items:flex-start;background:${n.is_read?'#fff':'#F7F8FF'};">
        <div style="font-size:1rem;flex-shrink:0;margin-top:2px;">${n.type==='worksheet'?'📋':n.type==='homework'?'📚':n.type==='badge'?'🏅':n.type==='quiz'?'⚡':'🔔'}</div>
        <div style="flex:1;">
          <div style="font-size:.82rem;font-weight:700;color:#1A1A2E;">${n.title||''}</div>
          <div style="font-size:.75rem;color:#9090B0;margin-top:2px;">${n.message||''}</div>
          <div style="font-size:.68rem;color:#B0B0C8;margin-top:3px;">${n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</div>
        </div>
        ${!n.is_read ? '<div style="width:8px;height:8px;border-radius:50%;background:#1E88E5;flex-shrink:0;margin-top:6px;"></div>' : ''}
      </div>`).join('');

  panel.innerHTML = header + items;
  document.body.appendChild(panel);

  // Mark as read
  markAllRead();

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!panel.contains(e.target) && e.target.id !== 'notifBtn') {
        panel.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 100);
}

async function markAllRead() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  await sb.from('notifications').update({ is_read: true })
    .eq('user_id', session.user.id).eq('is_read', false);
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
  window._notifs = (window._notifs||[]).map(n => ({...n, is_read: true}));
}
document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  const btn   = document.getElementById('notifBtn');
  if (panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
});

async function loadNotifications(userId) {
  const { data } = await sb.from('notifications')
    .select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(10);

  const list = document.getElementById('notifList');
  const dot  = document.getElementById('notifDot');
  if (!data?.length) {
    list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }
  dot.style.display = 'block';
  list.innerHTML = data.map(n => `
    <div class="notif-item">
      <div class="notif-item-title">${n.title}</div>
      <div class="notif-item-sub">${n.message || ''}</div>
    </div>`).join('');
}

// ── BUILD DASHBOARD ──────────────────────────────────────────
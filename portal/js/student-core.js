// ── SUPABASE ─────────────────────────────────────────────────
const SURL = 'https://bhullfoajenhkxlkiubs.supabase.co';
const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodWxsZm9hamVuaGt4bGtpdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzcwMjUsImV4cCI6MjA5MzExMzAyNX0.RUcKFGluRhu9H8sZdLb-ow4ORoCd2-oIzYXJqyNZ5Uc';
const sb = supabase.createClient(SURL, SKEY);

// ── HELPERS ──────────────────────────────────────────────────
function go(url) { location.href = url; }
function initials(name) { return (name||'S').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2); }
function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function toast(msg, type='success') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function getGroup(profile) {
  const age = profile.date_of_birth ? getAgeFromDOB(profile.date_of_birth) : null;
  if (age !== null) {
    if (age <= 7)  return 'tiny';
    if (age <= 10) return 'rising';
    return 'champions';
  }
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

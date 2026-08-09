/* ============================================================
   iMathAcademy — Device profiles
   ------------------------------------------------------------
   One phone, whole family. A six-year-old cannot type an email
   address and a password, so tapping a face and entering four
   digits has to work every time.

   WHAT CHANGED, AND WHY
   The first version stored a Supabase refresh token and used the
   PIN to unlock it. That token is fragile in three separate ways:
   Supabase rotates it on every use, a full sign-out revokes it on
   the server, and it expires on its own. Every lockout families
   reported traced to one of those. The PIN was never the weak
   part — the token behind it was.

   Now the PIN unlocks the PASSWORD, and we perform a genuine
   sign-in. The password is encrypted with a key derived from the
   PIN and never stored in readable form. Nothing depends on a
   session surviving, so signing off, expiry and rotation stop
   mattering entirely.

   HOW STRONG IS THIS
   Four digits is ten thousand combinations. Someone holding an
   UNLOCKED phone, willing to read localStorage and write a script,
   could work through them offline. PBKDF2 at 210,000 iterations
   makes each attempt slow enough that this is a poor use of their
   evening. It is weaker than typing the password and far stronger
   than what it replaces — the right trade for a family device.
   ============================================================ */

var Profiles = (function () {
  'use strict';

  var KEY  = 'imath_device_profiles';
  var ITER = 210000;

  var pendingPassword = null;   // held only between sign-in and PIN setup

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  /* ── Crypto ────────────────────────────────────────────────── */
  function bytes(n) {
    var a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return a;
  }
  function toB64(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function fromB64(s) {
    var bin = atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  async function keyFromPin(pin, salt) {
    var base = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function seal(pin, password) {
    var salt = bytes(16), iv = bytes(12);
    var key  = await keyFromPin(pin, salt);
    var ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key,
                 new TextEncoder().encode(password));
    return { salt: toB64(salt), iv: toB64(iv), blob: toB64(ct) };
  }

  async function open(pin, rec) {
    var key = await keyFromPin(pin, fromB64(rec.salt));
    var pt  = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: fromB64(rec.iv) }, key, fromB64(rec.blob));
    return new TextDecoder().decode(pt);
  }

  /* ── The people on this device ─────────────────────────────── */
  function list() {
    return load().sort(function (a, b) { return (b.last_used || 0) - (a.last_used || 0); });
  }
  function get(id) {
    return load().filter(function (p) { return p.id === id; })[0] || null;
  }
  function hasPin(id) {
    var p = get(id);
    return !!(p && p.blob && p.salt && p.iv);
  }
  /** Can this face sign in on its own? Same question as hasPin now. */
  function isLive(id) { return hasPin(id); }

  function forget(id) {
    save(load().filter(function (p) { return p.id !== id; }));
  }

  /** Held in memory only, so a PIN can be set moments later. */
  function stashPassword(pw) { pendingPassword = pw; }

  /** Remember who this is. No tokens are kept. */
  function remember(user, profile) {
    if (!user) return;
    var all = load();
    var existing = all.filter(function (p) { return p.id === user.id; })[0];
    var entry = existing || { id: user.id };
    entry.name  = profile.full_name || user.email || 'Student';
    entry.role  = profile.role || 'student';
    entry.email = user.email || '';
    entry.last_used = Date.now();
    if (!existing) all.push(entry);
    save(all);
  }

  /**
   * Set or replace a PIN. Uses the password captured at sign-in, so
   * this only works in the same visit — which is also what makes
   * "forgot my PIN" simple: sign in by email and set a new one.
   */
  async function setPin(id, pin, passwordOverride) {
    var pw = passwordOverride || pendingPassword;
    if (!pw) return false;
    var all = load();
    var p = all.filter(function (x) { return x.id === id; })[0];
    if (!p) return false;
    var sealed = await seal(pin, pw);
    p.salt = sealed.salt; p.iv = sealed.iv; p.blob = sealed.blob;
    p.fails = 0;
    save(all);
    pendingPassword = null;
    return true;
  }

  function clearPin(id) {
    var all = load();
    var p = all.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    delete p.salt; delete p.iv; delete p.blob; delete p.fails;
    save(all);
  }

  /**
   * Become this person: decrypt their password and sign in properly.
   * A wrong PIN fails at the decrypt step and never reaches the network.
   */
  async function switchTo(id, pin) {
    var p = get(id);
    if (!p || !p.blob) throw new Error('NEEDS_EMAIL');

    var password;
    try {
      password = await open(pin, p);
    } catch (e) {
      var all = load();
      var rec = all.filter(function (x) { return x.id === id; })[0];
      if (rec) { rec.fails = (rec.fails || 0) + 1; save(all); }
      throw new Error('WRONG_PIN');
    }

    var res = await sb.auth.signInWithPassword({ email: p.email, password: password });
    if (res.error) {
      // The password has been changed elsewhere, so the stored one is
      // no longer any use. Drop the PIN and ask for email once.
      clearPin(id);
      throw new Error('NEEDS_EMAIL');
    }

    var all2 = load();
    var e2 = all2.filter(function (x) { return x.id === id; })[0];
    if (e2) { e2.last_used = Date.now(); e2.fails = 0; save(all2); }

    return ROUTES[p.role] || 'index.html';
  }

  function failCount(id) {
    var p = get(id);
    return (p && p.fails) || 0;
  }

  /** Step away from this browser without revoking anything. */
  async function leave() {
    try { await sb.auth.signOut({ scope: 'local' }); }
    catch (e) { try { await sb.auth.signOut(); } catch (e2) {} }
  }

  /** A full sign-out. Safe now — nothing here depends on the session. */
  async function signOutFully(id) {
    if (id) forget(id);
    try { await sb.auth.signOut(); } catch (e) {}
  }

  var ROUTES = {
    student: 'portal/student/dashboard.html',
    parent:  'portal/parent/dashboard.html',
    teacher: 'portal/teacher/dashboard.html',
    admin:   'portal/admin/dashboard.html'
  };

  function initials(name) {
    return (name || 'S').split(' ').map(function (n) { return n[0]; })
      .join('').toUpperCase().slice(0, 2);
  }
  var COLOURS = ['#1565C0','#2E7D32','#6A1B9A','#E65100','#00838F','#C2185B'];
  function colour(id) {
    var n = 0;
    for (var i = 0; i < (id || '').length; i++) n += id.charCodeAt(i);
    return COLOURS[n % COLOURS.length];
  }
  var ICONS = { student: '🎒', parent: '👤', teacher: '📚', admin: '⚙️' };

  return {
    list: list, get: get, remember: remember, forget: forget,
    hasPin: hasPin, isLive: isLive, setPin: setPin, clearPin: clearPin,
    stashPassword: stashPassword, switchTo: switchTo, failCount: failCount,
    leave: leave, signOutFully: signOutFully,
    initials: initials, colour: colour,
    icon: function (r) { return ICONS[r] || '🎒'; },
    routes: ROUTES
  };
})();

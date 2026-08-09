/* ============================================================
   iMathAcademy — Device profiles
   ------------------------------------------------------------
   One phone, whole family. A child who has to ask a parent to
   type an email and password will practise less, so switching
   has to be something a six-year-old can do alone.

   How it works: when someone signs in, their session is kept on
   this device under their own name. Switching restores that
   session — no password, no email, just a tap and four digits.

   WHAT THE PIN IS AND IS NOT
   It stops a sibling opening the wrong account and stops a child
   wandering into the parent's fees. It is not a security barrier:
   the session token is already on the device, as it is for any
   signed-in website. Anyone holding an unlocked phone with
   technical intent could bypass it. Netflix profiles work the
   same way, and for the same reason — this is about the right
   person landing in the right place, not about defence.
   ============================================================ */

var Profiles = (function () {
  'use strict';

  var KEY = 'imath_device_profiles';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  /* ── PIN hashing ───────────────────────────────────────────
     Salted SHA-256 so the PIN itself is never written down, even
     though the store is local.
     ──────────────────────────────────────────────────────── */
  function randomSalt() {
    var a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function hashPin(pin, salt) {
    var data = new TextEncoder().encode(salt + '|' + pin);
    var buf  = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  /* ── Remembering someone ──────────────────────────────────── */
  function list() {
    return load().sort(function (a, b) { return (b.last_used || 0) - (a.last_used || 0); });
  }

  function get(id) {
    return load().filter(function (p) { return p.id === id; })[0] || null;
  }

  /**
   * Keep this person on the device after a successful sign-in.
   * Called with the live session so the tokens can be restored later.
   */
  function remember(user, profile, session) {
    if (!user || !session) return;
    var all = load();
    var existing = all.filter(function (p) { return p.id === user.id; })[0];
    var entry = existing || { id: user.id };

    entry.name    = profile.full_name || user.email || 'Student';
    entry.role    = profile.role || 'student';
    entry.email   = user.email || '';
    entry.access_token  = session.access_token;
    entry.refresh_token = session.refresh_token;
    entry.last_used = Date.now();
    // pin_hash and pin_salt are left alone if already set

    if (!existing) all.push(entry);
    save(all);
  }

  async function setPin(id, pin) {
    var all = load();
    var p = all.filter(function (x) { return x.id === id; })[0];
    if (!p) return false;
    if (!pin) { delete p.pin_hash; delete p.pin_salt; save(all); return true; }
    p.pin_salt = randomSalt();
    p.pin_hash = await hashPin(pin, p.pin_salt);
    save(all);
    return true;
  }

  function hasPin(id) {
    var p = get(id);
    return !!(p && p.pin_hash);
  }

  async function checkPin(id, pin) {
    var p = get(id);
    if (!p || !p.pin_hash) return true;      // no pin set — nothing to check
    var h = await hashPin(pin, p.pin_salt || '');
    return h === p.pin_hash;
  }

  /** Drop only the session, keeping the name, role and PIN. */
  function clearTokens(id) {
    var all = load();
    var p = all.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    delete p.access_token;
    delete p.refresh_token;
    save(all);
  }

  /** Is this profile still able to sign in without a password? */
  function isLive(id) {
    var p = get(id);
    return !!(p && p.refresh_token);
  }

  function forget(id) {
    save(load().filter(function (p) { return p.id !== id; }));
  }

  /**
   * Become this person. Restores their stored session; Supabase
   * refreshes it from the refresh token if the access token has
   * aged out. Returns the route their role should land on.
   */
  async function switchTo(id, pin) {
    var p = get(id);
    if (!p) throw new Error('That profile is no longer on this device');

    if (p.pin_hash) {
      var ok = await checkPin(id, pin);
      if (!ok) throw new Error('WRONG_PIN');
    }

    var res = await sb.auth.setSession({
      access_token:  p.access_token,
      refresh_token: p.refresh_token
    });
    if (res.error) {
      var msg = String(res.error.message || '').toLowerCase();
      var dead = msg.indexOf('refresh') > -1 || msg.indexOf('invalid') > -1 ||
                 msg.indexOf('expired') > -1 || msg.indexOf('jwt') > -1 ||
                 res.error.status === 400 || res.error.status === 401;
      if (dead) {
        // Keep the person and their PIN; only the session is gone.
        clearTokens(id);
        throw new Error('SESSION_EXPIRED');
      }
      throw new Error('Could not switch just now — please try again');
    }

    // Keep the refreshed tokens, or the next switch uses stale ones
    var s = res.data && res.data.session;
    if (s) {
      var all = load();
      var e = all.filter(function (x) { return x.id === id; })[0];
      if (e) {
        e.access_token  = s.access_token;
        e.refresh_token = s.refresh_token;
        e.last_used = Date.now();
        save(all);
      }
    }

    return ROUTES[p.role] || 'index.html';
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

  /**
   * Step away without destroying the stored session.
   *
   * A plain signOut() revokes the refresh token on the server, which
   * kills the saved profile for everyone on this device — sign out to
   * add a second person and the first can never switch back. Local
   * scope clears this browser only and leaves the token usable.
   */
  async function leave() {
    try { await sb.auth.signOut({ scope: 'local' }); }
    catch (e) { try { await sb.auth.signOut(); } catch (e2) {} }
  }

  /** A real sign-out. The token is revoked, so the profile goes too. */
  async function signOutFully(id) {
    if (id) forget(id);
    try { await sb.auth.signOut(); } catch (e) {}
  }

  /**
   * Supabase rotates the refresh token every time it is used, so the
   * copy saved in a profile goes stale as soon as the app refreshes a
   * session in the background. Without this the PIN appears to "expire"
   * after an hour or a page load. Listening keeps the stored copy current.
   */
  function keepFresh() {
    if (typeof sb === 'undefined' || !sb.auth || !sb.auth.onAuthStateChange) return;
    sb.auth.onAuthStateChange(function (event, session) {
      if (!session || !session.user) return;
      if (event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_IN') return;
      var all = load();
      var e = all.filter(function (p) { return p.id === session.user.id; })[0];
      if (!e) return;
      e.access_token  = session.access_token;
      e.refresh_token = session.refresh_token;
      e.last_used = Date.now();
      save(all);
    });
  }

  return {
    list: list, get: get, remember: remember, forget: forget, keepFresh: keepFresh,
    clearTokens: clearTokens, isLive: isLive,
    leave: leave, signOutFully: signOutFully,
    setPin: setPin, hasPin: hasPin, checkPin: checkPin,
    switchTo: switchTo, initials: initials, colour: colour,
    icon: function (role) { return ICONS[role] || '🎒'; },
    routes: ROUTES
  };
})();

// Start watching as soon as this file loads
try { Profiles.keepFresh(); } catch (e) {}

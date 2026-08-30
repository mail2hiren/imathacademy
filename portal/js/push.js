/* ============================================================
   iMathAcademy — Turning notifications on
   ------------------------------------------------------------
   Asked for once, on the teacher's own dashboard, with a reason
   given. A permission prompt that arrives unexplained gets refused,
   and a refusal is hard to undo.
   ============================================================ */

var Push = (function () {
  'use strict';

  // The public half of the VAPID pair. Safe in the browser by design.
  var VAPID_PUBLIC = window.IMATH_VAPID_PUBLIC || '';

  function urlB64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = window.atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
  }

  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function state() {
    if (!supported()) return 'unsupported';
    return Notification.permission;          // granted | denied | default
  }

  async function enable() {
    if (!supported()) throw new Error('This browser cannot show notifications');
    if (!VAPID_PUBLIC) throw new Error('Notifications are not configured yet');

    var perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notifications were not allowed');

    var reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    var sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC)
      });
    }

    var j = sub.toJSON();
    var me = (await sb.auth.getSession()).data.session.user.id;

    // .select() so a blocked write is not mistaken for success
    var res = await sb.from('push_subscriptions').upsert({
      user_id:  me,
      endpoint: j.endpoint,
      p256dh:   j.keys.p256dh,
      auth:     j.keys.auth,
      device:   navigator.userAgent.slice(0, 90),
      last_used: new Date().toISOString()
    }, { onConflict: 'endpoint' }).select();

    if (res.error) throw res.error;
    if (!res.data || !res.data.length) throw new Error('Could not save this device');
    return true;
  }

  async function disable() {
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      var sub = reg && await reg.pushManager.getSubscription();
      if (sub) {
        await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
    } catch (e) {}
  }

  /* A small strip on the dashboard, shown only while it is worth
     showing — never after it has been turned on or refused. */
  function offer(hostSelector) {
    if (state() !== 'default') return;
    var host = document.querySelector(hostSelector);
    if (!host) return;

    var box = document.createElement('div');
    box.style.cssText = 'background:#EAF2FF;border-radius:12px;padding:12px 14px;' +
      'margin-bottom:13px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;';
    box.innerHTML =
      '<div style="flex:1;min-width:190px;font-size:.84rem;color:#0D47A1;line-height:1.55;">' +
        '<strong>Hear about enquiries straight away</strong><br>' +
        'A parent who enquires in the evening reaches you the same evening.' +
      '</div>' +
      '<button id="pushOn" style="padding:10px 16px;border:none;border-radius:10px;' +
        'background:#1565C0;color:#fff;font-family:inherit;font-weight:800;cursor:pointer;">' +
        'Turn on</button>' +
      '<button id="pushNo" style="padding:10px 14px;border:none;border-radius:10px;' +
        'background:none;color:#5a6b85;font-family:inherit;font-weight:800;cursor:pointer;">' +
        'Not now</button>';
    host.parentNode.insertBefore(box, host);

    document.getElementById('pushOn').onclick = async function () {
      try { await enable(); box.innerHTML =
        '<div style="font-size:.84rem;font-weight:800;color:#1B5E20;">' +
        'Done — you will hear about new enquiries on this device.</div>'; }
      catch (e) { box.innerHTML =
        '<div style="font-size:.84rem;color:#B71C1C;">' + e.message + '</div>'; }
    };
    document.getElementById('pushNo').onclick = function () { box.remove(); };
  }

  return { supported: supported, state: state, enable: enable, disable: disable, offer: offer };
})();

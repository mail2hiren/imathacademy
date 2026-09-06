/* ============================================================
   iMathAcademy — Does this child have access?
   ------------------------------------------------------------
   The check was written separately into each page, and three
   pages never got one — the dashboard, homework and vedic. So a
   child whose subscription had ended could still sign in, land on
   their dashboard and look around, only hitting a wall when they
   opened practice.

   Megha saw them as expired in her list and saw them using the
   app, and both were true.

   One check, in one place, used by every page.
   ============================================================ */

var Access = (function () {
  'use strict';

  var cached = null;

  /** What access this child has. Never throws — a fault must not
      lock a paying family out. */
  async function status(userId) {
    if (cached && cached.userId === userId) return cached;
    try {
      var res = await sb.from('subscriptions')
        .select('id, plan, status, expires_at')
        .eq('student_id', userId)
        .order('expires_at', { ascending: false })
        .limit(5);

      var now = new Date();
      var live = (res.data || []).filter(function (s) {
        return s.status === 'active' && s.expires_at && new Date(s.expires_at) > now;
      })[0];

      var latest = (res.data || [])[0];
      cached = {
        userId: userId,
        ok: !!live,
        plan: live ? live.plan : (latest ? latest.plan : null),
        endsOn: live ? new Date(live.expires_at)
                     : (latest && latest.expires_at ? new Date(latest.expires_at) : null),
        daysLeft: live
          ? Math.ceil((new Date(live.expires_at) - now) / 86400000)
          : null,
        neverHad: !(res.data || []).length
      };
      return cached;
    } catch (e) {
      /* If the check itself fails, let them in. Locking out a family
         who has paid, because of a network blip, is the worse
         mistake of the two. */
      console.warn('Could not check access:', e.message);
      return { userId: userId, ok: true, unknown: true };
    }
  }

  /** For a page that cannot work without a subscription. */
  async function require(userId) {
    var s = await status(userId);
    if (!s.ok) {
      window.location.href = 'subscription.html';
      return false;
    }
    return true;
  }

  /* A child who is about to lose access should be told before they
     lose it, not after. Shown on the dashboard rather than on the
     page they were trying to use. */
  function notice(s, hostSelector) {
    if (!s || s.unknown) return;
    var host = document.querySelector(hostSelector);
    if (!host) return;

    var box = document.createElement('div');

    if (!s.ok) {
      box.style.cssText = 'background:#FFEBEE;border-left:4px solid #C62828;border-radius:12px;' +
        'padding:14px 16px;margin-bottom:14px;';
      box.innerHTML =
        '<div style="font-size:.95rem;font-weight:900;color:#B71C1C;">' +
          (s.neverHad ? 'Your subscription has not started yet'
                      : 'Your subscription has ended') + '</div>' +
        '<div style="font-size:.85rem;color:#8a1c17;margin-top:5px;line-height:1.6;">' +
          'Practice, worksheets and the weekly challenge are paused until it is renewed. ' +
          'Your progress and stickers are all safe.</div>' +
        '<a href="subscription.html" style="display:inline-block;margin-top:11px;' +
          'padding:11px 18px;border-radius:11px;background:#C62828;color:#fff;' +
          'text-decoration:none;font-weight:900;font-size:.88rem;">Renew now</a>';
    } else if (s.daysLeft !== null && s.daysLeft <= 7) {
      box.style.cssText = 'background:#FFF4E5;border-left:4px solid #E65100;border-radius:12px;' +
        'padding:13px 15px;margin-bottom:14px;';
      box.innerHTML =
        '<div style="font-size:.9rem;font-weight:900;color:#8a4b00;">' +
          'Your subscription ends in ' + s.daysLeft + ' day' + (s.daysLeft === 1 ? '' : 's') +
        '</div>' +
        '<a href="subscription.html" style="font-size:.83rem;color:#8a4b00;font-weight:800;">' +
          'Renew to keep going &rarr;</a>';
    } else return;

    host.parentNode.insertBefore(box, host);
  }

  return { status: status, require: require, notice: notice };
})();

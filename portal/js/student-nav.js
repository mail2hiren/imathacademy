/* ============================================================
   iMathAcademy — Student navigation
   ------------------------------------------------------------
   The sidebar, defined once.

   Every student page used to hardcode its own copy. They drifted:
   nine pages had nine different sidebars, four of them omitted
   Worksheets entirely, four listed Progress twice, and one had
   no links at all. A child on the Practice page could not reach
   their worksheets.

   This script rewrites the <nav> on whatever page it loads on,
   so all pages are identical by construction. To change the
   navigation, edit STUDENT_NAV below. Nothing else.
   ============================================================ */

var STUDENT_NAV = [
  { section: 'Overview' },
  { href: 'dashboard.html',    icon: '🏠', label: 'Dashboard' },

  { section: 'Learning' },
  { href: 'lessons.html',      icon: '▶️', label: 'Lessons' },
  { href: '../../abacus.html', icon: '🧮', label: 'Abacus' },
  { href: 'practice.html',     icon: '⚡', label: 'Practice' },
  { href: 'worksheets.html',   icon: '📋', label: 'Worksheets' },
  { href: 'weekly-quiz.html',  icon: '⭐', label: 'Weekly Challenge' },

  { section: 'My stuff' },
  { href: 'progress.html',     icon: '📊', label: 'Progress' },

  { section: 'Account' },
  { href: 'subscription.html', icon: '💳', label: 'Subscription' }
];

// homework.html was a second view of the same worksheets. The name
// is retired; anyone landing there is treated as being on Worksheets
// so the correct item highlights.
var NAV_ALIASES = { 'homework.html': 'worksheets.html' };

function currentNavPage() {
  var file = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
  if (!file || file === '') file = 'dashboard.html';
  return NAV_ALIASES[file] || file;
}

function renderStudentNav() {
  var nav = document.querySelector('.sidebar nav');
  if (!nav) return;   // page has no sidebar — nothing to normalise

  var here = currentNavPage();

  nav.innerHTML = STUDENT_NAV.map(function (item) {
    if (item.section) {
      return '<div class="nav-sec">' + item.section + '</div>';
    }
    var target = item.href.split('/').pop().toLowerCase();
    var active = (target === here) ? ' active' : '';
    return '<a class="nav-item' + active + '" href="' + item.href + '">' +
             '<span class="nav-icon">' + item.icon + '</span> ' + item.label +
           '</a>';
  }).join('\n');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderStudentNav);
} else {
  renderStudentNav();
}


/* ── SIGNING OFF ──────────────────────────────────────────────
   The sidebar is on every student page and carries a sign-out
   button, but logout() only existed in student-init.js, which just
   the dashboard loads. On practice, worksheets and the weekly quiz
   the button threw and did nothing — a child had to walk back to
   the dashboard to get out.

   It lives here now, beside the sidebar that uses it. Any page
   defining its own still wins, so nothing is disturbed.

   Local scope only: a full signOut revokes the refresh token, and
   the saved PIN sign-in for everyone on this device with it.
   ─────────────────────────────────────────────────────────── */
if (typeof window.logout !== 'function') {
  window.logout = async function () {
    try {
      if (typeof Profiles !== 'undefined' && Profiles.leave) await Profiles.leave();
      else if (typeof sb !== 'undefined') await sb.auth.signOut({ scope: 'local' });
    } catch (e) {
      try { if (typeof sb !== 'undefined') await sb.auth.signOut({ scope: 'local' }); } catch (e2) {}
    }
    // Work out how deep this page sits so the redirect lands correctly
    var depth = location.pathname.indexOf('/portal/') > -1 ? '../../' : './';
    window.location.href = depth + 'login.html';
  };
}

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

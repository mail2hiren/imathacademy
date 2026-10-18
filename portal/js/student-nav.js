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

/* Items marked with a programme are shown only to a child who learns
   it. Vedic practice existed as a page with no link anywhere, so a
   Vedic child had no way to reach it at all; and a Vedic-only child was
   being offered the abacus and Abacus practice, which are no use to
   them. Anything unmarked is shown to everyone. */
/* ONE SET OF ITEMS, whichever subject the child is in.

   Listing "Abacus practice" and "Vedic practice" side by side was the
   bolted-on version: it works for two subjects and falls apart at four,
   and it left the child with no idea which subject the other screens —
   worksheets, tests, progress — were showing them.

   Now the subject is a MODE. Practice goes to whichever subject they
   are in, and a chip at the top of every page says which, and switches.
   A child in one subject never sees the chip at all.

   'byProgram' picks the page for the subject in hand. */
var STUDENT_NAV = [
  { section: 'Overview' },
  { href: 'dashboard.html',    icon: '🏠', label: 'Dashboard' },

  { section: 'Learning' },
  { href: 'lessons.html',      icon: '▶️', label: 'Lessons' },
  { href: '../../abacus.html', icon: '🧮', label: 'Abacus',  program: 'abacus' },
  { byProgram: { abacus: 'practice.html', vedic: 'vedic-practice.html' },
    icon: '⚡', label: 'Practice' },
  { href: 'worksheets.html',   icon: '📋', label: 'Worksheets' },
  { href: 'weekly-quiz.html',  icon: '⭐', label: 'Weekly Challenge' },
  { href: 'test.html',         icon: '📝', label: 'Level tests' },

  { section: 'My stuff' },
  { href: 'progress.html',     icon: '📊', label: 'Progress' },
  { href: 'certificates.html', icon: '🏆', label: 'Certificates' },

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

/* Which programmes this child learns. Read once and remembered for the
   session, so moving between pages does not re-ask. */
var NAV_PROGRAMS = null;

async function navPrograms() {
  if (NAV_PROGRAMS) return NAV_PROGRAMS;
  try {
    var cached = sessionStorage.getItem('imath_programs');
    if (cached) { NAV_PROGRAMS = JSON.parse(cached); return NAV_PROGRAMS; }
  } catch (e) {}
  try {
    var s = await sb.auth.getSession();
    if (!s.data.session) return null;
    var r = await sb.from('student_programs')
      .select('program_code, is_active').eq('student_id', s.data.session.user.id);
    if (r.error) throw r.error;
    var live = (r.data || []).filter(function (p) { return p.is_active !== false; })
                             .map(function (p) { return p.program_code; });
    /* A child with no programme recorded is an Abacus child: that is
       how every account began. Better than hiding the practice. */
    NAV_PROGRAMS = live.length ? live : ['abacus'];
    try { sessionStorage.setItem('imath_programs', JSON.stringify(NAV_PROGRAMS)); } catch (e) {}
    return NAV_PROGRAMS;
  } catch (e) {
    console.warn('Could not read the programmes for the sidebar:', e);
    return null;
  }
}

function renderStudentNav(programs) {
  var nav = document.querySelector('.sidebar nav');
  if (!nav) return;   // page has no sidebar — nothing to normalise

  var here = currentNavPage();

  /* Until the enrolment is known, everything is shown. A child seeing
     one item too many for a moment is better than a child missing the
     page they were going to. */
  var now = (typeof Programs !== 'undefined' && Programs.current) ? Programs.current() : 'abacus';

  nav.innerHTML = STUDENT_NAV.filter(function (item) {
    if (!item.program || !programs) return true;
    return programs.indexOf(item.program) > -1;
  }).map(function (item) {
    /* an item that points at a different page per subject */
    if (item.byProgram) {
      item = Object.assign({}, item, { href: item.byProgram[now] || item.byProgram.abacus });
    }
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

/* ── Which subject am I in? ──────────────────────────────────────
   A child doing two subjects had nothing on any screen telling them
   which one they were looking at: Practice always meant Abacus, and
   Worksheets showed both mixed together. This puts the answer at the
   top of every page, and makes it the way to change subject.

   A child doing ONE subject sees nothing — there is nothing to say. */
function renderProgramChip(programs) {
  if (!programs || programs.length < 2) return;
  if (typeof Programs === 'undefined') return;

  var now = Programs.current();
  var host = document.querySelector('.topbar') || document.querySelector('.bar') ||
             document.querySelector('header');
  if (!host) return;

  var tag = document.getElementById('programChip');
  if (!tag) {
    tag = document.createElement('div');
    tag.id = 'programChip';
    tag.style.cssText = 'margin-left:auto;display:flex;gap:6px;align-items:center;';
    host.appendChild(tag);
  }

  tag.innerHTML = programs.map(function (code) {
    var cfg = Programs.config(code);
    var on = code === now;
    return '<button type="button" onclick="switchProgram(\'' + code + '\')" ' +
      'aria-pressed="' + on + '" title="' + cfg.name + '" ' +
      'style="border:2px solid ' + (on ? cfg.colour : '#E6E9F0') + ';' +
        'background:' + (on ? cfg.soft : '#fff') + ';color:' + (on ? cfg.ink : '#8892A4') + ';' +
        'border-radius:999px;padding:6px 12px;font:800 .8rem Nunito,sans-serif;cursor:pointer;">' +
      cfg.icon + ' ' + cfg.name + '</button>';
  }).join('');
}

/* Changing subject reloads the page, so everything on it — sidebar,
   lists, levels — belongs to the new subject. Nothing is left over
   from the old one, which is how a mixed screen happened before. */
function switchProgram(code) {
  if (typeof Programs === 'undefined') return;
  if (Programs.current() === code) return;
  Programs.setCurrent(code);
  location.reload();
}

/* Drawn at once so the page never waits for the sidebar, then drawn
   again when the enrolment is known. */
function startStudentNav() {
  renderStudentNav(null);
  if (typeof sb === 'undefined') return;
  navPrograms().then(function (p) {
    if (!p) return;
    renderStudentNav(p);
    try { renderProgramChip(p); } catch (e) { console.warn(e); }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startStudentNav);
} else {
  startStudentNav();
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

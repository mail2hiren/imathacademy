/* ============================================================
   iMathAcademy — Which programme is a child working in?
   ------------------------------------------------------------
   A child may be doing Abacus, Vedic, or both at different
   levels. Megha's answers settled how this should feel:

     two cards on the dashboard, so they see where they stand in
     both; the same screens in a different colour rather than a
     separate-looking app; and one programme active at a time
     everywhere else.

   A child doing only Abacus should never see a switcher at all,
   which is why this returns what they are actually enrolled in
   rather than assuming both.
   ============================================================ */

var Programs = (function () {
  'use strict';

  var CONFIG = {
    abacus: {
      code: 'abacus', name: 'Abacus', icon: '\uD83E\uDDEE',
      colour: '#E67D21', soft: '#FFF4E8', ink: '#8a4b00',
      levels: 9, firstLevel: 0,
      home: 'dashboard.html'
    },
    vedic: {
      code: 'vedic', name: 'Vedic Maths', icon: '\u0950',
      colour: '#04949D', soft: '#E7F6F7', ink: '#04616a',
      levels: 8, firstLevel: 1,
      home: 'dashboard.html'
    }
  };

  var mine = null;          // what this child is enrolled in
  var active = null;        // which one they are working in now

  function config(code) { return CONFIG[code] || CONFIG.abacus; }

  /** Everything this child is enrolled in, with their level in each. */
  async function load(studentId) {
    if (mine) return mine;
    try {
      var res = await sb.from('student_programs')
        .select('program_code, current_level, is_active, started_on')
        .eq('student_id', studentId).eq('is_active', true)
        .order('started_on');
      mine = (res.data || []).map(function (r) {
        return {
          code: r.program_code,
          level: r.current_level,
          since: r.started_on,
          cfg: config(r.program_code)
        };
      });
    } catch (e) {
      /* A FAILED read is not an answer. Caching the Abacus fallback
         here meant one hiccup — or this running before the database
         client exists — left a child looking Abacus-only for the rest
         of the page, with their Vedic work invisible and no error to
         show for it. Return the fallback, but do not remember it, so
         the next call tries again. */
      console.warn('Could not read programmes:', e.message);
      mine = null;
      return [{ code: 'abacus', level: 0, since: null, cfg: CONFIG.abacus }];
    }

    /* A child with no row at all is doing Abacus — that is what
       every child was before Vedic existed, and showing them
       nothing would be worse than assuming. */
    if (!mine.length) {
      mine = [{ code: 'abacus', level: 0, since: null, cfg: CONFIG.abacus }];
    }
    return mine;
  }

  /** The one they are working in. Remembered between visits. */
  function current() {
    if (active) return active;
    try {
      var saved = localStorage.getItem('imath_program');
      if (saved && CONFIG[saved]) { active = saved; return active; }
    } catch (e) {}
    active = (mine && mine[0]) ? mine[0].code : 'abacus';
    return active;
  }

  function setCurrent(code) {
    if (!CONFIG[code]) return;
    active = code;
    try { localStorage.setItem('imath_program', code); } catch (e) {}
  }

  /** Their level in a given programme. */
  function levelIn(code) {
    var row = (mine || []).filter(function (p) { return p.code === code; })[0];
    return row ? row.level : null;
  }

  function doingBoth() { return (mine || []).length > 1; }

  /* ── the two cards ──────────────────────────────────────────
     Only drawn for what they are enrolled in, so a child doing
     one programme sees one card and no switcher anywhere.
     ─────────────────────────────────────────────────────────── */
  function cardsHtml(waiting) {
    var w = waiting || {};
    return (mine || []).map(function (p) {
      var c = p.cfg;
      var total = c.levels;
      var done = Math.max(0, p.level - c.firstLevel);
      var dots = '';
      for (var i = 0; i < total; i++) {
        dots += '<i style="display:inline-block;width:7px;height:7px;border-radius:50%;' +
                'margin-right:4px;background:' +
                (i < done ? c.colour : i === done ? c.colour : '#DDE3EE') +
                (i === done ? ';box-shadow:0 0 0 3px ' + c.soft : '') + '"></i>';
      }
      var note = w[p.code] || '';
      var isNow = current() === p.code;

      /* A card is a door into that subject. The one they are in says
         so; the other invites them in. A child should never have to
         work out which world they are looking at. */
      return '<div onclick="Programs.enter(\'' + p.code + '\')" role="button" tabindex="0" ' +
        'onkeydown="if(event.key===\'Enter\'||event.key===\' \')Programs.enter(\'' + p.code + '\')" ' +
        'style="background:' + (isNow ? c.soft : '#fff') + ';border:2px solid ' +
          (isNow ? c.colour : '#E6E9F0') + ';' +
        'border-radius:16px;padding:15px 17px;margin-bottom:11px;cursor:pointer;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span style="font-size:1.4rem;">' + c.icon + '</span>' +
          '<span style="font-size:1.02rem;font-weight:900;">' + c.name + '</span>' +
          '<span style="margin-left:auto;font-size:.86rem;font-weight:900;color:' +
            c.colour + ';">Level ' + p.level + '</span>' +
        '</div>' +
        '<div style="margin-top:10px;">' + dots + '</div>' +
        (note ? '<div style="font-size:.82rem;color:#4A5160;margin-top:8px;">' +
                note + '</div>' : '') +
        '<div style="font-size:.78rem;font-weight:800;margin-top:9px;color:' +
          (isNow ? c.ink : c.colour) + ';">' +
          (isNow ? 'You are here' : 'Go to ' + c.name + ' \u2192') + '</div>' +
      '</div>';
    }).join('');
  }

  /** Tapping a card sets the programme and opens its screens. */
  /* Entering a subject means the SAME dashboard, in that subject's
     colour — not a different-looking app. Vedic used to go to its own
     hub while Abacus went to the dashboard, so the two worlds did not
     match and a child crossing between them had to learn two layouts.

     Megha's own answer: "the same screens in a different colour". */
  function enter(code) {
    setCurrent(code);
    window.location.href = 'dashboard.html';
  }

  /* A small chip for the header of every other screen, so a child
     always knows which programme they are in. Only shown when they
     are doing both. */
  function chipHtml() {
    if (!doingBoth()) return '';
    var c = config(current());
    return '<button onclick="Programs.toggle()" ' +
      'style="background:' + c.soft + ';color:' + c.ink + ';border:none;' +
      'border-radius:20px;padding:6px 13px;font-family:inherit;font-size:.78rem;' +
      'font-weight:900;cursor:pointer;">' + c.icon + ' ' + c.name + '</button>';
  }

  function toggle() {
    var codes = (mine || []).map(function (p) { return p.code; });
    if (codes.length < 2) return;
    var i = codes.indexOf(current());
    enter(codes[(i + 1) % codes.length]);
  }

  /** Paint the page in the current programme's colour. */
  function applyTheme() {
    var c = config(current());
    var r = document.documentElement;
    r.style.setProperty('--program', c.colour);
    r.style.setProperty('--program-soft', c.soft);
    r.style.setProperty('--program-ink', c.ink);
  }

  return {
    CONFIG: CONFIG, config: config, load: load,
    current: current, setCurrent: setCurrent, levelIn: levelIn,
    doingBoth: doingBoth, cardsHtml: cardsHtml, chipHtml: chipHtml,
    enter: enter, toggle: toggle, applyTheme: applyTheme,
    all: function () { return mine || []; }
  };
})();

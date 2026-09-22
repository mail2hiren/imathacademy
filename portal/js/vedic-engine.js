/* ============================================================
   iMathAcademy — The Vedic engine
   ------------------------------------------------------------
   Assembles a page for a level from Megha's approved 41-method
   curriculum. The levels and their scope live in sutra-rules.js,
   so this file holds only the level descriptions and the
   assembling.
   ============================================================ */

var VedicEngine = (function (S, G) {
  'use strict';

  var LEVELS = {
    1: { name: 'Foundation', months: 2,
         focus: 'Complements, doubling, and confident addition',
         outcome: 'Take any number from 100 or 1000. Add and subtract two-digit numbers three ways. Double anything.' },
    2: { name: 'Building up', months: 2,
         focus: 'Bigger bases, first multiplication, and checking your work',
         outcome: 'Subtract from 10000. Multiply by 11 and by a single digit. Check an answer with digit sums.' },
    3: { name: 'Multiplication and first division', months: 2,
         focus: 'Crosswise multiplication, the first special squares, and sharing out',
         outcome: 'Multiply any two two-digit numbers. Square anything ending in 5. Divide by 2, 5 and 10.' },
    4: { name: 'Base methods', months: 2,
         focus: 'Multiplying near a base, three-digit work, and more division',
         outcome: 'Multiply two numbers near 100. Square a three-digit number ending in 5. Divide by 3, 4 and 6.' },
    5: { name: 'Squares, cubes and harder division', months: 2,
         focus: 'Squaring anything, cubing, and the nines',
         outcome: 'Square any two-digit number. Cube a single digit. Multiply by 9 and 99. Divide by 7 and 8.' },
    6: { name: 'Bigger numbers', months: 2,
         focus: 'Three-digit squares and cubes, larger bases, divisibility',
         outcome: 'Square and cube three-digit numbers. Multiply by 12 to 19. Test divisibility by 4, 8 and 9.' },
    7: { name: 'Four digits and percentages', months: 2,
         focus: 'Four-digit squares, three-digit cubes, and percentages',
         outcome: 'Square a four-digit number. Cube three digits. Find simple percentages in your head.' },
    8: { name: 'Roots and percentage change', months: 2,
         focus: 'Square and cube roots, the harder divisibility tests, and percentage change',
         outcome: 'Find any square or cube root. Test divisibility by 7, 13 and 19. Handle percentage increase and decrease.' }
  };

  /* ── Reading the course map ─────────────────────────────────
     Megha's Vedic course map is saved to the curriculum. Before a
     worksheet is built the engine reads it, so a method she switches on
     or off at a level is on or off in the very next sheet. Read for a
     few seconds at most, like the Abacus rules.

     If the curriculum holds nothing for Vedic, the engine uses its
     built-in plan — which is her approved plan — and says so. */
  var syncedAt = 0, SYNC_MS = 5000, lastSync = { source: 'built-in', rows: 0 };

  async function sync(sb, force) {
    if (!sb) return lastSync;
    if (!force && Date.now() - syncedAt < SYNC_MS) return lastSync;
    try {
      var r = await sb.from('curriculum_level_concepts')
        .select('level_code, status, curriculum_concepts(concept_code)')
        .eq('program_code', 'vedic');
      if (r.error) throw r.error;
      var map = {}, st = {}, n = 0;
      (r.data || []).forEach(function (row) {
        var code = row.curriculum_concepts && row.curriculum_concepts.concept_code;
        if (!code || !S.METHODS[code]) return;          // not a method the engine knows
        if (!row.status || row.status === 'N') return;
        var L = parseInt(String(row.level_code).replace(/^L/, ''), 10);
        (map[L] = map[L] || []).push(code);
        st[L + ':' + code] = row.status;
        n++;
      });
      if (n) { S.setLevelMap(map, st); lastSync = { source: 'curriculum', rows: n }; }
      else   { S.setLevelMap(null);    lastSync = { source: 'built-in', rows: 0 }; }
    } catch (e) {
      /* A failed read is said, not hidden: the built-in plan is used and
         the caller can tell the teacher. */
      S.setLevelMap(null);
      lastSync = { source: 'built-in', rows: 0, error: e.message || String(e) };
    }
    syncedAt = Date.now();
    return lastSync;
  }
  function forget() { syncedAt = 0; }

  /** What this level introduces, and what it carries on. */
  function breakdown(level) {
    var here = S.methodsAt(level);
    var intro = [], carried = [];
    here.forEach(function (k) {
      /* Her status decides where the curriculum says; otherwise a
         method is new at the first level that teaches it. */
      var st = S.statusAt ? S.statusAt(k, level) : null;
      var isNew;
      if (st) isNew = st === 'I';
      else {
        var first = null;
        for (var L = 1; L <= 8; L++) if (S.taughtAt ? S.taughtAt(k, L) : S.METHODS[k].levels[L]) { first = L; break; }
        isNew = first === level;
      }
      (isNew ? intro : carried).push(k);
    });
    return { intro: intro, carried: carried };
  }

  function buildPage(level, opts) {
    var o = opts || {};
    var cfg = LEVELS[level];
    if (!cfg) return { error: 'No such level: ' + level };

    var res = G.page(level, o.count || 10, o);
    if (res.error) return res;

    /* Nothing is served that fails its own method. */
    var bad = G.audit(res.questions, level);
    if (bad.length) {
      console.error('Vedic page failed its audit:', bad);
      return { error: 'The questions did not pass their own check' };
    }

    res.levelName = cfg.name;
    res.focus = cfg.focus;
    return res;
  }

  /* The which-method exercise: a sum that exactly one of the
     level's methods suits, so the question has one right answer. */
  function whichMethodPage(level, opts) {
    var o = opts || {};
    var count = o.count || 10;
    var keys = S.readyAt(level).filter(function (k) {
      return S.METHODS[k].shape === 'multiplication';
    });
    if (keys.length < 2) {
      return { error: 'Level ' + level + ' does not teach enough multiplication methods for this' };
    }
    var out = [], guard = 0;
    while (out.length < count && guard < count * 40) {
      guard++;
      var key = keys[out.length % keys.length];
      var q = G.one(key, level, o);
      if (!q) continue;
      var fits = keys.filter(function (k) { return S.isAllowed(k, q.a, q.b, level); })
                     .filter(function (k) { return k !== 'urdhva'; });
      if (fits.length !== 1 || fits[0] !== key) continue;
      out.push({
        method: key, level: level, a: q.a, b: q.b,
        text: q.text, prompt: 'Which method fits this sum?',
        answer: S.METHODS[key].label,
        choices: keys.map(function (k) { return S.METHODS[k].label; }),
        realAnswer: q.answer
      });
    }
    return out.length ? { level: level, questions: out }
                      : { error: 'Could not build unambiguous sums for this level' };
  }

  function auditPage(page, level) {
    return G.audit((page && page.questions) || [], level);
  }

  return {
    LEVELS: LEVELS, breakdown: breakdown, sync: sync, forget: forget,
    source: function () { return lastSync; },
    buildPage: buildPage, whichMethodPage: whichMethodPage, auditPage: auditPage,
    methodsAt: S.methodsAt, readyAt: S.readyAt, notReady: S.notReady
  };
})(typeof Sutras !== 'undefined' ? Sutras : require('./sutra-rules.js'),
   typeof VedicGen !== 'undefined' ? VedicGen : require('./vedic-gen.js'));

if (typeof module !== 'undefined') module.exports = VedicEngine;

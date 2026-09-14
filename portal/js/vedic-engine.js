/* ============================================================
   iMathAcademy — The Vedic engine
   ------------------------------------------------------------
   Assembles a practice session or a worksheet page for a level,
   the way practice-engine.js does for the abacus.

   Two differences worth knowing:

   A Vedic level is defined by WHICH METHODS it teaches, not by a
   number range. So the level table below lists methods, and the
   numbers follow from what each method suits.

   And a method available at a level is not only the ones
   introduced there — everything taught earlier stays available,
   which is the same rule the abacus engine needed after Megha
   pointed out that four-digit addition uses formulas mastered
   three levels back.
   ============================================================ */

var VedicEngine = (function (S, G, T) {
  'use strict';

  /* ── the eight levels, from Megha's reviewed syllabus ──────── */
  var LEVELS = {
    1: { name: 'Foundation', months: 2,
         introduces: ['allFromNine', 'complement', 'doubling', 'halving',
                      'splitMerge', 'stacking'],
         opts: { maxBase: 1000, minBase: 100, digits: 2, easy: true } },

    2: { name: 'Number work', months: 2,
         introduces: ['byEleven', 'urdhva', 'digitSum'],
         opts: { maxBase: 100000, minBase: 100, digits: 3,
                 digitsA: 2, digitsB: 1 } },

    3: { name: 'Multiplication I', months: 2,
         introduces: ['ekadhikena', 'antyayor'],
         opts: { digitsA: 2, digitsB: 2, whichMethod: true } },

    4: { name: 'Base multiplication', months: 2,
         introduces: ['nikhilamMult', 'workingBase'],
         opts: { maxBase: 1000, tolerance: 12, aboveToo: true } },

    5: { name: 'Squares and cubes', months: 2,
         introduces: ['duplex', 'yavadunam', 'cubing'],
         opts: { digitsA: 3, digitsB: 3, maxCube: 30, tolerance: 12 } },

    6: { name: 'Division', months: 2,
         introduces: ['nikhilamDiv', 'paravartya', 'dhwajanka'],
         opts: { tolerance: 12, maxQuotient: 99, maxDivisor: 89 } },

    7: { name: 'Roots', months: 2,
         introduces: ['squareRoot', 'cubeRoot'],
         opts: { maxRoot: 99 } },

    /* Level 8 is recurring decimals, equations and recognising
       symmetry. Those are not number-pair generation and need their
       own handling, so nothing is generated here yet rather than
       something wrong being produced. */
    8: { name: 'Fractions and algebra', months: 2,
         introduces: [], notYetGenerated: true,
         opts: {} }
  };

  /** Everything taught at this level or any before it. */
  function methodsUpTo(level) {
    var out = [];
    for (var L = 1; L <= level; L++) {
      var cfg = LEVELS[L];
      if (!cfg) continue;
      cfg.introduces.forEach(function (k) {
        if (out.indexOf(k) < 0) out.push(k);
      });
    }
    return out;
  }

  /** The options for a level, merged with anything the teacher chose. */
  function optsFor(level, extra) {
    var cfg = LEVELS[level] || {};
    return Object.assign({}, cfg.opts || {}, extra || {});
  }

  /* When several methods fit one sum, this is the order of
     preference — the quickest first. Needed for the "which method?"
     exercise, where an ambiguous sum has no single right answer. */
  var PREFERENCE = ['ekadhikena', 'antyayor', 'yavadunam', 'nikhilamMult',
                    'workingBase', 'duplex', 'byEleven', 'urdhva'];

  function bestMethodFor(a, b, available, opts) {
    var fit = S.methodsFor(a, b, available, opts || {});
    for (var i = 0; i < PREFERENCE.length; i++) {
      if (fit.indexOf(PREFERENCE[i]) > -1) return PREFERENCE[i];
    }
    return fit[0] || null;
  }

  /** A sum that only ONE method fits, for the which-method exercise. */
  /* Several methods often fit one sum — 95 × 95 suits four of them.
     Demanding that exactly one fits found almost nothing. What
     matters is that the method being asked about is the BEST one for
     that sum, which is a fair question with one right answer. */
  function unambiguous(methodKey, available, opts, tries) {
    for (var t = 0; t < (tries || 80); t++) {
      var q = G.one(methodKey, opts);
      if (!q) continue;
      if (bestMethodFor(q.a, q.b, available, opts) === methodKey) return q;
    }
    return null;
  }

  /* ── a page of practice ─────────────────────────────────────
     Guided for the first few of each method, per Megha's rule,
     then answer-only.
     ─────────────────────────────────────────────────────────── */
  function buildPage(level, o) {
    var opts  = optsFor(level, o);
    var count = (o && o.count) || 10;       // she chose 10, not 20
    var cfg   = LEVELS[level];

    if (!cfg) return { error: 'No such level: ' + level };
    if (cfg.notYetGenerated) {
      return { error: 'Level ' + level + ' (' + cfg.name + ') is not generated yet \u2014 ' +
                      'recurring decimals and equations need their own handling.' };
    }

    // The focus is what this level introduces; earlier methods are
    // revision and appear less often.
    var focus    = (o && o.methods) ? [].concat(o.methods) : cfg.introduces;
    var earlier  = methodsUpTo(level - 1);
    var available = methodsUpTo(level);

    var out = [], seenPerMethod = {}, seen = {}, guard = 0;

    while (out.length < count && guard < count * 40) {
      guard++;
      var through = out.length / count;

      // mostly the new methods, with some revision woven in
      var useEarlier = earlier.length && Math.random() < 0.2 && through > 0.3;
      var pool = useEarlier ? earlier : focus;
      var key  = pool[out.length % pool.length];

      var step = Object.assign({}, opts, {
        tolerance: Math.max(3, Math.round((opts.tolerance || 12) * (0.4 + 0.6 * through))),
        aboveToo:  through > 0.5 ? opts.aboveToo : false
      });

      var q = G.one(key, step);
      if (!q) continue;
      if (seen[q.text]) continue;
      seen[q.text] = true;

      seenPerMethod[key] = (seenPerMethod[key] || 0) + 1;

      /* Guided for the first few of each method, then not. This is
         Megha's instruction, close to word for word. */
      if (T.shouldGuide(seenPerMethod[key] - 1, o)) {
        q.steps = T.forSum(q);
        q.guided = !!q.steps;
      } else {
        q.guided = false;
        q.workingShown = T.forSum(q);   // revealed after they answer
      }

      /* Whether to name the method. Her answer was "told at first,
         then not" — but that has to mean told while it is still being
         learnt, not merely in the first half of a page. A Level 1
         child met halving two minutes ago; asking them to identify it
         is asking the wrong question. */
      q.tellMethod = q.guided || level <= 2 || through < 0.4;

      out.push(q);
    }

    if (!out.length) {
      return { error: 'Could not build anything for Level ' + level +
                      '. The methods may not suit the settings given.' };
    }

    return {
      level: level,
      levelName: cfg.name,
      questions: out,
      methods: focus,
      available: available
    };
  }

  /* ── the which-method exercise ──────────────────────────────
     Her Level 3 makes choosing a method a skill of its own. Each
     question is a sum that exactly one method suits, and the child
     names it rather than working it.
     ─────────────────────────────────────────────────────────── */
  function whichMethodPage(level, o) {
    var opts = optsFor(level, o);
    var count = (o && o.count) || 10;
    var available = methodsUpTo(level).filter(function (k) {
      return S.METHODS[k].shape === 'multiplication';
    });
    if (available.length < 2) {
      return { error: 'Level ' + level + ' does not teach enough methods yet for this.' };
    }

    var out = [], guard = 0;
    while (out.length < count && guard < count * 30) {
      guard++;
      var key = available[out.length % available.length];
      var q = unambiguous(key, available, opts);
      if (!q) continue;
      out.push({
        method: key,
        text: q.text,
        prompt: 'Which method fits this sum?',
        answer: S.METHODS[key].label,
        choices: available.map(function (k) { return S.METHODS[k].label; }),
        realAnswer: q.answer
      });
    }
    return out.length ? { level: level, questions: out }
                      : { error: 'Could not build unambiguous sums for this level.' };
  }

  /* ── THE LAST GATE, over a whole page ───────────────────────
     Checks every question against its own method before anything
     is served. The abacus engine's silent failures were all things
     that got past a check like this.
     ─────────────────────────────────────────────────────────── */
  function auditPage(page, level) {
    if (!page || !page.questions) return ['nothing to check'];
    var opts = optsFor(level, {});
    var problems = [];
    page.questions.forEach(function (q, i) {
      if (!S.isAllowed(q.method, q.a, q.b, opts)) {
        problems.push('Q' + (i + 1) + ': ' + q.text + ' does not suit ' + q.label);
      }
      var m = S.METHODS[q.method];
      var expected = m.answer(q.a, q.b);
      var want = (typeof expected === 'object')
        ? (expected.r ? expected.q + ' r ' + expected.r : String(expected.q))
        : String(expected);
      if (String(q.answer) !== want) {
        problems.push('Q' + (i + 1) + ': ' + q.text + ' answer says ' + q.answer + ', should be ' + want);
      }
      if (q.steps && q.steps.length) {
        var last = String(q.steps[q.steps.length - 1].answer);
        var raw = (typeof q.raw === 'object') ? String(q.raw.r) : String(q.raw);
        if (last !== raw) {
          problems.push('Q' + (i + 1) + ': the last guided step does not reach the answer');
        }
      }
    });
    return problems;
  }

  return {
    LEVELS: LEVELS,
    methodsUpTo: methodsUpTo,
    optsFor: optsFor,
    buildPage: buildPage,
    whichMethodPage: whichMethodPage,
    bestMethodFor: bestMethodFor,
    auditPage: auditPage
  };
})(typeof Sutras !== 'undefined' ? Sutras : require('./sutra-rules.js'),
   typeof VedicGen !== 'undefined' ? VedicGen : require('./vedic-gen.js'),
   typeof VedicSteps !== 'undefined' ? VedicSteps : require('./vedic-steps.js'));

if (typeof module !== 'undefined') module.exports = VedicEngine;

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

  /** What this level introduces, and what it carries on. */
  function breakdown(level) {
    var here = S.methodsAt(level);
    var intro = [], carried = [];
    here.forEach(function (k) {
      var lv = Object.keys(S.METHODS[k].levels).map(Number);
      (Math.min.apply(null, lv) === level ? intro : carried).push(k);
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

    /* The working. Without this every question went out bare, so
       the teacher's preview had nothing to show and a child was never
       walked through a method — the thing Megha asked for most.

       Megha's rule: guided for the first few of each METHOD, then
       answer only with the working revealed afterwards. */
    var seenPer = {};
    var upto = o.guideFirst || 3;
    res.questions.forEach(function (q) {
      var st = (typeof VedicSteps !== 'undefined') ? VedicSteps.forSum(q) : null;
      seenPer[q.method] = (seenPer[q.method] || 0) + 1;
      q.guided = !!st && seenPer[q.method] <= upto;
      q.steps = q.guided ? st : null;
      q.workingShown = q.guided ? null : st;     // revealed after answering
      q.tellMethod = q.guided || level <= 2;
    });

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
    LEVELS: LEVELS, breakdown: breakdown,
    buildPage: buildPage, whichMethodPage: whichMethodPage, auditPage: auditPage,
    methodsAt: S.methodsAt, readyAt: S.readyAt, notReady: S.notReady
  };
})(typeof Sutras !== 'undefined' ? Sutras : require('./sutra-rules.js'),
   typeof VedicGen !== 'undefined' ? VedicGen : require('./vedic-gen.js'));

if (typeof module !== 'undefined') module.exports = VedicEngine;

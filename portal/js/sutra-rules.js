/* ============================================================
   iMathAcademy — When does a Vedic method apply?
   ------------------------------------------------------------
   This is the Vedic counterpart of bead-rules.js, and it answers
   the one question the whole engine rests on: given a sum, does
   this method actually help?

   It matters more here than it did for the abacus. Abacus is one
   method applied to bigger numbers, so a level is a number range.
   Vedic is many methods, each suited to a particular SHAPE of
   number. Nikhilam is wonderful for 97 x 96 and no use at all for
   23 x 41 — so a page of Nikhilam practice full of sums like the
   second teaches a child the wrong instinct.

   Every rule below was written against Megha's own "works well"
   and "should not be used" examples, and the tests check them.
   ============================================================ */

var Sutras = (function () {
  'use strict';

  /* ── helpers ────────────────────────────────────────────── */

  function digits(n) { return String(Math.abs(n)).length; }

  /** The nearest power of ten at or above n: 100 for 97, 1000 for 988. */
  function baseFor(n) {
    return Math.pow(10, digits(n));
  }

  /** How far n is from its natural base. Negative means below. */
  function deviation(n) {
    var b = baseFor(n);
    var below = n - b;                 // e.g. 97 - 100 = -3
    var lower = Math.pow(10, digits(n) - 1);
    var above = n - lower;             // e.g. 104 - 100 = 4
    return Math.abs(below) <= Math.abs(above)
      ? { base: b, dev: below }
      : { base: lower, dev: above };
  }

  /** Convenient working bases — 50, 200, 250, 500 and so on. */
  var WORKING_BASES = [20, 30, 40, 50, 60, 200, 250, 300, 500, 2000, 5000];

  function nearestWorkingBase(n) {
    var best = null;
    WORKING_BASES.forEach(function (b) {
      var d = Math.abs(n - b);
      if (!best || d < best.d) best = { base: b, d: d, dev: n - b };
    });
    return best;
  }

  function digitSum(n) {
    var s = String(Math.abs(n)).split('').reduce(function (a, c) {
      return a + Number(c);
    }, 0);
    return s > 9 ? digitSum(s) : s;
  }

  function isPerfectSquare(n) {
    if (n < 0) return false;
    var r = Math.round(Math.sqrt(n));
    return r * r === n;
  }

  function isPerfectCube(n) {
    if (n < 0) return false;
    var r = Math.round(Math.cbrt(n));
    return r * r * r === n;
  }

  /* ── the methods ────────────────────────────────────────────
     Each returns true only when the method genuinely helps.
     `tolerance` is how far from a base still counts as "near" —
     Megha's guardrail says about 12.
     ─────────────────────────────────────────────────────────── */

  var TOLERANCE = 12;

  var METHODS = {

    /* Level 1 & 2 — all from 9, last from 10.
       Subtracting from a base or a multiple of one. */
    allFromNine: {
      label: 'All from 9, last from 10',
      shape: 'subtraction',
      applies: function (a, b, opts) {
        // a must be a base or a clean multiple of one: 100, 300, 1000, 2000
        if (b >= a || b <= 0) return false;
        var maxBase = (opts && opts.maxBase) || 1000;
        var minBase = (opts && opts.minBase) || 100;
        for (var p = minBase; p <= maxBase; p *= 10) {
          if (a % p === 0) {
            var mult = a / p;
            // 100, 200 ... 900 are fine; 150 is not a base
            if (mult >= 1 && mult <= 9) return true;
          }
        }
        return false;
      },
      answer: function (a, b) { return a - b; },
      text: function (a, b) { return a + ' \u2212 ' + b; }
    },

    /* Level 1 — complements. What a number needs to reach a base. */
    complement: {
      label: 'Friends / complement',
      shape: 'complement',
      applies: function (a, b) {
        // b is the base; a must be below it
        return b > a && a > 0 && (b === 10 || b === 100 || b === 1000);
      },
      answer: function (a, b) { return b - a; },
      text: function (a, b) { return a + ' \u2192 ' + b; }
    },

    /* Level 1 & 2 — doubling. */
    doubling: {
      label: 'Doubling',
      shape: 'single',
      applies: function (a) { return a > 0; },
      answer: function (a) { return a * 2; },
      text: function (a) { return 'double ' + a; }
    },

    halving: {
      label: 'Halving',
      shape: 'single',
      // Only even numbers — an odd one gives a half, which waits for decimals
      applies: function (a) { return a > 0 && a % 2 === 0; },
      answer: function (a) { return a / 2; },
      text: function (a) { return 'half of ' + a; }
    },

    /* Level 2 — multiplying by 11. */
    byEleven: {
      label: 'Add the neighbour',
      shape: 'multiplication',
      applies: function (a, b) { return b === 11 || a === 11; },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; }
    },

    /* Level 2 & 3 — straightforward crosswise multiplication.
       Always applies; the generator uses it when nothing special fits. */
    urdhva: {
      label: 'Vertically and crosswise',
      shape: 'multiplication',
      applies: function (a, b) { return a > 1 && b > 1; },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; }
    },

    /* Level 3 — squares of numbers ending in 5.
       BOTH conditions: ends in 5 AND squared. Megha's guardrail is
       explicit that 65 x 75 must never be generated for this. */
    ekadhikena: {
      label: 'One more than the one before',
      shape: 'multiplication',
      applies: function (a, b) {
        return a === b && a % 10 === 5 && a >= 15;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; }
    },

    /* Level 3 — same tens digit, units summing to 10. */
    antyayor: {
      label: 'Same first, friends after',
      shape: 'multiplication',
      applies: function (a, b) {
        if (digits(a) !== 2 || digits(b) !== 2) return false;
        var ta = Math.floor(a / 10), tb = Math.floor(b / 10);
        var ua = a % 10, ub = b % 10;
        return ta === tb && (ua + ub) === 10;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; }
    },

    /* Level 4 — the base method. Both numbers near a power of ten,
       below it, above it, or one of each. */
    nikhilamMult: {
      label: 'Base method',
      shape: 'multiplication',
      applies: function (a, b, opts) {
        var tol = (opts && opts.tolerance) || TOLERANCE;
        var da = deviation(a), db = deviation(b);
        // Both must be near the SAME base, or the cross step is wrong
        return da.base === db.base &&
               Math.abs(da.dev) <= tol && Math.abs(db.dev) <= tol &&
               da.dev !== 0 && db.dev !== 0;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; },
      detail: function (a, b) {
        var da = deviation(a), db = deviation(b);
        return { base: da.base, devA: da.dev, devB: db.dev };
      }
    },

    /* Level 4 — a working base such as 50 or 200. */
    workingBase: {
      label: 'Working base',
      shape: 'multiplication',
      applies: function (a, b, opts) {
        var tol = (opts && opts.tolerance) || 5;
        var wa = nearestWorkingBase(a), wb = nearestWorkingBase(b);
        if (!wa || !wb || wa.base !== wb.base) return false;
        // A power of ten is the plain base method, not this
        if (String(wa.base).match(/^10*$/)) return false;
        return Math.abs(wa.dev) <= tol && Math.abs(wb.dev) <= tol;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; }
    },

    /* Level 5 — squaring by duplex. Any number, but numbers ending
       in 5 belong to ekadhikena, so they are excluded here. */
    duplex: {
      label: 'Duplex',
      shape: 'multiplication',
      applies: function (a, b) {
        return a === b && a % 10 !== 5 && digits(a) === 2;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; }
    },

    /* Level 5 — squaring near a base. */
    yavadunam: {
      label: 'Whatever the deficiency',
      shape: 'multiplication',
      applies: function (a, b, opts) {
        if (a !== b) return false;
        var tol = (opts && opts.tolerance) || TOLERANCE;
        var d = deviation(a);
        return Math.abs(d.dev) <= tol && d.dev !== 0;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' \u00d7 ' + b; }
    },

    /* Level 5 — cubing. Megha's guardrail: below 30. */
    cubing: {
      label: 'Cubing',
      shape: 'single',
      applies: function (a, b, opts) {
        var max = (opts && opts.maxCube) || 30;
        return a >= 11 && a <= max;
      },
      answer: function (a) { return a * a * a; },
      text: function (a) { return a + '\u00b3'; }
    },

    /* Level 6 — dividing by a number just below a base. */
    nikhilamDiv: {
      label: 'Base division',
      shape: 'division',
      applies: function (a, b, opts) {
        var tol = (opts && opts.tolerance) || TOLERANCE;
        if (b <= 1 || b >= a) return false;
        var d = deviation(b);
        return d.dev < 0 && Math.abs(d.dev) <= tol;
      },
      answer: function (a, b) {
        return { q: Math.floor(a / b), r: a % b };
      },
      text: function (a, b) { return a + ' \u00f7 ' + b; }
    },

    /* Level 6 — dividing by a number just above a base. */
    paravartya: {
      label: 'Transpose and apply',
      shape: 'division',
      applies: function (a, b, opts) {
        var tol = (opts && opts.tolerance) || TOLERANCE;
        if (b <= 1 || b >= a) return false;
        var d = deviation(b);
        return d.dev > 0 && d.dev <= tol;
      },
      answer: function (a, b) { return { q: Math.floor(a / b), r: a % b }; },
      text: function (a, b) { return a + ' \u00f7 ' + b; }
    },

    /* Level 6 — straight division by a flag digit. Any divisor,
       but the ones near a base belong to the two methods above. */
    dhwajanka: {
      label: 'Straight division',
      shape: 'division',
      applies: function (a, b) {
        if (b <= 10 || b >= a) return false;
        var d = deviation(b);
        return Math.abs(d.dev) > TOLERANCE;   // not near a base
      },
      answer: function (a, b) { return { q: Math.floor(a / b), r: a % b }; },
      text: function (a, b) { return a + ' \u00f7 ' + b; }
    },

    /* Level 7 — roots, by inspection. Perfect only. */
    squareRoot: {
      label: 'Square root',
      shape: 'root',
      applies: function (a) { return isPerfectSquare(a) && a >= 100; },
      answer: function (a) { return Math.round(Math.sqrt(a)); },
      text: function (a) { return '\u221a' + a; }
    },

    cubeRoot: {
      label: 'Cube root',
      shape: 'root',
      applies: function (a) { return isPerfectCube(a) && a >= 1000; },
      answer: function (a) { return Math.round(Math.cbrt(a)); },
      text: function (a) { return '\u221b' + a; }
    },

    /* Level 2 — digit sum, used for checking. */
    digitSum: {
      label: 'Digit sum',
      shape: 'single',
      applies: function (a) { return a > 9; },
      answer: function (a) { return digitSum(a); },
      text: function (a) { return 'digit sum of ' + a; }
    },

    /* Level 1 — plain stacked addition. */
    stacking: {
      label: 'Stacking',
      shape: 'addition',
      applies: function (a, b) {
        return a > 0 && b > 0 && digits(a) <= 2 && digits(b) <= 2;
      },
      answer: function (a, b) { return a + b; },
      text: function (a, b) { return a + ' + ' + b; }
    },

    /* Level 1 — split and merge. Adding something near a ten. */
    splitMerge: {
      label: 'Split and merge',
      shape: 'addition',
      applies: function (a, b) {
        if (a <= 0 || b <= 0) return false;
        var off = b % 10;
        // within 3 of a ten, either side, per Megha's guardrail
        return (off >= 7 || (off <= 3 && off > 0)) && b > 5;
      },
      answer: function (a, b) { return a + b; },
      text: function (a, b) { return a + ' + ' + b; }
    }
  };

  /* ── THE LAST GATE ─────────────────────────────────────────
     Nothing reaches a child without passing here. The abacus
     engine's most valuable piece was exactly this check, and
     every silent failure we had was something that slipped past
     it. Same idea, different rules.
     ─────────────────────────────────────────────────────────── */
  function isAllowed(methodKey, a, b, opts) {
    var m = METHODS[methodKey];
    if (!m) return false;
    try { return !!m.applies(a, b, opts || {}); }
    catch (e) { return false; }
  }

  /** Which of a given set of methods fit this sum? Used for the
      "which method?" exercise and to catch overlaps. */
  function methodsFor(a, b, keys, opts) {
    return (keys || Object.keys(METHODS)).filter(function (k) {
      return isAllowed(k, a, b, opts);
    });
  }

  return {
    METHODS: METHODS,
    isAllowed: isAllowed,
    methodsFor: methodsFor,
    deviation: deviation,
    baseFor: baseFor,
    digitSum: digitSum,
    nearestWorkingBase: nearestWorkingBase,
    isPerfectSquare: isPerfectSquare,
    isPerfectCube: isPerfectCube
  };
})();

if (typeof module !== 'undefined') module.exports = Sutras;

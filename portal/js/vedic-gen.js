/* ============================================================
   iMathAcademy — Generating Vedic sums
   ------------------------------------------------------------
   The abacus generator builds a column of numbers that obeys the
   beads. This builds a PAIR of numbers that suits a chosen method,
   which is a different job: 97 x 96 rather than a column at all.

   Every sum is checked against Sutras.isAllowed before it is
   returned. The abacus engine's worst failures were all things
   that slipped past that gate, so here nothing is returned that
   has not passed it — and there is no silent fallback. If a legal
   sum cannot be built, this returns null and says so.
   ============================================================ */

var VedicGen = (function (S) {
  'use strict';

  function randInt(lo, hi) {
    if (hi < lo) return lo;
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ── builders, one per method ───────────────────────────────
     Each proposes a candidate pair. The gate then decides.
     ─────────────────────────────────────────────────────────── */

  var BUILD = {

    allFromNine: function (o) {
      var bases = o.maxBase >= 10000 ? [10000, 100000] : [100, 1000];
      var base = pick(bases);
      var mult = Math.random() < 0.45 ? randInt(2, 9) : 1;  // 300, 2000
      var a = base * mult;
      var b = randInt(Math.floor(base / 10), a - 1);
      // no trailing zero at first — Megha says it confuses a beginner
      if (o.easy && b % 10 === 0) b += randInt(1, 9);
      return [a, b];
    },

    complement: function (o) {
      var base = pick(o.maxBase >= 1000 ? [10, 100, 1000] : [10, 100]);
      return [randInt(Math.max(1, Math.floor(base / 10)), base - 1), base];
    },

    doubling: function (o) {
      var d = o.digits || 2;
      return [randInt(Math.pow(10, d - 1), Math.pow(10, d) - 1), null];
    },

    halving: function (o) {
      var d = o.digits || 2;
      var n = randInt(Math.pow(10, d - 1), Math.pow(10, d) - 1);
      return [n % 2 ? n + 1 : n, null];
    },

    byEleven: function (o) {
      var d = o.digits || 2;
      return [randInt(Math.pow(10, d - 1), Math.pow(10, d) - 1), 11];
    },

    urdhva: function (o) {
      var da = o.digitsA || 2, db = o.digitsB || 2;
      return [randInt(Math.pow(10, da - 1), Math.pow(10, da) - 1),
              randInt(Math.pow(10, db - 1), Math.pow(10, db) - 1)];
    },

    ekadhikena: function (o) {
      /* Only nine two-digit numbers end in 5, so a page of ten with
         unique answers is arithmetically impossible — the same kind of
         wall we hit with single digits at Abacus L0. Three-digit ones
         (115, 125) open it up, and Megha's examples include 115. */
      var pool = o.threeDigit === false ? 9 : (Math.random() < 0.4 ? 19 : 9);
      var tens = randInt(1, pool);
      var n = tens * 10 + 5;
      return [n, n];
    },

    antyayor: function (o) {
      var t = randInt(2, 9);
      var u = randInt(1, 9);
      return [t * 10 + u, t * 10 + (10 - u)];
    },

    nikhilamMult: function (o) {
      var base = pick(o.maxBase >= 1000 ? [100, 1000] : [100]);
      var tol = Math.min(o.tolerance || 12, Math.floor(base / 10));
      function near() {
        var d = randInt(1, tol);
        return Math.random() < (o.aboveToo ? 0.4 : 0) ? base + d : base - d;
      }
      return [near(), near()];
    },

    workingBase: function (o) {
      var base = pick([20, 30, 40, 50, 60, 200, 250, 500]);
      var tol = o.tolerance || 5;
      function near() {
        var d = randInt(1, tol);
        return Math.random() < 0.5 ? base + d : base - d;
      }
      return [near(), near()];
    },

    duplex: function (o) {
      var n = randInt(11, 99);
      if (n % 10 === 5) n += 1;           // that is ekadhikena's job
      return [n, n];
    },

    yavadunam: function (o) {
      var base = pick(o.maxBase >= 1000 ? [100, 1000] : [100]);
      var tol = Math.min(o.tolerance || 12, Math.floor(base / 10));
      var d = randInt(1, tol);
      var n = Math.random() < 0.35 ? base + d : base - d;
      return [n, n];
    },

    cubing: function (o) {
      return [randInt(11, o.maxCube || 30), null];
    },

    nikhilamDiv: function (o) {
      // divisor just BELOW a base
      var base = pick([10, 100]);
      var b = base - randInt(1, Math.min(o.tolerance || 12, base - 2));
      var q = randInt(2, o.maxQuotient || 99);
      var a = b * q + randInt(0, b - 1);
      return [a, b];
    },

    paravartya: function (o) {
      // divisor just ABOVE a base
      var base = pick([10, 100]);
      var b = base + randInt(1, o.tolerance || 12);
      var q = randInt(2, o.maxQuotient || 99);
      var a = b * q + randInt(0, b - 1);
      return [a, b];
    },

    dhwajanka: function (o) {
      // deliberately NOT near a base, so the other two do not claim it
      var b;
      var guard = 0;
      do {
        b = randInt(21, o.maxDivisor || 89);
        guard++;
      } while (Math.abs(S.deviation(b).dev) <= 12 && guard < 40);
      var q = randInt(10, o.maxQuotient || 99);
      var a = b * q + randInt(0, b - 1);
      return [a, b];
    },

    squareRoot: function (o) {
      var r = randInt(10, o.maxRoot || 99);
      return [r * r, null];
    },

    cubeRoot: function (o) {
      var r = randInt(10, o.maxRoot || 40);
      return [r * r * r, null];
    },

    digitSum: function (o) {
      var d = o.digits || 3;
      return [randInt(Math.pow(10, d - 1), Math.pow(10, d) - 1), null];
    },

    stacking: function (o) {
      var a = randInt(11, 99);
      var b = o.oneDigit ? randInt(2, 9) : randInt(11, 99);
      return [a, b];
    },

    splitMerge: function (o) {
      var a = randInt(11, o.maxNumber || 99);
      var tens = randInt(1, 9) * 10;
      var b = tens + pick([-3, -2, -1, 1, 2, 3]);
      return [a, Math.max(6, b)];
    }
  };

  /* ── one sum for a method ───────────────────────────────────
     Tries, checks against the gate, and gives up honestly rather
     than returning something the method does not suit.
     ─────────────────────────────────────────────────────────── */
  function one(methodKey, opts) {
    var o = opts || {};
    var build = BUILD[methodKey];
    var meth  = S.METHODS[methodKey];
    if (!build || !meth) return null;

    for (var t = 0; t < 80; t++) {
      var pair = build(o);
      var a = pair[0], b = pair[1];

      // THE GATE. Nothing gets past here that the method does not fit.
      if (!S.isAllowed(methodKey, a, b, o)) continue;

      var ans = meth.answer(a, b);
      if (ans === null || ans === undefined) continue;
      if (typeof ans === 'number') {
        if (!isFinite(ans) || ans < 0) continue;
        if (o.maxAnswer && ans > o.maxAnswer) continue;
      }

      return {
        method: methodKey,
        label:  meth.label,
        shape:  meth.shape,
        a: a, b: b,
        text:   meth.text(a, b),
        answer: (typeof ans === 'object')
                  ? (ans.r ? ans.q + ' r ' + ans.r : String(ans.q))
                  : String(ans),
        raw: ans,
        detail: meth.detail ? meth.detail(a, b) : null
      };
    }
    return null;   // said plainly, never faked
  }

  /* ── a page of sums ─────────────────────────────────────────
     Unique answers where possible, and a gentle ramp across the
     page as the abacus pages have.
     ─────────────────────────────────────────────────────────── */
  function page(methodKeys, count, opts) {
    var o = opts || {};
    var keys = [].concat(methodKeys);
    var out = [], seen = {}, guard = 0;

    while (out.length < count && guard < count * 40) {
      guard++;
      var through = out.length / count;

      // the ramp: tolerance and size grow across the page
      var step = Object.assign({}, o, {
        tolerance: Math.max(3, Math.round((o.tolerance || 12) * (0.4 + 0.6 * through))),
        digits:    o.digits,
        aboveToo:  through > 0.5 ? o.aboveToo : false
      });

      var key = keys[out.length % keys.length];
      var q = one(key, step);
      if (!q) continue;
      if (seen[q.text] ) continue;
      if (seen['ans:' + q.answer] && out.length < count - 2) continue;
      seen[q.text] = true;
      seen['ans:' + q.answer] = true;
      out.push(q);
    }
    return out;
  }

  return { one: one, page: page, BUILD: BUILD };
})(typeof Sutras !== 'undefined' ? Sutras : require('./sutra-rules.js'));

if (typeof module !== 'undefined') module.exports = VedicGen;

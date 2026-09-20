/* ============================================================
   iMathAcademy — Generating Vedic sums
   ------------------------------------------------------------
   One builder per method per level, because the level decides the
   complexity: 2-digit x 11 at Level 2, 3-digit at Level 3.

   Every candidate goes through Sutras.isAllowed before it is
   returned, and nothing is returned if it fails. There is no
   fallback: a method that cannot build says null, and the caller
   says so to the teacher.
   ============================================================ */

var VedicGen = (function (S) {
  'use strict';

  function ri(lo, hi) { return hi < lo ? lo : Math.floor(Math.random() * (hi - lo + 1)) + lo; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function dRange(d) { return [Math.pow(10, d - 1), Math.pow(10, d) - 1]; }
  function rd(d) { var r = dRange(d); return ri(r[0], r[1]); }

  /* Each builder takes the level and returns [a, b]. b is null for
     a single-number method. */
  var BUILD = {

    nikhilam_sub: function (L) {
      var bases = L <= 1 ? [100, 1000] : L === 2 ? [10000, 100000] : [100, 1000, 10000];
      var base = pick(bases);
      var a = base * (Math.random() < 0.45 ? ri(2, 9) : 1);
      var b = ri(Math.floor(base / 10), a - 1);
      return [a, b];
    },

    friend_comp: function (L) {
      var base = pick(L <= 1 ? [10, 100] : [10, 100, 1000]);
      return [ri(Math.max(1, Math.floor(base / 10)), base - 1), base];
    },

    doubling: function (L) {
      return [L <= 1 ? rd(pick([1, 2])) : L === 2 ? rd(pick([3, 4])) : rd(pick([2, 3])), null];
    },

    halving: function (L) {
      if (L === 3) { var n = rd(2); return [n % 2 ? n + 1 : n, null]; }
      if (L === 4) { return [ri(25, 249) * 4, null]; }
      var o = rd(2); return [o % 2 ? o : o + 1, null];
    },

    split_merge: function (L) {
      if (L === 2) {
        var h = ri(1, 9) * 100 + pick([-5, -3, -2, 2, 3, 5]);
        return [rd(3), Math.max(51, h)];
      }
      var t = ri(1, 9) * 10 + pick([-3, -2, -1, 1, 2, 3]);
      var b = Math.max(6, t);
      return [rd(2), L === 3 ? -b : b];
    },

    stacking: function (L) {
      if (L <= 1) return [rd(2), Math.random() < 0.5 ? rd(1) : rd(2)];
      if (L === 2) return [rd(3), rd(3)];
      return [rd(pick([3, 4])), rd(pick([3, 4]))];
    },

    by_eleven: function (L) {
      if (L === 4) return [rd(pick([2, 3])), 111];
      return [rd(L === 2 ? 2 : 3), 11];
    },

    urdhva: function (L) {
      var w = { 2: [2, 1], 3: [2, 2], 4: [3, 2], 5: [3, 3] }[L] || [2, 2];
      return [rd(w[0]), rd(w[1])];
    },

    ekadhikena: function (L) {
      var n = L === 3 ? ri(1, 9) * 10 + 5 : ri(10, 99) * 10 + 5;
      return [n, n];
    },

    antyayor: function (L) {
      if (L === 3) { var t = ri(1, 9), u = ri(1, 9); return [t * 10 + u, t * 10 + (10 - u)]; }
      var h = ri(10, 99), u2 = ri(1, 9);
      return [h * 10 + u2, h * 10 + (10 - u2)];
    },

    base_mult: function (L) {
      if (L === 4) return [100 - ri(1, 10), 100 - ri(1, 10)];
      if (L === 5) {
        // at least one above the base
        return Math.random() < 0.5
          ? [100 + ri(1, 10), 100 + ri(1, 10)]
          : [100 + ri(1, 10), 100 - ri(1, 10)];
      }
      var base = pick([1000, 10000]);
      var tol = Math.floor(base / 10);
      function near() { var d = ri(1, tol); return Math.random() < 0.4 ? base + d : base - d; }
      return [near(), near()];
    },

    working_base: function (L) {
      var wb = pick(L === 4 ? [50] : L === 5 ? [200, 250, 500] : [50, 200, 250, 500, 2000]);
      var tol = Math.max(2, Math.round(wb * 0.08));
      function near() { var d = ri(1, tol); return Math.random() < 0.5 ? wb + d : wb - d; }
      return [near(), near()];
    },

    by_nines: function (L) {
      var m = pick(L === 5 ? [9, 99] : [999, 9999]);
      return [ri(2, m), m];
    },

    mult_11s: function (L) { return [rd(2), pick([22, 33, 44, 55, 66, 77, 88, 99])]; },

    twelve_to_19: function (L) { return [rd(2), ri(12, 19)]; },

    first_ten_last_same: function (L) {
      if (L === 5) {
        var t = ri(1, 9), u = ri(1, 9);
        return [t * 10 + u, (10 - t) * 10 + u];
      }
      var h = ri(10, 90), u2 = ri(1, 9);
      return [h * 10 + u2, (100 - h) * 10 + u2];
    },

    by_5_25_50: function (L) {
      var m = pick([5, 25, 50, 500]);
      return [rd(pick([2, 3])), m];
    },

    repeating: function (L) {
      var d = ri(1, 9), len = ri(2, 4);
      var n = Number(String(d).repeat(len));
      if (L === 6) return [n, n];
      var d2 = ri(1, 9), n2 = Number(String(d2).repeat(ri(2, 3)));
      return [n, n2];
    },

    basic_div: function (L) {
      var b = pick(L === 3 ? [2, 5, 10] : L === 4 ? [3, 4] : [2, 3, 4, 5, 10]);
      var q = ri(3, L === 3 ? 99 : 199);
      return [b * q + (L >= 5 ? ri(0, b - 1) : 0), b];
    },

    adv_div: function (L) {
      var b = pick(L === 4 ? [4, 6] : L === 5 ? [7, 8] : [9, 11, 12, 13]);
      var q = ri(3, 199);
      return [b * q + (L === 4 ? 0 : ri(0, b - 1)), b];
    },

    div_by_nine: function (L) { return [ri(20, 9999), 9]; },

    div_5_25_50: function (L) {
      var b = pick([5, 25, 50, 500]);
      return [b * ri(3, 199), b];
    },

    sq_2d_5: function (L) { var n = ri(1, 9) * 10 + 5; return [n, n]; },
    sq_3d_5: function (L) { var n = ri(10, 99) * 10 + 5; return [n, n]; },

    sq_2d: function (L) { var n = rd(2); if (n % 10 === 5) n++; return [n, n]; },
    sq_3d: function (L) { var n = rd(3); if (n % 10 === 5) n++; return [n, n]; },
    sq_4d: function (L) { var n = rd(4); if (n % 10 === 5) n++; return [n, n]; },

    cube_1d: function (L) { return [ri(2, 9), null]; },
    cube_2d: function (L) { return [ri(11, 99), null]; },
    cube_3d: function (L) { return [ri(101, 999), null]; },

    sqrt_perfect: function (L) { var r = ri(10, 99); return [r * r, null]; },
    cbrt_perfect: function (L) { var r = ri(10, 40); return [r * r * r, null]; },

    digit_sum: function (L) { return [rd(L === 2 ? 3 : 4), null]; },

    divis_2_3_5_10: function (L) {
      var b = pick([2, 3, 5, 10]);
      // half the questions should be a No, or the test is pointless
      var a = Math.random() < 0.5 ? b * ri(4, 99) : b * ri(4, 99) + ri(1, b - 1);
      return [a, b];
    },
    divis_4_8_9: function (L) {
      var b = pick([4, 8, 9]);
      var a = Math.random() < 0.5 ? b * ri(20, 250) : b * ri(20, 250) + ri(1, b - 1);
      return [a, b];
    },
    divis_6_15: function (L) {
      var b = pick([6, 15]);
      var a = Math.random() < 0.5 ? b * ri(20, 160) : b * ri(20, 160) + ri(1, b - 1);
      return [a, b];
    },
    divis_7_13_19: function (L) {
      var b = pick([7, 13, 19]);
      var a = Math.random() < 0.5 ? b * ri(20, 140) : b * ri(20, 140) + ri(1, b - 1);
      return [a, b];
    },

    percent_of: function (L) {
      var p = pick(L === 7 ? [10, 25, 50, 20, 75] : [5, 10, 15, 20, 25, 40, 50, 60, 75, 80]);
      var a = ri(2, 40) * (100 / gcd(p, 100));
      return [a, p];
    },

    percent_fraction: function (L) {
      var d = pick(L === 7 ? [8, 16] : [3, 6, 8, 16]);
      return [d * ri(3, 60), d];
    },

    percent_change: function (L) {
      var p = pick([10, 20, 25, 50, -10, -20, -25, -50]);
      return [ri(2, 40) * (100 / gcd(Math.abs(p), 100)), p];
    }
  };

  function gcd(x, y) { return y ? gcd(y, x % y) : x; }

  /** One sum for a method at a level, or null said plainly. */
  function one(key, level, opts) {
    var m = S.METHODS[key];
    var build = BUILD[key];
    if (!m || !m.ready || !build || !m.levels[level]) return null;
    var o = opts || {};

    for (var t = 0; t < 120; t++) {
      var pr = build(level);
      var a = pr[0], b = pr[1];

      // THE GATE
      if (!S.isAllowed(key, a, b, level)) continue;

      var ans;
      try { ans = m.answer(a, b, level); } catch (e) { continue; }
      if (ans === null || ans === undefined) continue;
      if (typeof ans === 'number' && (!isFinite(ans) || ans < 0)) continue;
      if (o.maxAnswer && typeof ans === 'number' && ans > o.maxAnswer) continue;

      var shown = (typeof ans === 'object')
        ? (ans.r ? ans.q + ' r ' + ans.r : String(ans.q))
        : String(ans);

      return {
        method: key, label: m.label, cat: m.cat, shape: m.shape,
        level: level, scope: m.levels[level],
        a: a, b: b,
        text: m.text(a, b, level),
        answer: shown, raw: ans,
        detail: m.detail ? m.detail(a, b) : null
      };
    }
    return null;
  }

  /** A page for a level, across the methods it teaches. */
  function page(level, count, opts) {
    var o = opts || {};
    var keys = o.methods ? [].concat(o.methods) : S.readyAt(level);
    if (!keys.length) return { error: 'No method at Level ' + level + ' is ready yet' };

    var out = [], seen = {}, guard = 0;
    while (out.length < count && guard < count * 60) {
      guard++;
      var key = keys[out.length % keys.length];
      var q = one(key, level, o);
      if (!q) continue;
      if (seen[q.text]) continue;
      seen[q.text] = true;
      out.push(q);
    }
    if (!out.length) {
      return { error: 'Could not build anything for Level ' + level +
                      ' with the methods chosen' };
    }
    return { level: level, questions: out, methods: keys };
  }

  /** Every question checked against its own method, before serving. */
  function audit(questions, level) {
    var bad = [];
    (questions || []).forEach(function (q, i) {
      if (!S.isAllowed(q.method, q.a, q.b, q.level || level)) {
        bad.push('Q' + (i + 1) + ': ' + q.text + ' does not suit ' + q.label);
        return;
      }
      var m = S.METHODS[q.method];
      var want = m.answer(q.a, q.b, q.level || level);
      var shown = (typeof want === 'object')
        ? (want.r ? want.q + ' r ' + want.r : String(want.q))
        : String(want);
      if (String(q.answer) !== shown) {
        bad.push('Q' + (i + 1) + ': ' + q.text + ' says ' + q.answer + ', should be ' + shown);
      }
    });
    return bad;
  }

  return { one: one, page: page, audit: audit, BUILD: BUILD };
})(typeof Sutras !== 'undefined' ? Sutras : require('./sutra-rules.js'));

if (typeof module !== 'undefined') module.exports = VedicGen;

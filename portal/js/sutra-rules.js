/* ============================================================
   iMathAcademy — Vedic methods: when each one applies
   ------------------------------------------------------------
   Built from Megha's own 41-method list, which she has approved,
   with each method's complexity split across the levels she gave.

   Two rules govern this file:

   1. A method says when it applies AND when it does not. A sum the
      method does not suit teaches the wrong instinct, which is
      worse than no practice at all.

   2. A method that is not properly implemented says so. It is
      marked `ready: false` and the engine refuses to serve it,
      rather than falling back to something plausible. Every silent
      fallback in this project has ended up teaching children the
      wrong thing for weeks before anyone noticed.
   ============================================================ */

var Sutras = (function () {
  'use strict';

  function digits(n) { return String(Math.abs(n)).length; }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  /** The nearest power of ten at or above n. */
  function baseAbove(n) { return Math.pow(10, digits(n)); }

  /** How far n sits from the nearer power of ten. */
  function deviation(n) {
    var hi = baseAbove(n), lo = hi / 10;
    var dHi = n - hi, dLo = n - lo;
    return Math.abs(dHi) <= Math.abs(dLo)
      ? { base: hi, dev: dHi }
      : { base: lo, dev: dLo };
  }

  /** Is n a base or a clean multiple of one? 100, 300, 2000. */
  function isBaseMultiple(n, minBase, maxBase) {
    for (var p = minBase; p <= maxBase; p *= 10) {
      if (n % p === 0) {
        var mult = n / p;
        if (mult >= 1 && mult <= 9) return { base: p, mult: mult };
      }
    }
    return null;
  }

  var WORKING_BASES = { 4: [50], 5: [50, 200, 250, 500], 6: [50, 200, 250, 500, 2000, 5000] };

  function digitSum(n) {
    var s = String(Math.abs(n)).split('').reduce(function (a, c) { return a + Number(c); }, 0);
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

  /* ── the methods ─────────────────────────────────────────────
     `levels` maps a level to what that level teaches, matching
     the matrix Megha approved. `applies(a, b, L)` is judged for
     the level being taught, so 2-digit x 11 at Level 2 does not
     accept a 3-digit number.
     ─────────────────────────────────────────────────────────── */

  var METHODS = {

    /* ── SUBTRACTION ── */
    nikhilam_sub: {
      cat: 'Subtraction', label: 'All from 9, last from 10',
      sanskrit: 'Nikhilam Navatashcaramam Dashatah', shape: 'subtraction',
      ready: true,
      levels: { 1: 'From 100 and 1000, and their multiples',
                2: 'From 10000 and 100000, and their multiples',
                3: 'Any base, including where the answer needs padding' },
      notFor: 'Ordinary subtraction like 47 - 23, where neither number is a base',
      applies: function (a, b, L) {
        if (!isInt(a) || !isInt(b) || b <= 0 || b >= a) return false;
        var range = L <= 1 ? [100, 1000] : L === 2 ? [10000, 100000] : [100, 100000];
        return !!isBaseMultiple(a, range[0], range[1]);
      },
      answer: function (a, b) { return a - b; },
      text: function (a, b) { return a + ' - ' + b; }
    },

    /* ── NUMBER WORK ── */
    friend_comp: {
      cat: 'Number work', label: 'Friend complement',
      sanskrit: 'Purana-Apuranabhyam', shape: 'complement', ready: true,
      levels: { 1: 'Complements to 10 and 100', 2: 'Complements to 1000',
                3: 'Complements used inside a longer calculation' },
      notFor: 'Numbers already at a base — the complement is zero',
      applies: function (a, b, L) {
        var allowed = L <= 1 ? [10, 100] : [10, 100, 1000];
        return allowed.indexOf(b) > -1 && a > 0 && a < b;
      },
      answer: function (a, b) { return b - a; },
      text: function (a, b) { return a + ' -> ' + b; }
    },

    doubling: {
      cat: 'Number work', label: 'Doubling', sanskrit: 'Anurupyena',
      shape: 'single', ready: true,
      levels: { 1: 'Single digit and 2-digit numbers',
                2: '3-digit and 4-digit numbers',
                3: 'Repeated doubling for x4 and x8' },
      notFor: '',
      applies: function (a, b, L) {
        if (!isInt(a) || a <= 0) return false;
        var d = digits(a);
        return L <= 1 ? d <= 2 : L === 2 ? (d === 3 || d === 4) : d <= 4;
      },
      answer: function (a, b, L) { return L >= 3 ? a * 4 : a * 2; },
      text: function (a, b, L) { return L >= 3 ? a + ' x 4' : 'double ' + a; }
    },

    halving: {
      cat: 'Number work', label: 'Halving', sanskrit: 'Anurupyena',
      shape: 'single', ready: true,
      levels: { 3: 'Even 2-digit numbers',
                4: 'Even 3-digit numbers, and repeated halving for /4',
                5: 'Odd numbers, giving a half' },
      notFor: 'Odd numbers before Level 5 — the half has to wait for decimals',
      applies: function (a, b, L) {
        if (!isInt(a) || a <= 0) return false;
        var d = digits(a);
        if (L === 3) return d === 2 && a % 2 === 0;
        if (L === 4) return d === 3 && a % 4 === 0;
        return a % 2 === 1 && d <= 3;
      },
      answer: function (a, b, L) { return L === 4 ? a / 4 : a / 2; },
      text: function (a, b, L) { return L === 4 ? a + ' / 4' : 'half of ' + a; }
    },

    /* ── ADDITION ── */
    split_merge: {
      cat: 'Addition', label: 'Split and merge', sanskrit: '',
      shape: 'addition', ready: true,
      levels: { 1: 'Adding a number within 3 of a ten',
                2: 'Adding near a hundred',
                3: 'Subtracting by the same adjustment',
                4: 'Chained adjustments in one sum' },
      notFor: 'Sums where both numbers are already easy, like 23 + 14',
      applies: function (a, b, L) {
        if (!isInt(a) || a <= 0) return false;
        var m = Math.abs(b);
        if (L <= 1) { var off = m % 10; return m > 5 && (off >= 7 || (off >= 1 && off <= 3)) && b > 0; }
        if (L === 2) { var o2 = m % 100; return m > 50 && (o2 >= 95 || (o2 >= 1 && o2 <= 5)); }
        if (L === 3) { var o3 = m % 10; return b < 0 && m > 5 && (o3 >= 7 || (o3 >= 1 && o3 <= 3)); }
        var o4 = m % 10;
        return m > 5 && (o4 >= 7 || (o4 >= 1 && o4 <= 3));
      },
      answer: function (a, b) { return a + b; },
      text: function (a, b) { return a + (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b); }
    },

    stacking: {
      cat: 'Addition', label: 'Stacking', sanskrit: '', shape: 'addition', ready: true,
      levels: { 1: '2-digit + 1-digit, and 2-digit + 2-digit',
                2: '3-digit columns', 3: 'Longer columns with carries throughout' },
      notFor: 'Long columns — that is abacus work',
      applies: function (a, b, L) {
        if (!isInt(a) || !isInt(b) || a <= 0 || b <= 0) return false;
        var m = Math.max(digits(a), digits(b));
        return L <= 1 ? m <= 2 : L === 2 ? m === 3 : m <= 4;
      },
      answer: function (a, b) { return a + b; },
      text: function (a, b) { return a + ' + ' + b; }
    },

    /* ── MULTIPLICATION ── */
    by_eleven: {
      cat: 'Multiplication', label: 'Add the neighbour',
      sanskrit: 'Sopantyadvayamantyam', shape: 'multiplication', ready: true,
      levels: { 2: '2-digit x 11', 3: '3-digit x 11', 4: '2-digit x 111 and 3-digit x 111' },
      notFor: 'Multiplying by 12 or 13 — those need a different handling',
      applies: function (a, b, L) {
        if (!isInt(a) || !isInt(b)) return false;
        if (L === 4) return (b === 111 || a === 111) && digits(a === 111 ? b : a) <= 3;
        var n = (b === 11) ? a : (a === 11 ? b : null);
        if (n === null) return false;
        return L === 2 ? digits(n) === 2 : digits(n) === 3;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    urdhva: {
      cat: 'Multiplication', label: 'Vertically and crosswise',
      sanskrit: 'Urdhva-Tiryagbhyam', shape: 'multiplication', ready: true,
      levels: { 2: '2-digit x 1-digit', 3: '2-digit x 2-digit',
                4: '3-digit x 2-digit', 5: '3-digit x 3-digit' },
      notFor: 'It always works, but a special method is quicker where one fits',
      applies: function (a, b, L) {
        if (!isInt(a) || !isInt(b) || a < 2 || b < 2) return false;
        var da = digits(a), db = digits(b);
        var want = { 2: [2, 1], 3: [2, 2], 4: [3, 2], 5: [3, 3] }[L];
        if (!want) return false;
        return (da === want[0] && db === want[1]) || (da === want[1] && db === want[0]);
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    ekadhikena: {
      cat: 'Squares', label: 'One more than the one before',
      sanskrit: 'Ekadhikena Purvena', shape: 'multiplication', ready: true,
      levels: { 3: 'Squaring a 2-digit number ending in 5',
                4: 'Squaring a 3-digit number ending in 5' },
      notFor: '65 x 75 — both end in 5 but they are different numbers. ' +
              'The number must end in 5 AND be multiplied by itself.',
      applies: function (a, b, L) {
        if (a !== b || a % 10 !== 5) return false;
        return L === 3 ? digits(a) === 2 : digits(a) === 3;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    antyayor: {
      cat: 'Multiplication', label: 'Same first, friends after',
      sanskrit: "Antyayordashake'pi", shape: 'multiplication', ready: true,
      levels: { 3: 'Same tens digit, units adding to 10',
                4: 'Same hundreds, and 3-digit cases' },
      notFor: 'Numbers whose leading digits differ, or whose units do not make 10',
      applies: function (a, b, L) {
        if (!isInt(a) || !isInt(b)) return false;
        var d = L === 3 ? 2 : 3;
        if (digits(a) !== d || digits(b) !== d) return false;
        var fa = Math.floor(a / 10), fb = Math.floor(b / 10);
        return fa === fb && (a % 10) + (b % 10) === 10;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    base_mult: {
      cat: 'Multiplication', label: 'Base method', sanskrit: 'Nikhilam',
      shape: 'multiplication', ready: true,
      levels: { 4: 'Both numbers just below 100',
                5: 'Above the base, and one above one below',
                6: 'Bases of 1000 and beyond' },
      notFor: 'Numbers far from a base — long multiplication is less work',
      applies: function (a, b, L) {
        if (!isInt(a) || !isInt(b)) return false;
        var da = deviation(a), db = deviation(b);
        if (da.base !== db.base || !da.dev || !db.dev) return false;
        var tol = Math.max(3, Math.floor(da.base / 10));
        if (Math.abs(da.dev) > tol || Math.abs(db.dev) > tol) return false;
        if (L === 4) return da.base === 100 && da.dev < 0 && db.dev < 0;
        if (L === 5) return da.base === 100 && (da.dev > 0 || db.dev > 0);
        return da.base >= 1000;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; },
      detail: function (a, b) {
        var d = deviation(a), e = deviation(b);
        return { base: d.base, devA: d.dev, devB: e.dev };
      }
    },

    working_base: {
      cat: 'Multiplication', label: 'Working base', sanskrit: 'Anurupyena',
      shape: 'multiplication', ready: true,
      levels: { 4: 'Near 50', 5: 'Near 200, 250 and 500', 6: 'Any convenient working base' },
      notFor: 'Numbers nearer a power of ten — that is the plain base method',
      applies: function (a, b, L) {
        if (!isInt(a) || !isInt(b)) return false;
        var bases = WORKING_BASES[L] || WORKING_BASES[6];
        for (var i = 0; i < bases.length; i++) {
          var wb = bases[i], tol = Math.max(2, Math.round(wb * 0.1));
          var da = a - wb, db = b - wb;
          if (!da || !db) continue;
          if (Math.abs(da) <= tol && Math.abs(db) <= tol) {
            // a power of ten must not be nearer
            var p = deviation(a);
            if (Math.abs(p.dev) < Math.abs(da)) continue;
            return true;
          }
        }
        return false;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    by_nines: {
      cat: 'Multiplication', label: 'Multiplying by 9, 99, 999',
      sanskrit: 'Ekanyunena Purvena', shape: 'multiplication', ready: true,
      levels: { 5: 'By 9 and 99', 6: 'By 999 and 9999' },
      notFor: 'Multipliers that are not all nines',
      applies: function (a, b, L) {
        var nines = L === 5 ? [9, 99] : [999, 9999];
        var m = nines.indexOf(b) > -1 ? b : (nines.indexOf(a) > -1 ? a : null);
        if (m === null) return false;
        var other = (m === b) ? a : b;
        return isInt(other) && other > 1 && other <= m;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    mult_11s: {
      cat: 'Multiplication', label: 'Multiples of 11', sanskrit: '',
      shape: 'multiplication', ready: true,
      levels: { 5: 'By 22, 33, 44 and the rest' },
      notFor: 'By 11 itself — that is the neighbour method from Level 2',
      applies: function (a, b, L) {
        var m = [22, 33, 44, 55, 66, 77, 88, 99];
        var k = m.indexOf(b) > -1 ? b : (m.indexOf(a) > -1 ? a : null);
        if (k === null) return false;
        var other = (k === b) ? a : b;
        return isInt(other) && digits(other) === 2;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    twelve_to_19: {
      cat: 'Multiplication', label: 'Multiplying by 12 to 19',
      sanskrit: 'Sopantyadvayamantyam', shape: 'multiplication', ready: true,
      levels: { 6: 'Any 2-digit number by 12 through 19' },
      notFor: 'By 11 — the neighbour method is simpler',
      applies: function (a, b, L) {
        var m = (b >= 12 && b <= 19) ? b : ((a >= 12 && a <= 19) ? a : null);
        if (m === null) return false;
        var other = (m === b) ? a : b;
        return isInt(other) && digits(other) === 2;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    first_ten_last_same: {
      cat: 'Multiplication', label: 'First digits total 10, last digits the same',
      sanskrit: 'Purvanna Samuccayah', shape: 'multiplication', ready: true,
      levels: { 5: '2-digit cases', 6: '3-digit cases' },
      notFor: 'Numbers whose leading digits do not total 10',
      applies: function (a, b, L) {
        var d = L === 5 ? 2 : 3;
        if (digits(a) !== d || digits(b) !== d) return false;
        if (a % 10 !== b % 10) return false;
        return Math.floor(a / 10) + Math.floor(b / 10) === (d === 2 ? 10 : 100);
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    by_5_25_50: {
      cat: 'Multiplication', label: 'Multiplying by 5, 25, 50 and 500',
      sanskrit: '', shape: 'multiplication', ready: true,
      levels: { 6: 'Halving and shifting the point' },
      notFor: 'Other multipliers — this works because each is a power of ten halved',
      applies: function (a, b, L) {
        var m = [5, 25, 50, 500];
        var k = m.indexOf(b) > -1 ? b : (m.indexOf(a) > -1 ? a : null);
        if (k === null) return false;
        var other = (k === b) ? a : b;
        return isInt(other) && digits(other) >= 2 && digits(other) <= 4;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    repeating: {
      cat: 'Multiplication', label: 'Repeating numbers',
      sanskrit: 'Number splitting', shape: 'multiplication', ready: true,
      levels: { 6: 'Numbers like 3333 x 3333', 7: 'Mixed repeating patterns' },
      notFor: 'Numbers whose digits are not all the same',
      applies: function (a, b, L) {
        function rep(n) { return /^(\d)\1+$/.test(String(n)); }
        if (L === 6) return rep(a) && rep(b) && a === b && digits(a) >= 2;
        return rep(a) && rep(b) && digits(a) >= 2 && digits(b) >= 2;
      },
      answer: function (a, b) { return a * b; },
      text: function (a, b) { return a + ' x ' + b; }
    },

    /* ── DIVISION ── */
    basic_div: {
      cat: 'Division', label: 'Basic division', sanskrit: '', shape: 'division', ready: true,
      levels: { 3: 'Dividing by 2, 5 and 10', 4: 'Dividing by 3 and 4',
                5: 'Mixed, with remainders' },
      notFor: 'Divisors above 10 — those come later',
      applies: function (a, b, L) {
        var allowed = L === 3 ? [2, 5, 10] : L === 4 ? [3, 4] : [2, 3, 4, 5, 10];
        if (allowed.indexOf(b) < 0 || !isInt(a) || a <= b) return false;
        return L >= 5 ? true : a % b === 0;   // exact until Level 5
      },
      answer: function (a, b) { return { q: Math.floor(a / b), r: a % b }; },
      text: function (a, b) { return a + ' / ' + b; }
    },

    adv_div: {
      cat: 'Division', label: 'Advanced division', sanskrit: '', shape: 'division', ready: true,
      levels: { 4: 'Dividing by 4 and 6', 5: 'Dividing by 7 and 8',
                6: 'Dividing by 9, and larger divisors' },
      notFor: 'The small divisors from basic division',
      applies: function (a, b, L) {
        var allowed = L === 4 ? [4, 6] : L === 5 ? [7, 8] : [9, 11, 12, 13];
        if (allowed.indexOf(b) < 0 || !isInt(a) || a <= b) return false;
        return L === 4 ? a % b === 0 : true;
      },
      answer: function (a, b) { return { q: Math.floor(a / b), r: a % b }; },
      text: function (a, b) { return a + ' / ' + b; }
    },

    div_by_nine: {
      cat: 'Division', label: 'Dividing by 9', sanskrit: 'Nikhilam',
      shape: 'division', ready: true,
      levels: { 4: 'The running-sum shortcut for 9' },
      notFor: 'Any divisor other than 9',
      applies: function (a, b, L) {
        return b === 9 && isInt(a) && a > 9 && digits(a) <= 4;
      },
      answer: function (a, b) { return { q: Math.floor(a / b), r: a % b }; },
      text: function (a, b) { return a + ' / 9'; }
    },

    div_5_25_50: {
      cat: 'Division', label: 'Dividing by 5, 25, 50 and 500',
      sanskrit: '', shape: 'division', ready: true,
      levels: { 7: 'Doubling and shifting the point' },
      notFor: 'Other divisors — this works because each is a power of ten halved',
      applies: function (a, b, L) {
        var m = [5, 25, 50, 500];
        if (m.indexOf(b) < 0 || !isInt(a) || a <= b) return false;
        return a % b === 0;
      },
      answer: function (a, b) { return { q: a / b, r: 0 }; },
      text: function (a, b) { return a + ' / ' + b; }
    },

    /* ── SQUARES ── */
    sq_2d_5: {
      cat: 'Squares', label: 'Squaring a 2-digit number ending in 5',
      sanskrit: 'Ekadhikena Purvena', shape: 'multiplication', ready: true,
      levels: { 3: '15 through 95' },
      notFor: 'Numbers not ending in 5, and two different numbers',
      applies: function (a, b, L) { return a === b && digits(a) === 2 && a % 10 === 5; },
      answer: function (a, b) { return a * a; },
      text: function (a, b) { return a + ' x ' + a; }
    },

    sq_3d_5: {
      cat: 'Squares', label: 'Squaring a 3-digit number ending in 5',
      sanskrit: 'Ekadhikena Purvena', shape: 'multiplication', ready: true,
      levels: { 4: '105 through 995' },
      notFor: 'Numbers not ending in 5',
      applies: function (a, b, L) { return a === b && digits(a) === 3 && a % 10 === 5; },
      answer: function (a, b) { return a * a; },
      text: function (a, b) { return a + ' x ' + a; }
    },

    sq_2d: {
      cat: 'Squares', label: 'Squaring any 2-digit number',
      sanskrit: 'Dwandwa Yoga', shape: 'multiplication', ready: true,
      levels: { 5: 'The duplex method, any 2-digit number' },
      notFor: 'Numbers ending in 5 — the Level 3 method is quicker and this ' +
              'teaches the wrong instinct for them',
      applies: function (a, b, L) {
        return a === b && digits(a) === 2 && a % 10 !== 5;
      },
      answer: function (a, b) { return a * a; },
      text: function (a, b) { return a + ' x ' + a; }
    },

    sq_3d: {
      cat: 'Squares', label: 'Squaring any 3-digit number',
      sanskrit: 'Dwandwa Yoga', shape: 'multiplication', ready: true,
      levels: { 6: 'The duplex method extended' },
      notFor: 'Numbers ending in 5 — Level 4 has a quicker way',
      applies: function (a, b, L) {
        return a === b && digits(a) === 3 && a % 10 !== 5;
      },
      answer: function (a, b) { return a * a; },
      text: function (a, b) { return a + ' x ' + a; }
    },

    sq_4d: {
      cat: 'Squares', label: 'Squaring any 4-digit number',
      sanskrit: 'Dwandwa Yoga', shape: 'multiplication', ready: true,
      levels: { 7: 'The duplex method, four digits' },
      notFor: 'Numbers ending in 5',
      applies: function (a, b, L) {
        return a === b && digits(a) === 4 && a % 10 !== 5;
      },
      answer: function (a, b) { return a * a; },
      text: function (a, b) { return a + ' x ' + a; }
    },

    /* ── CUBES ── */
    cube_1d: {
      cat: 'Cubes', label: 'Cube of a single digit', sanskrit: '',
      shape: 'single', ready: true,
      levels: { 5: '1 through 9' },
      notFor: 'Numbers of more than one digit',
      applies: function (a, b, L) { return isInt(a) && a >= 2 && a <= 9; },
      answer: function (a) { return a * a * a; },
      text: function (a) { return a + '^3'; }
    },

    cube_2d: {
      cat: 'Cubes', label: 'Cube of a 2-digit number', sanskrit: 'Anurupyena',
      shape: 'single', ready: true,
      levels: { 6: 'The ratio series' },
      notFor: 'Single digits — those should be known by now',
      applies: function (a, b, L) { return isInt(a) && a >= 11 && a <= 99; },
      answer: function (a) { return a * a * a; },
      text: function (a) { return a + '^3'; }
    },

    cube_3d: {
      cat: 'Cubes', label: 'Cube of a 3-digit number', sanskrit: 'Anurupyena',
      shape: 'single', ready: true,
      levels: { 7: 'Extended to three digits' },
      notFor: '',
      applies: function (a, b, L) { return isInt(a) && a >= 101 && a <= 999; },
      answer: function (a) { return a * a * a; },
      text: function (a) { return a + '^3'; }
    },

    /* ── ROOTS ── */
    sqrt_perfect: {
      cat: 'Roots', label: 'Square root of a perfect square',
      sanskrit: 'Vilokanam', shape: 'root', ready: true,
      levels: { 8: 'By inspection, perfect squares only' },
      notFor: 'Numbers that are not perfect squares',
      applies: function (a, b, L) { return isPerfectSquare(a) && a >= 100; },
      answer: function (a) { return Math.round(Math.sqrt(a)); },
      text: function (a) { return 'root ' + a; }
    },

    cbrt_perfect: {
      cat: 'Roots', label: 'Cube root of a perfect cube',
      sanskrit: 'Vilokanam', shape: 'root', ready: true,
      levels: { 8: 'By inspection, perfect cubes only' },
      notFor: 'Numbers that are not perfect cubes',
      applies: function (a, b, L) { return isPerfectCube(a) && a >= 1000; },
      answer: function (a) { return Math.round(Math.cbrt(a)); },
      text: function (a) { return 'cube root ' + a; }
    },

    /* Not implemented. The general square root needs a digit-by-digit
       duplex procedure and produces a decimal, which the practice
       screen has no way to mark yet. Declared plainly rather than
       approximated. */
    sqrt_general: {
      cat: 'Roots', label: 'Square root of any number',
      sanskrit: 'Dwandwa Yoga', shape: 'root', ready: false,
      levels: { 8: 'The general method, including non-perfect squares' },
      notFor: '',
      why: 'Gives a decimal answer to a chosen number of places, which the ' +
           'practice screen cannot mark yet.'
    },

    /* ── NUMBER THEORY ── */
    digit_sum: {
      cat: 'Number theory', label: 'Digit sum', sanskrit: 'Beejank',
      shape: 'single', ready: true,
      levels: { 2: 'Reducing a number to a single digit',
                3: 'Checking an addition', 4: 'Checking a multiplication' },
      notFor: 'Proving an answer right — it only ever shows one is wrong',
      applies: function (a, b, L) { return isInt(a) && a > 9; },
      answer: function (a) { return digitSum(a); },
      text: function (a) { return 'digit sum of ' + a; }
    },

    divis_2_3_5_10: {
      cat: 'Number theory', label: 'Divisibility by 2, 3, 5 and 10',
      sanskrit: '', shape: 'divisibility', ready: true,
      levels: { 5: 'The four simplest tests' },
      notFor: 'Divisors needing the osculation method',
      applies: function (a, b, L) { return [2, 3, 5, 10].indexOf(b) > -1 && isInt(a) && a > 10; },
      answer: function (a, b) { return a % b === 0 ? 'Yes' : 'No'; },
      text: function (a, b) { return 'Is ' + a + ' divisible by ' + b + '?'; }
    },

    divis_4_8_9: {
      cat: 'Number theory', label: 'Divisibility by 4, 8 and 9',
      sanskrit: '', shape: 'divisibility', ready: true,
      levels: { 6: 'Last two digits, last three, and the digit sum' },
      notFor: '',
      applies: function (a, b, L) { return [4, 8, 9].indexOf(b) > -1 && isInt(a) && a > 100; },
      answer: function (a, b) { return a % b === 0 ? 'Yes' : 'No'; },
      text: function (a, b) { return 'Is ' + a + ' divisible by ' + b + '?'; }
    },

    divis_6_15: {
      cat: 'Number theory', label: 'Divisibility by 6 and 15',
      sanskrit: '', shape: 'divisibility', ready: true,
      levels: { 7: 'Combining two tests' },
      notFor: '',
      applies: function (a, b, L) { return [6, 15].indexOf(b) > -1 && isInt(a) && a > 100; },
      answer: function (a, b) { return a % b === 0 ? 'Yes' : 'No'; },
      text: function (a, b) { return 'Is ' + a + ' divisible by ' + b + '?'; }
    },

    divis_7_13_19: {
      cat: 'Number theory', label: 'Divisibility by 7, 13 and 19',
      sanskrit: 'Vestanas (osculation)', shape: 'divisibility', ready: true,
      levels: { 8: 'The osculator method' },
      notFor: '',
      applies: function (a, b, L) { return [7, 13, 19].indexOf(b) > -1 && isInt(a) && a > 100; },
      answer: function (a, b) { return a % b === 0 ? 'Yes' : 'No'; },
      text: function (a, b) { return 'Is ' + a + ' divisible by ' + b + '?'; }
    },

    /* ── PERCENTAGES ── */
    percent_of: {
      cat: 'Percentages', label: 'Finding a percentage of a number',
      sanskrit: '', shape: 'percent', ready: true,
      levels: { 7: 'Simple percentages: 10%, 25%, 50%', 8: 'Any percentage' },
      notFor: 'Percentages that do not divide cleanly, before Level 8',
      applies: function (a, b, L) {
        var simple = [10, 25, 50, 20, 75];
        if (!isInt(a) || a <= 0) return false;
        if (L === 7) return simple.indexOf(b) > -1 && (a * b) % 100 === 0;
        return b > 0 && b <= 100 && (a * b) % 100 === 0;
      },
      answer: function (a, b) { return a * b / 100; },
      text: function (a, b) { return b + '% of ' + a; }
    },

    percent_fraction: {
      cat: 'Percentages', label: 'Fractional percentages', sanskrit: '',
      shape: 'percent', ready: true,
      levels: { 7: '12.5% and 6.25%, as one eighth and one sixteenth',
                8: '33.33%, 16.66% and the rest' },
      notFor: 'Whole percentages — those are the simpler method',
      applies: function (a, b, L) {
        /* b carries the denominator: 8 means 12.5%, 3 means 33.33%.
           Level 7 keeps to the powers of two, where the answer is
           exact; the thirds wait for Level 8. */
        var allowed = L === 7 ? [8, 16] : [3, 6, 8, 16];
        return allowed.indexOf(b) > -1 && isInt(a) && a % b === 0 && a > 0;
      },
      answer: function (a, b) { return a / b; },
      text: function (a, b) {
        var pc = { 3: '33.33', 6: '16.66', 8: '12.5', 16: '6.25' }[b];
        return pc + '% of ' + a;
      }
    },

    percent_change: {
      cat: 'Percentages', label: 'Increase and decrease in percentage',
      sanskrit: '', shape: 'percent', ready: true,
      levels: { 8: 'Both directions, and successive changes' },
      notFor: '',
      applies: function (a, b, L) {
        return isInt(a) && a > 0 && isInt(b) && b !== 0 && Math.abs(b) <= 100 &&
               (a * Math.abs(b)) % 100 === 0;
      },
      answer: function (a, b) { return a + (a * b / 100); },
      text: function (a, b) {
        return a + (b > 0 ? ' increased by ' + b + '%' : ' decreased by ' + Math.abs(b) + '%');
      }
    }
  };

  /* ── THE GATE ───────────────────────────────────────────────
     Nothing reaches a child without passing here, and a method
     that is not ready never passes.
     ─────────────────────────────────────────────────────────── */
  function isAllowed(key, a, b, level) {
    var m = METHODS[key];
    if (!m || !m.ready) return false;
    if (!m.levels[level]) return false;        // not taught at this level
    try { return !!m.applies(a, b, level); }
    catch (e) { return false; }
  }

  function methodsAt(level) {
    return Object.keys(METHODS).filter(function (k) {
      return METHODS[k].levels[level];
    });
  }

  function readyAt(level) {
    return methodsAt(level).filter(function (k) { return METHODS[k].ready; });
  }

  function notReady() {
    return Object.keys(METHODS).filter(function (k) { return !METHODS[k].ready; });
  }

  function scopeOf(key, level) {
    var m = METHODS[key];
    return (m && m.levels[level]) || '';
  }

  return {
    METHODS: METHODS, isAllowed: isAllowed,
    methodsAt: methodsAt, readyAt: readyAt, notReady: notReady, scopeOf: scopeOf,
    deviation: deviation, isBaseMultiple: isBaseMultiple, digitSum: digitSum,
    isPerfectSquare: isPerfectSquare, isPerfectCube: isPerfectCube
  };
})();

if (typeof module !== 'undefined') module.exports = Sutras;

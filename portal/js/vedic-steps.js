/* ============================================================
   iMathAcademy — Guided steps
   ------------------------------------------------------------
   Megha's instruction, close to her words:

     "Guided steps when a method is introduced -- the first few
      questions at that level. Then answer-only with the working
      revealed for the rest, once they know it."

   So every method describes its own working as a sequence the app
   can check one step at a time. A step is { ask, answer, hint }.

   Two rules:

   1. The LAST step's answer must equal the question's answer. A
      sequence that ends somewhere else would walk a child to the
      wrong place, which is worse than no steps at all. The test
      suite checks this for every method at every level.

   2. A method with no steps returns null and the screen serves it
      answer-only. Nothing is invented to fill the gap.
   ============================================================ */

var VedicSteps = (function (S) {
  'use strict';

  function digits(n) { return String(Math.abs(n)).length; }
  function dArr(n) { return String(Math.abs(n)).split('').map(Number); }

  var STEPS = {

    /* ── SUBTRACTION ── */
    nikhilam_sub: function (a, b, L) {
      var bm = S.isBaseMultiple(a, 100, 100000);
      var base = bm ? bm.base : Math.pow(10, digits(a));
      var extra = a - base;              // the 200 in 300 - 176
      var ds = dArr(b);
      var steps = [];

      if (extra > 0) {
        steps.push({ ask: 'Split ' + a + ' into ' + base + ' and how much?',
                     answer: extra, hint: 'Take the number off the base first, then add the rest back' });
      }
      ds.forEach(function (d, i) {
        var last = i === ds.length - 1;
        steps.push({
          ask: last ? 'Last digit: 10 - ' + d : (i === 0 ? 'First digit: 9 - ' + d : 'Next: 9 - ' + d),
          answer: last ? 10 - d : 9 - d,
          hint: last ? 'The last one comes off 10' : 'All the others come off 9'
        });
      });
      if (extra > 0) {
        steps.push({ ask: 'Now add the ' + extra + ' back on', answer: a - b, hint: '' });
      } else {
        steps.push({ ask: 'So the answer is', answer: a - b, hint: 'Put the digits together' });
      }
      return steps;
    },

    /* ── NUMBER WORK ── */
    friend_comp: function (a, b) {
      return [{ ask: 'What does ' + a + ' need to reach ' + b + '?', answer: b - a,
                hint: 'All from 9, and the last from 10' }];
    },

    doubling: function (a, b, L) {
      if (L >= 3) {
        return [{ ask: 'Double ' + a, answer: a * 2, hint: '' },
                { ask: 'Double it again', answer: a * 4, hint: 'Doubling twice is times four' }];
      }
      var t = Math.floor(a / 10) * 10, u = a % 10;
      if (!t) return [{ ask: 'Double ' + a, answer: a * 2, hint: '' }];
      return [
        { ask: 'Double the tens: ' + t + ' x 2', answer: t * 2, hint: '' },
        { ask: 'Double the units: ' + u + ' x 2', answer: u * 2, hint: '' },
        { ask: 'Add them: ' + (t * 2) + ' + ' + (u * 2), answer: a * 2, hint: 'Watch the carry' }
      ];
    },

    halving: function (a, b, L) {
      if (L === 4) {
        return [{ ask: 'Half of ' + a, answer: a / 2, hint: '' },
                { ask: 'Half again', answer: a / 4, hint: 'Halving twice is dividing by four' }];
      }
      if (a % 2) {
        return [{ ask: 'Half of ' + (a - 1), answer: (a - 1) / 2, hint: 'Take the even part first' },
                { ask: 'And the odd 1 gives another half. So', answer: a / 2, hint: '' }];
      }
      return [{ ask: 'Half of ' + a, answer: a / 2, hint: 'Halve the tens, then the units' }];
    },

    /* ── ADDITION ── */
    split_merge: function (a, b, L) {
      var m = Math.abs(b);
      var round = (L === 2) ? Math.round(m / 100) * 100 : Math.round(m / 10) * 10;
      var adjust = round - m;
      var sign = b < 0 ? -1 : 1;
      return [
        { ask: 'Round ' + m + ' to', answer: round, hint: L === 2 ? 'The nearest hundred' : 'The nearest ten' },
        { ask: a + (sign < 0 ? ' - ' : ' + ') + round, answer: a + sign * round, hint: '' },
        { ask: adjust > 0
            ? (sign < 0 ? 'Now add ' + adjust + ' back' : 'Now take ' + adjust + ' back off')
            : (sign < 0 ? 'Now take off ' + Math.abs(adjust) : 'Now add ' + Math.abs(adjust)),
          answer: a + b,
          hint: 'We changed it, so change it back the other way' }
      ];
    },

    /* Megha: the tens must be shown as well. "Then the rest, with any
       carry" hid the step where the carry is actually used, which is
       the part a child gets wrong. Each place is now its own box, from
       the units leftwards, and the carry is named. */
    stacking: function (a, b) {
      var steps = [];
      var da = String(a).split('').reverse().map(Number);
      var db = String(b).split('').reverse().map(Number);
      var places = ['Units', 'Tens', 'Hundreds', 'Thousands'];
      var n = Math.max(da.length, db.length);
      var carry = 0;
      for (var i = 0; i < n; i++) {
        var x = da[i] || 0, y = db[i] || 0;
        var sum = x + y + carry;
        steps.push({
          ask: (places[i] || 'Next') + ': ' + x + ' + ' + y +
               (carry ? ' + ' + carry + ' carried' : ''),
          answer: sum,
          hint: sum > 9 ? 'Write the last digit and carry the 1' : ''
        });
        carry = sum > 9 ? Math.floor(sum / 10) : 0;
      }
      if (carry) steps.push({ ask: 'The carry on the left', answer: carry, hint: '' });
      steps.push({ ask: 'Put the digits together. The answer is', answer: a + b, hint: '' });
      return steps;
    },

    /* ── MULTIPLICATION ── */
    by_eleven: function (a, b, L) {
      var n = (b === 11 || b === 111) ? a : b;
      var mult = (b === 11 || b === 111) ? b : a;
      if (mult === 111) {
        var d = dArr(n);
        return [
          { ask: 'For 111, each digit adds itself and its TWO neighbours',
            answer: n, hint: 'Start by writing ' + n + ' down' },
          { ask: 'Working through with carries, the answer is', answer: n * 111, hint: '' }
        ];
      }
      var ds = dArr(n);
      var steps = [{ ask: 'Write the first digit', answer: ds[0], hint: '' }];
      for (var i = 0; i < ds.length - 1; i++) {
        steps.push({ ask: 'Add the neighbours: ' + ds[i] + ' + ' + ds[i + 1],
                     answer: ds[i] + ds[i + 1], hint: 'Carry if it passes 9' });
      }
      steps.push({ ask: 'Write the last digit', answer: ds[ds.length - 1], hint: '' });
      steps.push({ ask: 'With the carries added, the answer is', answer: n * mult, hint: '' });
      return steps;
    },

    urdhva: function (a, b, L) {
      if (digits(a) === 2 && digits(b) === 2) {
        var a1 = Math.floor(a / 10), a0 = a % 10, b1 = Math.floor(b / 10), b0 = b % 10;
        return [
          { ask: 'Units, straight down: ' + a0 + ' x ' + b0, answer: a0 * b0, hint: 'Carry if it passes 9' },
          { ask: 'Crosswise: (' + a1 + 'x' + b0 + ') + (' + a0 + 'x' + b1 + ')',
            answer: a1 * b0 + a0 * b1, hint: 'This is where carries get lost' },
          { ask: 'Tens, straight down: ' + a1 + ' x ' + b1, answer: a1 * b1, hint: '' },
          { ask: 'Assemble with the carries. The answer is', answer: a * b, hint: '' }
        ];
      }
      if (digits(b) === 1 || digits(a) === 1) {
        var n = digits(a) === 1 ? b : a, k = digits(a) === 1 ? a : b;
        var u = n % 10, t = Math.floor(n / 10);
        return [
          { ask: 'Units: ' + u + ' x ' + k, answer: u * k, hint: 'Write the last digit, carry the rest' },
          { ask: 'Then the rest: ' + t + ' x ' + k, answer: t * k, hint: 'Add the carry' },
          { ask: 'So the answer is', answer: a * b, hint: '' }
        ];
      }
      return [
        { ask: 'Work crosswise from the right, one column at a time',
          answer: (a % 10) * (b % 10), hint: 'Start with the units product' },
        { ask: 'Carrying at each step, the answer is', answer: a * b, hint: '' }
      ];
    },

    ekadhikena: function (a, b, L) {
      var front = Math.floor(a / 10);
      return [
        { ask: 'Take the ' + front + ' and multiply by one more: ' + front + ' x ' + (front + 1),
          answer: front * (front + 1), hint: 'One more than the one before' },
        { ask: 'Write 25 after it. The answer is', answer: a * a,
          hint: 'A number ending in 5 always squares to something ending in 25' }
      ];
    },
    sq_2d_5: function (a, b, L) { return STEPS.ekadhikena(a, b, L); },
    sq_3d_5: function (a, b, L) { return STEPS.ekadhikena(a, b, L); },

    antyayor: function (a, b, L) {
      var d = L === 3 ? 10 : 10;
      var fa = Math.floor(a / d);
      var ua = a % 10, ub = b % 10;
      return [
        { ask: 'The leading part is ' + fa + '. Times one more: ' + fa + ' x ' + (fa + 1),
          answer: fa * (fa + 1), hint: '' },
        { ask: 'Multiply the units: ' + ua + ' x ' + ub, answer: ua * ub,
          hint: 'This part always fills two digits' },
        { ask: 'Put them together. The answer is', answer: a * b, hint: '' }
      ];
    },

    base_mult: function (a, b) {
      var da = S.deviation(a), db = S.deviation(b);
      var base = da.base, width = String(base).length - 1;
      var right = da.dev * db.dev;
      var left = a + db.dev;
      return [
        { ask: 'Which base are we near?', answer: base, hint: 'The nearest power of ten' },
        { ask: 'How far is ' + a + ' from ' + base + '?', answer: da.dev,
          hint: da.dev < 0 ? 'Below, so a minus' : 'Above, so a plus' },
        { ask: 'And ' + b + '?', answer: db.dev, hint: '' },
        { ask: 'Cross: ' + a + ' ' + (db.dev < 0 ? '- ' + Math.abs(db.dev) : '+ ' + db.dev),
          answer: left, hint: 'That is the left-hand part' },
        { ask: 'Multiply the differences: ' + da.dev + ' x ' + db.dev, answer: right,
          hint: 'Fill ' + width + ' digits, padding with a zero if needed' },
        { ask: 'So the answer is', answer: a * b, hint: '' }
      ];
    },

    working_base: function (a, b, L) {
      var bases = { 4: [50], 5: [200, 250, 500], 6: [50, 200, 250, 500, 2000] }[L] || [50];
      var wb = bases[0], best = Math.abs(a - wb);
      bases.forEach(function (x) { if (Math.abs(a - x) < best) { wb = x; best = Math.abs(a - x); } });
      var power = Math.pow(10, String(wb).length - 1);
      var ratio = wb / power;
      var da = a - wb, db = b - wb;
      return [
        { ask: 'Which working base is nearest?', answer: wb, hint: '' },
        { ask: 'How far is ' + a + ' from it?', answer: da, hint: '' },
        { ask: 'And ' + b + '?', answer: db, hint: '' },
        { ask: 'Cross: ' + a + ' ' + (db < 0 ? '- ' + Math.abs(db) : '+ ' + db),
          answer: a + db, hint: '' },
        { ask: 'Multiply by the ratio ' + ratio + ': ' + (a + db) + ' x ' + ratio,
          answer: (a + db) * ratio, hint: 'This is the step children forget' },
        { ask: 'Differences: ' + da + ' x ' + db, answer: da * db, hint: '' },
        { ask: 'So the answer is', answer: a * b, hint: '' }
      ];
    },

    by_nines: function (a, b) {
      var nine = /^9+$/.test(String(b)) ? b : a;
      var n = (nine === b) ? a : b;
      var len = String(nine).length;
      return [
        { ask: 'One less than ' + n, answer: n - 1, hint: 'Ekanyunena: one less than the one before' },
        { ask: 'And the complement of ' + n + ' from ' + Math.pow(10, len),
          answer: Math.pow(10, len) - n, hint: 'All from 9, last from 10' },
        { ask: 'So the answer is', answer: a * b, hint: 'The two parts side by side' }
      ];
    },

    mult_11s: function (a, b) {
      var m = (b % 11 === 0 && b !== 11) ? b : a;
      var n = (m === b) ? a : b;
      var k = m / 11;
      return [
        { ask: 'Split ' + m + ' into 11 x', answer: k, hint: '' },
        { ask: n + ' x 11, by the neighbour method', answer: n * 11, hint: '' },
        { ask: 'Now x ' + k + '. The answer is', answer: a * b, hint: '' }
      ];
    },

    twelve_to_19: function (a, b) {
      var m = (b >= 12 && b <= 19) ? b : a;
      var n = (m === b) ? a : b;
      var u = m % 10;
      return [
        { ask: 'The units of ' + m + ' is', answer: u, hint: '' },
        { ask: n + ' x 10', answer: n * 10, hint: '' },
        { ask: n + ' x ' + u, answer: n * u, hint: '' },
        { ask: 'Add them. The answer is', answer: a * b, hint: '' }
      ];
    },

    first_ten_last_same: function (a, b, L) {
      var fa = Math.floor(a / 10), fb = Math.floor(b / 10);
      var u = a % 10;
      /* Add u scaled by what the first parts total: u for 2-digit
         numbers (they total 10), 10u for 3-digit (they total 100).
         The last step always matched the answer, so this middle step
         being wrong at Level 6 went unnoticed until the working itself
         was checked. */
      var add = u * (fa + fb) / 10;
      return [
        { ask: 'Leading parts: ' + fa + ' x ' + fb, answer: fa * fb, hint: '' },
        { ask: 'Add ' + add + ' for the shared last digit', answer: fa * fb + add, hint: 'That is the left part' },
        { ask: 'Units squared: ' + u + ' x ' + u, answer: u * u, hint: 'Fills two digits' },
        { ask: 'So the answer is', answer: a * b, hint: '' }
      ];
    },

    by_5_25_50: function (a, b) {
      var m = [5, 25, 50, 500].indexOf(b) > -1 ? b : a;
      var n = (m === b) ? a : b;
      var map = { 5: [10, 2], 25: [100, 4], 50: [100, 2], 500: [1000, 2] }[m];
      return [
        { ask: m + ' is ' + map[0] + ' divided by ' + map[1] + '. So ' + n + ' x ' + map[0],
          answer: n * map[0], hint: 'Shift the point first' },
        { ask: 'Now divide by ' + map[1], answer: a * b, hint: '' }
      ];
    },

    repeating: function (a, b) {
      return [
        { ask: 'Both numbers repeat, so split the work',
          answer: Number(String(a)[0]) * Number(String(b)[0]),
          hint: 'Start with the single-digit product' },
        { ask: 'Building up the pattern, the answer is', answer: a * b, hint: '' }
      ];
    },

    /* ── DIVISION ── */
    /* A division answer is "14 r 2" when there is a remainder, and
       just "14" when there is not. The last step has to land on
       whichever of those the question shows, or the sequence walks a
       child to a different answer than the one being marked. */
    basic_div: function (a, b) {
      var q = Math.floor(a / b), r = a % b;
      if (!r) {
        return [
          { ask: 'Work from the left. How many ' + b + 's in ' + a + '?',
            answer: q, hint: 'It divides exactly, with nothing left over' }
        ];
      }
      return [
        { ask: 'How many whole ' + b + 's in ' + a + '?', answer: q, hint: 'Work from the left' },
        { ask: 'And what is left over?', answer: r, hint: '' },
        { ask: 'So the answer is', answer: q + ' r ' + r, hint: 'Quotient and remainder' }
      ];
    },
    adv_div: function (a, b) { return STEPS.basic_div(a, b); },
    div_5_25_50: function (a, b) {
      var map = { 5: [2, 10], 25: [4, 100], 50: [2, 100], 500: [2, 1000] }[b];
      return [
        { ask: 'Dividing by ' + b + ' is multiplying by ' + map[0] + ' then dividing by ' + map[1] +
               '. First ' + a + ' x ' + map[0], answer: a * map[0], hint: 'Double, then shift' },
        { ask: 'Now divide by ' + map[1], answer: a / b, hint: 'It divides exactly here' }
      ];
    },

    div_by_nine: function (a, b) {
      var ds = dArr(a);
      var run = [ds[0]];
      for (var i = 1; i < ds.length - 1; i++) run.push(run[i - 1] + ds[i]);
      return [
        { ask: 'First digit of ' + a + ' is the start of the answer', answer: ds[0], hint: '' },
        { ask: 'Add it to the next digit: ' + ds[0] + ' + ' + ds[1],
          answer: ds[0] + ds[1], hint: 'Keep a running sum' },
        { ask: 'The quotient is', answer: Math.floor(a / 9), hint: '' },
        { ask: 'And the remainder', answer: a % 9, hint: 'The digit sum, reduced' },
        { ask: 'So the answer is',
          answer: (a % 9) ? Math.floor(a / 9) + ' r ' + (a % 9) : Math.floor(a / 9),
          hint: '' }
      ];
    },

    /* ── SQUARES ── */
    sq_2d: function (a) {
      var t = Math.floor(a / 10), u = a % 10;
      return [
        { ask: 'Duplex of the units: ' + u + ' x ' + u, answer: u * u, hint: 'One digit, so just square it' },
        { ask: 'Duplex of both: 2 x ' + t + ' x ' + u, answer: 2 * t * u,
          hint: 'Two digits, so twice their product' },
        { ask: 'Duplex of the tens: ' + t + ' x ' + t, answer: t * t, hint: '' },
        { ask: 'Assemble right to left, carrying. The answer is', answer: a * a, hint: '' }
      ];
    },
    sq_3d: function (a) {
      var d = dArr(a);
      return [
        { ask: 'Duplex of ' + d[2] + ': ' + d[2] + ' x ' + d[2], answer: d[2] * d[2], hint: '' },
        { ask: 'Duplex of ' + d[1] + d[2] + ': 2 x ' + d[1] + ' x ' + d[2],
          answer: 2 * d[1] * d[2], hint: '' },
        { ask: 'Duplex of all three: 2 x ' + d[0] + ' x ' + d[2] + ' + ' + d[1] + ' x ' + d[1],
          answer: 2 * d[0] * d[2] + d[1] * d[1], hint: 'The middle digit squares itself' },
        { ask: 'Then outward again, and assemble. The answer is', answer: a * a, hint: '' }
      ];
    },
    sq_4d: function (a) {
      var d = dArr(a);
      return [
        { ask: 'Duplex of the last digit: ' + d[3] + ' x ' + d[3], answer: d[3] * d[3], hint: '' },
        { ask: 'Then working outward in pairs, duplex by duplex',
          answer: 2 * d[2] * d[3], hint: 'Twice the product of each pair' },
        { ask: 'Assembling all seven duplexes, the answer is', answer: a * a, hint: '' }
      ];
    },

    /* ── CUBES ── */
    cube_1d: function (a) {
      return [{ ask: a + ' x ' + a, answer: a * a, hint: '' },
              { ask: 'Now x ' + a + ' again', answer: a * a * a, hint: '' }];
    },
    cube_2d: function (a) {
      var t = Math.floor(a / 10), u = a % 10;
      return [
        { ask: 'The ratio is ' + u + '/' + t + '. First term: ' + t + ' cubed',
          answer: t * t * t, hint: '' },
        { ask: 'Second: ' + (t * t) + ' x ' + u, answer: t * t * u, hint: '' },
        { ask: 'Third: ' + t + ' x ' + (u * u), answer: t * u * u, hint: '' },
        { ask: 'Fourth: ' + u + ' cubed', answer: u * u * u, hint: '' },
        { ask: 'Double the middle two, add and carry. The answer is', answer: a * a * a,
          hint: 'The doubling is what children miss' }
      ];
    },
    cube_3d: function (a) {
      return [
        { ask: 'Square it first: ' + a + ' x ' + a, answer: a * a, hint: 'Use the duplex method' },
        { ask: 'Now multiply by ' + a + ' again', answer: a * a * a,
          hint: 'Vertically and crosswise' }
      ];
    },

    /* ── ROOTS ── */
    sqrt_perfect: function (a) {
      var r = Math.round(Math.sqrt(a));
      var lead = Math.floor(a / 100);
      return [
        { ask: 'Split ' + a + ' two digits at a time from the right. The left group is',
          answer: lead, hint: '' },
        { ask: 'Largest square that fits inside it', answer: Math.floor(Math.sqrt(lead)),
          hint: 'That is the first digit of the root' },
        { ask: 'The last digit is ' + (a % 10) + ', so the root ends in', answer: r % 10,
          hint: 'Each ending comes from one of two digits' },
        { ask: 'So the root is', answer: r, hint: '' }
      ];
    },
    cbrt_perfect: function (a) {
      var r = Math.round(Math.cbrt(a));
      return [
        { ask: 'The last digit is ' + (a % 10) + ', so the root ends in', answer: r % 10,
          hint: 'The pairs are 2 with 8, and 3 with 7' },
        { ask: 'The leading group gives the first digit', answer: Math.floor(r / 10), hint: '' },
        { ask: 'So the root is', answer: r, hint: '' }
      ];
    },

    /* ── NUMBER THEORY ── */
    digit_sum: function (a) {
      var once = dArr(a).reduce(function (x, y) { return x + y; }, 0);
      var steps = [{ ask: 'Add the digits of ' + a, answer: once, hint: '' }];
      if (once > 9) steps.push({ ask: 'Still above 9, so add again', answer: S.digitSum(a), hint: '' });
      return steps;
    },

    /* Divisibility answers Yes or No, not a number, so the steps end
       on the deciding figure and the screen shows the verdict. */
    divis_2_3_5_10: function (a, b) {
      if (b === 2) return [{ ask: 'Is the last digit of ' + a + ' even?',
                             answer: a % 2 === 0 ? 1 : 0, hint: '1 for yes, 0 for no' },
                           { ask: 'So is it divisible by 2?', answer: a % 2 === 0 ? 'Yes' : 'No', hint: '' }];
      if (b === 5) return [{ ask: 'Does ' + a + ' end in 0 or 5?', answer: (a % 10 === 0 || a % 10 === 5) ? 1 : 0,
                             hint: '1 for yes, 0 for no' },
                           { ask: 'So is it divisible by 5?', answer: a % 5 === 0 ? 'Yes' : 'No', hint: '' }];
      if (b === 10) return [{ ask: 'Does ' + a + ' end in 0?', answer: a % 10 === 0 ? 1 : 0, hint: '' },
                            { ask: 'So is it divisible by 10?', answer: a % 10 === 0 ? 'Yes' : 'No', hint: '' }];
      return [{ ask: 'Digit sum of ' + a, answer: S.digitSum(a), hint: 'Reduce to one digit' },
              { ask: 'Is that a multiple of 3?', answer: a % 3 === 0 ? 'Yes' : 'No',
                hint: 'If the digit sum divides by 3, so does the number' }];
    },
    divis_4_8_9: function (a, b) {
      if (b === 4) return [{ ask: 'The last two digits of ' + a + ' are', answer: a % 100, hint: '' },
                           { ask: 'Do they divide by 4?', answer: a % 4 === 0 ? 'Yes' : 'No', hint: '' }];
      if (b === 8) return [{ ask: 'The last three digits are', answer: a % 1000, hint: '' },
                           { ask: 'Do they divide by 8?', answer: a % 8 === 0 ? 'Yes' : 'No', hint: '' }];
      return [{ ask: 'Digit sum of ' + a, answer: S.digitSum(a), hint: '' },
              { ask: 'Is it 9?', answer: a % 9 === 0 ? 'Yes' : 'No',
                hint: 'A number divides by 9 exactly when its digit sum does' }];
    },
    divis_6_15: function (a, b) {
      var parts = b === 6 ? [2, 3] : [3, 5];
      return [
        { ask: b + ' is ' + parts[0] + ' x ' + parts[1] + '. Does ' + a + ' divide by ' + parts[0] + '?',
          answer: a % parts[0] === 0 ? 1 : 0, hint: '1 for yes, 0 for no' },
        { ask: 'And by ' + parts[1] + '?', answer: a % parts[1] === 0 ? 1 : 0, hint: '' },
        { ask: 'Both must hold. So by ' + b + '?', answer: a % b === 0 ? 'Yes' : 'No', hint: '' }
      ];
    },
    divis_7_13_19: function (a, b) {
      var osc = { 7: 5, 13: 4, 19: 2 }[b];
      var ds = dArr(a);
      var last = ds[ds.length - 1];
      var rest = Math.floor(a / 10);
      return [
        { ask: 'The osculator for ' + b + ' is ' + osc + '. Take the last digit: ' + last,
          answer: last, hint: '' },
        { ask: last + ' x ' + osc + ' + ' + rest, answer: last * osc + rest,
          hint: 'Repeat this until the number is small' },
        { ask: 'Carrying on, is ' + a + ' divisible by ' + b + '?',
          answer: a % b === 0 ? 'Yes' : 'No', hint: '' }
      ];
    },

    /* ── PERCENTAGES ── */
    percent_of: function (a, b) {
      if (b === 50) return [{ ask: '50% is a half. Half of ' + a, answer: a / 2, hint: '' }];
      if (b === 25) return [{ ask: 'Half of ' + a, answer: a / 2, hint: '25% is half of a half' },
                            { ask: 'Half again', answer: a / 4, hint: '' }];
      if (b === 10) return [{ ask: '10% is the number with the point moved. So', answer: a / 10, hint: '' }];
      return [
        { ask: '10% of ' + a, answer: a / 10, hint: 'Move the point one place' },
        { ask: 'Now x ' + (b / 10) + ' for ' + b + '%', answer: a * b / 100, hint: '' }
      ];
    },
    percent_fraction: function (a, b) {
      var pc = { 3: '33.33', 6: '16.66', 8: '12.5', 16: '6.25' }[b];
      var how = { 3: 'a third', 6: 'a sixth', 8: 'an eighth', 16: 'a sixteenth' }[b];
      if (b === 8) return [
        { ask: '12.5% is an eighth. Half of ' + a, answer: a / 2, hint: '' },
        { ask: 'Half again', answer: a / 4, hint: '' },
        { ask: 'And once more', answer: a / 8, hint: 'Three halvings make an eighth' }
      ];
      if (b === 16) return [
        { ask: '6.25% is a sixteenth. Half of ' + a, answer: a / 2, hint: '' },
        { ask: 'Keep halving: ', answer: a / 4, hint: '' },
        { ask: 'And again', answer: a / 8, hint: '' },
        { ask: 'Once more', answer: a / 16, hint: 'Four halvings make a sixteenth' }
      ];
      return [
        { ask: pc + '% is ' + how + '. So divide ' + a + ' by ' + b, answer: a / b, hint: '' }
      ];
    },
    percent_change: function (a, b) {
      var amt = a * Math.abs(b) / 100;
      return [
        { ask: Math.abs(b) + '% of ' + a, answer: amt, hint: '' },
        { ask: b > 0 ? 'Add it on' : 'Take it off', answer: a + (a * b / 100), hint: '' }
      ];
    }
  };

  /** Steps for one generated question, or null. */
  function forSum(q) {
    if (!q || !q.method) return null;
    var f = STEPS[q.method];
    if (!f) return null;
    try {
      /* the method's own scope for this level, which may be borrowed */
      var s = f(q.a, q.b, q.scopeLevel || q.level);
      return (s && s.length) ? s : null;
    } catch (e) {
      console.warn('Could not build steps for ' + q.method + ':', e.message);
      return null;
    }
  }

  /** Megha's rule: guided for the first few of a method, then not. */
  function shouldGuide(seenSoFar, opts) {
    return seenSoFar < ((opts && opts.guideFirst) || 3);
  }

  function coverage() {
    var all = Object.keys(S.METHODS).filter(function (k) { return S.METHODS[k].ready; });
    return {
      total: all.length,
      withSteps: all.filter(function (k) { return !!STEPS[k]; }).length,
      missing: all.filter(function (k) { return !STEPS[k]; })
    };
  }

  return { STEPS: STEPS, forSum: forSum, shouldGuide: shouldGuide, coverage: coverage };
})(typeof Sutras !== 'undefined' ? Sutras : require('./sutra-rules.js'));

if (typeof module !== 'undefined') module.exports = VedicSteps;

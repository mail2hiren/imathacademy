/* ============================================================
   iMathAcademy — Guided steps
   ------------------------------------------------------------
   Megha asked for the working to be shown in the app, and was
   specific about how:

     "Guided steps when a method is introduced — the first few
      questions at that level. Then answer-only with the working
      revealed for the rest, once they know it."

   So each method describes its own steps as a sequence the app can
   check one at a time. A child meeting Nikhilam for the first time
   is walked through it; by the tenth question they just answer.

   Each step has a prompt in plain words and a function that works
   out what the right answer to that step is. Nothing here is
   hardcoded to particular numbers.
   ============================================================ */

var VedicSteps = (function (S) {
  'use strict';

  function digits(n) { return String(Math.abs(n)).length; }
  function pad(n, width) {
    var s = String(Math.abs(n));
    while (s.length < width) s = '0' + s;
    return s;
  }

  /* Each entry returns an array of steps for that particular sum.
     A step is { ask, answer, hint }. */
  var STEPS = {

    allFromNine: function (a, b) {
      var base = Math.pow(10, digits(a) - (a % Math.pow(10, digits(a) - 1) === 0 ? 0 : 0));
      // work against the plain power of ten, then add the multiple back
      var p = Math.pow(10, String(b).length);
      while (p < b) p *= 10;
      var ds = String(b).split('').map(Number);
      var steps = [];
      ds.forEach(function (d, i) {
        var last = i === ds.length - 1;
        steps.push({
          ask: last ? 'Last digit: 10 \u2212 ' + d : (i === 0 ? 'First digit: 9 \u2212 ' + d : 'Next: 9 \u2212 ' + d),
          answer: last ? 10 - d : 9 - d,
          hint: last ? 'The last one comes off 10' : 'All the others come off 9'
        });
      });
      steps.push({ ask: 'So the answer is', answer: a - b, hint: 'Put the digits together' });
      return steps;
    },

    complement: function (a, b) {
      return [
        { ask: 'What does ' + a + ' need to reach ' + b + '?', answer: b - a,
          hint: 'All from 9, and the last from 10' }
      ];
    },

    doubling: function (a) {
      var t = Math.floor(a / 10) * 10, u = a % 10;
      return [
        { ask: 'Double the tens: ' + t + ' \u00d7 2', answer: t * 2, hint: '' },
        { ask: 'Double the units: ' + u + ' \u00d7 2', answer: u * 2, hint: '' },
        { ask: 'Add them: ' + (t * 2) + ' + ' + (u * 2), answer: a * 2, hint: 'Watch the carry' }
      ];
    },

    halving: function (a) {
      return [{ ask: 'Half of ' + a, answer: a / 2, hint: 'Halve the tens, then the units' }];
    },

    byEleven: function (a, b) {
      var n = a === 11 ? b : a;
      var ds = String(n).split('').map(Number);
      var steps = [{ ask: 'Write the first digit', answer: ds[0], hint: '' }];
      for (var i = 0; i < ds.length - 1; i++) {
        steps.push({
          ask: 'Add the neighbours: ' + ds[i] + ' + ' + ds[i + 1],
          answer: ds[i] + ds[i + 1],
          hint: 'If it goes past 9, carry to the left'
        });
      }
      steps.push({ ask: 'Write the last digit', answer: ds[ds.length - 1], hint: '' });
      steps.push({ ask: 'So the answer is', answer: n * 11, hint: 'With any carries added' });
      return steps;
    },

    ekadhikena: function (a) {
      var front = Math.floor(a / 10);
      return [
        { ask: 'Take the ' + front + ' and multiply by one more: ' + front + ' \u00d7 ' + (front + 1),
          answer: front * (front + 1), hint: 'One more than the one before' },
        { ask: 'Write 25 after it. The answer is', answer: a * a,
          hint: 'A number ending in 5 always squares to something ending in 25' }
      ];
    },

    antyayor: function (a, b) {
      var t = Math.floor(a / 10);
      var ua = a % 10, ub = b % 10;
      return [
        { ask: 'Tens digit ' + t + ', times one more: ' + t + ' \u00d7 ' + (t + 1),
          answer: t * (t + 1), hint: '' },
        { ask: 'Multiply the units: ' + ua + ' \u00d7 ' + ub,
          answer: ua * ub, hint: 'This part always fills two digits' },
        { ask: 'Put them together. The answer is', answer: a * b, hint: '' }
      ];
    },

    nikhilamMult: function (a, b) {
      var d = S.deviation(a), e = S.deviation(b);
      var base = d.base;
      var width = String(base).length - 1;
      var right = d.dev * e.dev;
      var left = a + e.dev;                 // cross-add works for both signs
      return [
        { ask: 'Which base are we working from?', answer: base,
          hint: 'The nearest power of ten' },
        { ask: 'How far is ' + a + ' from ' + base + '?', answer: d.dev,
          hint: d.dev < 0 ? 'Below, so a minus' : 'Above, so a plus' },
        { ask: 'And ' + b + '?', answer: e.dev, hint: '' },
        { ask: 'Cross: ' + a + ' ' + (e.dev < 0 ? '\u2212 ' + Math.abs(e.dev) : '+ ' + e.dev),
          answer: left, hint: 'That is the left-hand part' },
        { ask: 'Multiply the differences: ' + Math.abs(d.dev) + ' \u00d7 ' + Math.abs(e.dev),
          answer: Math.abs(right), hint: 'Fill ' + width + ' digits \u2014 pad with a zero if needed' },
        { ask: 'So the answer is', answer: a * b, hint: '' }
      ];
    },

    workingBase: function (a, b) {
      var w = S.nearestWorkingBase(a);
      var base = w.base;
      var power = Math.pow(10, String(base).length - 1);
      var ratio = base / power;
      var da = a - base, db = b - base;
      return [
        { ask: 'Which working base is nearest?', answer: base, hint: '' },
        { ask: 'How far is ' + a + ' from it?', answer: da, hint: '' },
        { ask: 'And ' + b + '?', answer: db, hint: '' },
        { ask: 'Cross: ' + a + ' ' + (db < 0 ? '\u2212 ' + Math.abs(db) : '+ ' + db),
          answer: a + db, hint: '' },
        { ask: 'Multiply by the ratio ' + ratio + ': ' + (a + db) + ' \u00d7 ' + ratio,
          answer: (a + db) * ratio, hint: 'This is the step children forget' },
        { ask: 'Differences: ' + Math.abs(da) + ' \u00d7 ' + Math.abs(db),
          answer: Math.abs(da * db), hint: '' },
        { ask: 'So the answer is', answer: a * b, hint: '' }
      ];
    },

    duplex: function (a) {
      var t = Math.floor(a / 10), u = a % 10;
      return [
        { ask: 'Duplex of the units: ' + u + '\u00b2', answer: u * u, hint: 'One digit, so just square it' },
        { ask: 'Duplex of both: 2 \u00d7 ' + t + ' \u00d7 ' + u, answer: 2 * t * u,
          hint: 'Two digits, so twice their product' },
        { ask: 'Duplex of the tens: ' + t + '\u00b2', answer: t * t, hint: '' },
        { ask: 'Assemble them. The answer is', answer: a * a, hint: 'Right to left, carrying' }
      ];
    },

    yavadunam: function (a) {
      var d = S.deviation(a);
      var width = String(d.base).length - 1;
      return [
        { ask: 'How far is ' + a + ' from ' + d.base + '?', answer: d.dev, hint: '' },
        { ask: a + ' ' + (d.dev < 0 ? '\u2212 ' + Math.abs(d.dev) : '+ ' + d.dev),
          answer: a + d.dev, hint: 'That is the left-hand part' },
        { ask: 'The deficiency squared: ' + Math.abs(d.dev) + '\u00b2',
          answer: d.dev * d.dev, hint: 'Fill ' + width + ' digits' },
        { ask: 'So the answer is', answer: a * a, hint: '' }
      ];
    },

    cubing: function (a) {
      var t = Math.floor(a / 10), u = a % 10;
      return [
        { ask: 'The ratio is ' + u + '/' + t + '. First term: ' + t + '\u00b3',
          answer: t * t * t, hint: '' },
        { ask: 'Second: ' + (t * t) + ' \u00d7 ' + u, answer: t * t * u, hint: '' },
        { ask: 'Third: ' + t + ' \u00d7 ' + (u * u), answer: t * u * u, hint: '' },
        { ask: 'Fourth: ' + u + '\u00b3', answer: u * u * u, hint: '' },
        { ask: 'Double the middle two and add. The answer is', answer: a * a * a,
          hint: 'The doubling is what children miss' }
      ];
    },

    nikhilamDiv: function (a, b) {
      var d = S.deviation(b);
      var r = a % b;
      return [
        { ask: 'The complement of ' + b + ' is', answer: Math.abs(d.dev),
          hint: 'How far below ' + d.base },
        { ask: 'Working through, the quotient is', answer: Math.floor(a / b), hint: '' },
        { ask: 'And the remainder', answer: r, hint: '' }
      ];
    },

    paravartya: function (a, b) {
      var d = S.deviation(b);
      return [
        { ask: 'Transpose ' + b + ' \u2014 the digit becomes', answer: -d.dev,
          hint: 'Above the base, so it turns negative' },
        { ask: 'The quotient is', answer: Math.floor(a / b), hint: '' },
        { ask: 'And the remainder', answer: a % b, hint: '' }
      ];
    },

    dhwajanka: function (a, b) {
      var flag = b % 10, div = Math.floor(b / 10);
      return [
        { ask: 'Flag the last digit. What is left to divide by?', answer: div, hint: '' },
        { ask: 'And the flag is', answer: flag, hint: 'Subtract its product at each step' },
        { ask: 'The quotient is', answer: Math.floor(a / b), hint: '' },
        { ask: 'And the remainder', answer: a % b, hint: '' }
      ];
    },

    squareRoot: function (a) {
      var r = Math.round(Math.sqrt(a));
      var last = a % 10;
      return [
        { ask: 'Split into pairs from the right. What is the left group?',
          answer: Math.floor(a / 100), hint: '' },
        { ask: 'Largest square that fits in it', answer: Math.floor(Math.sqrt(Math.floor(a / 100))),
          hint: 'That is the first digit of the root' },
        { ask: 'The last digit is ' + last + ', so the root ends in', answer: r % 10,
          hint: 'Squares ending in ' + last + ' come from roots ending in a set pair' },
        { ask: 'So the root is', answer: r, hint: '' }
      ];
    },

    cubeRoot: function (a) {
      var r = Math.round(Math.cbrt(a));
      return [
        { ask: 'The last digit is ' + (a % 10) + ', so the root ends in', answer: r % 10,
          hint: 'The pairs are 2 with 8, and 3 with 7' },
        { ask: 'The leading group gives the first digit', answer: Math.floor(r / 10), hint: '' },
        { ask: 'So the root is', answer: r, hint: '' }
      ];
    },

    digitSum: function (a) {
      var once = String(a).split('').reduce(function (s, c) { return s + Number(c); }, 0);
      var steps = [{ ask: 'Add the digits of ' + a, answer: once, hint: '' }];
      if (once > 9) steps.push({ ask: 'Still more than 9 \u2014 add again', answer: S.digitSum(a), hint: '' });
      return steps;
    },

    stacking: function (a, b) {
      var ua = a % 10, ub = b % 10;
      return [
        { ask: 'Units: ' + ua + ' + ' + ub, answer: ua + ub, hint: 'Carry if it passes 9' },
        { ask: 'Then the tens, with any carry. The answer is', answer: a + b, hint: '' }
      ];
    },

    splitMerge: function (a, b) {
      var round = Math.round(b / 10) * 10;
      var adjust = round - b;
      return [
        { ask: 'Round ' + b + ' to', answer: round, hint: 'The nearest ten' },
        { ask: a + ' + ' + round, answer: a + round, hint: '' },
        { ask: adjust > 0 ? 'Now take back ' + adjust : 'Now add ' + Math.abs(adjust),
          answer: a + b, hint: 'We changed it, so change it back the other way' }
      ];
    },

    urdhva: function (a, b) {
      var a1 = Math.floor(a / 10), a0 = a % 10;
      var b1 = Math.floor(b / 10), b0 = b % 10;
      if (String(a).length === 2 && String(b).length === 2) {
        return [
          { ask: 'Units, vertically: ' + a0 + ' \u00d7 ' + b0, answer: a0 * b0,
            hint: 'Carry if it passes 9' },
          { ask: 'Crosswise: (' + a1 + '\u00d7' + b0 + ') + (' + a0 + '\u00d7' + b1 + ')',
            answer: a1 * b0 + a0 * b1, hint: 'This is where carries get lost' },
          { ask: 'Tens, vertically: ' + a1 + ' \u00d7 ' + b1, answer: a1 * b1, hint: '' },
          { ask: 'So the answer is', answer: a * b, hint: '' }
        ];
      }
      return [{ ask: a + ' \u00d7 ' + b, answer: a * b, hint: 'Vertically and crosswise' }];
    }
  };

  /** The steps for one generated sum, or null if the method has none. */
  function forSum(q) {
    var f = STEPS[q.method];
    if (!f) return null;
    try {
      var s = f(q.a, q.b);
      return (s && s.length) ? s : null;
    } catch (e) {
      console.warn('Could not build steps for ' + q.method + ':', e.message);
      return null;
    }
  }

  /* Whether this question should be guided. Megha's rule: the first
     few of a method, then answer-only. */
  function shouldGuide(seenSoFar, opts) {
    var upto = (opts && opts.guideFirst) || 3;
    return seenSoFar < upto;
  }

  return { STEPS: STEPS, forSum: forSum, shouldGuide: shouldGuide };
})(typeof Sutras !== 'undefined' ? Sutras : require('./sutra-rules.js'));

if (typeof module !== 'undefined') module.exports = VedicSteps;

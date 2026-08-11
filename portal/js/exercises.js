/* ============================================================
   iMathAcademy — The other exercise shapes
   ------------------------------------------------------------
   Fill blank, Match pairs, Picture sums, Colour by answer and
   Mixed were the last activities still handed to the AI, which
   does not know what a bead can do. Every one of them is really
   the same thing underneath: a sum that has already passed the
   bead rules, shown a different way.

   So the sum is made and checked first, exactly as for column
   work and word problems. Only the presentation differs.
   ============================================================ */

var Exercises = (function () {
  'use strict';

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

  /** A sum for this level that a child can actually work. */
  function makeSum(rules, ceiling, rows, mode) {
    var m = mode || (rules.formulas.length ? pick(rules.formulas) : 'direct');
    for (var t = 0; t < 40; t++) {
      var s = ColumnGen.column({
        max: ceiling, rows: rows, mode: m,
        require: m === 'direct' ? 0 : 1,
        allowZero: rules.allowZero
      });
      if (!s) continue;
      // The same last gate everything else goes through
      var v = s.rows[0], ok = true;
      for (var i = 1; i < s.rows.length; i++) {
        var kinds = Beads.stepKinds(v, s.rows[i]);
        for (var k = 0; k < kinds.length; k++) {
          if (kinds[k] === 'small' && rules.formulas.indexOf('small') < 0) ok = false;
          if (kinds[k] === 'big'   && rules.formulas.indexOf('big')   < 0) ok = false;
        }
        v += s.rows[i];
        if (v > rules.maxNumber || v < 0) ok = false;
      }
      if (ok && v === s.answer) return s;
    }
    return null;
  }

  function sumText(rows) {
    return rows.map(function (n, i) {
      return i === 0 ? String(n) : (n < 0 ? '− ' + Math.abs(n) : '+ ' + n);
    }).join(' ');
  }

  /* ── Missing number ───────────────────────────────────────
     "7 + ___ = 11". The strongest exercise at L1, because the
     child cannot reach the answer without the formula — there is
     nowhere to guess from.
     ─────────────────────────────────────────────────────── */
  function fillBlank(rules, ceiling) {
    var s = makeSum(rules, ceiling, randInt(2, 3));
    if (!s) return null;

    // Hide one of the steps, not the total — hiding the total is
    // just an ordinary sum with a different mark at the end.
    var hide = randInt(1, s.rows.length - 1);
    var shown = s.rows.map(function (n, i) {
      if (i === 0) return String(n);
      if (i === hide) return (n < 0 ? '− ___' : '+ ___');
      return n < 0 ? '− ' + Math.abs(n) : '+ ' + n;
    }).join(' ');

    return {
      type: 'fill_blank',
      question: shown + ' = ' + s.answer,
      answer: String(Math.abs(s.rows[hide])),
      hint: 'Which number is missing?',
      rows: s.rows
    };
  }

  /* ── Match pairs ──────────────────────────────────────────── */
  function matchPairs(rules, ceiling, howMany) {
    var pairs = [], seen = {};
    for (var t = 0; t < (howMany || 5) * 12 && pairs.length < (howMany || 5); t++) {
      var s = makeSum(rules, ceiling, 2);
      if (!s || seen[s.answer]) continue;      // answers must differ or it cannot be matched
      seen[s.answer] = true;
      pairs.push({ left: sumText(s.rows), right: String(s.answer), rows: s.rows });
    }
    if (pairs.length < 2) return null;
    return {
      type: 'match_pairs',
      question: 'Match each sum to its answer',
      pairs: pairs,
      answer: pairs.map(function (p) { return p.left + ' = ' + p.right; }).join('; '),
      hint: 'Work each one on your abacus first'
    };
  }

  /* ── Picture sums ─────────────────────────────────────────
     Beads on a rod rather than digits. A child who cannot yet read
     numbers confidently can still count what they see.
     ─────────────────────────────────────────────────────── */
  function pictureSum(rules, ceiling) {
    var s = makeSum(rules, Math.min(ceiling, 20), 2);
    if (!s) return null;
    return {
      type: 'picture',
      question: sumText(s.rows) + ' = ?',
      beadsFor: s.rows[0],       // the abacus shows the starting number
      answer: String(s.answer),
      hint: 'Read the beads, then move them',
      rows: s.rows
    };
  }

  /* ── Colour by answer ─────────────────────────────────────── */
  var PALETTE = [
    { name: 'red',    hex: '#E53935' }, { name: 'blue',   hex: '#1E88E5' },
    { name: 'green',  hex: '#43A047' }, { name: 'yellow', hex: '#FDD835' },
    { name: 'purple', hex: '#8E24AA' }, { name: 'orange', hex: '#FB8C00' }
  ];

  function colourAnswer(rules, ceiling, howMany) {
    var n = howMany || 6;
    var band = Math.max(1, Math.ceil(ceiling / PALETTE.length));
    var items = [];
    for (var t = 0; t < n * 12 && items.length < n; t++) {
      var s = makeSum(rules, ceiling, 2);
      if (!s) continue;
      var idx = Math.min(PALETTE.length - 1, Math.floor(s.answer / band));
      items.push({ sum: sumText(s.rows), answer: s.answer,
                   colour: PALETTE[idx].name, hex: PALETTE[idx].hex, rows: s.rows });
    }
    if (!items.length) return null;

    var keyLines = PALETTE.map(function (c, i) {
      var lo = i * band, hi = (i === PALETTE.length - 1) ? ceiling : (i + 1) * band - 1;
      return lo + '–' + hi + ' = ' + c.name;
    }).join(', ');

    return {
      type: 'colour',
      question: 'Work out each sum, then colour it: ' + keyLines,
      items: items,
      answer: items.map(function (i) { return i.sum + ' = ' + i.answer + ' (' + i.colour + ')'; }).join('; '),
      hint: 'Answer first, colour after'
    };
  }

  /* ── Mixed ────────────────────────────────────────────────── */
  function mixed(rules, ceiling) {
    var makers = [
      function () { return fillBlank(rules, ceiling); },
      function () { return pictureSum(rules, ceiling); },
      function () {
        var s = makeSum(rules, ceiling, randInt(2, 3));
        return s ? { type: 'calculation', question: sumText(s.rows) + ' = ?',
                     answer: String(s.answer), hint: '', rows: s.rows } : null;
      },
      function () {
        var s = makeSum(rules, ceiling, randInt(2, 3));
        return s && typeof WordProblems !== 'undefined' ? (function () {
          var w = WordProblems.dress(s);
          return w ? { type: 'story', question: w.question, answer: String(w.answer),
                       emoji: w.emoji, speak: true, rows: s.rows } : null;
        })() : null;
      }
    ];
    for (var t = 0; t < 20; t++) {
      var q = pick(makers)();
      if (q) return q;
    }
    return null;
  }

  /**
   * A whole page of one kind, getting harder as it goes.
   */
  function page(kind, rules, count) {
    var out = [], guard = 0;
    var n = count || 10;

    // These make one question containing many parts, not many questions
    if (kind === 'match_pairs') {
      var m = matchPairs(rules, rules.maxNumber, Math.min(6, n));
      return m ? [m] : [];
    }
    if (kind === 'colour_answer') {
      var c = colourAnswer(rules, rules.maxNumber, Math.min(8, n));
      return c ? [c] : [];
    }

    while (out.length < n && guard < n * 30) {
      guard++;
      var through = out.length / n;
      var ceiling = Math.max(9, Math.round(9 + (rules.maxNumber - 9) * Math.pow(through, 1.4)));
      var q = kind === 'fill_blank'   ? fillBlank(rules, ceiling)
            : kind === 'picture_sums' ? pictureSum(rules, ceiling)
            : mixed(rules, ceiling);
      if (q) out.push(q);
    }
    return out;
  }

  return {
    makeSum: makeSum, sumText: sumText,
    fillBlank: fillBlank, matchPairs: matchPairs,
    pictureSum: pictureSum, colourAnswer: colourAnswer,
    mixed: mixed, page: page, PALETTE: PALETTE
  };
})();

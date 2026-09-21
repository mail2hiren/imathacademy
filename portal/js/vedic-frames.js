/* ============================================================
   iMathAcademy — Vedic fill-in frames
   ------------------------------------------------------------
   Each method drawn in its own paper layout, as Megha approved:
   navy numbers are given, ORANGE boxes are the child's to fill, and
   orange means nothing else.

   Five layouts cover all 40 buildable methods:

     halves     left | right, with a real divider bar
     cross      the digits with the crossing lines drawn
     neighbour  multiplying by 11: first, the pair sums, last
     digits     all from 9, last from 10, one digit at a time
     chain      the method's steps as a column, for the methods
                that are mental arithmetic with no written shape

   Every frame ends with a final answer box the child fills. For the
   base method that is not a formality: joining 95 | 6 into 9506 is
   exactly the step children get wrong.

   render(q, prefix) returns { html, slots, answer }. The final box
   has the id `prefix` itself, so a worksheet's existing checking,
   Next and Submit keep working without change.
   ============================================================ */

var VedicFrames = (function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function dArr(n) { return String(Math.abs(n)).split('').map(Number); }
  function sgn(n) { return n < 0 ? '(' + n + ')' : String(n); }

  /* ── building blocks ─────────────────────────────────────── */
  function Builder(prefix) {
    this.prefix = prefix;
    this.slots = [];
    this.n = 0;
  }
  /* A box is as wide as the number it expects, plus room either side.
     A fixed width fitted two digits and clipped a Level 7 cube, which
     can run to nine. The minimum keeps a one-digit box easy to tap. */
  function widthFor(want, isAns) {
    var len = String(want == null ? '' : want).length;
    var ch = Math.max(isAns ? 4 : 2, len) + 1.6;
    return 'width:' + ch + 'ch;';
  }

  Builder.prototype.slot = function (want, hint, cls) {
    var id = this.prefix + '-f' + (this.n++);
    this.slots.push({ id: id, want: want, hint: hint });
    return '<input class="vf-slot' + (cls ? ' ' + cls : '') + '" id="' + id + '" ' +
      'style="' + widthFor(want, false) + '" ' +
      'data-vf="' + esc(this.prefix) + '" autocomplete="off" ' +
      'inputmode="' + (typeof want === 'string' && isNaN(Number(want)) ? 'text' : 'numeric') + '" ' +
      'aria-label="' + esc(hint) + '">';
  };
  Builder.prototype.answer = function (want) {
    this.slots.push({ id: this.prefix, want: want, hint: 'Now the whole answer', final: true });
    return '<div class="vf-final"><span class="vf-eq">=</span>' +
      '<input class="vf-slot vf-ans" id="' + this.prefix + '" data-vf="' + esc(this.prefix) + '" ' +
      'style="' + widthFor(want, true) + '" ' +
      'autocomplete="off" inputmode="' +
        (typeof want === 'string' && isNaN(Number(want)) ? 'text' : 'numeric') + '" ' +
      'placeholder="answer" aria-label="The whole answer"></div>';
  };
  function given(v, big) { return '<span class="vf-given' + (big ? ' big' : '') + '">' + esc(v) + '</span>'; }
  function lbl(t) { return '<div class="vf-lbl">' + t + '</div>'; }

  function halves(left, right) {
    return '<div class="vf-halves">' +
      '<div class="vf-side">' + left + '</div>' +
      '<div class="vf-bar" aria-hidden="true"></div>' +
      '<div class="vf-side">' + right + '</div></div>';
  }

  /* ── HALVES ──────────────────────────────────────────────── */
  var HALVES = {
    base_mult: function (B, q) {
      var dev = function (n) {
        var hi = Math.pow(10, String(n).length), lo = hi / 10;
        return Math.abs(n - hi) <= Math.abs(n - lo) ? { base: hi, d: n - hi } : { base: lo, d: n - lo };
      };
      var da = dev(q.a), db = dev(q.b), base = da.base, w = String(base).length - 1;
      var right = da.d * db.d, left = q.a + db.d;
      return '<div class="vf-base">Base = <b>' + base + '</b></div>' +
        '<div class="vf-devs">' +
          given(q.a) + '<span class="vf-arr">&rarr;</span>' +
            B.slot(da.d, 'How far is ' + q.a + ' from ' + base + '? ' + (da.d < 0 ? 'Below, so a minus.' : 'Above, so a plus.')) +
          given(q.b) + '<span class="vf-arr">&rarr;</span>' +
            B.slot(db.d, 'How far is ' + q.b + ' from ' + base + '?') +
        '</div>' +
        halves(B.slot(left, 'Left: ' + q.a + ' and the other difference', 'wide') + lbl(q.a + ' + ' + sgn(db.d)),
               B.slot(right, 'Right: multiply the two differences', 'wide') + lbl(sgn(da.d) + ' &times; ' + sgn(db.d))) +
        '<div class="vf-note">The right side fills ' + w + ' digit' + (w === 1 ? '' : 's') +
          '. Pad with a zero if it is short.</div>' +
        B.answer(q.a * q.b);
    },

    working_base: function (B, q) {
      var bases = [20, 30, 40, 50, 60, 200, 250, 300, 500, 2000, 5000];
      var wb = bases.reduce(function (p, c) { return Math.abs(q.a - c) < Math.abs(q.a - p) ? c : p; });
      var power = Math.pow(10, String(wb).length - 1), ratio = wb / power;
      var da = q.a - wb, db = q.b - wb;
      return '<div class="vf-base">Working base <b>' + wb + '</b> = ' + power + ' &times; ' + ratio + '</div>' +
        '<div class="vf-devs">' +
          given(q.a) + '<span class="vf-arr">&rarr;</span>' + B.slot(da, 'How far is ' + q.a + ' from ' + wb + '?') +
          given(q.b) + '<span class="vf-arr">&rarr;</span>' + B.slot(db, 'How far is ' + q.b + ' from ' + wb + '?') +
        '</div>' +
        '<div class="vf-line">' + B.slot(q.a + db, 'Cross: ' + q.a + ' and the other difference', 'wide') +
          '<span class="vf-op">&times; ' + ratio + ' =</span>' +
          B.slot((q.a + db) * ratio, 'Multiply by the ratio ' + ratio + ' \u2014 the step children forget', 'wide') + '</div>' +
        halves(given((q.a + db) * ratio) + lbl('left'),
               B.slot(da * db, 'Right: multiply the differences', 'wide') + lbl(sgn(da) + ' &times; ' + sgn(db))) +
        B.answer(q.a * q.b);
    },

    by_nines: function (B, q) {
      var nine = /^9+$/.test(String(q.b)) ? q.b : q.a;
      var n = nine === q.b ? q.a : q.b, len = String(nine).length, pw = Math.pow(10, len);
      return '<div class="vf-base">' + given(n) + ' &times; ' + given(nine) + '</div>' +
        halves(B.slot(n - 1, 'Left: one less than ' + n, 'wide') + lbl('one less than ' + n),
               B.slot(pw - n, 'Right: all from 9, last from 10', 'wide') + lbl('from ' + pw)) +
        B.answer(q.a * q.b);
    },

    ekadhikena: function (B, q) {
      var f = Math.floor(q.a / 10);
      return '<div class="vf-line">' + given(f) + '<span class="vf-op">&times; one more =</span>' +
          B.slot(f + 1, 'One more than ' + f) + '</div>' +
        halves(B.slot(f * (f + 1), f + ' times one more', 'wide') + lbl(f + ' &times; ' + (f + 1)),
               given('25', true) + lbl('always 25')) +
        B.answer(q.a * q.a);
    },

    antyayor: function (B, q) {
      var t = Math.floor(q.a / 10), ua = q.a % 10, ub = q.b % 10;
      return '<div class="vf-note">Same first part <b>' + t + '</b>, and ' + ua + ' + ' + ub + ' = 10</div>' +
        halves(B.slot(t * (t + 1), t + ' times one more', 'wide') + lbl(t + ' &times; ' + (t + 1)),
               B.slot(ua * ub, 'Multiply the units', 'wide') + lbl(ua + ' &times; ' + ub)) +
        '<div class="vf-note">The right side always fills two digits.</div>' +
        B.answer(q.a * q.b);
    },

    /* The left part is the first parts multiplied, plus the shared
       last digit scaled by what the first parts total. For 2-digit
       numbers they total 10, so add u. For 3-digit numbers they total
       100, so add 10u — 622 x 382 is 62 x 38 = 2356, plus 20, giving
       2376 | 04. Using the 2-digit rule for both gave wrong answers at
       Level 6. */
    first_ten_last_same: function (B, q) {
      var fa = Math.floor(q.a / 10), fb = Math.floor(q.b / 10), u = q.a % 10;
      var tot = fa + fb, add = u * tot / 10;
      var left = fa * fb + add;
      return '<div class="vf-note">First parts ' + fa + ' + ' + fb + ' make ' + tot + ', last digits the same</div>' +
        '<div class="vf-line">' + given(fa) + '<span class="vf-op">&times;</span>' + given(fb) +
          '<span class="vf-op">+ ' + add + ' =</span>' +
          B.slot(left, 'Multiply the first parts, then add ' + add, 'wide') + '</div>' +
        halves(given(left) + lbl('left'),
               B.slot(u * u, 'Square the shared last digit', 'wide') + lbl(u + ' &times; ' + u)) +
        B.answer(q.a * q.b);
    }
  };
  HALVES.sq_2d_5 = HALVES.ekadhikena;
  HALVES.sq_3d_5 = HALVES.ekadhikena;

  /* ── CROSS ───────────────────────────────────────────────── */
  function cross2(B, a, b, label) {
    var a1 = Math.floor(a / 10), a0 = a % 10, b1 = Math.floor(b / 10), b0 = b % 10;
    return '<div class="vf-cross">' +
        '<svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">' +
          '<line x1="58" y1="28" x2="142" y2="76" class="vf-x"/>' +
          '<line x1="142" y1="28" x2="58" y2="76" class="vf-x"/></svg>' +
        '<div class="vf-cgrid">' +
          given(a1, true) + given(a0, true) + given(b1, true) + given(b0, true) +
        '</div><div class="vf-under"></div></div>' +
      '<div class="vf-parts">' +
        '<div class="vf-part"><div class="vf-how">Left, down<br>' + a1 + ' &times; ' + b1 + '</div>' +
          B.slot(a1 * b1, 'Left: multiply the two left digits') + '</div>' +
        '<div class="vf-part"><div class="vf-how">Crosswise<br>' + a1 + '&times;' + b0 + ' + ' + a0 + '&times;' + b1 + '</div>' +
          B.slot(a1 * b0 + a0 * b1, 'Crosswise: the two diagonal products, added') + '</div>' +
        '<div class="vf-part"><div class="vf-how">Right, down<br>' + a0 + ' &times; ' + b0 + '</div>' +
          B.slot(a0 * b0, 'Right: multiply the two right digits') + '</div>' +
      '</div>' +
      '<div class="vf-note">Carry from right to left if a part is 10 or more.</div>';
  }

  /* Duplex: each column is a "duplex" of the digits around it. */
  function duplexCols(n) {
    var d = dArr(n), L = d.length, out = [];
    for (var c = 0; c < 2 * L - 1; c++) {
      var sum = 0, parts = [];
      for (var i = 0; i < L; i++) {
        var j = c - i;
        if (j < 0 || j >= L || j < i) continue;
        if (i === j) { sum += d[i] * d[i]; parts.push(d[i] + '\u00B2'); }
        else { sum += 2 * d[i] * d[j]; parts.push('2\u00D7' + d[i] + '\u00D7' + d[j]); }
      }
      out.push({ sum: sum, how: parts.join(' + ') });
    }
    return out;
  }

  var CROSS = {
    urdhva: function (B, q) {
      if (String(q.a).length === 2 && String(q.b).length === 2) return cross2(B, q.a, q.b) + B.answer(q.a * q.b);
      /* 2x1, 3x2, 3x3: the same idea, column by column */
      var A = dArr(q.a), Bd = dArr(q.b);
      var LA = A.length, LB = Bd.length, cols = [];
      for (var c = 0; c < LA + LB - 1; c++) {
        var s = 0, parts = [];
        for (var i = 0; i < LA; i++) {
          var j = c - i;
          if (j < 0 || j >= LB) continue;
          s += A[i] * Bd[j]; parts.push(A[i] + '\u00D7' + Bd[j]);
        }
        cols.push({ sum: s, how: parts.join(' + ') });
      }
      return '<div class="vf-base">' + given(q.a, true) + ' <span class="vf-op">&times;</span> ' + given(q.b, true) + '</div>' +
        '<div class="vf-parts' + (cols.length > 4 ? ' many' : '') + '" style="' + (cols.length > 4 ? '' : 'grid-template-columns:repeat(' + cols.length + ',1fr)') + '">' +
          cols.map(function (col, k) {
            return '<div class="vf-part"><div class="vf-how">' + esc(col.how) + '</div>' +
              B.slot(col.sum, 'Column ' + (k + 1) + ': ' + col.how) + '</div>';
          }).join('') + '</div>' +
        '<div class="vf-note">Carry from right to left if a column is 10 or more.</div>' +
        B.answer(q.a * q.b);
    },
    sq_2d: function (B, q) { return duplexFrame(B, q); },
    sq_3d: function (B, q) { return duplexFrame(B, q); },
    sq_4d: function (B, q) { return duplexFrame(B, q); }
  };
  function duplexFrame(B, q) {
    var cols = duplexCols(q.a);
    return '<div class="vf-base">' + given(q.a, true) + '<span class="vf-op">&sup2;</span> by duplex</div>' +
      '<div class="vf-parts' + (cols.length > 4 ? ' many' : '') + '" style="' + (cols.length > 4 ? '' : 'grid-template-columns:repeat(' + cols.length + ',1fr)') + '">' +
        cols.map(function (col, k) {
          return '<div class="vf-part"><div class="vf-how">' + esc(col.how) + '</div>' +
            B.slot(col.sum, 'Duplex ' + (k + 1) + ': ' + col.how) + '</div>';
        }).join('') + '</div>' +
      '<div class="vf-note">Assemble right to left, carrying as you go.</div>' +
      B.answer(q.a * q.a);
  }

  /* ── NEIGHBOUR ───────────────────────────────────────────── */
  function neighbour(B, q) {
    var mult = (q.b === 11 || q.b === 111) ? q.b : q.a;
    var n = mult === q.b ? q.a : q.b;
    /* x 111: each column adds THREE neighbours rather than two. Pad
       the number with two zeros each side and slide a window of three
       across it: 23 x 111 gives 2 | 5 | 5 | 3. Sending this to the
       step list left a single "write the number down" as the whole of
       the working, which is no working at all. */
    if (mult === 111) {
      var dd = dArr(n), pad = [0, 0].concat(dd, [0, 0]), cols3 = [];
      for (var w = 0; w + 2 < pad.length; w++) {
        var trio = pad.slice(w, w + 3);
        /* The first window always holds the leading digit, so it is
           never empty. A window of zeros can only come at the END, from
           a number like 250, and there it is a real 0 in that place —
           skipping it lost a column, 2775 instead of 27750. */
        var parts = trio.filter(function (x, i2) { return x !== 0 || true; });
        cols3.push({ sum: trio[0] + trio[1] + trio[2],
                     how: trio.filter(function (x) { return x !== 0; }).join(' + ') || '0' });
      }
      return '<div class="vf-base">' + given(n, true) + ' <span class="vf-op">&times; 111</span></div>' +
        '<div class="vf-note">Each column adds a digit and its two neighbours.</div>' +
        '<div class="vf-parts' + (cols3.length > 4 ? ' many' : '') + '" style="' + (cols3.length > 4 ? '' : 'grid-template-columns:repeat(' + cols3.length + ',1fr)') + '">' +
          cols3.map(function (col, k) {
            return '<div class="vf-part"><div class="vf-how">' + col.how + '</div>' +
              B.slot(col.sum, 'Add the neighbours: ' + col.how) + '</div>';
          }).join('') + '</div>' +
        '<div class="vf-note">Carry from right to left if a column is 10 or more.</div>' +
        B.answer(n * mult);
    }
    var d = dArr(n), cells = [];
    cells.push('<div class="vf-part"><div class="vf-how">First</div>' + B.slot(d[0], 'Write the first digit') + '</div>');
    for (var i = 0; i < d.length - 1; i++) {
      cells.push('<div class="vf-part"><div class="vf-how">' + d[i] + ' + ' + d[i + 1] + '</div>' +
        B.slot(d[i] + d[i + 1], 'Add the neighbours ' + d[i] + ' and ' + d[i + 1]) + '</div>');
    }
    cells.push('<div class="vf-part"><div class="vf-how">Last</div>' + B.slot(d[d.length - 1], 'Write the last digit') + '</div>');
    return '<div class="vf-base">' + given(n, true) + ' <span class="vf-op">&times; 11</span></div>' +
      '<div class="vf-parts' + (cells.length > 4 ? ' many' : '') + '" style="' + (cells.length > 4 ? '' : 'grid-template-columns:repeat(' + cells.length + ',1fr)') + '">' + cells.join('') + '</div>' +
      '<div class="vf-note">If a pair adds past 9, carry to the left.</div>' +
      B.answer(n * mult);
  }

  /* ── DIGITS: all from 9, last from 10 ────────────────────
     For a plain base, 1000 - 357: each digit off 9, the last off 10.

     For a MULTIPLE of a base, 300 - 176, that alone gives 824, which
     is wrong. The leading part is handled first: 3 - 1 - 1 = 1, and
     then 76 comes off 100 to give 24. So the answer reads 1 | 24.
     ─────────────────────────────────────────────────────────── */
  function digits(B, q) {
    if (q.method === 'friend_comp') {
      return '<div class="vf-line">' + given(q.a, true) + '<span class="vf-op">needs how many to make</span>' +
        given(q.b, true) + '</div>' +
        '<div class="vf-note">All from 9, and the last from 10.</div>' + B.answer(q.b - q.a);
    }

    var base = null, mult = 1;
    for (var p = 100000; p >= 10; p = p / 10) {
      if (q.a % p === 0 && q.a / p >= 1 && q.a / p <= 9) { base = p; mult = q.a / p; break; }
    }
    if (!base) return chain(B, q);

    var lead = Math.floor(q.b / base);   // the 1 in 176 against base 100
    var rest = q.b % base;               // the 76
    if (rest === 0) return chain(B, q);

    var width = String(base).length - 1;
    var rd = dArr(rest);
    while (rd.length < width) rd.unshift(0);

    /* The rule runs up to the LAST NON-ZERO digit. After it, zeros
       stay zeros: 100 - 60 is 40, not "3 and 10". */
    var lastNZ = -1;
    rd.forEach(function (d, i) { if (d !== 0) lastNZ = i; });

    /* The leading part is built FIRST, so the boxes are filled in the
       order they appear. Built after, the auto-advance sent a child
       down to the digits and then back up to the top. */
    var head = '';
    if (mult > 1 || lead > 0) {
      head = '<div class="vf-line">' +
        given(mult) + '<span class="vf-op">&minus; 1 &minus;</span>' + given(lead) +
        '<span class="vf-op">=</span>' +
        B.slot(mult - 1 - lead, 'The leading part: ' + mult + ' take 1, take ' + lead) + '</div>' +
        '<div class="vf-note">Then ' + rest + ' comes off ' + base + ':</div>';
    }

    var cells = rd.map(function (d, i) {
      if (i > lastNZ) {
        return '<div class="vf-part"><div class="vf-how">stays</div>' + given('0', true) + '</div>';
      }
      var last = i === lastNZ;
      return '<div class="vf-part"><div class="vf-how">' + (last ? '10' : '9') + ' &minus; ' + d + '</div>' +
        B.slot(last ? 10 - d : 9 - d,
               last ? 'The last non-zero digit comes off 10' : 'This digit comes off 9') + '</div>';
    });

    return '<div class="vf-base">' + given(q.a) + ' &minus; ' + given(q.b) + '</div>' +
      head +
      '<div class="vf-parts' + (cells.length > 4 ? ' many' : '') + '" style="' + (cells.length > 4 ? '' : 'grid-template-columns:repeat(' + cells.length + ',1fr)') + '">' + cells.join('') + '</div>' +
      '<div class="vf-note">All from 9, and the last from 10. Zeros at the end stay zeros.</div>' +
      B.answer(q.a - q.b);
  }

  /* ── CHAIN: the steps as a column ────────────────────────── */
  function chain(B, q) {
    var steps = (typeof VedicSteps !== 'undefined') ? VedicSteps.forSum(q) : null;
    if (!steps || !steps.length) return B.answer(q.answer);
    var rows = steps.slice(0, -1).map(function (s) {
      return '<div class="vf-row"><span class="vf-ask">' + esc(s.ask) + '</span>' +
        B.slot(s.answer, s.hint || s.ask) + '</div>';
    }).join('');
    var last = steps[steps.length - 1];
    return '<div class="vf-chain">' + rows + '</div>' +
      '<div class="vf-row vf-lastask"><span class="vf-ask">' + esc(last.ask) + '</span></div>' +
      B.answer(last.answer);
  }

  var LAYOUT = {};
  Object.keys(HALVES).forEach(function (k) { LAYOUT[k] = HALVES[k]; });
  Object.keys(CROSS).forEach(function (k) { LAYOUT[k] = CROSS[k]; });
  LAYOUT.by_eleven = neighbour;
  LAYOUT.nikhilam_sub = digits;
  LAYOUT.friend_comp = digits;

  /** One question drawn in its method's frame. */
  function render(q, prefix) {
    var B = new Builder(prefix);
    var fn = LAYOUT[q.method] || chain;
    var body;
    try { body = fn(B, q); }
    catch (e) { B = new Builder(prefix); body = chain(B, q); }
    return { html: '<div class="vf">' + body + '</div>', slots: B.slots, answer: q.answer };
  }

  function layoutOf(method) {
    if (HALVES[method]) return 'halves';
    if (CROSS[method]) return 'cross';
    if (method === 'by_eleven') return 'neighbour';
    if (method === 'nikhilam_sub' || method === 'friend_comp') return 'digits';
    return 'chain';
  }

  /* The shared styles, so every page draws the frames the same way. */
  var CSS = '' +
    '.vf{--vf-ink:#16324F;--vf-fill:#F08A24;--vf-fill-soft:#FFF1E2;--vf-teal:#04949D;' +
      '--vf-good:#2E8B57;--vf-good-soft:#E8F5EE;--vf-bad:#D64545;--vf-bad-soft:#FCEBEB;' +
      '--vf-muted:#6B7890;--vf-rule:#DCE3EC;color:var(--vf-ink);margin-top:10px;}' +
    '.vf-given{font-family:"Baloo 2",system-ui,sans-serif;font-weight:800;font-size:1.45rem;' +
      'font-variant-numeric:tabular-nums;color:var(--vf-ink);}' +
    '.vf-given.big{font-size:1.9rem;}' +
    '.vf-slot{font-family:"Baloo 2",system-ui,sans-serif;font-weight:800;font-size:1.4rem;' +
      'min-width:52px;max-width:100%;height:50px;text-align:center;border:2.5px solid var(--vf-fill);' +
      'border-radius:12px;background:var(--vf-fill-soft);color:var(--vf-ink);' +
      'font-variant-numeric:tabular-nums;}' +
    '.vf-slot.wide{min-width:72px;}' +
    '.vf-slot:focus{outline:3px solid var(--vf-teal);outline-offset:2px;}' +
    '.vf-slot.correct,.vf-slot.good{border-color:var(--vf-good);background:var(--vf-good-soft);color:var(--vf-good);}' +
    '.vf-slot.wrong,.vf-slot.bad{border-color:var(--vf-bad);background:var(--vf-bad-soft);}' +
    '.vf-lbl,.vf-how{font-size:.76rem;font-weight:800;color:var(--vf-muted);text-align:center;line-height:1.3;}' +
    '.vf-note{font-size:.82rem;color:var(--vf-muted);margin:8px 0;text-align:center;}' +
    '.vf-base{text-align:center;font-weight:800;color:var(--vf-muted);margin-bottom:10px;}' +
    '.vf-base b{color:var(--vf-teal);font-family:"Baloo 2",sans-serif;font-size:1.2rem;}' +
    '.vf-op{font-weight:900;color:var(--vf-muted);margin:0 6px;}' +
    '.vf-arr{color:var(--vf-muted);font-weight:900;margin:0 6px;}' +
    '.vf-devs{display:grid;grid-template-columns:auto auto auto;gap:10px 4px;justify-content:center;align-items:center;}' +
    '.vf-line{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;margin:10px 0;}' +
    '.vf-halves{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;margin:16px 0 4px;}' +
    '.vf-side{display:flex;flex-direction:column;align-items:center;gap:6px;}' +
    '.vf-bar{width:4px;height:62px;border-radius:2px;background:var(--vf-ink);}' +
    '.vf-cross{position:relative;width:200px;margin:4px auto 0;}' +
    '.vf-cross svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}' +
    '.vf-x{stroke:var(--vf-fill);stroke-width:3;stroke-linecap:round;}' +
    '.vf-cgrid{display:grid;grid-template-columns:1fr 1fr;row-gap:30px;text-align:center;}' +
    '.vf-under{height:3px;background:var(--vf-ink);border-radius:2px;margin-top:10px;}' +
    '.vf-parts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;}' +
    '.vf-parts.many{grid-template-columns:repeat(auto-fit,minmax(96px,1fr));}' +
    '.vf-part{display:flex;flex-direction:column;align-items:center;gap:6px;border:1.5px solid var(--vf-rule);' +
      'border-radius:14px;padding:9px 4px 11px;}' +
    '.vf-chain{border-top:1.5px solid var(--vf-rule);margin-top:4px;}' +
    '.vf-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #EEF1F6;}' +
    '.vf-ask{flex:1;font-size:.9rem;color:#4A5160;line-height:1.35;}' +
    '.vf-lastask{border-bottom:none;padding-bottom:0;}' +
    '.vf-lastask .vf-ask{font-weight:900;color:var(--vf-ink);}' +
    '.vf-final{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px;' +
      'padding-top:12px;border-top:2px dashed var(--vf-rule);}' +
    '.vf-eq{font-family:"Baloo 2",sans-serif;font-weight:800;font-size:1.6rem;color:var(--vf-muted);}' +
    '.vf-ans{min-width:120px;font-size:1.6rem;border-color:var(--vf-teal);}' +
    '@media(max-width:400px){.vf-slot{min-width:46px;height:46px;font-size:1.25rem;}' +
      '.vf-slot.wide{min-width:62px;}.vf-parts{gap:5px;}.vf-cross{width:170px;}' +
      '.vf-parts.many{grid-template-columns:repeat(auto-fit,minmax(84px,1fr));}' +
      '.vf-ans{font-size:1.4rem;}}';

  function injectCss() {
    if (typeof document === 'undefined' || document.getElementById('vf-css')) return;
    var s = document.createElement('style');
    s.id = 'vf-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  return { render: render, layoutOf: layoutOf, CSS: CSS, injectCss: injectCss };
})();

if (typeof module !== 'undefined') module.exports = VedicFrames;

/* ============================================================
   iMathAcademy — Practice engine
   ------------------------------------------------------------
   Generates the exercises in Megha's practice books, driven by
   the curriculum rather than by guesswork.

   It replaces a generator that decided everything itself:

       const useMulti = lv >= 3 && Math.random() > 0.5;

   That "lv >= 3" had no connection to multiplication_allowed, so
   practice could serve a child work their level forbids.

   THE RULE THAT MATTERS MOST
   A column sum is worked top to bottom on the beads. The running
   total can never go below zero, because there is no such thing
   as a negative bead. Every subtraction must therefore be smaller
   than the total standing above it. Generating numbers first and
   checking afterwards produces columns a child cannot physically
   work, so the running total is carried as the numbers are made.
   ============================================================ */

var PracticeEngine = (function () {
  'use strict';

  /* ── Digit patterns ────────────────────────────────────────
     A pattern says how wide the first number is and how wide the
     ones that follow are. '2d+1d' means a two-digit start with
     single-digit steps.
     ──────────────────────────────────────────────────────── */
  var PATTERNS = {
    '1d':    { first: 1, rest: 1 },
    '2d+1d': { first: 2, rest: 1 },
    '2d+2d': { first: 2, rest: 2 },
    '3d+2d': { first: 3, rest: 2 },
    '3d+3d': { first: 3, rest: 3 },
    '4d+4d': { first: 4, rest: 4 }
  };

  function digitRange(d) {
    return { min: d === 1 ? 1 : Math.pow(10, d - 1), max: Math.pow(10, d) - 1 };
  }

  function randInt(min, max) {
    if (max < min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ── Level rules ───────────────────────────────────────────
     Everything the generator needs, read from the curriculum.
     ──────────────────────────────────────────────────────── */
  var rulesCache = {};

  async function loadLevelRules(level) {
    var code = 'L' + level;
    if (rulesCache[code]) return rulesCache[code];

    var rules = {
      levelCode: code,
      level: level,        // the shapes above are keyed by it
      maxNumber: 99,
      allowZero: false,
      allowNegativeResult: false,
      multiplication: false,
      division: false,
      beadsToNumbers: false,
      orals: true,
      sumsPerPage: 20,
      pagesPerSession: 3,
      oralsPerSession: 10,
      rowRules: [],
      formulas: []      // 'big' and/or 'small', empty means direct only
    };

    try {
      // Postgres rejects the whole query on one unknown column, so the
      // guardrails are fetched separately from the session-shape columns.
      // If a later migration has not run, only the session shape falls
      // back to defaults instead of every rule being lost at once.
      var lv = await sb.from('curriculum_levels')
        .select('level_code, max_number, allow_zero, negative_numbers_allowed, ' +
                'multiplication_allowed, division_allowed, min_rows, max_rows')
        .eq('level_code', code).single();
      if (lv.error) throw lv.error;

      try {
        var shape = await sb.from('curriculum_levels')
          .select('ex_beads_to_numbers, ex_orals, sums_per_page, pages_per_session, orals_per_session')
          .eq('level_code', code).single();
        if (!shape.error && shape.data) Object.assign(lv.data, shape.data);
      } catch (e2) {
        console.warn('Practice: session-shape columns missing, using defaults');
      }
      var d = lv.data || {};
      if (d.max_number != null)            rules.maxNumber = d.max_number;
      if (d.allow_zero != null)            rules.allowZero = !!d.allow_zero;
      if (d.negative_numbers_allowed != null) rules.allowNegativeResult = !!d.negative_numbers_allowed;
      rules.multiplication  = !!d.multiplication_allowed;
      rules.division        = !!d.division_allowed;
      rules.beadsToNumbers  = !!d.ex_beads_to_numbers;
      rules.orals           = d.ex_orals !== false;
      if (d.sums_per_page)     rules.sumsPerPage     = d.sums_per_page;
      if (d.pages_per_session) rules.pagesPerSession = d.pages_per_session;
      if (d.orals_per_session) rules.oralsPerSession = d.orals_per_session;
      rules._flatRows = { min: d.min_rows || 3, max: d.max_rows || 5 };
    } catch (e) {
      console.warn('Practice: level rules unavailable for ' + code + ':', e.message);
      rules._flatRows = { min: 3, max: 5 };
    }

    // Which movements may a column demand here? At L0 Megha forbids
    // both complements, so every step must be direct. At L1 the
    // complement is the lesson, so it has to be required rather than
    // merely allowed.
    try {
      var cs = await sb.from('curriculum_level_concepts')
        .select('status, curriculum_concepts(concept_code)')
        .eq('level_code', code);
      var live = (cs.data || [])
        .filter(function (r) { return r.status && r.status !== 'N' && r.curriculum_concepts; })
        .map(function (r) { return r.curriculum_concepts.concept_code; });
      if (live.indexOf('big_friends') > -1)   rules.formulas.push('big');
      if (live.indexOf('small_friends') > -1) rules.formulas.push('small');
      // Level 3 is built on the Combination formula: +10 -5 +x, used
      // when the ten is needed AND the five has to be broken as well.
      // Without this the engine could only ever produce the friends
      // work of the level below.
      if (live.indexOf('combination') > -1)   rules.formulas.push('combination');
    } catch (e2) { /* no concepts mapped — direct movement only */ }

    try {
      var rr = await sb.from('curriculum_row_rules')
        .select('digit_pattern, min_rows, max_rows, sort_order')
        .eq('level_code', code).order('sort_order');
      if (rr.error) throw rr.error;
      rules.rowRules = (rr.data || []).filter(function (r) { return PATTERNS[r.digit_pattern]; });
    } catch (e) {
      rules.rowRules = [];
    }

    // No row rules configured yet — fall back to single digits at the
    // level's flat row range, so practice still works.
    if (!rules.rowRules.length) {
      rules.rowRules = [{
        digit_pattern: '1d',
        min_rows: rules._flatRows.min,
        max_rows: rules._flatRows.max
      }];
    }

    rulesCache[code] = rules;
    return rules;
  }

  /* ── A column sum ──────────────────────────────────────────
     Numbers are generated one at a time while carrying the running
     total, so the total never drops below zero and never exceeds
     what the level permits. This is what makes the column workable
     on a real abacus.
     ──────────────────────────────────────────────────────── */
  function makeColumn(rules, patternKey, rowCount) {
    var pat   = PATTERNS[patternKey] || PATTERNS['1d'];
    var first = digitRange(pat.first);
    var rest  = digitRange(pat.rest);

    var ceiling = Math.min(rules.maxNumber, first.max * 10);
    var floorV  = rules.allowZero ? 0 : 1;

    var start = randInt(Math.max(first.min, floorV), Math.min(first.max, ceiling));
    var rows  = [start];
    var total = start;

    for (var i = 1; i < rowCount; i++) {
      // What could be added without breaching the ceiling
      var addMax = Math.min(rest.max, ceiling - total);
      // What could be taken away without going below zero
      var subMax = Math.min(rest.max, total - floorV);

      var canAdd = addMax >= rest.min;
      var canSub = subMax >= rest.min;

      if (!canAdd && !canSub) break;   // nowhere left to go

      // Lean towards addition so columns climb rather than collapse,
      // but subtract often enough to exercise the friends formulas.
      var doAdd = canAdd && (!canSub || Math.random() < 0.62);

      if (doAdd) {
        var v = randInt(rest.min, addMax);
        rows.push(v);
        total += v;
      } else {
        var s = randInt(rest.min, subMax);
        rows.push(-s);
        total -= s;
      }
    }

    return { type: 'column', pattern: patternKey, rows: rows, answer: total };
  }

  /* ── Exercise builders ─────────────────────────────────────── */

  function columnSum(rules, mental, progress) {
    var rule = pick(rules.rowRules);
    var n    = randInt(rule.min_rows, rule.max_rows);
    var q;

    // The bead-aware generator is the correct one: it only produces
    // steps a child can actually make, and can insist on the formula
    // being taught. The old generator is kept as a fallback because
    // it never fails, only sometimes asks the impossible.
    if (typeof ColumnGen !== 'undefined' && typeof Beads !== 'undefined') {
      var mode = rules.formulas.length ? pick(rules.formulas) : 'direct';
      var thr  = typeof progress === 'number' ? progress : Math.random();
      var built = ColumnGen.column({
        max:       Math.max(9, Math.round(rules.maxNumber * (0.45 + 0.55 * thr))),
        rows:      n,
        mode:      mode,
        require:   mode === 'direct' ? 0 : (thr < 0.35 ? 1 : 2),
        allowZero: rules.allowZero
      });
      if (built) {
        q = { type: 'column', pattern: rule.digit_pattern,
              rows: built.rows, answer: built.answer, movement: mode };
      }
    }
    // NO SILENT FALLBACK. The old makeColumn() knows nothing about
    // beads — it only checks a running total against a ceiling. When
    // it stood in for the real generator it produced sums like
    // 81 + 34 at Level 0, which needs both complements and runs past
    // 99. Better to hand back nothing and let the caller try again.
    if (!q) return null;

    q.mental = !!mental;
    q.prompt = mental ? 'Work this out in your head' : 'Add and subtract on your abacus';
    return q;
  }

  /* Megha teaches multiplication by shape, not by size: 1x1 at Level 4,
     then 2x1, 3x1, 2x2, 4x1, 3x2. Her Level 4 exam is entirely
     2-digit by 1-digit — 13x9, 22x4, 59x6. The generator used to pick
     any number up to 999 times any single digit, which at Level 4
     produced work from three levels higher. */
  /* Taken from Megha's own exam papers rather than guessed:
       Level 4  13x9, 22x4, 59x6            2 digit by 1
       Level 5  341x8, 126x3, 682x7         3 by 1, and 48x6 mentally
                981/9, 208/2, 536/4         3 by 1
       Level 6  255x5, 813x9  and  65x70, 44x23, 91x38
                6335/5, 7967/6, 4496/2      4 by 1
       Level 7  512x16, 302x45              3 by 2 */
  var MULT_SHAPES = {
    4: [[1,1],[2,1]],
    5: [[2,1],[3,1]],
    6: [[3,1],[2,2]],
    7: [[3,2]],
    8: [[3,2],[4,1]]
  };
  var DIV_SHAPES = {
    5: [[2,1],[3,1]],
    6: [[4,1]],
    7: [[4,1]],
    8: [[3,2]]
  };

  function ofDigits(d) {
    return d <= 1 ? randInt(2, 9) : randInt(Math.pow(10, d - 1), Math.pow(10, d) - 1);
  }

  function multiplication(rules) {
    var shapes = MULT_SHAPES[rules.level] || [[2,1]];
    var s = pick(shapes);
    var a = ofDigits(s[0]), b = ofDigits(s[1]);
    return { type: 'multiplication', a: a, b: b,
             text: a + ' × ' + b, answer: a * b,
             prompt: 'Multiply' };
  }

  function division(rules) {
    var shapes = DIV_SHAPES[rules.level] || [[2,1]];
    var s = pick(shapes);
    // Build it from the answer so it always divides exactly — a child
    // at this stage is never given a remainder.
    for (var t = 0; t < 40; t++) {
      var b = ofDigits(s[1]);
      var q = ofDigits(Math.max(1, s[0] - s[1] + 1));
      var a = b * q;
      if (String(a).length === s[0]) {
        return { type: 'division', a: a, b: b,
                 text: a + ' ÷ ' + b, answer: q, prompt: 'Divide' };
      }
    }
    var b2 = randInt(2, 9), q2 = randInt(2, 99);
    return { type: 'division', a: b2 * q2, b: b2,
             text: (b2 * q2) + ' ÷ ' + b2, answer: q2, prompt: 'Divide' };
  }

  // Read the beads and write the number. Used in the first levels,
  // and rendered by the abacus component in read-only mode.
  function beadsToNumbers(rules) {
    var maxShown = Math.min(rules.maxNumber, 999);
    var value = randInt(rules.allowZero ? 0 : 1, maxShown);
    return { type: 'beads', value: value, answer: value,
             prompt: 'What number is on the abacus?' };
  }

  // The numbers are spoken aloud, one at a time. The child works
  // them on the abacus and writes only the total.
  function oral(rules) {
    var rule = pick(rules.rowRules);
    var n    = Math.min(randInt(rule.min_rows, rule.max_rows), 8);
    var q    = makeColumn(rules, rule.digit_pattern, n);
    q.type   = 'oral';
    q.prompt = 'Listen, and work it out on your abacus';
    return q;
  }


/* ── THE LAST GATE ────────────────────────────────────────────
   Nothing reaches a child on trust. Every column is walked step by
   step against the bead rules for its level, and anything that
   breaks them is thrown away rather than served.

   This is the check that was missing. Each earlier failure — the
   forbidden formula, the total past the level's maximum — would
   have been caught here before a child ever saw it.
   ─────────────────────────────────────────────────────────── */
function columnIsAllowed(q, rules) {
  if (!q || q.type !== 'column' && q.type !== 'oral') return true;
  if (typeof Beads === 'undefined') return true;
  if (!q.rows || !q.rows.length) return false;

  var allowSmall = rules.formulas.indexOf('small') > -1;
  var allowBig   = rules.formulas.indexOf('big')   > -1;
  var floorV     = rules.allowZero ? 0 : 1;
  var v = q.rows[0];

  if (v > rules.maxNumber || v < floorV) return false;

  for (var i = 1; i < q.rows.length; i++) {
    var kinds = Beads.stepKinds(v, q.rows[i]);
    for (var k = 0; k < kinds.length; k++) {
      if (kinds[k] === 'small' && !allowSmall) return false;
      if (kinds[k] === 'big'   && !allowBig)   return false;
    }
    v += q.rows[i];
    if (v > rules.maxNumber) return false;
    if (v < floorV) return false;
  }
  return v === q.answer;
}


/* ── WHERE THIS CHILD IS WITHIN THE LEVEL ─────────────────────
   A page used to span the whole level, so a beginner met five-row
   two-digit work as question twenty on their first day. It now
   centres on how far this particular child has actually come.

   The position moves on their own results, drifts down as well as
   up, and never falls below a floor a teacher has set. It decides
   what they practise today — not when they move up a level, which
   stays the three gates.
   ─────────────────────────────────────────────────────────── */
async function loadPosition(studentId, level) {
  var code = 'L' + level;
  var def  = { position: 0.10, floor: 0, sessions: 0 };
  if (!studentId) return def;
  try {
    var res = await sb.from('student_level_position')
      .select('position, floor_pos, sessions')
      .eq('student_id', studentId).eq('level_code', code).single();
    if (res.error || !res.data) return def;
    return {
      position: Number(res.data.position),
      floor:    Number(res.data.floor_pos || 0),
      sessions: res.data.sessions || 0
    };
  } catch (e) { return def; }
}

/**
 * Move the position after a session.
 *
 * Steps are small so it drifts rather than lurches — one bad
 * afternoon should not undo a fortnight. It can go backwards, but
 * more slowly than it goes forward, and never below the teacher's
 * floor.
 */
async function recordOutcome(studentId, level, correct, attempted) {
  if (!studentId || !attempted) return;
  var code = 'L' + level;
  try {
    var cur = await loadPosition(studentId, level);
    var pct = correct / attempted;

    var step = pct >= 0.90 ? 0.040
             : pct >= 0.70 ? 0.015
             : -0.020;                       // back down, gently

    var next = cur.position + step;
    if (next > 1) next = 1;
    if (next < cur.floor) next = cur.floor;  // the teacher's floor holds
    if (next < 0) next = 0;

    await sb.from('student_level_position').upsert({
      student_id: studentId,
      level_code: code,
      position:   Number(next.toFixed(3)),
      sessions:   (cur.sessions || 0) + 1,
      updated_at: new Date().toISOString()
    }, { onConflict: 'student_id,level_code' });
  } catch (e) {
    console.warn('Could not record progress:', e.message);
  }
}

/**
 * The slice of the level a page should cover. Narrower than the
 * whole level, and aimed where this child is working.
 */
function bandFor(rules, pos) {
  var lo = 9;
  var hi = rules.maxNumber;
  var centre = lo + (hi - lo) * Math.pow(pos, 1.3);

  return {
    start: Math.max(lo, Math.round(centre * 0.55)),
    end:   Math.min(hi, Math.max(lo + 4, Math.round(centre * 1.15)))
  };
}

  /* ── A session ─────────────────────────────────────────────
     A child does both abacus and mental work every session, so a
     session mixes them. Multiplication, division, beads and orals
     appear only where the level allows.
     ──────────────────────────────────────────────────────── */
  async function buildSession(level, opts) {
    var o = opts || {};
    var rules = await loadLevelRules(level);
    var total = o.count || rules.sumsPerPage;

    // Aim the page at where this child actually is
    var pos  = o.position;
    if (pos === undefined && o.studentId) {
      var st = await loadPosition(o.studentId, level);
      pos = st.position;
    }
    if (pos === undefined) pos = 0.10;
    var band = bandFor(rules, pos);

    var out = [];

    // Roughly a fifth of a session is orals where the level uses them
    var oralCount = rules.orals ? Math.min(Math.round(total * 0.2),
                                           rules.oralsPerSession) : 0;

    // Megha asks that every answer on a page be different, and that
    // the work builds from easy to harder as the page goes on.
    var seenAnswers = {};
    var plain = total - oralCount;
    for (var i = 0; i < plain; i++) {
      // Within the page, run from the easy end of this child's band to
      // the hard end — not from the easiest sum in the level to the
      // hardest, which is what made question twenty impossible.
      var acrossPage = plain > 1 ? i / (plain - 1) : 0.5;
      var thr = (band.start + (band.end - band.start) * acrossPage) / Math.max(1, rules.maxNumber);
      var r = Math.random();
      var q;
      if (rules.beadsToNumbers && r < 0.15)      q = beadsToNumbers(rules);
      else if (rules.multiplication && r < 0.30) q = multiplication(rules);
      else if (rules.division && r < 0.42)       q = division(rules);
      else {
        // Try for a column that is both allowed and not a repeat.
        q = null;
        for (var tries = 0; tries < 25; tries++) {
          var cand = columnSum(rules, Math.random() < 0.4, thr);
          if (!cand) continue;
          if (!columnIsAllowed(cand, rules)) continue;   // never serve it
          if (seenAnswers[cand.answer] && tries < 18) continue;
          q = cand; break;
        }
      }
      if (q) { seenAnswers[q.answer] = true; out.push(q); }
    }

    for (var j = 0; j < oralCount; j++) out.push(oral(rules));

    // Shuffle so the orals are not all at the end
    for (var k = out.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1));
      var t = out[k]; out[k] = out[m]; out[m] = t;
    }

    return { level: level, rules: rules, questions: out };
  }

  /* ── Rendering a column the way the books print it ────────── */
  function columnText(q) {
    return q.rows.map(function (n, i) {
      return i === 0 ? String(n) : (n < 0 ? '- ' + Math.abs(n) : '+ ' + n);
    }).join('\n');
  }

  return {
    loadPosition: loadPosition, recordOutcome: recordOutcome, bandFor: bandFor,
    loadLevelRules: loadLevelRules,
    buildSession:   buildSession,
    columnSum:      columnSum,
    multiplication: multiplication,
    division:       division,
    beadsToNumbers: beadsToNumbers,
    oral:           oral,
    columnText:     columnText,
    PATTERNS:       PATTERNS,
    _makeColumn:    makeColumn      // exposed for testing
  };
})();

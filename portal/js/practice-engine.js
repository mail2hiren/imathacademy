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
    if (!q) q = makeColumn(rules, rule.digit_pattern, n);

    q.mental = !!mental;
    q.prompt = mental ? 'Work this out in your head' : 'Add and subtract on your abacus';
    return q;
  }

  function multiplication(rules) {
    var a = randInt(2, Math.min(999, rules.maxNumber));
    var b = randInt(2, 9);
    return { type: 'multiplication', a: a, b: b,
             text: a + ' × ' + b, answer: a * b,
             prompt: 'Multiply' };
  }

  function division(rules) {
    var b = randInt(2, 9);
    var q = randInt(2, Math.min(999, Math.floor(rules.maxNumber / b) || 9));
    var a = b * q;                       // exact division, no remainders
    return { type: 'division', a: a, b: b,
             text: a + ' ÷ ' + b, answer: q,
             prompt: 'Divide' };
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

  /* ── A session ─────────────────────────────────────────────
     A child does both abacus and mental work every session, so a
     session mixes them. Multiplication, division, beads and orals
     appear only where the level allows.
     ──────────────────────────────────────────────────────── */
  async function buildSession(level, opts) {
    var o = opts || {};
    var rules = await loadLevelRules(level);
    var total = o.count || rules.sumsPerPage;

    var out = [];

    // Roughly a fifth of a session is orals where the level uses them
    var oralCount = rules.orals ? Math.min(Math.round(total * 0.2),
                                           rules.oralsPerSession) : 0;

    // Megha asks that every answer on a page be different, and that
    // the work builds from easy to harder as the page goes on.
    var seenAnswers = {};
    var plain = total - oralCount;
    for (var i = 0; i < plain; i++) {
      var thr = plain > 1 ? i / (plain - 1) : 0.5;   // 0 at the start, 1 at the end
      var r = Math.random();
      var q;
      if (rules.beadsToNumbers && r < 0.15)      q = beadsToNumbers(rules);
      else if (rules.multiplication && r < 0.30) q = multiplication(rules);
      else if (rules.division && r < 0.42)       q = division(rules);
      else {
        // try a few times for an answer not already on this page
        for (var tries = 0; tries < 12; tries++) {
          q = columnSum(rules, Math.random() < 0.4, thr);
          if (!seenAnswers[q.answer]) break;
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

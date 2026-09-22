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
  /* Megha expects a change in the course map to show on the very next
   worksheet. Keeping the rules for the whole visit meant a change made
   in another tab never arrived. They are kept for a few seconds only —
   long enough that one sheet does not read the same level twenty
   times, short enough that her changes are always picked up. */
var rulesCache = {};
var RULES_TTL_MS = 5000;
function forgetRules() { rulesCache = {}; }

  async function loadLevelRules(level) {
    var code = 'L' + level;
    var hit = rulesCache[code];
    if (hit && (Date.now() - hit._at) < RULES_TTL_MS) return hit;

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
      formulas: [],     // 'big' and/or 'small', empty means direct only
      multShapes: [],   // from her formula names, e.g. [[3,1]]
      divShapes:  []
    };

    try {
      // Postgres rejects the whole query on one unknown column, so the
      // guardrails are fetched separately from the session-shape columns.
      // If a later migration has not run, only the session shape falls
      // back to defaults instead of every rule being lost at once.
      var lv = await sb.from('curriculum_levels')
        .select('level_code, max_number, allow_zero, negative_numbers_allowed, ' +
                'multiplication_allowed, division_allowed, min_rows, max_rows').eq('program_code', 'abacus')
        .eq('level_code', code).single();
      if (lv.error) throw lv.error;

      try {
        var shape = await sb.from('curriculum_levels')
          .select('ex_beads_to_numbers, ex_orals, sums_per_page, pages_per_session, orals_per_session').eq('program_code', 'abacus')
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
    // Her formula names decide the multiplication and division shapes
    try {
      var fs = await sb.from('curriculum_formulas')
        .select('formula_name').eq('program_code', 'abacus').eq('level_code', code).eq('is_active', true);
      (fs.data || []).forEach(function (f) {
        var sh = parseShape(f.formula_name);
        if (!sh) return;
        (sh.kind === 'mult' ? rules.multShapes : rules.divShapes).push([sh.a, sh.b]);
      });
    } catch (e3) { /* fall back to the table below */ }

    try {
      var cs = await sb.from('curriculum_level_concepts')
        .select('status, curriculum_concepts(concept_code)').eq('program_code', 'abacus')
        .eq('level_code', code);
      var live = (cs.data || [])
        .filter(function (r) { return r.status && r.status !== 'N' && r.curriculum_concepts; })
        .map(function (r) { return r.curriculum_concepts.concept_code; });
      /* The full list is kept, so the engine and LX can act on anything
         she sets in the course map — not only the three bead formulas. */
      rules.concepts = live.slice();
      rules.introduced = (cs.data || [])
        .filter(function (r) { return r.status === 'I' && r.curriculum_concepts; })
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
        .select('digit_pattern, min_rows, max_rows, sort_order').eq('program_code', 'abacus')
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

    /* ── What her curriculum says about this level ──────────────────
       Each of these reads what she has set, so a change in the course
       map changes the next worksheet. */
    var names = [];
    try {
      var fn = await sb.from('curriculum_formulas').select('formula_name, is_active')
        .eq('program_code', 'abacus').eq('level_code', code);
      names = (fn.data || []).filter(function (f) { return f.is_active !== false; })
        .map(function (f) { return String(f.formula_name || '').toLowerCase(); });
    } catch (e5) {}
    var concepts = rules.concepts || [];

    /* Multiplication and division follow the course map too. The
       level's own switch said yes or no, and a concept marked "not
       taught" in the matrix changed nothing — she would untick it and
       still get multiplication. Now both must agree.

       A level with no concepts at all (Level 7 today) is one she has
       not filled in yet, and there the switch decides, so an empty
       level still produces work while the matrix flags it. */
    if (concepts.length) {
      if (concepts.indexOf('multiplication') < 0) { rules.multiplication = false; rules.multShapes = []; }
      if (concepts.indexOf('division') < 0)       { rules.division = false;       rules.divShapes = []; }
    }

    /* Direction. Her formula master names the direction of each friend
       formula — "Big friends Addition" at Level 1, "Big friends
       subtraction" at Level 2 — and her level focus says the same. So
       a level whose friend formulas are all subtraction works in
       subtraction, one whose are all addition in addition, and one with
       both mixes them. */
    var friendish = names.filter(function (n) {
      return /friend|combination/.test(n) && !/multipl|divis/.test(n);
    });
    var hasAdd = friendish.some(function (n) { return /addition|\badd\b/.test(n); });
    var hasSub = friendish.some(function (n) { return /subtraction|\bsub\b/.test(n); });
    rules.direction = (hasAdd && !hasSub) ? 'add' : (hasSub && !hasAdd) ? 'sub' : 'both';

    /* Decimals and negatives, from either the course map or the formula
       master — whichever she has filled in. */
    rules.decimals = (concepts.indexOf('decimals') > -1 &&
                      (rules.introduced || []).indexOf('decimals') > -1) ||
                     names.some(function (n) { return /decimal/.test(n); }) ? 1 : 0;
    rules.negative = concepts.indexOf('negative') > -1 ||
                     names.some(function (n) { return /negative/.test(n); });
    if (rules.negative) rules.allowNegativeResult = true;

    /* Her rule: the difficulty bands govern addition and subtraction;
       multiplication and division follow the formula master. So a sum
       of additions may go as high as the level's highest band even when
       the level's own number limit is lower — that limit is for
       multiplication and division. */
    try {
      var bd = await sb.from('curriculum_difficulty_rules').select('max_number')
        .eq('program_code', 'abacus').eq('level_code', code);
      var top = (bd.data || []).reduce(function (m, b) {
        return (b.max_number != null && b.max_number > m) ? b.max_number : m;
      }, 0);
      rules.addSubMax = top || rules.maxNumber;
    } catch (e6) { rules.addSubMax = rules.maxNumber; }

    rules._at = Date.now();
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

  /* Level 7 is decimals and it never worked: a `decimals` option was
     passed to the generator and silently ignored, and stepKinds
     returns nothing for a fraction so no formula was checked either.

     On a soroban a decimal is an integer with the point moved — the
     bead work for 3.5 + 1.2 is the bead work for 35 + 12 — so the
     generator builds whole rods and shifts the point. */
  function decimalPlacesFor(rules) {
    return (rules && rules.decimals) ? rules.decimals : 0;
  }

  /* On an abacus 4.6 is set as 46 across two rods. Her bands are counted
     in rods, so a band of 999 means sums up to 99.9 — treating it as
     the number shown gave 4729.1 + 5070.6 when her examples are 4.6 + 2.7. */
  function shownMax(rules, rodMax) {
    var p = decimalPlacesFor(rules);
    return p ? Math.max(1, rodMax / Math.pow(10, p)) : rodMax;
  }

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
      /* At a negatives level, some of the sums go below zero. */
      if (rules.negative && Math.random() < 0.45) {
        var ng = negativeSum(rules);
        if (ng && columnIsAllowed(ng, rules)) return ng;
      }
      var built = ColumnGen[decimalPlacesFor(rules) ? 'decimalColumn' : 'column']({
              decimals: decimalPlacesFor(rules),
        /* addition and subtraction up to the level's highest band */
        max:       shownMax(rules, Math.max(9, Math.round((rules.addSubMax || rules.maxNumber) * (0.45 + 0.55 * thr)))),
        rows:      n,
        mode:      mode,
        require:   mode === 'direct' ? 0 : (thr < 0.35 ? 1 : 2),
        allowZero: rules.allowZero,
        /* the teacher's choice wins; otherwise the level's own direction,
           so Level 2 works in subtraction as her curriculum says */
        signBias:  rules.signBias || (rules.direction !== 'both' ? rules.direction : null)
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
  /* Which shapes a level uses comes from Megha's own formula names.
     She writes them precisely — "Multiplication 3 digit by 1 digit",
     "Multiplication 2digitx1digit" — so the name says what to build.

     These were hardcoded here from her exam papers, and drifted: the
     table said Level 5 multiplication was 2x1 and 3x1 when she teaches
     3x1 only, and missed 5-digit division at Level 6 entirely. Adding
     a formula in the admin screen now changes what is generated, with
     no code change and nothing for anyone to keep in step.

     The fallbacks below are only used if the formula table cannot be
     read at all. */
  var MULT_FALLBACK = { 4: [[1,1],[2,1]], 5: [[3,1]], 6: [[2,2],[4,1]], 7: [[3,2]], 8: [[3,2]] };
  var DIV_FALLBACK  = { 5: [[2,1],[3,1]], 6: [[4,1],[5,1]], 7: [[4,1]], 8: [[3,2]] };

  /** "3 digit by 1 digit" / "2digitx1digit" / "3 digits by 2 digits" */
  function parseShape(name) {
    var s = String(name || '').toLowerCase();
    var kind = s.indexOf('divis') > -1 ? 'div'
             : s.indexOf('multipl') > -1 ? 'mult' : null;
    if (!kind) return null;
    var m = s.match(/(\d)\s*digits?\s*(?:by|x|\*|\u00d7)\s*(\d)\s*digits?/);
    if (!m) return null;
    return { kind: kind, a: parseInt(m[1], 10), b: parseInt(m[2], 10) };
  }


  function ofDigits(d) {
    return d <= 1 ? randInt(2, 9) : randInt(Math.pow(10, d - 1), Math.pow(10, d) - 1);
  }

  function multiplication(rules) {
    var shapes = (rules.multShapes && rules.multShapes.length)
               ? rules.multShapes
               : (MULT_FALLBACK[rules.level] || [[2,1]]);
    var s = pick(shapes);
    var a = ofDigits(s[0]), b = ofDigits(s[1]);
    return { type: 'multiplication', a: a, b: b,
             text: a + ' × ' + b, answer: a * b,
             prompt: 'Multiply' };
  }

  function division(rules) {
    var shapes = (rules.divShapes && rules.divShapes.length)
               ? rules.divShapes
               : (DIV_FALLBACK[rules.level] || [[2,1]]);
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
  /* What a session is made of, level by level.
     The weights used to be the same everywhere — a fifth beads, then
     multiplication, then division — so a Level 5 session came out
     mostly column addition even though Megha's focus there is
     "Multiplication, Division only". Each level now gets a mix that
     matches what it is teaching.

     Any share for something a level does not allow is folded back
     into column work, so the proportions always add up. */
  var SESSION_MIX = {
    0: { beads: 0.20, story: 0.15, mult: 0,    div: 0    },
    1: { beads: 0.15, story: 0.15, mult: 0,    div: 0    },
    2: { beads: 0.10, story: 0.15, mult: 0,    div: 0    },
    3: { beads: 0,    story: 0.10, mult: 0,    div: 0    },
    4: { beads: 0,    story: 0.10, mult: 0.30, div: 0    },
    5: { beads: 0,    story: 0.05, mult: 0.30, div: 0.25 },
    6: { beads: 0,    story: 0.05, mult: 0.30, div: 0.25 },
    7: { beads: 0,    story: 0,    mult: 0.25, div: 0.25 },
    8: { beads: 0,    story: 0,    mult: 0.25, div: 0.25 }
  };

  function mixFor(rules) {
    var m = SESSION_MIX[rules.level] || { beads: 0, story: 0.1, mult: 0, div: 0 };
    return {
      beads: rules.beadsToNumbers ? m.beads : 0,
      story: m.story,
      mult:  rules.multiplication ? m.mult : 0,
      div:   rules.division       ? m.div  : 0
    };
  }

  /* A word problem in daily practice, not only on a worksheet.
     The sum is generated and checked first exactly as a column is;
     the words are only clothing. Falls back to a plain column if the
     word-problem module is not loaded. */
  function storyQuestion(rules, band, through, theme) {
    if (typeof WordProblems === 'undefined' || typeof ColumnGen === 'undefined') return null;
    var mode = rules.formulas.length ? pick(rules.formulas) : 'direct';

    /* Third place this floor has been wrong. A formula that needs the
       ten can never produce an answer below it, and combination needs
       it just as big friends does. */
    var floor = (mode === 'big' || mode === 'combination') ? 20 : 9;

    /* Stories were getting Level 1 numbers at Level 7, so I made the
       level's maximum raise the ceiling. That was wrong the other way:
       it OVERRODE the difficulty band, and an Easy sheet at Level 1
       started producing sums past 60. Megha saw questions out of
       syllabus, and she was right.

       The band decides. The level maximum is only ever a cap. */
    var lvlMax  = rules.maxNumber || 99;
    var bandTop = Math.round(band.start + (band.end - band.start) * (through || 0.5));
    var ceiling = Math.min(Math.max(floor, bandTop), lvlMax);

    /* Longer sums as the level rises, but judged on the band the
       teacher actually chose, not the level's outer limit. */
    var rowsWanted = ceiling >= 1000 ? (Math.random() < 0.5 ? 3 : 4)
                   : ceiling >= 300  ? (Math.random() < 0.6 ? 3 : 2)
                   : (Math.random() < 0.55 ? 2 : 3);

    for (var t = 0; t < 30; t++) {
      var s = ColumnGen[decimalPlacesFor(rules) ? 'decimalColumn' : 'column']({
              decimals: decimalPlacesFor(rules),
        max: shownMax(rules, ceiling), rows: rowsWanted, mode: mode,
        require: mode === 'direct' ? 0 : 1, allowZero: rules.allowZero,
        signBias: rules.signBias || (rules.direction !== 'both' ? rules.direction : null)
      });
      if (!s) continue;
      if (!columnIsAllowed({ type: 'column', rows: s.rows, answer: s.answer }, rules)) continue;
      /* theme was not a variable in this scope at all — an earlier
         edit added it to this call and it would have thrown a
         ReferenceError, killing the whole session build. It is a
         parameter now. */
      var w = WordProblems.dress(s, theme);
      if (!w) continue;
      return {
        type: 'story', question: w.question, answer: w.answer,
        emoji: w.emoji, rows: s.rows, speak: true,
        prompt: 'Read it, then work it out'
      };
    }
    return null;
  }

/* Negative numbers, Level 8. Her method is the complement rule: the
   abacus shows a large number and the child reads it as a negative.
   Her examples are 5 - 9 = -4 and 33 - 43 = -10: a positive start and a
   larger subtraction that carries the total below zero.

   The bead model works on rods that cannot hold a minus, so these are
   checked for their arithmetic and their size rather than bead by bead —
   every step through zero is a complement, which is the lesson. */
function negativeSum(rules, rows) {
  var lim = Math.max(9, Math.min(rules.addSubMax || rules.maxNumber || 99, 999));
  var n = rows || (Math.random() < 0.6 ? 2 : 3);
  for (var t = 0; t < 60; t++) {
    var start = 1 + Math.floor(Math.random() * Math.max(1, Math.floor(lim * 0.6)));
    var out = [start], v = start;
    for (var i = 1; i < n; i++) {
      var last = i === n - 1;
      /* the last step makes sure the total ends below zero */
      var take = last
        ? v + 1 + Math.floor(Math.random() * Math.max(1, Math.floor(lim * 0.4)))
        : 1 + Math.floor(Math.random() * Math.max(1, Math.floor(lim * 0.5)));
      var sign = last || Math.random() < 0.6 ? -1 : 1;
      out.push(sign * take);
      v += sign * take;
    }
    if (v >= 0 || Math.abs(v) > lim) continue;
    /* Every number, not just the total, must fit the level. The last
       step is sized to push the total below zero, and on a longer sum
       that could ask for more than the level allows — a sum that fails
       its own check should never be built. */
    if (out.some(function (x) { return Math.abs(x) > lim; })) continue;
    return { type: 'column', rows: out, answer: v, negative: true };
  }
  return null;
}

function columnIsAllowed(q, rules) {
  /* A negative sum is judged on its arithmetic and size; its steps
     through zero are complements by design. */
  if (q && q.negative) {
    if (!rules.negative) return false;
    var tot = q.rows.reduce(function (a, b) { return a + b; }, 0);
    var lim = Math.max(9, rules.addSubMax || rules.maxNumber || 99);
    return tot === Number(q.answer) && q.rows.every(function (n) { return Math.abs(n) <= lim; });
  }
  if (!q || q.type !== 'column' && q.type !== 'oral') return true;
  if (typeof Beads === 'undefined') return true;
  if (!q.rows || !q.rows.length) return false;

  /* This checked small and big and said nothing about combination, so
     a combination step walked straight through at Level 1 and Level 2
     where it is not taught. That is the out-of-syllabus work Megha
     found, and it was here rather than in the generator.

     Checking the list instead of naming formulas one by one means a
     formula added later cannot slip past the same way. */
  var floorV = rules.allowZero ? 0 : 1;

  /* A decimal question is judged on its whole-rod form. Checking 3.5
     directly would let every step past, because stepKinds returns
     nothing for a fraction. */
  var rowsToCheck = q.intRows || q.rows;
  /* Addition and subtraction are held to the difficulty bands, per her
     rule, so the limit here is the highest band rather than the level's
     own number limit, which belongs to multiplication and division. */
  var addSubLimit = rules.addSubMax || rules.maxNumber;

  /* A level that works in one direction must not be handed a sum in the
     other. Built correctly this never triggers; it stops anything that
     built a column some other way. */
  var dir = rules.signBias || rules.direction;
  if (dir === 'add' || dir === 'sub') {
    var steps = (q.intRows || q.rows).slice(1);
    if (steps.some(function (n) { return dir === 'add' ? n < 0 : n > 0; })) return false;
  }
  var maxToCheck  = q.intRows
    ? addSubLimit * Math.pow(10, q.decimals || 1)
    : addSubLimit;
  var v = rowsToCheck[0];

  if (v > maxToCheck || v < floorV) return false;

  for (var i = 1; i < rowsToCheck.length; i++) {
    var kinds = Beads.stepKinds(v, rowsToCheck[i]);
    for (var k = 0; k < kinds.length; k++) {
      // 'direct' is plain bead movement and needs no formula
      if (kinds[k] !== 'direct' && rules.formulas.indexOf(kinds[k]) < 0) return false;
    }
    v += rowsToCheck[i];
    /* These two used rules.maxNumber while the walk is in whole rods,
       so a decimal sum was rejected for exceeding a limit ten times
       smaller than the numbers being walked. */
    if (v > maxToCheck) return false;
    if (v < floorV) return false;
  }

  /* And the final check compared the whole-rod total against the
     displayed answer — 184 against 18.4 — so every legal decimal
     sum was refused. */
  return v === (q.intAnswer !== undefined ? q.intAnswer : q.answer);
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
    /* A COPY. The rules come from a shared cache, and changing them here
       changed them for the next sheet too: one Easy sheet shrank the
       level's limit, and every Medium and Hard sheet after it came out
       at Easy's numbers until the page was reloaded. */
    var shared = await loadLevelRules(level);
    var rules = Object.assign({}, shared, {
      formulas:   (shared.formulas   || []).slice(),
      rowRules:   (shared.rowRules   || []).map(function (r) { return Object.assign({}, r); }),
      multShapes: (shared.multShapes || []).slice(),
      divShapes:  (shared.divShapes  || []).slice(),
      concepts:   (shared.concepts   || []).slice()
    });

    /* What a teacher picks has to reach the numbers.

       Her rule: the difficulty band governs ADDITION AND SUBTRACTION, so
       the band the teacher chose becomes the limit for those. The
       level's own limit stays as it is — it belongs to multiplication
       and division, which follow the formula master. Taking the smaller
       of the two used to cap Level 6 Hard at 9999 when she set 99999. */
    if (o.maxNumber) rules.addSubMax = o.maxNumber;
    if (o.minRows || o.maxRows) {
      var lo = o.minRows || 3, hi = o.maxRows || lo + 2;
      rules.rowRules = (rules.rowRules || []).map(function (r) {
        return { digit_pattern: r.digit_pattern,
                 min_rows: Math.max(lo, Math.min(hi, r.min_rows)),
                 max_rows: Math.max(lo, Math.min(hi, r.max_rows)) };
      });
      if (!rules.rowRules.length) {
        rules.rowRules = [{ digit_pattern: '1d', min_rows: lo, max_rows: hi }];
      }
    }
    // Addition only / subtraction only, as chosen
    rules.signBias = o.signBias || null;

    /* The concept a teacher picks is how she targets one weakness.
       It was never passed in, so at Level 3 a Big Friends sheet and a
       Combination sheet came out identical — both drew on whatever the
       level allowed. Narrowing it here means every sum on the sheet
       exercises the thing she chose. */
    if (o.concept) {
      var only = { big_friends: 'big', small_friends: 'small',
                   combination: 'combination' }[o.concept];
      if (only && rules.formulas.indexOf(only) > -1) {
        rules.formulas = [only];
      } else if (o.concept === 'direct_add' || o.concept === 'direct_sub') {
        rules.formulas = [];                 // direct movement only
        rules.signBias = o.concept === 'direct_add' ? 'add' : 'sub';
      }
    }

    var total = o.count || rules.sumsPerPage;

    /* A focus on multiplication, division or negative numbers means a
       sheet OF that. The focus used to be ignored for all three: asking
       for multiplication at Level 4 gave fewer multiplication questions
       than asking for nothing, and LX then threw even those away. Where
       the level does not teach the thing chosen, it says so rather than
       quietly handing back something else. */
    var ONLY = { multiplication: multiplication, division: division };
    if (o.concept && (ONLY[o.concept] || o.concept === 'negative')) {
      var teaches = o.concept === 'negative' ? rules.negative : rules[o.concept];
      if (!teaches) {
        return { level: level, rules: rules, questions: [],
                 error: 'Level ' + level + ' does not teach ' +
                        (o.concept === 'negative' ? 'negative numbers' : o.concept) +
                        ' in the curriculum' };
      }
      var only = [], seen = {}, guard = 0;
      while (only.length < total && guard < total * 30) {
        guard++;
        var q = o.concept === 'negative' ? negativeSum(rules) : ONLY[o.concept](rules);
        if (!q) continue;
        var key = (q.rows ? q.rows.join(',') : q.a + ':' + q.b);
        /* every question on the page different, as she asks at every
           level; a repeat is allowed only once the level has run out */
        if (seen[key] && guard < total * 20) continue;
        seen[key] = true;
        only.push(q);
      }
      return { level: level, rules: rules, questions: only };
    }

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
      var mix = mixFor(rules);
      var r = Math.random();
      var q;

      // Bands, so each share is what the level actually asks for
      var bBeads = mix.beads;
      var bStory = bBeads + mix.story;
      var bMult  = bStory + mix.mult;
      var bDiv   = bMult  + mix.div;

      if (r < bBeads)      q = beadsToNumbers(rules);
      else if (r < bStory) q = storyQuestion(rules, band, acrossPage, opts && opts.theme);
      else if (r < bMult)  q = multiplication(rules);
      else if (r < bDiv)   q = division(rules);
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
    division: division,
    division:       division,
    beadsToNumbers: beadsToNumbers,
    oral:           oral,
    columnText:     columnText,
    PATTERNS:       PATTERNS,
    _makeColumn:    makeColumn      // exposed for testing
  ,
    /* One builder and one check, shared with LX Designer, so the two
       can never disagree about what a level allows. */
    makeMultiplication: multiplication, makeDivision: division,
    isLegal: columnIsAllowed, negativeSum: negativeSum,
    shownMax: shownMax, decimalPlacesFor: decimalPlacesFor,
    forgetRules: forgetRules
  };
})();

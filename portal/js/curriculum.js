/* ============================================================
   iMathAcademy — Curriculum rules
   ------------------------------------------------------------
   Megha already decides, per level, whether children use the
   physical abacus or work mentally. She sets it in the admin
   under "Abacus Mode & Operations":

     physical_abacus   required | optional | not_used
     anzan_allowed     may solve mentally

   And per concept within a level:

     I  Introduced     P  Practised     M  Mastered
     R  Revision       N  Not applicable

   Until now the student app never read any of it. This module
   is the connection: the curriculum decides how the abacus
   behaves, not a hardcoded rule and not a child's preference.
   ============================================================ */

var CURRICULUM_RULES = {};   // level_code -> level row
var CURRICULUM_STATUS = {};  // level_code -> { concept_code: 'I'|'P'|'M'|'R'|'N' }

/** Load the rules for one level. Safe to call repeatedly. */
async function loadCurriculumRules(level) {
  var code = 'L' + level;
  if (CURRICULUM_RULES[code]) return CURRICULUM_RULES[code];

  try {
    var lv = await sb.from('curriculum_levels')
      .select('level_code, level_name, core_focus, physical_abacus, anzan_allowed, ' +
              'min_digits, max_digits, min_number, max_number, min_rows, max_rows')
      .eq('level_code', code).single();
    if (lv.error) throw lv.error;
    CURRICULUM_RULES[code] = lv.data || {};
  } catch (e) {
    console.warn('Curriculum rules unavailable for ' + code + ':', e.message);
    // Abacus required is the safe default — this is an abacus academy.
    CURRICULUM_RULES[code] = { level_code: code, physical_abacus: 'required', anzan_allowed: false };
  }

  try {
    var cs = await sb.from('curriculum_level_concepts')
      .select('status, curriculum_concepts(concept_code)')
      .eq('level_code', code);
    if (cs.error) throw cs.error;
    var map = {};
    (cs.data || []).forEach(function (row) {
      var cc = row.curriculum_concepts && row.curriculum_concepts.concept_code;
      if (cc) map[cc] = row.status;
    });
    CURRICULUM_STATUS[code] = map;
  } catch (e) {
    CURRICULUM_STATUS[code] = {};
  }

  return CURRICULUM_RULES[code];
}

/**
 * How should the abacus behave right now?
 *
 *   'guided'   the concept is being introduced — show the abacus and
 *              highlight what to move. Teaching the technique.
 *   'input'    the concept is being practised — the child sets the
 *              answer on the beads. This is the normal mode.
 *   'optional' the abacus is available but typing is allowed too.
 *   'mental'   no abacus. Anzan, or a level that does not use one.
 *
 * @param {number} level         the student's level, 0–8
 * @param {string} [conceptCode] the concept this worksheet covers
 */
function abacusModeFor(level, conceptCode) {
  var code  = 'L' + level;
  var rules = CURRICULUM_RULES[code] || {};
  var mode  = rules.physical_abacus || 'required';

  if (mode === 'not_used') return 'mental';

  // A mastered concept may be solved mentally where the level allows it
  var status = (CURRICULUM_STATUS[code] || {})[conceptCode];
  if (status === 'M' && rules.anzan_allowed) return 'mental';

  if (mode === 'optional') return 'optional';

  // Being introduced — walk the child through the beads
  if (status === 'I') return 'guided';

  return 'input';
}

/** Plain-English line explaining the mode to the child. */
function abacusModeLabel(mode) {
  return {
    guided:   'Follow the glowing bead',
    input:    'Set your answer on the abacus',
    optional: 'Use the abacus, or type your answer',
    mental:   'Solve this one in your head'
  }[mode] || '';
}

/** Does this mode allow typing the answer instead? */
function typingAllowed(mode) {
  return mode === 'optional' || mode === 'mental';
}


/* ============================================================
   LEVEL COMPLETION
   ------------------------------------------------------------
   A child completes a level by clearing three gates:

     1. every worksheet for the level submitted
     2. enough practice sessions   (Megha sets the number)
     3. a pass on the level test   (Megha sets the mark)

   Only then the certificate, and only then the next level.
   ============================================================ */

/**
 * Where is this child against the three gates?
 * Always resolves — a query failure reports the gate as incomplete
 * rather than throwing, so a child is never wrongly advanced.
 */
async function levelProgress(studentId, level) {
  var code  = 'L' + level;
  var rules = await loadCurriculumRules(level);

  var out = {
    levelCode: code,
    levelName: rules.level_name || ('Level ' + level),
    worksheets: { done: 0, total: 0, complete: false },
    practice:   { done: 0, required: rules.required_practice_sessions || 20, complete: false },
    test:       { exists: false, attempted: false, score: null,
                  passMark: rules.test_pass_mark || 80, passed: false },
    canComplete: false,
    alreadyCompleted: false
  };

  try {
    // Already certified? Then everything is settled.
    var done = await sb.from('student_level_completions')
      .select('certificate_number, completed_at')
      .eq('student_id', studentId).eq('level_code', code).limit(1);
    if (done.data && done.data.length) {
      out.alreadyCompleted   = true;
      out.certificateNumber  = done.data[0].certificate_number;
      out.completedAt        = done.data[0].completed_at;
    }

    // Which batches is this child in?
    var bl = await sb.from('batch_students').select('batch_id').eq('student_id', studentId);
    var batchIds = (bl.data || []).map(function (b) { return b.batch_id; });

    // Everything assigned to them at this level
    var filter = 'student_id.eq.' + studentId;
    if (batchIds.length) filter += ',batch_id.in.(' + batchIds.join(',') + ')';

    var ws = await sb.from('lx_worksheets')
      .select('id, is_level_test')
      .eq('is_active', true).eq('level_code', code).or(filter);
    var all = ws.data || [];

    var practiceSheets = all.filter(function (w) { return !w.is_level_test; });
    var testSheets     = all.filter(function (w) { return  w.is_level_test; });

    // What have they submitted?
    var rs = await sb.from('worksheet_responses')
      .select('worksheet_id, score, total').eq('student_id', studentId);
    var byId = {};
    (rs.data || []).forEach(function (r) { byId[r.worksheet_id] = r; });

    // ── Gate 1 — worksheets ──────────────────────────────────
    out.worksheets.total = practiceSheets.length;
    out.worksheets.done  = practiceSheets.filter(function (w) { return byId[w.id]; }).length;
    out.worksheets.complete =
      out.worksheets.total > 0 && out.worksheets.done >= out.worksheets.total;

    // ── Gate 2 — practice ────────────────────────────────────
    var ps = await sb.from('practice_sessions')
      .select('id').eq('student_id', studentId);
    out.practice.done     = (ps.data || []).length;
    out.practice.complete = out.practice.done >= out.practice.required;

    // ── Gate 3 — the level test ──────────────────────────────
    out.test.exists = testSheets.length > 0;
    var best = null;
    testSheets.forEach(function (t) {
      var r = byId[t.id];
      if (!r || !r.total) return;
      var pct = Math.round(r.score / r.total * 100);
      if (best === null || pct > best) best = pct;
    });
    if (best !== null) {
      out.test.attempted = true;
      out.test.score     = best;
      out.test.passed    = best >= out.test.passMark;
    }

    out.canComplete = out.worksheets.complete &&
                      out.practice.complete &&
                      out.test.passed &&
                      !out.alreadyCompleted;

  } catch (e) {
    console.warn('levelProgress:', e.message);
  }

  return out;
}

/** One line saying what is still standing between the child and the certificate. */
function nextStepFor(p) {
  if (p.alreadyCompleted)      return 'Level complete! Certificate ' + (p.certificateNumber || 'issued') + ' 🎓';
  if (!p.worksheets.complete)  return (p.worksheets.total - p.worksheets.done) + ' more worksheet' +
                                      ((p.worksheets.total - p.worksheets.done) === 1 ? '' : 's') + ' to finish';
  if (!p.practice.complete)    return (p.practice.required - p.practice.done) + ' more practice session' +
                                      ((p.practice.required - p.practice.done) === 1 ? '' : 's');
  if (!p.test.exists)          return 'Waiting for your teacher to set the level test';
  if (!p.test.attempted)       return 'Take the level test — you are ready!';
  if (!p.test.passed)          return 'Try the level test again — you need ' + p.test.passMark + '%';
  return 'Ready for your certificate! 🎓';
}

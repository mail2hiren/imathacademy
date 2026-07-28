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

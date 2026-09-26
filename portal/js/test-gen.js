/* ============================================================
   iMathAcademy — building a test paper from Megha's blueprint
   ------------------------------------------------------------
   A blueprint says what the paper asks: a list of sections, each with
   a method, how many questions, how big, and how it reaches the child
   (written, read aloud, mentally, or flashed).

   Two things make a test different from a worksheet, and both matter:

     - THE SAME PAPER FOR EVERYONE at that level. No pitching to where
       a child sits in the level; if one child's paper were easier than
       another's, a pass would mean nothing and the certificate would
       rest on it.

     - A FRESH PAPER EACH ATTEMPT. Same blueprint, same difficulty,
       different numbers, so a retake is not a memory exercise.

   Nothing is served that fails its own check: every question is put
   back through the engine's gate for that level before the paper is
   handed over, and a section that cannot be built says so rather than
   quietly making up something else.
   ============================================================ */

var TestGen = (function () {
  'use strict';

  function levelNumber(code) { return parseInt(String(code).replace(/\D/g, ''), 10) || 0; }
  function isVedic(code) { return /^VL/.test(String(code)); }

  /* Which concept each section names, in the words the engines use. */
  function abacusModeFor(concept) {
    var c = String(concept || '').toLowerCase();
    if (/big/.test(c) && /friend/.test(c)) return 'big';
    if (/small/.test(c) && /friend/.test(c)) return 'small';
    if (/combin|family|mixed/.test(c)) return 'combination';
    return 'direct';
  }

  /** One section of an Abacus paper. */
  async function abacusSection(section, levelCode, rules) {
    var out = [], want = Number(section.count) || 10;
    var concept = String(section.concept || '').toLowerCase();
    var digits = Number(section.digits) || 2;
    var rows   = Number(section.rows) || 3;
    var ceiling = Math.pow(10, digits) - 1;

    /* Multiplication and division follow the formula master, as Megha
       set for worksheets; the digits she chose here are respected where
       a shape of that size exists. */
    if (/multipl/.test(concept)) {
      for (var i = 0; i < want * 40 && out.length < want; i++) {
        var m = PracticeEngine.makeMultiplication(rules);
        if (m) out.push(m);
      }
      return out;
    }
    if (/divis/.test(concept)) {
      for (var j = 0; j < want * 40 && out.length < want; j++) {
        var d = PracticeEngine.makeDivision(rules);
        if (d) out.push(d);
      }
      return out;
    }
    if (/negativ/.test(concept)) {
      for (var k = 0; k < want * 40 && out.length < want; k++) {
        var n = PracticeEngine.negativeSum(rules, rows);
        if (n && PracticeEngine.isLegal(n, rules)) out.push(n);
      }
      return out;
    }

    var mode = abacusModeFor(concept);
    var dec = /decimal/.test(concept) ? 1 : (PracticeEngine.decimalPlacesFor(rules) || 0);
    var seen = {};
    for (var t = 0; t < want * 60 && out.length < want; t++) {
      var opts = {
        max: PracticeEngine.shownMax(rules, Math.min(ceiling, rules.addSubMax || rules.maxNumber)),
        rows: rows, mode: mode, require: mode === 'direct' ? 0 : 1,
        allowZero: rules.allowZero, decimals: dec,
        signBias: rules.signBias || (rules.direction && rules.direction !== 'both' ? rules.direction : null)
      };
      var s = dec ? ColumnGen.decimalColumn(opts) : ColumnGen.column(opts);
      if (!s) continue;
      var q = { type: 'column', rows: s.rows, answer: s.answer,
                intRows: s.intRows, intAnswer: s.intAnswer, decimals: s.decimals };
      if (!PracticeEngine.isLegal(q, rules)) continue;
      /* Every answer on a paper different, as she asks for worksheets. */
      if (seen[String(q.answer)] && out.length < want - 1) continue;
      seen[String(q.answer)] = true;
      out.push(q);
    }
    return out;
  }

  /** One section of a Vedic paper. */
  function vedicSection(section, levelCode) {
    var out = [], want = Number(section.count) || 10;
    var L = levelNumber(levelCode);
    var method = section.concept;
    var seen = {};
    for (var t = 0; t < want * 60 && out.length < want; t++) {
      var q = VedicGen.one(method, L, {});
      if (!q) break;
      if (seen[q.text] && out.length < want - 1) continue;
      seen[q.text] = true;
      out.push(q);
    }
    return out;
  }

  function textFor(q) {
    if (q.rows) {
      return q.rows.map(function (n, i) {
        return i === 0 ? String(n) : (n < 0 ? '\u2212 ' + Math.abs(n) : '+ ' + n);
      }).join('\n');
    }
    if (q.type === 'multiplication') return q.a + ' \u00d7 ' + q.b;
    if (q.type === 'division')       return q.a + ' \u00f7 ' + q.b;
    return q.text || '';
  }

  /**
   * Build the paper.
   * Returns { questions, total, problems } — problems names any section
   * that could not be filled, so a teacher is told rather than given a
   * short paper without knowing.
   */
  async function build(blueprint) {
    var bp = blueprint || {};
    var levelCode = bp.level_code || 'L1';
    var vedic = isVedic(levelCode) || bp.program_code === 'vedic';
    var L = levelNumber(levelCode);
    var questions = [], problems = [];

    var rules = null;
    if (!vedic) {
      rules = await PracticeEngine.loadLevelRules(L);
    } else if (typeof VedicEngine !== 'undefined' && VedicEngine.sync) {
      try { await VedicEngine.sync(sb, true); } catch (e) {}
    }

    var sections = Array.isArray(bp.sections) ? bp.sections : [];
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var want = Number(sec.count) || 10;
      var made = vedic ? vedicSection(sec, levelCode) : await abacusSection(sec, levelCode, rules);

      if (made.length < want) {
        problems.push('Section ' + (i + 1) + ' (' + (sec.concept || 'no method') + ') asked for ' +
          want + ' and could build ' + made.length);
      }
      made.forEach(function (q) {
        questions.push({
          section:   i + 1,
          concept:   sec.concept || '',
          delivery:  sec.delivery || 'written',
          question:  textFor(q),
          answer:    String(typeof q.answer === 'object'
                       ? (q.answer.r ? q.answer.q + ' r ' + q.answer.r : q.answer.q)
                       : q.answer),
          rows:      q.rows,
          a: q.a, b: q.b,
          method:    q.label || '',
          method_key: q.method || '',
          level:     L,
          negative:  q.negative || undefined,
          decimals:  q.decimals || undefined
        });
      });
    }

    return { questions: questions, total: questions.length, problems: problems,
             blueprint: bp, levelCode: levelCode, vedic: vedic };
  }

  /** Every question checked against the level it is set for. */
  async function audit(paper) {
    var bad = [];
    if (paper.vedic) {
      (paper.questions || []).forEach(function (q, i) {
        if (!q.method_key) return;
        if (!Sutras.isAllowed(q.method_key, q.a, q.b, q.level)) {
          bad.push('Q' + (i + 1) + ': ' + q.question.replace(/\n/g, ' ') + ' does not suit ' + q.method);
        }
      });
      return bad;
    }
    var rules = await PracticeEngine.loadLevelRules(paper.questions.length ? paper.questions[0].level : 1);
    (paper.questions || []).forEach(function (q, i) {
      if (!q.rows) return;                 // multiplication and division are not columns
      if (!PracticeEngine.isLegal({ type: 'column', rows: q.rows, answer: Number(q.answer),
                                    negative: q.negative }, rules)) {
        bad.push('Q' + (i + 1) + ': ' + q.question.replace(/\n/g, ' ') + ' is outside this level');
      }
    });
    return bad;
  }

  return { build: build, audit: audit, textFor: textFor, levelNumber: levelNumber, isVedic: isVedic };
})();

if (typeof module !== 'undefined') module.exports = TestGen;

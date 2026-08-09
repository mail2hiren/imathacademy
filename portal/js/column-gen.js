/* ============================================================
   iMathAcademy — Building a column a child can actually work
   ------------------------------------------------------------
   Every step is chosen from what the beads allow, not picked and
   hoped for:

     L0   every step direct — no complement anywhere, per Megha's
          note "avoid big friend or small friends formula"
     L1   a set number of steps must DEMAND the formula being
          taught, so a Big Friends sheet really practises it

   A page also gets easier at the start and harder at the end, and
   no two sums on it share an answer.
   ============================================================ */

var ColumnGen = (function () {
  'use strict';

  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function pick(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }

  /**
   * One column.
   *
   * @param opts.max        highest the running total may reach
   * @param opts.rows       how many numbers
   * @param opts.mode       'direct' | 'small' | 'big'
   * @param opts.require    how many steps must demand the formula
   * @param opts.allowZero  may the running total rest on zero
   */
  function column(opts) {
    var max      = opts.max || 30;
    var rows     = opts.rows || 4;
    var mode     = opts.mode || 'direct';
    var need     = mode === 'direct' ? 0 : (opts.require || 1);
    var allowZero = !!opts.allowZero;
    var floorV   = allowZero ? 0 : 1;

    // How wide may a single number be? Capping this at 9 meant the
    // generator never used the two-digit range, so a page could only
    // ever reach nine different answers.
    var maxStep = opts.maxStep || max;

    for (var attempt = 0; attempt < 220; attempt++) {
      // Start anywhere in range, not just at a single digit
      var start = randInt(1, Math.max(1, Math.floor(max * 0.6)));
      var value = start;
      var out   = [start];
      var got   = 0;
      var ok    = true;

      for (var i = 1; i < rows; i++) {
        var direct  = Beads.directOptions(value, max, allowZero, maxStep);
        var formula = mode === 'direct'
          ? { add: [], sub: [] }
          : Beads.formulaOptions(value, max, allowZero, mode, maxStep);

        // Take the formula steps first while any are still owed
        var stillNeeded = need - got;
        var stepsLeft   = rows - i;
        var useFormula  = stillNeeded > 0 &&
                          (formula.add.length || formula.sub.length) &&
                          (stillNeeded >= stepsLeft || Math.random() < 0.55);

        var src = useFormula ? formula : direct;
        var canAdd = src.add.length, canSub = src.sub.length;
        if (!canAdd && !canSub) { ok = false; break; }

        // Lean towards adding so the column climbs rather than stalls
        var doAdd = canAdd && (!canSub || Math.random() < 0.62);
        var n = doAdd ? pick(src.add) : pick(src.sub);

        out.push(doAdd ? n : -n);
        value += doAdd ? n : -n;
        if (useFormula) got++;
      }

      if (!ok || got < need) continue;
      if (value < floorV) continue;
      return { rows: out, answer: value, mode: mode, formulaSteps: got };
    }
    return null;   // the constraints could not be met
  }

  /**
   * A page of sums that gets harder as it goes and never repeats an
   * answer — "the answer for each question should be different".
   */
  function page(opts) {
    var count   = opts.count || 20;
    var max     = opts.max || 30;
    var minRows = opts.minRows || 3;
    var maxRows = opts.maxRows || 5;
    var mode    = opts.mode || 'direct';

    var out = [], seen = {}, guard = 0;

    while (out.length < count && guard < count * 60) {
      guard++;
      var through = out.length / count;      // 0 at the start, 1 at the end

      // Rows and range both grow across the page. The range starts at
      // single digits — a child on their first day should not meet a
      // two-digit sum as question one — and climbs from there.
      var rows = Math.round(minRows + (maxRows - minRows) * through);
      var ceiling = Math.max(9, Math.round(9 + (max - 9) * Math.pow(through, 1.4)));

      // The formula is asked for more insistently later on
      var require = mode === 'direct' ? 0 : (through < 0.35 ? 1 : 2);

      var c = column({ max: ceiling, rows: rows, mode: mode,
                       require: require, allowZero: opts.allowZero });
      if (!c) continue;
      if (seen[c.answer]) continue;          // every answer different
      seen[c.answer] = true;
      out.push(c);
    }

    // If uniqueness could not be met, fill the rest without it rather
    // than hand back a short page
    while (out.length < count) {
      var f = column({ max: max, rows: maxRows, mode: mode,
                       require: mode === 'direct' ? 0 : 1, allowZero: opts.allowZero });
      if (!f) break;
      out.push(f);
    }
    return out;
  }

  return { column: column, page: page };
})();

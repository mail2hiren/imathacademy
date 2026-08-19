/* ============================================================
   iMathAcademy — What a bead can actually do
   ------------------------------------------------------------
   A rod holds one heaven bead (worth 5) and four earth beads
   (worth 1 each). Adding a number is only "direct" when the beads
   it needs are free to move. When they are not, the child must use
   a complement:

     Small Friends   +n = +5  − (5−n)      needs the heaven bead free
     Big Friends     +n = +10 − (10−n)     carries into the next rod

   The generator had no model of this at all. It picked numbers by
   digit width and range, so 78% of the columns it produced for
   Level 0 forced a formula Megha explicitly forbids there.

   Everything below is about one rod. A multi-digit sum is judged
   rod by rod, because that is how a child works it.
   ============================================================ */

var Beads = (function () {
  'use strict';

  /** Split a digit into its heaven and earth beads. */
  function rod(d) { return { h: d >= 5 ? 1 : 0, e: d >= 5 ? d - 5 : d }; }

  function canAddDirect(d, n) {
    var r = rod(d);
    if (n <= 4) return r.e + n <= 4;
    if (n === 5) return r.h === 0;
    return r.h === 0 && r.e + (n - 5) <= 4;      // 6..9, both hands at once
  }

  function canSubDirect(d, n) {
    var r = rod(d);
    if (n <= 4) return r.e - n >= 0;
    if (n === 5) return r.h === 1;
    return r.h === 1 && r.e - (n - 5) >= 0;
  }

  /**
   * Which movement does adding n to a rod showing d require?
   *   'direct' | 'small' | 'big'
   */
  function addKind(d, n) {
    if (canAddDirect(d, n)) return 'direct';
    var r = rod(d);

    // Small Friends only works while the heaven bead is still free
    // and there are enough earth beads to give back.
    if (n <= 4 && r.h === 0 && r.e >= (5 - n)) return 'small';

    /* Otherwise the ten is needed: +n = +10 - (10-n). Whether that is
       Big Friends or a Combination depends on the rod. If the (10-n)
       can simply be taken off, it is Big Friends. If it cannot — no
       earth beads to give and the heaven bead in the way — the child
       has to break the five as well: +10 -5 +x. That is the
       Combination formula, and Level 3 is built around it.

       Megha's own example: 8 + 6. Big friend of 6 is 4, but 8 has
       only 3 earth beads, so 4 cannot come off directly. It becomes
       +10 -5 +1. */
    var give = 10 - n;
    return canSubDirect(d, give) ? 'big' : 'combination';
  }

  function subKind(d, n) {
    if (canSubDirect(d, n)) return 'direct';
    var r = rod(d);
    if (n <= 4 && r.h === 1 && (r.e + (5 - n)) <= 4) return 'small';
    // -n = -10 + (10-n). If that addition needs the five broken too,
    // it is a Combination rather than plain Big Friends.
    var give = 10 - n;
    return canAddDirect(d, give) ? 'big' : 'combination';
  }

  /**
   * Work a whole step rod by rod, the way a child does — units first,
   * carrying left. Returns every movement the step demands.
   */
  function stepKinds(value, delta) {
    var kinds = [];
    var add = delta > 0;
    var n = Math.abs(delta);
    var v = value;
    var place = 0;

    while (n > 0) {
      var digit = Math.floor(n % 10);
      var rodDigit = Math.floor(v / Math.pow(10, place)) % 10;
      if (digit > 0) {
        kinds.push(add ? addKind(rodDigit, digit) : subKind(rodDigit, digit));
      }
      n = Math.floor(n / 10);
      place++;
    }
    return kinds;
  }

  /** Does this step stay within direct bead movement throughout? */
  function isDirect(value, delta) {
    return stepKinds(value, delta).every(function (k) { return k === 'direct'; });
  }

  /** Does this step demand the named formula somewhere? */
  function needs(value, delta, formula) {
    return stepKinds(value, delta).indexOf(formula) > -1;
  }

  /** Every step from this value that is purely direct movement.
      maxStep lets two-digit addends be considered, which is what
      Megha's own L0 examples use — 11+23, 52+47, 44-23. */
  function directOptions(value, max, allowZero, maxStep) {
    var out = { add: [], sub: [] };
    var top = maxStep || 9;
    for (var n = 1; n <= top; n++) {
      if (value + n <= max && isDirect(value, n)) out.add.push(n);
      var floorV = allowZero ? 0 : 1;
      if (value - n >= floorV && isDirect(value, -n)) out.sub.push(n);
    }
    return out;
  }

  /** Every step from this value that demands the named formula. */
  function formulaOptions(value, max, allowZero, formula, maxStep) {
    var out = { add: [], sub: [] };
    var top = maxStep || 9;
    for (var n = 1; n <= top; n++) {
      if (value + n <= max && needs(value, n, formula)) out.add.push(n);
      var floorV = allowZero ? 0 : 1;
      if (value - n >= floorV && needs(value, -n, formula)) out.sub.push(n);
    }
    return out;
  }

  return {
    rod: rod,
    canAddDirect: canAddDirect, canSubDirect: canSubDirect,
    addKind: addKind, subKind: subKind,
    stepKinds: stepKinds, isDirect: isDirect, needs: needs,
    directOptions: directOptions, formulaOptions: formulaOptions
  };
})();

/* ============================================================
   iMathAcademy — Abacus component
   ------------------------------------------------------------
   One abacus engine, many hosts. Mount it into any element:

     const ab = Abacus.mount(document.getElementById('slot'), {
       onChange: function (value) { console.log(value); }
     });

     ab.getValue()        current value, decimals included
     ab.setValue(123.45)  set the beads to a number
     ab.reset()           all beads to resting
     ab.setReadonly(true) look but do not touch
     ab.hint(8, 'earth', 2)  pulse a bead — guided mode
     ab.clearHints()
     ab.destroy()

   Layout, for a 17-rod board with ones at visual index 8:
     rod 1  (vi 0)  ten crores        rod 9  (vi 8)  ONES
     rod 10 (vi 9)  first decimal     rod 17 (vi 16) 1e-8
   Unit dots fall on every third rod: 3, 6, 9, 12, 15.
   ============================================================ */

window.Abacus = (function () {
  'use strict';

  var WARM        = ['#E53935', '#EF6C00', '#F9A825', '#388E3C', '#1565C0', '#6A1B9A'];
  var WARM_LIGHT  = ['#FFCDD2', '#FFE0B2', '#FFF9C4', '#C8E6C9', '#BBDEFB', '#E1BEE7'];
  var WARM_DARK   = ['#B71C1C', '#E65100', '#F57F17', '#1B5E20', '#0D47A1', '#4A148C'];
  var DECIMAL     = '#00838F';

  var sharedAudioCtx = null;
  function audioCtx() {
    if (!sharedAudioCtx) {
      try {
        sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* audio unavailable — silently continue */ }
    }
    return sharedAudioCtx;
  }

  function mount(container, options) {
    if (!container) throw new Error('Abacus.mount: container element is required');
    var opt = options || {};

    var N          = opt.rods       != null ? opt.rods       : 17;
    var ONES_VI    = opt.onesIndex  != null ? opt.onesIndex  : 8;
    var soundOn    = opt.sound      != null ? opt.sound      : true;
    var showValue  = opt.showValue  != null ? opt.showValue  : true;
    var readonly   = !!opt.readonly;
    var onChange   = typeof opt.onChange === 'function' ? opt.onChange : null;

    var DEC_VI      = ONES_VI + 1;
    var MAX_DECIMAL = N - 1 - ONES_VI;
    var SCALE       = Math.pow(10, MAX_DECIMAL);

    // state[vi] = { h: 0|1, e: 0..4 }
    var state = [];

    // Geometry, recomputed on resize
    var BW, BH, GAP, H_GAP = 5, E_PAD = 4;
    var H_H, H_REST, H_ACTIVE, E_H;

    // ── Colours ───────────────────────────────────────────────
    function rodColour(vi) {
      return vi < DEC_VI ? WARM[vi % WARM.length] : DECIMAL;
    }
    function beadGradient(vi) {
      if (vi >= DEC_VI) {
        return 'radial-gradient(ellipse at 35% 28%,#B2EBF2,' + DECIMAL + ' 60%,#004D40)';
      }
      var i = vi % WARM.length;
      return 'radial-gradient(ellipse at 35% 28%,' + WARM_LIGHT[i] + ',' +
             WARM[i] + ' 60%,' + WARM_DARK[i] + ')';
    }

    // ── Geometry ──────────────────────────────────────────────
    function calcDims() {
      var availW = (root.clientWidth || 340) - 26;
      BW  = Math.max(10, Math.min(24, Math.floor(availW / N) - 3));
      BH  = Math.round(BW * 0.65);
      GAP = Math.max(2, Math.round(BH * 0.15));

      H_H      = BH + H_GAP + BH + 8;
      H_REST   = 4;
      H_ACTIVE = 4 + BH + H_GAP;

      // Four earth beads plus one empty slot below the divider
      E_H = 4 * (BH + GAP) - GAP + BH + GAP + 8;
    }

    function earthActiveTop(bi) { return E_PAD + (bi - 1) * (BH + GAP); }
    function earthRestTop(bi)   { return E_H - E_PAD - BH - (4 - bi) * (BH + GAP); }
    function earthTop(bi, e)    { return bi <= e ? earthActiveTop(bi) : earthRestTop(bi); }

    // ── Sound ─────────────────────────────────────────────────
    function beep(freq) {
      if (!soundOn) return;
      var ctx = audioCtx();
      if (!ctx) return;
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start(); osc.stop(ctx.currentTime + 0.07);
    }

    // ── Value ─────────────────────────────────────────────────
    // Accumulate in scaled integers so decimals do not drift.
    function getValue() {
      var scaled = 0;
      for (var vi = 0; vi < N; vi++) {
        var digit = state[vi].h * 5 + state[vi].e;
        scaled += digit * Math.pow(10, (ONES_VI - vi) + MAX_DECIMAL);
      }
      return scaled / SCALE;
    }

    function setValue(n) {
      var scaled = Math.round(Math.abs(Number(n) || 0) * SCALE);
      for (var vi = 0; vi < N; vi++) {
        var place = (ONES_VI - vi) + MAX_DECIMAL;
        var digit = Math.floor(scaled / Math.pow(10, place)) % 10;
        state[vi].h = digit >= 5 ? 1 : 0;
        state[vi].e = digit >= 5 ? digit - 5 : digit;
      }
      refreshAll();
      emit();
    }

    function reset() {
      for (var vi = 0; vi < N; vi++) { state[vi].h = 0; state[vi].e = 0; }
      refreshAll();
      emit();
    }

    function emit() {
      renderValue();
      if (onChange) {
        try { onChange(getValue()); } catch (e) { console.warn('Abacus onChange:', e); }
      }
    }

    // ── DOM ───────────────────────────────────────────────────
    var root      = document.createElement('div');
    root.className = 'imath-abacus' + (readonly ? ' ab-readonly' : '');

    var valueWrap = document.createElement('div');
    valueWrap.className = 'ab-value';
    valueWrap.innerHTML =
      '<div class="ab-value-label">Value</div>' +
      '<div class="ab-value-num is-zero">0</div>';
    var valueNum = valueWrap.querySelector('.ab-value-num');

    var frame     = document.createElement('div'); frame.className = 'ab-frame';
    var topBar    = document.createElement('div'); topBar.className = 'ab-bar';
    var heavenRow = document.createElement('div'); heavenRow.className = 'ab-rods';
    var divider   = document.createElement('div'); divider.className = 'ab-divider';
    var earthRow  = document.createElement('div'); earthRow.className = 'ab-rods';
    var botBar    = document.createElement('div'); botBar.className = 'ab-bar';

    frame.appendChild(topBar);
    frame.appendChild(heavenRow);
    frame.appendChild(divider);
    frame.appendChild(earthRow);
    frame.appendChild(botBar);

    if (showValue) root.appendChild(valueWrap);
    root.appendChild(frame);
    container.appendChild(root);

    function makeBead(vi, top) {
      var b = document.createElement('div');
      b.className = 'ab-bead';
      b.style.width  = BW + 'px';
      b.style.height = BH + 'px';
      b.style.background = beadGradient(vi);
      b.style.top = top + 'px';
      return b;
    }

    function makeStick(vi, height) {
      var s = document.createElement('div');
      s.className = 'ab-stick';
      s.style.background = rodColour(vi);
      s.style.height = height + 'px';
      return s;
    }

    function build() {
      calcDims();
      heavenRow.innerHTML = '';
      earthRow.innerHTML  = '';
      divider.innerHTML   = '';
      heavenRow.style.height = H_H + 'px';
      earthRow.style.height  = E_H + 'px';

      for (var vi = 0; vi < N; vi++) {
        // Heaven rod — one bead worth five
        var hRod = document.createElement('div');
        hRod.className = 'ab-rod';
        hRod.style.height = H_H + 'px';
        hRod.appendChild(makeStick(vi, H_H));

        var hBead = makeBead(vi, state[vi].h ? H_ACTIVE : H_REST);
        hBead.dataset.vi = vi;
        hBead.dataset.kind = 'heaven';
        hBead.addEventListener('click', onHeavenTap);
        hBead.addEventListener('touchend', onHeavenTap, { passive: false });
        hRod.appendChild(hBead);
        heavenRow.appendChild(hRod);

        // Earth rod — four beads worth one each
        var eRod = document.createElement('div');
        eRod.className = 'ab-rod';
        eRod.style.height = E_H + 'px';
        eRod.appendChild(makeStick(vi, E_H));

        for (var bi = 1; bi <= 4; bi++) {
          var eBead = makeBead(vi, earthTop(bi, state[vi].e));
          eBead.dataset.vi = vi;
          eBead.dataset.bi = bi;
          eBead.dataset.kind = 'earth';
          eBead.addEventListener('click', onEarthTap);
          eBead.addEventListener('touchend', onEarthTap, { passive: false });
          eRod.appendChild(eBead);
        }
        earthRow.appendChild(eRod);
      }

      buildDividerMarks();
      renderValue();
    }

    function buildDividerMarks() {
      var colWidth = (heavenRow.offsetWidth || (N * (BW + 3))) / N;

      // Unit dots on every third rod: 3, 6, 9, 12, 15 …
      for (var vi = 0; vi < N; vi++) {
        if ((vi + 1) % 3 !== 0) continue;
        var dot = document.createElement('div');
        dot.className = 'ab-dot';
        dot.style.left = ((vi + 0.5) * colWidth) + 'px';
        divider.appendChild(dot);
      }

      // Decimal boundary sits on the left edge of the first decimal rod
      if (DEC_VI < N) {
        var sep = document.createElement('div');
        sep.className = 'ab-decimal-sep';
        sep.style.left = (DEC_VI * colWidth - 1) + 'px';
        divider.appendChild(sep);
      }
    }

    // ── Interaction ───────────────────────────────────────────
    function onHeavenTap(ev) {
      if (ev.type === 'touchend') ev.preventDefault();
      ev.stopPropagation();
      if (readonly) return;
      var vi = +this.dataset.vi;
      state[vi].h = state[vi].h ? 0 : 1;
      this.style.top = (state[vi].h ? H_ACTIVE : H_REST) + 'px';
      beep(900);
      emit();
    }

    function onEarthTap(ev) {
      if (ev.type === 'touchend') ev.preventDefault();
      ev.stopPropagation();
      if (readonly) return;
      var vi = +this.dataset.vi;
      var bi = +this.dataset.bi;
      // Tapping an active bead sends it and everything above back down.
      // Tapping a resting bead brings it and everything above it up.
      state[vi].e = (bi <= state[vi].e) ? bi - 1 : bi;
      refreshEarthRod(vi);
      beep(650);
      emit();
    }

    // ── Rendering ─────────────────────────────────────────────
    function refreshEarthRod(vi) {
      var beads = earthRow.children[vi].querySelectorAll('.ab-bead');
      for (var i = 0; i < beads.length; i++) {
        var bi = +beads[i].dataset.bi;
        beads[i].style.top = earthTop(bi, state[vi].e) + 'px';
      }
    }

    function refreshHeavenRod(vi) {
      var bead = heavenRow.children[vi].querySelector('.ab-bead');
      if (bead) bead.style.top = (state[vi].h ? H_ACTIVE : H_REST) + 'px';
    }

    function refreshAll() {
      for (var vi = 0; vi < N; vi++) { refreshHeavenRod(vi); refreshEarthRod(vi); }
    }

    function renderValue() {
      if (!showValue) return;
      var v = getValue();
      valueNum.textContent = v === 0
        ? '0'
        : v.toLocaleString('en-IN', { maximumFractionDigits: MAX_DECIMAL });
      valueNum.classList.toggle('is-zero', v === 0);
    }

    // ── Guided mode ───────────────────────────────────────────
    function hint(vi, kind, beadIndex) {
      var row = kind === 'heaven' ? heavenRow : earthRow;
      var rod = row.children[vi];
      if (!rod) return;
      var bead = kind === 'heaven'
        ? rod.querySelector('.ab-bead')
        : rod.querySelector('.ab-bead[data-bi="' + beadIndex + '"]');
      if (bead) bead.classList.add('ab-hint');
    }
    function clearHints() {
      var hinted = root.querySelectorAll('.ab-bead.ab-hint');
      for (var i = 0; i < hinted.length; i++) hinted[i].classList.remove('ab-hint');
    }

    // ── Resize ────────────────────────────────────────────────
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 90);
    }
    var observer = null;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(onResize);
      observer.observe(root);
    } else {
      window.addEventListener('resize', onResize);
    }

    // ── Boot ──────────────────────────────────────────────────
    for (var i = 0; i < N; i++) state.push({ h: 0, e: 0 });
    build();

    return {
      el: root,
      getValue: getValue,
      setValue: setValue,
      reset: reset,
      relayout: build,
      hint: hint,
      clearHints: clearHints,
      setSound: function (on) { soundOn = !!on; if (soundOn) audioCtx(); },
      isSoundOn: function () { return soundOn; },
      setReadonly: function (on) {
        readonly = !!on;
        root.classList.toggle('ab-readonly', readonly);
      },
      destroy: function () {
        clearTimeout(resizeTimer);
        if (observer) observer.disconnect();
        else window.removeEventListener('resize', onResize);
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  return { mount: mount };
})();

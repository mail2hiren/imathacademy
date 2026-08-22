/* ============================================================
   iMathAcademy — The voice that reads to a child
   ------------------------------------------------------------
   Megha's children could not follow the voice they were getting.
   Two reasons, both fixable:

   Practice never chose a voice at all, so whatever the device
   defaulted to was used — on most Android phones that is a male
   voice. And nothing set a language, so an Indian child heard
   American or British English reading Indian numbers.

   This picks a female Indian English voice where one exists,
   falls back sensibly, and is shared by practice, the weekly
   quiz and worksheets so all three sound the same.

   It also repeats. A five-year-old asked to hold a number in
   their head needs to hear it more than once, and Megha says
   they need it two or three times even slowly.
   ============================================================ */

var Speech = (function () {
  'use strict';

  var chosen = null;
  var ready  = false;

  /* Names vary by device, so this is a preference order rather than
     a lookup. Indian English first, then any female English voice,
     then anything English at all. */
  var WANT = [
    /en[-_]IN/i,                          // Indian English, any
    /Heera|Kalpana|Veena|Raveena|Aditi/i, // known Indian female voices
    /Google.*(Hindi|India)/i,
    /female/i,
    /Samantha|Karen|Moira|Tessa|Fiona|Victoria|Zira|Susan/i  // female en-*
  ];

  function score(v) {
    var s = 0;
    var tag = (v.name || '') + ' ' + (v.lang || '');
    WANT.forEach(function (re, i) { if (re.test(tag)) s += (WANT.length - i) * 10; });
    if (/en/i.test(v.lang)) s += 5;
    if (/male/i.test(v.name) && !/female/i.test(v.name)) s -= 15;
    return s;
  }

  function choose() {
    if (!window.speechSynthesis) return null;
    var all = window.speechSynthesis.getVoices() || [];
    if (!all.length) return null;
    var best = null, bestScore = -999;
    all.forEach(function (v) {
      var s = score(v);
      if (s > bestScore) { bestScore = s; best = v; }
    });
    chosen = best;
    ready = true;
    return best;
  }

  // Voices load asynchronously on most browsers
  if (window.speechSynthesis) {
    choose();
    window.speechSynthesis.onvoiceschanged = function () { choose(); };
  }

  /** A teacher or parent can override the choice; it is remembered. */
  function setVoiceByName(name) {
    var all = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
    var v = all.filter(function (x) { return x.name === name; })[0];
    if (v) { chosen = v; try { localStorage.setItem('imath_voice', name); } catch (e) {} }
    return !!v;
  }

  function voices() {
    var all = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
    return all.filter(function (v) { return /en/i.test(v.lang); });
  }

  function current() {
    try {
      var saved = localStorage.getItem('imath_voice');
      if (saved && (!chosen || chosen.name !== saved)) setVoiceByName(saved);
    } catch (e) {}
    if (!chosen) choose();
    return chosen;
  }

  function dress(u, opts) {
    var v = current();
    if (v) u.voice = v;
    u.lang  = (v && v.lang) || 'en-IN';
    u.rate  = (opts && opts.rate)  != null ? opts.rate  : 0.75;
    u.pitch = (opts && opts.pitch) != null ? opts.pitch : 1.1;
    u.volume = 1;
    return u;
  }

  /** Say one thing once. */
  function say(text, opts) {
    if (!window.speechSynthesis) return;
    var u = dress(new SpeechSynthesisUtterance(String(text)), opts);
    window.speechSynthesis.speak(u);
  }

  /**
   * Say it, then say it again, with a gap between.
   *
   * A child holding a number in their head needs to hear it more
   * than once — Megha says two or three times even at a slow rate.
   * The repeat is quieter and a shade slower, the way a teacher
   * naturally says something a second time.
   */
  function sayTwice(text, opts) {
    if (!window.speechSynthesis) return;
    var o = opts || {};
    var times = o.times || 2;
    var gap   = o.gap != null ? o.gap : 900;
    var token = o.token;
    var i = 0;

    function next() {
      if (token !== undefined && o.stillWanted && !o.stillWanted(token)) return;
      if (i >= times) { if (o.onDone) o.onDone(); return; }
      var u = dress(new SpeechSynthesisUtterance(String(text)), {
        rate:  (o.rate || 0.75) - (i * 0.05),   // a touch slower each time
        pitch: o.pitch
      });
      i++;
      u.onend   = function () { setTimeout(next, gap); };
      u.onerror = function () { setTimeout(next, gap); };
      window.speechSynthesis.speak(u);
    }
    next();
  }

  function stop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  /* iOS will not speak until the page has had a real touch. */
  function unlock() {
    if (!window.speechSynthesis) return;
    try {
      var u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
    choose();
  }

  return {
    say: say, sayTwice: sayTwice, stop: stop, unlock: unlock,
    voices: voices, current: current, setVoiceByName: setVoiceByName,
    dress: dress
  };
})();

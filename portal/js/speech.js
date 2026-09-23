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

  /* Guessing from the language tag was wrong. Preferring en-IN put
     Rishi first on every iPhone — he is the iOS Indian English voice
     and he is male. Gender is not in the API, and most Android voice
     names carry no clue either, so the only reliable approach is to
     name the voices we know.

     Known female voices first, known male voices refused outright,
     and only then a cautious fallback. */

  var FEMALE = [
    // Indian English, female — the best case
    /\bVeena\b/i, /\bHeera\b/i, /\bKalpana\b/i, /\bRaveena\b/i, /\bAditi\b/i,
    /\bLekha\b/i, /\bNeerja\b/i, /\bSwara\b/i,
    /Microsoft.*(Heera|Kalpana|Neerja|Swara)/i,
    // Google's explicitly female English voices
    /Google UK English Female/i,
    /Google US English/i,                 // Google's US voice is female
    // Apple, female
    /\bSamantha\b/i, /\bKaren\b/i, /\bMoira\b/i, /\bTessa\b/i, /\bFiona\b/i,
    /\bVictoria\b/i, /\bAllison\b/i, /\bAva\b/i, /\bSusan\b/i, /\bZoe\b/i,
    // Microsoft, female
    /\bZira\b/i, /\bAria\b/i, /\bJenny\b/i, /\bMichelle\b/i,
    // anything that says so
    /\bfemale\b/i, /\bwoman\b/i
  ];

  var MALE = [
    /\bRishi\b/i,                          // iOS Indian English — male
    /\bDaniel\b/i, /\bAlex\b/i, /\bFred\b/i, /\bOliver\b/i, /\bThomas\b/i,
    /\bAaron\b/i, /\bArthur\b/i, /\bGordon\b/i, /\bNathan\b/i, /\bRalph\b/i,
    /\bDavid\b/i, /\bMark\b/i, /\bGuy\b/i, /\bRavi\b/i, /\bPrabhat\b/i,
    /Google UK English Male/i,
    /\bmale\b/i                            // careful: tested after FEMALE
  ];

  function isFemale(v) {
    var t = (v.name || '') + ' ' + (v.voiceURI || '');
    return FEMALE.some(function (re) { return re.test(t); });
  }

  function isMale(v) {
    var t = (v.name || '') + ' ' + (v.voiceURI || '');
    if (isFemale(v)) return false;          // "female" contains "male"
    return MALE.some(function (re) { return re.test(t); });
  }

  function score(v) {
    var s = 0;
    var indian = /en[-_]IN/i.test(v.lang || '');

    if (isFemale(v)) s += 100;              // known female outranks everything
    else if (isMale(v)) s -= 100;           // never, if there is any choice

    if (indian) s += 30;                    // Indian accent, once gender is settled
    if (/en/i.test(v.lang || '')) s += 10;
    if (/^en[-_]GB/i.test(v.lang || '')) s += 3;   // closer to Indian English than US
    if (v.localService) s += 2;             // offline voices are more reliable
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
    // Printed so a wrong choice can be reported rather than guessed at
    try {
      console.log('[speech] using "' + best.name + '" (' + best.lang + ')' +
                  (isFemale(best) ? ' — known female' :
                   isMale(best) ? ' — MALE, no female voice on this device' : ' — gender unknown'));
    } catch (e) {}
    return best;
  }

  // Voices load asynchronously on most browsers
  if (window.speechSynthesis) {
    choose();
    // Android reports an empty list on first call and fills it moments
    // later. Without this the first question of a session is spoken by
    // whatever the device defaults to.
    window.speechSynthesis.onvoiceschanged = function () { choose(); };
    var tries = 0;
    var poll = setInterval(function () {
      tries++;
      var got = (window.speechSynthesis.getVoices() || []).length;
      if (got) { choose(); clearInterval(poll); }
      else if (tries > 20) clearInterval(poll);
    }, 250);
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
  /* ── Saying the maths out loud ──────────────────────────────
     A sum was handed over exactly as written — "33 − 43" — and what
     a device made of the minus sign was its own business. Megha's
     children heard the numbers with no "minus" at all, which for
     negative numbers at Level 8 changes the question entirely.

     Every sign is now said as a word, and each row is a short phrase
     so a child can keep up. A hyphen is only treated as minus next to
     a digit, so "3-digit" is still read as words. */
  function forMaths(text) {
    var t = String(text == null ? '' : text);

    t = t.replace(/\r/g, '');
    t = t.replace(/\n+/g, ' , ');                  // one row, then a breath

    t = t.replace(/[\u00d7]/g, ' times ');
    t = t.replace(/(\d)\s*[x*]\s*(\d)/gi, '$1 times $2');
    t = t.replace(/[\u00f7]/g, ' divided by ');
    t = t.replace(/(\d)\s*\/\s*(\d)/g, '$1 divided by $2');
    t = t.replace(/\+/g, ' plus ');
    t = t.replace(/=/g, ' equals ');
    t = t.replace(/\^2|\u00b2/g, ' squared ');
    t = t.replace(/\^3|\u00b3/g, ' cubed ');
    t = t.replace(/%/g, ' percent ');

    /* the minus, in both of its jobs */
    t = t.replace(/[\u2212\u2013\u2014]/g, '-');   // a real minus, en dash, em dash
    t = t.replace(/(^|[\s,(])-\s*(\d)/g, '$1 minus $2');   // a negative number
    t = t.replace(/(\d)\s*-\s*(\d)/g, '$1 minus $2');     // taking away

    t = t.replace(/(\d)\.(\d)/g, '$1 point $2');   // 4.6 -> four point six
    t = t.replace(/(\d)\s+r\s+(\d)/g, '$1 remainder $2');   // 14 r 2
    t = t.replace(/\?/g, '');
    t = t.replace(/\s{2,}/g, ' ').trim();
    /* "33 minus 43 equals" with nothing after it — the child supplies
       the answer, so the word is left hanging. Dropped. */
    t = t.replace(/\s*equals\s*$/i, '');
    return t;
  }

  function say(text, opts) {
    if (!window.speechSynthesis) return;
    var o = opts || {};
    var words = o.raw ? String(text) : forMaths(text);
    var u = dress(new SpeechSynthesisUtterance(words), o);
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
      var u = dress(new SpeechSynthesisUtterance(
        o.raw ? String(text) : forMaths(text)), {
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
    forMaths: forMaths,
    voices: voices, current: current, setVoiceByName: setVoiceByName,
    dress: dress
  };
})();

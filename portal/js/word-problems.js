/* ============================================================
   iMathAcademy — Word problems
   ------------------------------------------------------------
   THE RULE: the engine makes the sum, the words are only clothing.

   The AI used to invent both, and it does not know what a bead can
   do — which is how "9 + 2" reached a Level 1 child in a story
   about a superhero. Nine plus two is Big Friends.

   So a word problem starts life as a sum that has already passed
   the bead rules for that child's level and position. Only then
   does it get dressed. Two or three numbers, never five: a
   five-row column makes an unreadable story.

   Every sentence is one clause. A six-year-old is going to have
   this read aloud to them, and long sentences do not survive that.
   ============================================================ */

var WordProblems = (function () {
  'use strict';

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* Gender is carried so the second sentence can say "she" instead
     of repeating the name. Read aloud, "Meera had 1 pencil. Meera
     was given 10 pencils." is stilted; children hear the repetition. */
  var NAMES = [
    { n:'Aarav',   they:'he'  }, { n:'Riya',    they:'she' },
    { n:'Kabir',   they:'he'  }, { n:'Ananya',  they:'she' },
    { n:'Vihaan',  they:'he'  }, { n:'Meera',   they:'she' },
    { n:'Arjun',   they:'he'  }, { n:'Diya',    they:'she' },
    { n:'Ishaan',  they:'he'  }, { n:'Saanvi',  they:'she' },
    { n:'Reyansh', they:'he'  }, { n:'Aadhya',  they:'she' },
    { n:'Kiaan',   they:'he'  }, { n:'Myra',    they:'she' },
    { n:'Advik',   they:'he'  }, { n:'Anika',   they:'she' }
  ];

  /* Things a child has actually held. Each carries how it is
     gained and lost, so the sentence stays true to the object —
     you do not "eat" a marble or "spend" a mango. */
  var THINGS = [
    { one:'sticker',  many:'stickers',  emoji:'⭐',
      got:['was given','found','earned'],           lost:['gave away','used','lost'] },
    { one:'mango',    many:'mangoes',   emoji:'🥭',
      got:['picked','was given','bought'],          lost:['ate','gave away','shared'] },
    { one:'marble',   many:'marbles',   emoji:'🔵',
      got:['won','found','was given'],              lost:['lost','gave away','traded'] },
    { one:'pencil',   many:'pencils',   emoji:'✏️',
      got:['bought','was given'],                   lost:['gave away','lost'] },
    { one:'laddoo',   many:'laddoos',   emoji:'🍬',
      got:['made','was given'],                     lost:['ate','shared'] },
    { one:'flower',   many:'flowers',   emoji:'🌸',
      got:['picked','was given'],                   lost:['gave away'] },
    { one:'shell',    many:'shells',    emoji:'🐚',
      got:['found','collected'],                    lost:['gave away','lost'] },
    { one:'balloon',  many:'balloons',  emoji:'🎈',
      got:['was given','bought'],                   lost:['popped','gave away'] },
    { one:'rupee',    many:'rupees',    emoji:'💰',
      got:['saved','was given','earned'],           lost:['spent','gave away'] },
    { one:'book',     many:'books',     emoji:'📚',
      got:['borrowed','was given'],                 lost:['returned','lent'] }
  ];

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function count(n, t) { return n + ' ' + (n === 1 ? t.one : t.many); }

  /**
   * Dress a sum that has ALREADY been checked against the bead
   * rules. Nothing here changes a number.
   *
   * @param sum.rows   e.g. [12, 8, -5] — two or three entries
   * @param sum.answer the total
   */
  /* The theme picker fed only the AI prompt. When every activity moved
     to the engine nothing read it any more, so choosing a theme
     silently did nothing. These are the same objects grouped by
     setting, so a theme actually changes what a child reads. */
  var THEMED = {
    festival: ['laddoo','flower','balloon','rupee'],
    market:   ['mango','rupee','book','pencil'],
    school:   ['pencil','book','sticker','marble'],
    nature:   ['flower','shell','mango'],
    space:    ['marble','sticker','balloon'],
    animals:  ['flower','shell','mango'],
    sports:   ['marble','balloon','sticker','rupee'],
    food:     ['mango','laddoo','rupee']
  };

  function thingsFor(theme) {
    var keys = THEMED[String(theme || '').toLowerCase()];
    if (!keys) return THINGS;
    var picked = THINGS.filter(function (t) { return keys.indexOf(t.one) > -1; });
    return picked.length ? picked : THINGS;
  }

  function dress(sum, theme) {
    var rows = sum.rows || [];
    if (rows.length < 2 || rows.length > 3) return null;   // stories need short sums

    var who   = pick(NAMES);
    var name  = who.n;
    var they  = who.they;
    var thing = pick(thingsFor(theme));
    var start = rows[0];

    var lines = [name + ' had ' + count(start, thing) + '.'];

    // Do not use the same verb twice in one story — a child hears it
    var used = {};
    function verb(bank) {
      var free = bank.filter(function (v) { return !used[v]; });
      var v = pick(free.length ? free : bank);
      used[v] = true;
      return v;
    }

    for (var i = 1; i < rows.length; i++) {
      var n = rows[i];
      var lead = (i === 1 ? cap(they) : 'Then ' + they);   // "She ..." / "Then she ..."
      if (n > 0) lines.push(lead + ' ' + verb(thing.got)  + ' ' + count(n, thing) + '.');
      else       lines.push(lead + ' ' + verb(thing.lost) + ' ' + count(-n, thing) + '.');
    }

    // The question follows whatever happened last, so it reads naturally
    var last = rows[rows.length - 1];
    lines.push(last > 0
      ? 'How many ' + thing.many + ' does ' + name + ' have now?'
      : 'How many ' + thing.many + ' are left?');

    return {
      type:     'story',
      question: lines.join(' '),
      lines:    lines,          // kept separate so speech can pause between them
      answer:   sum.answer,
      emoji:    thing.emoji,
      rows:     rows,           // the abacus still works the same sum
      speak:    true            // read aloud: they cannot read it themselves
    };
  }

  /**
   * Turn a page of sums into word problems, keeping only the short
   * ones. Long columns stay as columns.
   */
  function fromSums(sums, howMany) {
    var out = [];
    for (var i = 0; i < sums.length && out.length < (howMany || 5); i++) {
      if (!sums[i] || !sums[i].rows) continue;
      if (sums[i].rows.length > 3) continue;
      var w = dress(sums[i]);
      if (w) out.push(w);
    }
    return out;
  }

  /* A multiplication story is a different shape from an addition one:
     equal groups rather than gaining and losing. Division is the same
     thing read backwards — sharing out. Without these, choosing
     Multiplication and Story problems together gave addition, because
     the only story shape that existed was a running total. */
  var GROUPS = [
    { one: 'box',    many: 'boxes',    holds: 'pencils',  emoji: '✏️' },
    { one: 'packet', many: 'packets',  holds: 'biscuits', emoji: '🍪' },
    { one: 'basket', many: 'baskets',  holds: 'mangoes',  emoji: '🥭' },
    { one: 'tray',   many: 'trays',    holds: 'laddoos',  emoji: '🍬' },
    { one: 'shelf',  many: 'shelves',  holds: 'books',    emoji: '📚' },
    { one: 'bag',    many: 'bags',     holds: 'marbles',  emoji: '🔵' },
    { one: 'row',    many: 'rows',     holds: 'plants',   emoji: '🌱' }
  ];

  /** a x b — equal groups. */
  function dressMultiply(a, b, theme) {
    var who = pick(NAMES), g = pick(GROUPS);
    var lines = [
      who.n + ' has ' + a + ' ' + (a === 1 ? g.one : g.many) + '.',
      'Each one holds ' + b + ' ' + g.holds + '.',
      'How many ' + g.holds + ' altogether?'
    ];
    return {
      type: 'story', question: lines.join(' '), lines: lines,
      answer: a * b, emoji: g.emoji, speak: true
    };
  }

  /** total ÷ parts — sharing out. */
  function dressDivide(total, parts, theme) {
    var who = pick(NAMES), g = pick(GROUPS);
    var lines = [
      who.n + ' has ' + total + ' ' + g.holds + '.',
      cap(who.they) + ' puts them into ' + parts + ' ' + (parts === 1 ? g.one : g.many) +
        ', the same number in each.',
      'How many ' + g.holds + ' in each ' + g.one + '?'
    ];
    return {
      type: 'story', question: lines.join(' '), lines: lines,
      answer: Math.round(total / parts), emoji: g.emoji, speak: true
    };
  }

  return { dress: dress, fromSums: fromSums, NAMES: NAMES, THINGS: THINGS,
           dressMultiply: dressMultiply, dressDivide: dressDivide };
})();

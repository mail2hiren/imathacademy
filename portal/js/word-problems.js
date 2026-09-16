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
    { one:'sticker',  many:'stickers',  emoji:'\u2B50', shop:'stationery shop',
      got:['was given','found','earned'],        lost:['gave away','used','lost'] },
    { one:'mango',    many:'mangoes',   emoji:'\uD83E\uDD6D', shop:'fruit stall',
      got:['picked','was given','bought'],       lost:['ate','gave away','shared'] },
    { one:'marble',   many:'marbles',   emoji:'\uD83D\uDD35', shop:'toy shop',
      got:['won','found','was given'],           lost:['lost','gave away','traded'] },
    { one:'pencil',   many:'pencils',   emoji:'\u270F\uFE0F', shop:'stationery shop',
      got:['bought','was given'],                lost:['gave away','lost'] },
    { one:'laddoo',   many:'laddoos',   emoji:'\uD83C\uDF6C', shop:'sweet shop',
      got:['made','was given'],                  lost:['ate','shared'] },
    { one:'flower',   many:'flowers',   emoji:'\uD83C\uDF38', shop:'flower stall',
      got:['picked','was given'],                lost:['gave away'] },
    { one:'shell',    many:'shells',    emoji:'\uD83D\uDC1A', shop:null,
      got:['found','collected'],                 lost:['gave away','lost'] },
    { one:'balloon',  many:'balloons',  emoji:'\uD83C\uDF88', shop:'toy shop',
      got:['was given','bought'],                lost:['popped','gave away'] },
    { one:'rupee',    many:'rupees',    emoji:'\uD83D\uDCB0', shop:null,
      got:['saved','was given','earned'],        lost:['spent','gave away'] },
    { one:'book',     many:'books',     emoji:'\uD83D\uDCDA', shop:'book shop',
      got:['borrowed','was given'],              lost:['returned','lent'] },

    /* Cricket and superheroes were offered in the dropdown with no
       objects behind them at all, so choosing either did nothing. */
    { one:'run',      many:'runs',      emoji:'\uD83C\uDFCF', shop:null,
      got:['scored','added'],                    lost:['lost'] },
    { one:'wicket',   many:'wickets',   emoji:'\uD83C\uDFAF', shop:null,
      got:['took'],                              lost:['gave away'] },
    { one:'cricket ball', many:'cricket balls', emoji:'\uD83C\uDFD0', shop:'sports shop',
      got:['bought','was given'],                lost:['lost','gave away'] },
    { one:'trophy',   many:'trophies',  emoji:'\uD83C\uDFC6', shop:null,
      got:['won','was given'],                   lost:['gave away'] },
    { one:'medal',    many:'medals',    emoji:'\uD83E\uDD47', shop:null,
      got:['won','earned'],                      lost:['gave away'] },
    { one:'hero card', many:'hero cards', emoji:'\uD83E\uDDB8', shop:'toy shop',
      got:['collected','traded for','was given'], lost:['traded away','gave away','lost'] },
    { one:'comic',    many:'comics',    emoji:'\uD83D\uDCD6', shop:'book shop',
      got:['bought','borrowed'],                 lost:['lent','returned'] },
    { one:'badge',    many:'badges',    emoji:'\uD83C\uDFC5', shop:null,
      got:['earned','was given'],                lost:['gave away','lost'] },

    { one:'banana',   many:'bananas',   emoji:'\uD83C\uDF4C', shop:'fruit stall',
      got:['bought','picked'],                   lost:['ate','shared'] },
    { one:'apple',    many:'apples',    emoji:'\uD83C\uDF4E', shop:'fruit stall',
      got:['bought','picked'],                   lost:['ate','shared'] },
    { one:'orange',   many:'oranges',   emoji:'\uD83C\uDF4A', shop:'fruit stall',
      got:['bought','picked'],                   lost:['ate','shared'] },
    { one:'samosa',   many:'samosas',   emoji:'\uD83E\uDD5F', shop:'snack stall',
      got:['bought','made'],                     lost:['ate','shared'] },

    { one:'diya',     many:'diyas',     emoji:'\uD83E\uDE94', shop:'festival stall',
      got:['bought','made'],                     lost:['gave away'] },
    { one:'rangoli colour', many:'rangoli colours', emoji:'\uD83C\uDFA8', shop:'festival stall',
      got:['bought'],                            lost:['used up'] },
    { one:'sparkler', many:'sparklers', emoji:'\u2728', shop:'festival stall',
      got:['bought','was given'],                lost:['used','gave away'] },

    { one:'star',     many:'stars',     emoji:'\u2B50', shop:null,
      got:['counted','spotted'],                 lost:['clouded over'] },
    { one:'rocket',   many:'rockets',   emoji:'\uD83D\uDE80', shop:'toy shop',
      got:['built','was given'],                 lost:['gave away'] },
    { one:'moon rock', many:'moon rocks', emoji:'\uD83C\uDF19', shop:null,
      got:['collected','found'],                 lost:['gave away'] },

    { one:'parrot',   many:'parrots',   emoji:'\uD83E\uDD9C', shop:null,
      got:['counted','spotted'],                 lost:['flew away'] },
    { one:'butterfly', many:'butterflies', emoji:'\uD83E\uDD8B', shop:null,
      got:['counted','spotted'],                 lost:['flew away'] },
    { one:'fish',     many:'fish',      emoji:'\uD83D\uDC1F', shop:null,
      got:['counted','caught'],                  lost:['let go'] },
    { one:'leaf',     many:'leaves',    emoji:'\uD83C\uDF43', shop:null,
      got:['collected','found'],                 lost:['blew away'] },
    { one:'seed',     many:'seeds',     emoji:'\uD83C\uDF31', shop:null,
      got:['planted','collected'],               lost:['gave away'] }
  ];

  /* The dropdown offers animals, fruits, space, cricket, festivals,
     superheroes, nature and none. This map used different words
     entirely — food, sports, festival, market — so four of the eight
     themes matched nothing and quietly fell back to everything.
     These keys are the dropdown's own values. */
  var THEMED = {
    animals:     ['parrot','butterfly','fish','shell','seed'],
    fruits:      ['mango','banana','apple','orange','samosa','laddoo'],
    space:       ['star','rocket','moon rock','marble','balloon'],
    cricket:     ['run','wicket','cricket ball','trophy','medal'],
    festivals:   ['laddoo','diya','rangoli colour','sparkler','flower'],
    superheroes: ['hero card','comic','badge','medal','sticker'],
    nature:      ['flower','leaf','seed','shell','butterfly'],
    none:        null,

    // the older names, kept so nothing that still sends them breaks
    festival:    ['laddoo','diya','sparkler','flower'],
    market:      ['mango','rupee','book','pencil'],
    school:      ['pencil','book','sticker','marble'],
    sports:      ['run','wicket','trophy','medal'],
    food:        ['mango','laddoo','samosa','banana']
  };

  /* Somewhere for a story to happen. Kept simple and Indian, since
     these are the places the children know. */
  var PLACES = {
    market:      [{n:'fruit stall'},{n:'sweet shop'},{n:'vegetable cart'}],
    fruits:      [{n:'fruit stall'},{n:'juice shop'}],
    school:      [{n:'classroom'},{n:'library'},{n:'school shop'}],
    festivals:   [{n:'sweet shop'},{n:'flower stall'},{n:'festival stall'}],
    cricket:     [{n:'sports shop'},{n:'club room'}],
    superheroes: [{n:'comic shop'},{n:'toy shop'}],
    nature:      [{n:'garden'},{n:'park'}],
    animals:     [{n:'garden'},{n:'pond'}],
    space:       [{n:'planetarium'},{n:'science room'}],
    default:     [{n:'shop'},{n:'stall'},{n:'market'}]
  };

  function placesFor(theme) {
    return PLACES[String(theme || '').toLowerCase()] || PLACES.default;
  }

  function thingsFor(theme) {
    var key = String(theme || '').toLowerCase();
    if (!key || key === 'none') return THINGS;
    var keys = THEMED[key];
    if (!keys) {
      /* Loud, because a theme that silently does nothing is exactly
         the fault this is fixing. */
      console.warn('No objects are set up for the theme "' + theme + '"');
      return THINGS;
    }
    var picked = THINGS.filter(function (t) { return keys.indexOf(t.one) > -1; });
    return picked.length ? picked : THINGS;
  }

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
  function dress(sum, theme) {
    var rows = sum.rows || [];
    if (rows.length < 2 || rows.length > 4) return null;

    var who   = pick(NAMES);
    var name  = who.n, they = who.they, them = who.them || (who.they === 'he' ? 'him' : 'her');
    var thing = pick(thingsFor(theme));
    var place = pick(placesFor(theme));

    /* One sentence shape produced every story in the app, so children
       memorised them. These are genuinely different situations, not
       reworded versions of the same one — and the shape is chosen by
       what the sum actually looks like, so it always reads truthfully. */
    var shapes = [];

    var allAdd = rows.slice(1).every(function (n) { return n > 0; });
    var allSub = rows.slice(1).every(function (n) { return n < 0; });
    var two    = rows.length === 2;

    // 1. The running story — what the app has always done
    shapes.push(function () {
      var used = {};
      function verb(bank) {
        var free = bank.filter(function (v) { return !used[v]; });
        var v = pick(free.length ? free : bank);
        used[v] = true;
        return v;
      }
      var lines = [name + ' had ' + count(rows[0], thing) + '.'];
      for (var i = 1; i < rows.length; i++) {
        var n = rows[i];
        var lead = (i === 1 ? cap(they) : 'Then ' + they);
        lines.push(lead + ' ' + (n > 0 ? verb(thing.got) : verb(thing.lost)) +
                   ' ' + count(Math.abs(n), thing) + '.');
      }
      lines.push(rows[rows.length - 1] > 0
        ? 'How many ' + thing.many + ' does ' + name + ' have now?'
        : 'How many ' + thing.many + ' are left?');
      return lines;
    });

    // 2. Two people, added together
    if (allAdd && two) {
      shapes.push(function () {
        var other = pick(NAMES.filter(function (x) { return x.n !== name; }));
        return [name + ' has ' + count(rows[0], thing) + ' and ' +
                other.n + ' has ' + count(rows[1], thing) + '.',
                'How many ' + thing.many + ' do they have altogether?'];
      });
    }

    // 3. A comparison — one has more than the other
    if (allAdd && two) {
      shapes.push(function () {
        var other = pick(NAMES.filter(function (x) { return x.n !== name; }));
        return [other.n + ' has ' + count(rows[0], thing) + '.',
                name + ' has ' + rows[1] + ' more ' + thing.many + ' than ' + other.n + '.',
                'How many ' + thing.many + ' does ' + name + ' have?'];
      });
    }

    /* 4. A shop or a stall — only when the object is something a shop
       would actually sell. "The sweet shop had 31 books" is the kind of
       thing a child spots at once, and it makes the whole page feel
       careless. */
    if (rows.length <= 3 && thing.shop) {
      shapes.push(function () {
        var lines = ['The ' + thing.shop + ' had ' + count(rows[0], thing) + ' in the morning.'];
        for (var i = 1; i < rows.length; i++) {
          var n = rows[i];
          lines.push(n > 0
            ? (i === 1 ? 'Another ' : 'Then another ') + count(n, thing) + ' arrived.'
            : (i === 1 ? '' : 'Then ') + count(-n, thing) + ' were sold.');
        }
        lines.push('How many ' + thing.many + ' are there now?');
        return lines.map(function (l) { return l.replace(/^\s+/, ''); });
      });
    }

    // 5. Counting what is left after taking some away
    if (allSub && two) {
      shapes.push(function () {
        return [name + ' had ' + count(rows[0], thing) + ' in ' +
                (they === 'he' ? 'his' : 'her') + ' bag.',
                cap(they) + ' ' + pick(thing.lost) + ' ' + count(-rows[1], thing) + '.',
                'How many are left in the bag?'];
      });
    }

    // 6. Over two days
    if (allAdd) {
      shapes.push(function () {
        var days = ['On Monday', 'On Tuesday', 'On Wednesday', 'On Thursday'];
        var lines = [];
        rows.forEach(function (n, i) {
          lines.push(days[i] + ' ' + name + ' ' +
                     (i === 0 ? 'had ' : pick(thing.got) + ' ') +
                     count(Math.abs(n), thing) + '.');
        });
        lines.push('How many ' + thing.many + ' does ' + name + ' have altogether?');
        return lines;
      });
    }

    // 7. Sharing between friends
    if (allSub && two && Math.abs(rows[1]) < rows[0]) {
      shapes.push(function () {
        var other = pick(NAMES.filter(function (x) { return x.n !== name; }));
        return [name + ' had ' + count(rows[0], thing) + '.',
                cap(they) + ' gave ' + Math.abs(rows[1]) + ' of them to ' + other.n + '.',
                'How many ' + thing.many + ' does ' + name + ' have left?'];
      });
    }

    /* 8. A collection growing. Not for money — nobody collects rupees,
       and "returned 9 books" is not collecting either, so the verbs
       stay on the gaining side. */
    if (thing.one !== 'rupee') shapes.push(function () {
      var lines = [name + ' is collecting ' + thing.many + '.',
                   cap(they) + ' already has ' + rows[0] + '.'];
      for (var i = 1; i < rows.length; i++) {
        var n = rows[i];
        lines.push(n > 0
          ? 'Then ' + they + ' ' + pick(thing.got) + ' ' + Math.abs(n) + ' more.'
          : 'Then ' + they + ' lost ' + Math.abs(n) + ' of them.');
      }
      lines.push('How many are in the collection now?');
      return lines;
    });

    var lines = pick(shapes)();

    return {
      type:     'story',
      question: lines.join(' '),
      lines:    lines,
      answer:   sum.answer,
      emoji:    thing.emoji,
      rows:     rows,
      speak:    true
    };
  }


  /* ── VEDIC STORIES ───────────────────────────────────────────
     Megha's point, and she is right: a child who only ever sees
     98 x 97 asks why they would need it. A story answers that, and
     the themed objects are what make it feel real.

     A Vedic story is shaped by the METHOD, not by a running total.
     Taking a number from a base is stock and sales; multiplying near
     a base is rows and boxes; division is sharing out. So each
     method gets its own situations.
     ─────────────────────────────────────────────────────────── */

  function dressVedic(q, theme) {
    if (!q || !q.method) return null;
    var who   = pick(NAMES);
    var name  = who.n, they = who.they;
    var thing = pick(thingsFor(theme));
    var a = q.a, b = q.b;

    var shapes = {

      /* Taking a number from 100, 1000 or a multiple */
      allFromNine: function () {
        var opts = [
          [ 'A ' + (thing.shop || 'shop') + ' had ' + a + ' ' + thing.many + ' in stock.',
            they === 'he' ? 'The owner sold ' + b + ' of them.' : 'The owner sold ' + b + ' of them.',
            'How many ' + thing.many + ' are left? = ?' ],
          [ name + ' needs ' + a + ' ' + thing.many + ' for a function.',
            cap(they) + ' already has ' + b + '.',
            'How many more are needed? = ?' ],
          [ 'A box holds ' + a + ' ' + thing.many + '.',
            b + ' have been taken out.',
            'How many are still in the box? = ?' ]
        ];
        return pick(opts);
      },

      complement: function () {
        return [ name + ' has ' + a + ' rupees and wants to save ' + b + '.',
                 'How much more does ' + they + ' need? = ?' ];
      },

      doubling: function () {
        return [ 'Last month the ' + (thing.shop || 'shop') + ' sold ' + a + ' ' + thing.many + '.',
                 'This month it sold twice as many.',
                 'How many did it sell this month? = ?' ];
      },

      halving: function () {
        return [ name + ' has ' + a + ' ' + thing.many + ' to share equally with a friend.',
                 'How many does each of them get? = ?' ];
      },

      byEleven: function () {
        return [ 'Each crate holds ' + a + ' ' + thing.many + '.',
                 'There are 11 crates.',
                 'How many ' + thing.many + ' altogether? = ?' ];
      },

      /* Equal groups — the shape that makes multiplication real */
      urdhva: function () { return groups(); },
      nikhilamMult: function () { return groups(); },
      workingBase: function () { return groups(); },
      antyayor: function () { return groups(); },
      ekadhikena: function () {
        return [ 'A square hall has ' + a + ' tiles along each side.',
                 'How many tiles are there in the whole hall? = ?' ];
      },
      duplex: function () {
        return [ name + ' is laying a square garden, ' + a + ' steps on every side.',
                 'How many square steps of ground is that? = ?' ];
      },
      yavadunam: function () {
        return [ 'A square plot measures ' + a + ' metres on each side.',
                 'What is its area in square metres? = ?' ];
      },
      cubing: function () {
        return [ 'A cube-shaped box is ' + a + ' cm along every edge.',
                 'How many cubic centimetres does it hold? = ?' ];
      },

      /* Sharing out */
      nikhilamDiv: function () { return sharing(); },
      paravartya:  function () { return sharing(); },
      dhwajanka:   function () { return sharing(); },

      squareRoot: function () {
        return [ 'A square hall has an area of ' + a + ' square tiles.',
                 'How many tiles are along one side? = ?' ];
      },
      cubeRoot: function () {
        return [ 'A cube-shaped tank holds ' + a + ' cubic cm.',
                 'How long is one edge? = ?' ];
      },

      digitSum: function () {
        return [ name + ' wants to check the total ' + a + ' quickly.',
                 'What is its digit sum? = ?' ];
      },

      stacking: function () {
        return [ name + ' had ' + a + ' ' + thing.many + ' and ' + pick(thing.got) +
                 ' ' + b + ' more.', 'How many now? = ?' ];
      },

      splitMerge: function () {
        return [ 'The ' + (thing.shop || 'shop') + ' had ' + a + ' ' + thing.many + '.',
                 b + ' more arrived.', 'How many are there now? = ?' ];
      }
    };

    function groups() {
      var opts = [
        [ 'A ' + (thing.shop || 'shop') + ' has ' + a + ' boxes.',
          'Each box holds ' + b + ' ' + thing.many + '.',
          'How many ' + thing.many + ' altogether? = ?' ],
        [ 'There are ' + a + ' rows of chairs in the hall.',
          'Each row has ' + b + ' chairs.',
          'How many chairs are there? = ?' ],
        [ 'Each ' + thing.one + ' costs ' + b + ' rupees.',
          name + ' buys ' + a + ' of them.',
          'How much does ' + they + ' pay? = ?' ]
      ];
      return pick(opts);
    }

    function sharing() {
      var opts = [
        [ name + ' has ' + a + ' ' + thing.many + ' to pack into boxes of ' + b + '.',
          'How many full boxes, and how many left over? = ?' ],
        [ a + ' ' + thing.many + ' are shared equally among ' + b + ' children.',
          'How many does each child get? = ?' ]
      ];
      return pick(opts);
    }

    var f = shapes[q.method];
    if (!f) return null;

    var lines;
    try { lines = f(); } catch (e) { return null; }
    if (!lines || !lines.length) return null;

    return {
      type:     'story',
      question: lines.join(' '),
      lines:    lines,
      answer:   q.answer,
      emoji:    thing.emoji,
      method:   q.label || '',
      speak:    true
    };
  }

  /**
   * Turn a page of sums into word problems, keeping only the short
   * ones. Long columns stay as columns.
   */
  function fromSums(sums, howMany, theme) {
    var out = [];
    for (var i = 0; i < sums.length && out.length < (howMany || 5); i++) {
      if (!sums[i] || !sums[i].rows) continue;
      if (sums[i].rows.length > 3) continue;
      /* The theme was never passed here, so every story used the
         default objects and Megha's theme choice did nothing at all.
         Another control that looked connected and was not. */
      var w = dress(sums[i], theme);
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

  return { dress: dress, dressVedic: dressVedic, fromSums: fromSums, NAMES: NAMES, THINGS: THINGS,
           placesFor: placesFor,
           dressMultiply: dressMultiply, dressDivide: dressDivide };
})();

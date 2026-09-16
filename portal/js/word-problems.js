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
  /* The first list here was written the way an adult writes lists —
     medals, badges, seeds, leaves. Nothing a child would lean towards.
     These are things Indian children actually talk about: golgappas,
     pichkaris, IPL sixes, robot sidekicks. The verbs matter as much
     as the nouns — you do not "obtain" a chocolate, you scoff it. */
  /* Some things you own and can carry: chocolates, kites, hero cards.
     Others you only count: monkeys, shooting stars, sixes. Mixing the
     two produced "she slipped away 9 tigers" and "34 tigers in her
     bag" — which a child would laugh at, rightly. Each thing says
     which it is, and the sentences respect it. */
  /* Hiren's vocabulary, with two kinds of word left out on purpose.

     The Marvel names — Iron Man, Thor, Spider-Man, Infinity Stones
     and the rest — are Disney trademarks, and worksheets sold to
     schools are commercial use. Generic heroes do the same job for a
     child without the risk.

     And words like Diwali, Celebration, Umpire or the Sun cannot be
     counted: there is one Sun, and "she had 34 Diwalis" is not a sum.
     Those appear as SETTINGS further down instead, which is where
     they actually belong.

     Each thing also says whether a child OWNS it or only COUNTS it.
     Mixing the two gave us "she slipped away 9 tigers". */
  var THINGS = [

    /* —— cricket —— */
    { kind:'seen', one:'six', many:'sixes', emoji:'\uD83C\uDFCF', shop:null,
      got:['hit','smashed'], lost:[] },
    { kind:'seen', one:'four', many:'fours', emoji:'\uD83C\uDFCF', shop:null,
      got:['hit','cracked'], lost:[] },
    { kind:'seen', one:'boundary', many:'boundaries', emoji:'\uD83C\uDFCF', shop:null,
      got:['hit','found'], lost:[] },
    { kind:'seen', one:'wicket', many:'wickets', emoji:'\uD83C\uDFAF', shop:null,
      got:['took','claimed'], lost:[] },
    { kind:'seen', one:'catch', many:'catches', emoji:'\uD83E\uDD1D', shop:null,
      got:['took','held'], lost:['dropped'] },
    { kind:'seen', one:'yorker', many:'yorkers', emoji:'\uD83C\uDFAF', shop:null,
      got:['bowled'], lost:[] },
    { kind:'seen', one:'bouncer', many:'bouncers', emoji:'\uD83C\uDFAF', shop:null,
      got:['bowled'], lost:[] },
    { kind:'seen', one:'run out', many:'run outs', emoji:'\uD83C\uDFC3', shop:null,
      got:['made'], lost:[] },
    { one:'bat', many:'bats', emoji:'\uD83C\uDFCF', shop:'sports shop',
      got:['bought','was given'], lost:['broke','lent'] },
    { one:'cricket ball', many:'cricket balls', emoji:'\uD83C\uDFD0', shop:'sports shop',
      got:['bought','was given'], lost:['lost','gave away'] },
    { one:'helmet', many:'helmets', emoji:'\u26D1\uFE0F', shop:'sports shop',
      got:['bought','was given'], lost:['lent','outgrew'] },
    { one:'jersey', many:'jerseys', emoji:'\uD83D\uDC55', shop:'sports shop',
      got:['bought','was given'], lost:['gave away','outgrew'] },
    { one:'stump', many:'stumps', emoji:'\uD83C\uDFCF', shop:'sports shop',
      got:['bought','set up'], lost:['lost','gave away'] },
    { one:'trophy', many:'trophies', emoji:'\uD83C\uDFC6', shop:null,
      got:['won','lifted'], lost:['gave away'] },
    { one:'autograph', many:'autographs', emoji:'\u270D\uFE0F', shop:null,
      got:['collected','got'], lost:['gave away'] },

    /* —— superheroes, without the trademarks —— */
    { one:'cape', many:'capes', emoji:'\uD83E\uDDB8', shop:'costume shop',
      got:['made','was given'], lost:['tore','gave away'] },
    { one:'mask', many:'masks', emoji:'\uD83C\uDFAD', shop:'costume shop',
      got:['made','bought'], lost:['lost','gave away'] },
    { one:'shield', many:'shields', emoji:'\uD83D\uDEE1\uFE0F', shop:'toy shop',
      got:['made','was given'], lost:['broke','lent'] },
    { one:'hammer', many:'hammers', emoji:'\uD83D\uDD28', shop:'toy shop',
      got:['was given','found'], lost:['lent','lost'] },
    { one:'gadget', many:'gadgets', emoji:'\uD83D\uDD27', shop:'toy shop',
      got:['built','invented'], lost:['broke','lent'] },
    { one:'power crystal', many:'power crystals', emoji:'\uD83D\uDC8E', shop:null,
      got:['found','collected'], lost:['used up','lost'] },
    { one:'robot sidekick', many:'robot sidekicks', emoji:'\uD83E\uDD16', shop:'toy shop',
      got:['built','switched on'], lost:['broke','lent'] },
    { one:'hero card', many:'hero cards', emoji:'\uD83C\uDCCF', shop:'toy shop',
      got:['collected','swapped for'], lost:['traded away','lost'] },
    { one:'comic', many:'comics', emoji:'\uD83D\uDCD6', shop:'comic shop',
      got:['bought','borrowed'], lost:['lent','finished'] },
    { kind:'seen', one:'superhero', many:'superheroes', emoji:'\uD83E\uDDB8', shop:null,
      got:['spotted','counted'], lost:['flew off'] },
    { kind:'seen', one:'villain', many:'villains', emoji:'\uD83D\uDE08', shop:null,
      got:['spotted','counted'], lost:['escaped'] },
    { kind:'seen', one:'portal', many:'portals', emoji:'\uD83C\uDF00', shop:null,
      got:['opened','spotted'], lost:['closed'] },

    /* —— festivals —— */
    { one:'diya', many:'diyas', emoji:'\uD83E\uDE94', shop:'festival stall',
      got:['lit','bought'], lost:['blew out','gave away'] },
    { one:'firecracker', many:'firecrackers', emoji:'\uD83E\uDDE8', shop:'firework stall',
      got:['bought','was given'], lost:['burst','gave away'] },
    { one:'sparkler', many:'sparklers', emoji:'\u2728', shop:'firework stall',
      got:['bought','was given'], lost:['burnt out','gave away'] },
    { one:'rocket', many:'rockets', emoji:'\uD83C\uDF86', shop:'firework stall',
      got:['bought','was given'], lost:['let off','gave away'] },
    { one:'kite', many:'kites', emoji:'\uD83E\uDE81', shop:'kite shop',
      got:['bought','made'], lost:['cut loose','gave away'] },
    { one:'pichkari', many:'pichkaris', emoji:'\uD83D\uDD2B', shop:'festival stall',
      got:['bought','was given'], lost:['broke','gave away'] },
    { one:'rakhi', many:'rakhis', emoji:'\uD83C\uDF80', shop:'festival stall',
      got:['bought','tied'], lost:['gave away'] },
    { one:'lantern', many:'lanterns', emoji:'\uD83C\uDFEE', shop:'festival stall',
      got:['hung up','bought'], lost:['took down','gave away'] },
    { one:'sweet', many:'sweets', emoji:'\uD83C\uDF6C', shop:'sweet shop',
      got:['was given','made'], lost:['ate','shared'] },
    { one:'gift', many:'gifts', emoji:'\uD83C\uDF81', shop:'gift shop',
      got:['was given','wrapped'], lost:['gave away'] },
    { one:'rangoli colour', many:'rangoli colours', emoji:'\uD83C\uDFA8', shop:'festival stall',
      got:['bought'], lost:['used up'] },

    /* —— food —— */
    { one:'chocolate', many:'chocolates', emoji:'\uD83C\uDF6B', shop:'sweet shop',
      got:['was given','bought','won'], lost:['ate','shared'] },
    { one:'ice cream', many:'ice creams', emoji:'\uD83C\uDF66', shop:'ice cream cart',
      got:['bought','was given'], lost:['finished','shared'] },
    { one:'pizza slice', many:'pizza slices', emoji:'\uD83C\uDF55', shop:'pizza shop',
      got:['ordered','was given'], lost:['ate','shared'] },
    { one:'burger', many:'burgers', emoji:'\uD83C\uDF54', shop:'burger shop',
      got:['ordered','bought'], lost:['ate','shared'] },
    { one:'fry', many:'fries', emoji:'\uD83C\uDF5F', shop:'burger shop',
      got:['ordered','bought'], lost:['ate','shared'] },
    { one:'noodle bowl', many:'noodle bowls', emoji:'\uD83C\uDF5C', shop:'noodle stall',
      got:['ordered','made'], lost:['ate','shared'] },
    { one:'popcorn packet', many:'popcorn packets', emoji:'\uD83C\uDF7F', shop:'cinema',
      got:['bought','was given'], lost:['finished','shared'] },
    { one:'golgappa', many:'golgappas', emoji:'\uD83E\uDD63', shop:'chaat stall',
      got:['ordered','was given'], lost:['gobbled up','shared'] },
    { one:'samosa', many:'samosas', emoji:'\uD83E\uDD5F', shop:'snack stall',
      got:['bought','made'], lost:['ate','shared'] },
    { one:'dosa', many:'dosas', emoji:'\uD83E\uDD5E', shop:'dosa stall',
      got:['ordered','made'], lost:['ate','shared'] },
    { one:'idli', many:'idlis', emoji:'\uD83C\uDF5A', shop:'tiffin shop',
      got:['ordered','made'], lost:['ate','shared'] },
    { one:'sandwich', many:'sandwiches', emoji:'\uD83E\uDD6A', shop:'snack stall',
      got:['made','bought'], lost:['ate','shared'] },
    { one:'donut', many:'donuts', emoji:'\uD83C\uDF69', shop:'bakery',
      got:['bought','was given'], lost:['ate','shared'] },
    { one:'cupcake', many:'cupcakes', emoji:'\uD83E\uDDC1', shop:'bakery',
      got:['baked','bought'], lost:['ate','shared'] },
    { one:'gulab jamun', many:'gulab jamuns', emoji:'\uD83C\uDF6E', shop:'sweet shop',
      got:['was given','made'], lost:['ate','shared'] },
    { one:'jalebi', many:'jalebis', emoji:'\uD83C\uDF6F', shop:'sweet shop',
      got:['bought','made'], lost:['ate','shared'] },
    { one:'mango', many:'mangoes', emoji:'\uD83E\uDD6D', shop:'fruit stall',
      got:['picked','bought'], lost:['ate','gave away'] },
    { one:'watermelon slice', many:'watermelon slices', emoji:'\uD83C\uDF49', shop:'fruit stall',
      got:['cut','bought'], lost:['ate','shared'] },
    { one:'milkshake', many:'milkshakes', emoji:'\uD83E\uDD5B', shop:'juice shop',
      got:['ordered','made'], lost:['finished','shared'] },

    /* —— animals —— */
    { kind:'seen', one:'puppy', many:'puppies', emoji:'\uD83D\uDC36', shop:null,
      got:['counted','spotted'], lost:['ran off'] },
    { kind:'seen', one:'kitten', many:'kittens', emoji:'\uD83D\uDC31', shop:null,
      got:['counted','spotted'], lost:['wandered off'] },
    { kind:'seen', one:'monkey', many:'monkeys', emoji:'\uD83D\uDC35', shop:null,
      got:['counted','spotted'], lost:['scampered off'] },
    { kind:'seen', one:'elephant', many:'elephants', emoji:'\uD83D\uDC18', shop:null,
      got:['counted','spotted'], lost:['wandered away'] },
    { kind:'seen', one:'tiger', many:'tigers', emoji:'\uD83D\uDC05', shop:null,
      got:['counted','spotted'], lost:['slipped away'] },
    { kind:'seen', one:'lion', many:'lions', emoji:'\uD83E\uDD81', shop:null,
      got:['counted','spotted'], lost:['moved off'] },
    { kind:'seen', one:'peacock', many:'peacocks', emoji:'\uD83E\uDD9A', shop:null,
      got:['counted','spotted'], lost:['flew off'] },
    { kind:'seen', one:'panda', many:'pandas', emoji:'\uD83D\uDC3C', shop:null,
      got:['counted','spotted'], lost:['wandered off'] },
    { kind:'seen', one:'penguin', many:'penguins', emoji:'\uD83D\uDC27', shop:null,
      got:['counted','spotted'], lost:['waddled off'] },
    { kind:'seen', one:'dolphin', many:'dolphins', emoji:'\uD83D\uDC2C', shop:null,
      got:['counted','spotted'], lost:['swam away'] },
    { kind:'seen', one:'giraffe', many:'giraffes', emoji:'\uD83E\uDD92', shop:null,
      got:['counted','spotted'], lost:['moved off'] },
    { kind:'seen', one:'zebra', many:'zebras', emoji:'\uD83E\uDD93', shop:null,
      got:['counted','spotted'], lost:['moved off'] },
    { kind:'seen', one:'rabbit', many:'rabbits', emoji:'\uD83D\uDC30', shop:null,
      got:['counted','spotted'], lost:['hopped away'] },
    { kind:'seen', one:'bear', many:'bears', emoji:'\uD83D\uDC3B', shop:null,
      got:['counted','spotted'], lost:['wandered off'] },
    { kind:'seen', one:'horse', many:'horses', emoji:'\uD83D\uDC0E', shop:null,
      got:['counted','spotted'], lost:['trotted away'] },
    { kind:'seen', one:'parrot', many:'parrots', emoji:'\uD83E\uDD9C', shop:null,
      got:['counted','spotted'], lost:['flew away'] },
    { kind:'seen', one:'butterfly', many:'butterflies', emoji:'\uD83E\uDD8B', shop:null,
      got:['counted','spotted'], lost:['flew away'] },
    { kind:'seen', one:'dinosaur', many:'dinosaurs', emoji:'\uD83E\uDD95', shop:null,
      got:['counted','spotted'], lost:['stomped off'] },

    /* —— space —— */
    { one:'toy rocket', many:'toy rockets', emoji:'\uD83D\uDE80', shop:'toy shop',
      got:['built','was given'], lost:['gave away','broke'] },
    { one:'telescope', many:'telescopes', emoji:'\uD83D\uDD2D', shop:'science shop',
      got:['bought','borrowed'], lost:['lent','returned'] },
    { one:'moon rock', many:'moon rocks', emoji:'\uD83C\uDF19', shop:null,
      got:['collected','found'], lost:['gave away'] },
    { kind:'seen', one:'planet', many:'planets', emoji:'\uD83E\uDE90', shop:null,
      got:['discovered','mapped'], lost:[] },
    { kind:'seen', one:'alien', many:'aliens', emoji:'\uD83D\uDC7D', shop:null,
      got:['spotted','counted'], lost:['beamed away'] },
    { kind:'seen', one:'star', many:'stars', emoji:'\u2B50', shop:null,
      got:['counted','spotted'], lost:['clouded over'] },
    { kind:'seen', one:'shooting star', many:'shooting stars', emoji:'\uD83C\uDF1F', shop:null,
      got:['spotted','counted'], lost:['faded'] },
    { kind:'seen', one:'astronaut', many:'astronauts', emoji:'\uD83D\uDC68\u200D\uD83D\uDE80', shop:null,
      got:['counted','spotted'], lost:['went inside'] },
    { kind:'seen', one:'spaceship', many:'spaceships', emoji:'\uD83D\uDEF8', shop:null,
      got:['spotted','tracked'], lost:['flew off'] },
    { kind:'seen', one:'satellite', many:'satellites', emoji:'\uD83D\uDCE1', shop:null,
      got:['launched','tracked'], lost:[] },
    { kind:'seen', one:'meteor', many:'meteors', emoji:'\u2604\uFE0F', shop:null,
      got:['spotted','tracked'], lost:['burnt up'] },
    { kind:'seen', one:'comet', many:'comets', emoji:'\u2604\uFE0F', shop:null,
      got:['spotted','tracked'], lost:['passed by'] },
    { kind:'seen', one:'UFO', many:'UFOs', emoji:'\uD83D\uDEF8', shop:null,
      got:['spotted','counted'], lost:['vanished'] },
    { kind:'seen', one:'space robot', many:'space robots', emoji:'\uD83E\uDD16', shop:null,
      got:['counted','switched on'], lost:['powered down'] },

    /* —— school and everyday —— */
    { one:'sticker', many:'stickers', emoji:'\u2B50', shop:'stationery shop',
      got:['earned','was given','won'], lost:['stuck down','gave away'] },
    { one:'pencil', many:'pencils', emoji:'\u270F\uFE0F', shop:'stationery shop',
      got:['bought','was given'], lost:['lost','lent'] },
    { one:'marble', many:'marbles', emoji:'\uD83D\uDD35', shop:'toy shop',
      got:['won','swapped for'], lost:['lost','traded away'] },
    { one:'balloon', many:'balloons', emoji:'\uD83C\uDF88', shop:'toy shop',
      got:['blew up','was given'], lost:['popped','let go'] },
    { one:'rupee', many:'rupees', emoji:'\uD83D\uDCB0', shop:null,
      got:['saved','earned','was given'], lost:['spent','gave away'] },
    { one:'seashell', many:'seashells', emoji:'\uD83D\uDC1A', shop:null,
      got:['found','collected'], lost:['gave away'] },
    { one:'flower', many:'flowers', emoji:'\uD83C\uDF38', shop:'flower stall',
      got:['picked','was given'], lost:['gave away'] },
    { one:'coconut', many:'coconuts', emoji:'\uD83E\uDD65', shop:'fruit stall',
      got:['picked','collected'], lost:['cracked open','gave away'] }
  ];

  /* The dropdown's own values, so a theme cannot silently miss. */
  var THEMED = {
    cricket: ['six','four','boundary','wicket','catch','yorker','bouncer','run out',
              'bat','cricket ball','helmet','jersey','stump','trophy','autograph'],

    superheroes: ['cape','mask','shield','hammer','gadget','power crystal',
                  'robot sidekick','hero card','comic','superhero','villain','portal'],

    festivals: ['diya','firecracker','sparkler','rocket','kite','pichkari','rakhi',
                'lantern','sweet','gift','rangoli colour'],

    fruits: ['chocolate','ice cream','pizza slice','burger','fry','noodle bowl',
             'popcorn packet','golgappa','samosa','dosa','idli','sandwich','donut',
             'cupcake','gulab jamun','jalebi','mango','watermelon slice','milkshake'],

    animals: ['puppy','kitten','monkey','elephant','tiger','lion','peacock','panda',
              'penguin','dolphin','giraffe','zebra','rabbit','bear','horse','parrot',
              'butterfly','dinosaur'],

    space: ['toy rocket','telescope','moon rock','planet','alien','star',
            'shooting star','astronaut','spaceship','satellite','meteor','comet',
            'UFO','space robot'],

    nature: ['seashell','flower','coconut','butterfly','parrot','peacock'],
    none: null,

    // older names, so nothing that still sends them breaks
    food:     ['chocolate','ice cream','golgappa','samosa','dosa','jalebi'],
    festival: ['diya','firecracker','sparkler','kite','gift'],
    market:   ['mango','rupee','chocolate','pencil'],
    school:   ['pencil','sticker','marble','comic'],
    sports:   ['six','four','wicket','trophy','jersey','bat']
  };

  function thingsFor(theme) {
    var key = String(theme || '').toLowerCase();
    if (!key || key === 'none') return THINGS;
    var keys = THEMED[key];
    if (!keys) {
      console.warn('No objects are set up for the theme "' + theme + '"');
      return THINGS;
    }
    var picked = THINGS.filter(function (t) { return keys.indexOf(t.one) > -1; });
    return picked.length ? picked : THINGS;
  }

  /* Somewhere for a story to happen. Kept simple and Indian, since
     these are the places the children know. */
  var PLACES = {
    cricket:     [{n:'sports shop'},{n:'stadium shop'},{n:'club room'}],
    superheroes: [{n:'comic shop'},{n:'toy shop'},{n:'costume shop'}],
    market:      [{n:'fruit stall'},{n:'sweet shop'},{n:'vegetable cart'}],
    fruits:      [{n:'sweet shop'},{n:'chaat stall'},{n:'bakery'},{n:'pizza shop'}],
    school:      [{n:'classroom'},{n:'library'},{n:'school shop'}],
    festivals:   [{n:'festival stall'},{n:'firework stall'},{n:'kite shop'},{n:'sweet shop'}],
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
    var owned  = thing.kind !== 'seen';

    /* A six cannot be un-hit and a wicket cannot wander off, so a
       thing with no losing verbs has no place in a story where the
       numbers come down. */
    var canFall = !!(thing.lost && thing.lost.length);

    /* And you can count monkeys, but you do not count run outs — a
       cricket statistic is scored by a team, not tallied by a child. */
    var isCricketStat = ['six','four','boundary','wicket','catch',
                         'yorker','bouncer','run out'].indexOf(thing.one) > -1;

    // 1. The running story — only for things a child can hold
    if (owned) shapes.push(function () {
      var used = {};
      function verb(bank) {
        // Some objects can only be gained — you do not "un-hit" a six.
        if (!bank || !bank.length) bank = ['gave away'];
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

    /* 1b. For things you only count. "9 monkeys scampered off" is
       true; "she scampered off 9 monkeys" is not. */
    if (!owned && (canFall || allAdd) && !isCricketStat) shapes.push(function () {
      /* "34 fours in the garden" and "34 satellites on the tree" — the
         setting has to belong to the thing, not come from one list. */
      /* Holi, Diwali, the Umpire, the Stadium — these cannot be counted
         ("she had 34 Diwalis" is not a sum), so they earn their place
         here as settings instead, which is what they really are. */
      var WHERE = {
        'puppy':['in the street','in the park'], 'kitten':['on the wall','in the garden'],
        'monkey':['on the temple wall','on the tree'], 'elephant':['at the sanctuary','by the river'],
        'tiger':['in the forest','at the sanctuary'], 'lion':['in the safari park','at the zoo'],
        'peacock':['in the field','in the garden'], 'panda':['at the zoo','in the bamboo'],
        'penguin':['at the zoo','on the ice'], 'dolphin':['in the sea','near the boat'],
        'giraffe':['at the zoo','on the savanna'], 'zebra':['at the zoo','on the savanna'],
        'rabbit':['in the field','in the garden'], 'bear':['in the forest','at the zoo'],
        'horse':['at the stable','in the field'], 'parrot':['on the tree','in the cage'],
        'butterfly':['in the garden','over the flowers'],
        'dinosaur':['in the museum','in the picture book'],

        'planet':['in the solar system','through the telescope'],
        'alien':['on the planet','in the spaceship'],
        'star':['in the night sky','above the terrace'],
        'shooting star':['in the night sky','above the terrace'],
        'astronaut':['at the space station','in the spaceship'],
        'spaceship':['in orbit','on the radar'],
        'satellite':['in orbit','on the tracking screen'],
        'meteor':['in the night sky','on the radar'],
        'comet':['in the night sky','through the telescope'],
        'UFO':['over the hills','on the radar'],
        'space robot':['at the space station','on Mars'],

        'six':['in the match','in the Super Over','at the stadium'],
        'four':['in the match','in the innings','at the stadium'],
        'boundary':['in the match','in the innings'],
        'wicket':['in the match','in the innings'],
        'catch':['in the match','at the stadium'],
        'yorker':['in the Super Over','in the innings'],
        'bouncer':['in the match','in the innings'],
        'run out':['in the match','in the Super Over'],

        'superhero':['in the city','at the portal'],
        'villain':['in the city','at the hideout'],
        'portal':['above the city','in the sky']
      };
      var where = pick(WHERE[thing.one] || ['nearby']);
      var cricket = ['six','four','wicket','catch'].indexOf(thing.one) > -1;
      var lines = cricket
        ? ['India scored ' + count(rows[0], thing) + ' ' + where + '.']
        : ['There were ' + count(rows[0], thing) + ' ' + where + '.'];
      for (var i = 1; i < rows.length; i++) {
        var n = rows[i];
        if (n > 0) {
          lines.push((i === 1 ? 'Then ' : 'After that ') + count(n, thing) +
                     ' more ' + (n === 1 ? 'arrived' : 'arrived') + '.');
        } else {
          if (cricket) {
            // You cannot un-score a six, so this becomes a comparison
            lines.push('The other team scored ' + count(-n, thing) + '.');
          } else {
            var away = (thing.lost && thing.lost.length) ? pick(thing.lost) : 'went away';
            lines.push((i === 1 ? 'Then ' : 'After that ') + count(-n, thing) +
                       ' ' + away + '.');
          }
        }
      }
      lines.push(cricket
        ? 'How many more did India score?'
        : 'How many ' + thing.many + ' are there now?');
      return lines;
    });

    if (!owned && !isCricketStat) shapes.push(function () {
      var other = pick(NAMES.filter(function (x) { return x.n !== name; }));
      return [name + ' counted ' + count(rows[0], thing) + '.',
              other.n + ' counted ' + count(Math.abs(rows[1]), thing) + '.',
              rows[1] > 0
                ? 'How many did they count between them?'
                : 'How many more did ' + name + ' count than ' + other.n + '?'];
    });

    if (isCricketStat && two) shapes.push(function () {
      var them = pick(['the other team','Australia','England','South Africa']);
      var where = pick((typeof WHERE !== 'undefined' && WHERE[thing.one]) || ['in the match']);
      return ['India scored ' + count(rows[0], thing) + ' ' + where + '.',
              cap(them) + ' scored ' + count(Math.abs(rows[1]), thing) + '.',
              rows[1] > 0
                ? 'How many ' + thing.many + ' were scored altogether?'
                : 'How many more did India score?'];
    });

    // 2. Two people, added together
    if (owned && allAdd && two) {
      shapes.push(function () {
        var other = pick(NAMES.filter(function (x) { return x.n !== name; }));
        return [name + ' has ' + count(rows[0], thing) + ' and ' +
                other.n + ' has ' + count(rows[1], thing) + '.',
                'How many ' + thing.many + ' do they have altogether?'];
      });
    }

    // 3. A comparison — one has more than the other
    if (owned && allAdd && two) {
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
    if (owned && rows.length <= 3 && thing.shop) {
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
    if (owned && allSub && two) {
      shapes.push(function () {
        return [name + ' had ' + count(rows[0], thing) + ' in ' +
                (they === 'he' ? 'his' : 'her') + ' bag.',
                cap(they) + ' ' + pick(thing.lost) + ' ' + count(-rows[1], thing) + '.',
                'How many are left in the bag?'];
      });
    }

    // 6. Over two days
    if (owned && allAdd) {
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
    if (owned && allSub && two && Math.abs(rows[1]) < rows[0]) {
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
    if (owned && thing.one !== 'rupee') shapes.push(function () {
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

    if (!shapes.length) shapes.push(function () {
      return ['There were ' + count(rows[0], thing) + '.',
              rows.slice(1).map(function (n) {
                return n > 0 ? count(n, thing) + ' more arrived.'
                             : count(-n, thing) + ' went away.';
              }).join(' '),
              'How many ' + thing.many + ' now?'];
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

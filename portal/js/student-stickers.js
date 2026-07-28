/* ============================================================
   iMathAcademy — Stickers
   ------------------------------------------------------------
   Stickers are not badges.

     badges     rare, one of each, "you achieved something"
     stickers   frequent, duplicates welcome, "look what I collected"

   A child aged five is motivated by a collection that visibly
   grows. Roughly one sticker per session is the target — often
   enough to feel generous, varied enough to stay interesting.

   Duplicates are deliberate. Children like having three cats.
   ============================================================ */

var STICKER_DEFS = [
  // Common — the everyday reward, drops most sessions
  { key: 'cat',       emoji: '🐱', name: 'Kitty',      tier: 'common' },
  { key: 'dog',       emoji: '🐶', name: 'Puppy',      tier: 'common' },
  { key: 'panda',     emoji: '🐼', name: 'Panda',      tier: 'common' },
  { key: 'frog',      emoji: '🐸', name: 'Froggy',     tier: 'common' },
  { key: 'bee',       emoji: '🐝', name: 'Buzzy',      tier: 'common' },
  { key: 'fish',      emoji: '🐠', name: 'Fishy',      tier: 'common' },
  { key: 'turtle',    emoji: '🐢', name: 'Shelly',     tier: 'common' },
  { key: 'butterfly', emoji: '🦋', name: 'Flutter',    tier: 'common' },
  { key: 'apple',     emoji: '🍎', name: 'Apple',      tier: 'common' },
  { key: 'balloon',   emoji: '🎈', name: 'Balloon',    tier: 'common' },
  { key: 'flower',    emoji: '🌸', name: 'Blossom',    tier: 'common' },
  { key: 'sun',       emoji: '☀️', name: 'Sunny',      tier: 'common' },

  // Rare — a perfect score, or finishing a tricky worksheet
  { key: 'lion',      emoji: '🦁', name: 'Brave Lion', tier: 'rare' },
  { key: 'elephant',  emoji: '🐘', name: 'Jumbo',      tier: 'rare' },
  { key: 'unicorn',   emoji: '🦄', name: 'Unicorn',    tier: 'rare' },
  { key: 'dragon',    emoji: '🐲', name: 'Dragon',     tier: 'rare' },
  { key: 'rocket',    emoji: '🚀', name: 'Rocket',     tier: 'rare' },
  { key: 'rainbow',   emoji: '🌈', name: 'Rainbow',    tier: 'rare' },
  { key: 'icecream',  emoji: '🍦', name: 'Ice Cream',  tier: 'rare' },

  // Shiny — level up, or a long streak. Should feel like an event.
  { key: 'trophy',    emoji: '🏆', name: 'Trophy',     tier: 'shiny' },
  { key: 'crown',     emoji: '👑', name: 'Crown',      tier: 'shiny' },
  { key: 'star',      emoji: '🌟', name: 'Gold Star',  tier: 'shiny' },
  { key: 'medal',     emoji: '🏅', name: 'Medal',      tier: 'shiny' },
  { key: 'diamond',   emoji: '💎', name: 'Diamond',    tier: 'shiny' }
];

// What each kind of achievement is worth.
//
// THE CAP: one sticker per worksheet, plus one per day for keeping
// the streak. Generous enough to feel rewarding every session,
// scarce enough that the collection still means something.
//
// Practice deliberately does not pay out on its own — it feeds the
// daily streak sticker instead. Otherwise a child could farm stickers
// by starting practice sessions over and over.
var STICKER_RULES = {
  worksheet:  'common',   // finished a worksheet — once per worksheet
  perfect:    'rare',     // full marks on a worksheet — replaces the common one
  streak:     'common',   // kept the streak — once per day
  quiz:       'rare',     // weekly challenge
  levelup:    'shiny',    // moved up a level
  bonus:      'rare'      // teacher awarded it by hand
};

function stickerByKey(key) {
  for (var i = 0; i < STICKER_DEFS.length; i++) {
    if (STICKER_DEFS[i].key === key) return STICKER_DEFS[i];
  }
  return null;
}

// Pick a random sticker from a tier. Falls back to common so a
// typo in a rule can never stop a child earning something.
function pickSticker(tier) {
  var pool = STICKER_DEFS.filter(function (s) { return s.tier === tier; });
  if (!pool.length) pool = STICKER_DEFS.filter(function (s) { return s.tier === 'common'; });
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Has this child already been paid out for this thing?
 * Worksheets are capped per worksheet, streaks per calendar day.
 */
async function canEarnSticker(studentId, reason, refId) {
  try {
    // One per worksheet, keyed on the worksheet id
    if (reason === 'worksheet' || reason === 'perfect') {
      if (!refId) return true;               // nothing to key on, allow it
      var ws = await sb.from('student_stickers')
        .select('id').eq('student_id', studentId).eq('ref_id', refId).limit(1);
      return !(ws.data && ws.data.length);
    }

    // One per calendar day for the streak
    if (reason === 'streak') {
      var midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      var st = await sb.from('student_stickers')
        .select('id')
        .eq('student_id', studentId)
        .eq('source', 'streak')
        .gte('earned_at', midnight.toISOString())
        .limit(1);
      return !(st.data && st.data.length);
    }
  } catch (e) {
    console.warn('Sticker cap check failed, allowing:', e.message);
  }
  // quiz, levelup and teacher bonuses are rare events — not capped here
  return true;
}

/**
 * Award a sticker and save it.
 *
 * @param {string} studentId
 * @param {string} reason  worksheet | perfect | streak | quiz | levelup | bonus
 * @param {string} [refId] the worksheet id, so the same sheet cannot pay twice
 * @returns {Promise<object|null>} the sticker awarded, or null if capped or failed
 */
async function awardSticker(studentId, reason, refId) {
  if (!(await canEarnSticker(studentId, reason, refId))) return null;

  var tier    = STICKER_RULES[reason] || 'common';
  var sticker = pickSticker(tier);

  // The row records how it was earned, not which tier it was
  var source = reason === 'perfect' ? 'worksheet'
             : (['worksheet', 'streak', 'quiz', 'levelup', 'bonus'].indexOf(reason) > -1 ? reason : 'bonus');

  try {
    var res = await sb.from('student_stickers').insert({
      student_id:  studentId,
      sticker_key: sticker.key,
      source:      source,
      ref_id:      refId || null
    });
    // A unique-index violation means two requests raced. The cap held,
    // which is the correct outcome — just do not award twice.
    if (res.error) {
      if (String(res.error.code) === '23505') return null;
      throw res.error;
    }
    return sticker;
  } catch (e) {
    console.warn('Could not save sticker:', e.message);
    return null;   // never block a child's session over a sticker
  }
}

/** Load a child's whole collection. */
async function loadStickers(studentId) {
  try {
    var res = await sb.from('student_stickers')
      .select('sticker_key, source, earned_at')
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  } catch (e) {
    console.warn('Could not load stickers:', e.message);
    return [];
  }
}

/** Group a flat list into { key: count } */
function groupStickers(rows) {
  var counts = {};
  (rows || []).forEach(function (r) {
    counts[r.sticker_key] = (counts[r.sticker_key] || 0) + 1;
  });
  return counts;
}

/**
 * The sticker book.
 *
 * Earned stickers show in colour, with a small count if the child
 * has more than one. A handful of uncollected ones follow as faint
 * outlines so there is always something visible still to find.
 *
 * All twenty-four slots are deliberately NOT shown. A child with no
 * stickers yet would see a wall of grey, which reads as "you have
 * nothing" rather than "look what you could collect".
 */
function renderStickerBook(rows) {
  var counts = groupStickers(rows);
  var total  = (rows || []).length;

  var earned   = STICKER_DEFS.filter(function (s) { return counts[s.key]; });
  var toFind   = STICKER_DEFS.filter(function (s) { return !counts[s.key]; }).slice(0, 6);

  var tiles = earned.map(function (s) {
    var n = counts[s.key];
    return '<div class="sb-item sb-got" title="' + s.name + '">' +
             '<span class="sb-emoji">' + s.emoji + '</span>' +
             (n > 1 ? '<span class="sb-dupe">' + n + '</span>' : '') +
           '</div>';
  }).concat(toFind.map(function (s) {
    return '<div class="sb-item" title="Not collected yet">' +
             '<span class="sb-emoji">' + s.emoji + '</span>' +
           '</div>';
  })).join('');

  var caption = total === 0
    ? 'Finish a worksheet to earn your first sticker!'
    : (toFind.length
        ? 'Keep going — there are more stickers to find!'
        : 'You have collected every kind of sticker! 🎉');

  return '' +
    '<div class="sb-book">' +
      '<div class="sb-head">' +
        '<span class="sb-title">🎁 My sticker book</span>' +
        '<span class="sb-count">' + total + (total === 1 ? ' sticker' : ' stickers') + '</span>' +
      '</div>' +
      '<div class="sb-grid">' + tiles + '</div>' +
      '<div class="sb-caption">' + caption + '</div>' +
    '</div>';
}

/** Full-screen moment when a new sticker is earned. */
function showStickerReward(sticker, onClose) {
  if (!sticker) return;
  if (!document.getElementById('stickerRewardStyle')) {
    var st = document.createElement('style');
    st.id = 'stickerRewardStyle';
    st.textContent =
      '@keyframes stickerPop{0%{transform:scale(.2) rotate(-25deg);opacity:0}' +
      '60%{transform:scale(1.15) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}' +
      '@keyframes stickerGlow{0%,100%{filter:drop-shadow(0 0 8px rgba(255,213,79,.7))}' +
      '50%{filter:drop-shadow(0 0 22px rgba(255,213,79,1))}}';
    document.head.appendChild(st);
  }

  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9998;' +
    'display:flex;align-items:center;justify-content:center;';
  wrap.innerHTML =
    '<div style="background:#fff;border-radius:26px;padding:30px 26px;text-align:center;max-width:280px;width:88%;">' +
      '<div style="font-size:.72rem;font-weight:900;letter-spacing:.6px;text-transform:uppercase;color:#F57F17;margin-bottom:10px;">New sticker!</div>' +
      '<div style="font-size:5rem;line-height:1;animation:stickerPop .5s cubic-bezier(.34,1.56,.64,1),stickerGlow 1.6s ease-in-out infinite .5s;">' + sticker.emoji + '</div>' +
      '<div style="font-size:1.3rem;font-weight:900;color:#1A1A2E;margin:12px 0 4px;">' + sticker.name + '</div>' +
      '<div style="font-size:.8rem;color:#777;margin-bottom:18px;">Added to your sticker book</div>' +
      '<button style="width:100%;padding:13px;border:none;border-radius:14px;background:linear-gradient(135deg,#1565C0,#6A1B9A);color:#fff;font-family:inherit;font-size:1rem;font-weight:900;cursor:pointer;">Yay! 🎉</button>' +
    '</div>';

  wrap.querySelector('button').addEventListener('click', function () {
    wrap.remove();
    if (typeof onClose === 'function') onClose();
  });
  document.body.appendChild(wrap);
}

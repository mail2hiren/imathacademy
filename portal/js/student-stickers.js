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

// What each kind of achievement is worth
var STICKER_RULES = {
  worksheet:  'common',   // finished a worksheet
  practice:   'common',   // five correct in a row
  streak:     'common',   // another day in the streak
  perfect:    'rare',     // full marks
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
 * Award a sticker and save it.
 * @param {string} studentId
 * @param {string} reason  key of STICKER_RULES: worksheet, practice, streak, perfect, quiz, levelup, bonus
 * @returns {Promise<object|null>} the sticker awarded, or null if saving failed
 */
async function awardSticker(studentId, reason) {
  var tier    = STICKER_RULES[reason] || 'common';
  var sticker = pickSticker(tier);

  // The DB only records how it was earned, not the tier
  var source = ['worksheet', 'practice', 'streak', 'quiz', 'bonus'].indexOf(reason) > -1
    ? reason
    : (reason === 'perfect' ? 'worksheet' : 'bonus');

  try {
    var res = await sb.from('student_stickers').insert({
      student_id:  studentId,
      sticker_key: sticker.key,
      source:      source
    });
    if (res.error) throw res.error;
    return sticker;
  } catch (e) {
    console.warn('Could not save sticker:', e.message);
    return null;   // never block the child's session over a sticker
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
 * The sticker book. Earned stickers show in colour with a count;
 * ones not yet collected show as faint outlines, so the child can
 * see what is still out there to find.
 */
function renderStickerBook(rows) {
  var counts = groupStickers(rows);
  var total  = (rows || []).length;
  var unique = Object.keys(counts).length;

  var cells = STICKER_DEFS.map(function (s) {
    var n   = counts[s.key] || 0;
    var got = n > 0;
    return '' +
      '<div class="sticker' + (got ? ' got' : '') + '" title="' + s.name + '">' +
        '<span class="sticker-emoji">' + s.emoji + '</span>' +
        (n > 1 ? '<span class="sticker-count">' + n + '</span>' : '') +
      '</div>';
  }).join('');

  return '' +
    '<div class="sticker-book">' +
      '<div class="sticker-book-head">' +
        '<span class="sticker-book-title">My sticker book</span>' +
        '<span class="sticker-book-count">' + total + ' collected · ' +
          unique + ' of ' + STICKER_DEFS.length + ' kinds</span>' +
      '</div>' +
      '<div class="sticker-grid">' + cells + '</div>' +
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

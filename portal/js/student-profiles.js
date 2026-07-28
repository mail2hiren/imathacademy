/* ============================================================
   iMathAcademy — Age profiles
   ------------------------------------------------------------
   The single source of truth for what each age group gets.

   The dashboard used to carry three independent template
   branches, so every feature had to be written three times and
   the branches drifted apart. Now there is one template that
   reads this file, and a feature is enabled by flipping a flag.

   Adding a rule is one line here. Content cannot leak between
   age groups, because nothing renders unless its flag is on.
   ============================================================ */

var AGE_PROFILES = {

  // ── 5 to 7 — Levels L0 to L1 ────────────────────────────────
  // Play, not school. Nothing timed, nothing competitive.
  tiny: {
    key:    'tiny',
    label:  'Tiny Champs',
    ages:   '5–7',
    levels: 'L0–L1',

    mascot:  { emoji: '🐘', name: 'Jumbo' },
    voice:   true,          // read the screen aloud
    timer:   'none',
    input:   'choice',      // tap an answer, never type
    sessionMinutes: 5,
    tone:    'playful',

    show: {
      streak:          true,
      xpBar:           true,
      worksheetCard:   true,
      stickers:        true,
      badges:          false,   // stickers instead — badges come later
      levelProgress:   false,   // an abstract bar means nothing at this age
      quickActions:    false,   // one action at a time, no menu
      weeklyChallenge: false,
      leaderboard:     false,   // never rank a six-year-old
      titles:          false
    }
  },

  // ── 8 to 10 — Levels L2 to L4 ───────────────────────────────
  // Progress becomes motivating. Competition still does not.
  rising: {
    key:    'rising',
    label:  'Rising Stars',
    ages:   '8–10',
    levels: 'L2–L4',

    mascot:  { emoji: '🦁', name: 'Leo' },
    voice:   false,
    timer:   'optional',
    input:   'type',
    sessionMinutes: 15,
    tone:    'encouraging',

    show: {
      streak:          true,
      xpBar:           true,
      worksheetCard:   true,
      stickers:        true,
      badges:          true,
      levelProgress:   true,
      quickActions:    true,
      weeklyChallenge: true,
      leaderboard:     false,
      titles:          false
    }
  },

  // ── 11 to 14 — Levels L5 to L8 ──────────────────────────────
  // Speed and ranking. A mascot reads as babyish here.
  champions: {
    key:    'champions',
    label:  'Champions',
    ages:   '11–14',
    levels: 'L5–L8',

    mascot:  null,          // deliberately none
    voice:   false,
    timer:   'always',
    input:   'type',
    sessionMinutes: 20,
    tone:    'direct',

    show: {
      streak:          true,
      xpBar:           true,
      worksheetCard:   true,
      stickers:        false,
      badges:          true,
      levelProgress:   true,
      quickActions:    true,
      weeklyChallenge: true,
      leaderboard:     true,   // the only group that is ranked
      titles:          true
    }
  }
};

// Always returns a usable profile. Rising is the safe middle
// ground if a group is ever missing or misspelled.
function profileFor(group) {
  return AGE_PROFILES[group] || AGE_PROFILES.rising;
}

// Does this age group get this feature?
function ageShows(group, feature) {
  var p = profileFor(group);
  return !!(p.show && p.show[feature]);
}

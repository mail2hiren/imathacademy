/* ============================================================
   iMathAcademy — Student dashboard
   ------------------------------------------------------------
   One template, assembled from blocks. What renders is decided
   by portal/js/student-profiles.js, not by branching here.

   This replaced three independently-maintained template
   branches. Those branches drifted, which is how content
   intended for older students reached younger ones. A block
   now renders only when its flag is on, and there is exactly
   one place that flag can be set.

   Adding a feature: write a block, add a flag. Not three edits.
   ============================================================ */

function buildDashboard(profile, stats, group, session_user_id) {
  var P = profileFor(group);

  var ctx = {
    P:       P,
    group:   group,
    uid:     session_user_id,
    stats:   stats || {},
    name:    profile.full_name || 'Student',
    first:   (profile.full_name || 'Student').split(' ')[0],
    age:     getAgeFromDOB(profile.date_of_birth),
    level:   profile.current_level ?? 0,
    xp:      profile.xp_points  || 0,
    streak:  profile.streak_days || 0
  };
  ctx.xpNext = (Math.floor(ctx.xp / 500) + 1) * 500;
  ctx.xpPct  = Math.min(100, Math.round((ctx.xp % 500) / 500 * 100));

  paintChrome(ctx);

  var blocks = [
    heroBlock(ctx),
    '<div id="todaysQuestCard"></div>',
    '<div id="vcDashCard" style="display:none;margin-bottom:14px;"></div>'
  ];

  if (P.show.quickActions)  blocks.push(actionsBlock(ctx));
  else                      blocks.push(simpleActionsBlock(ctx));

  if (P.show.stickers)      blocks.push(stickerBlock(ctx));
  if (P.show.badges)        blocks.push(badgeBlock(ctx));
  if (P.show.levelProgress) blocks.push(levelBlock(ctx));
  if (P.show.leaderboard)   blocks.push(leaderboardBlock(ctx));
  if (P.mascot)             blocks.push(mascotBlock(ctx));

  document.getElementById('mainContent').innerHTML = blocks.join('\n');
}

/* ── Topbar and sidebar ──────────────────────────────────── */
function paintChrome(ctx) {
  var g = document.getElementById('topbarGreeting');
  if (g) g.textContent = greet() + ', ' + ctx.first + '! 🙏';

  if (window.innerWidth <= 768) {
    var ml = document.getElementById('mobileLogout');
    if (ml) ml.style.display = 'flex';
  }

  var av = document.getElementById('desktopAv');
  var nm = document.getElementById('desktopName');
  var gp = document.getElementById('desktopGroup');
  if (av) av.textContent = initials(ctx.name);
  if (nm) nm.textContent = ctx.name;
  if (gp) gp.textContent = ctx.P.label + ' · ' + ctx.P.ages;

  if (ctx.stats.homeworkPending > 0) {
    var hb = document.getElementById('hwBadge');
    if (hb) hb.style.display = 'flex';
  }
}

/* ── Hero ─────────────────────────────────────────────────────
   Three tones, because a five-year-old and a fourteen-year-old
   genuinely need different framing. The tone comes from the
   profile, so it cannot be set anywhere else.
   ─────────────────────────────────────────────────────────── */
function heroBlock(ctx) {
  if (ctx.P.tone === 'playful')  return heroPlayful(ctx);
  if (ctx.P.tone === 'direct')   return heroDirect(ctx);
  return heroEncouraging(ctx);
}

function heroPlayful(ctx) {
  var m = ctx.P.mascot;
  var stars = '';
  for (var i = 0; i < 7; i++) {
    var on = i < ctx.streak;
    stars += '<span style="font-size:' + (on ? '1.6' : '1.2') + 'rem;opacity:' +
             (on ? 1 : .2) + ';transition:all .3s;">⭐</span>';
  }
  var streakLine = ctx.streak === 0
    ? 'Come and play today to start your stars!'
    : ctx.streak + ' day' + (ctx.streak !== 1 ? 's' : '') + ' in a row! ' +
      (ctx.streak < 7 ? (7 - ctx.streak) + ' more for a SUPER STAR badge!' : 'AMAZING streak! 🎉');

  return '' +
  '<div style="background:linear-gradient(135deg,#E91E8C,#9C27B0);border-radius:20px;padding:20px;margin-bottom:14px;color:#fff;text-align:center;position:relative;overflow:hidden;">' +
    '<div style="position:absolute;top:-10px;left:-10px;font-size:60px;opacity:.1;">' + m.emoji + '</div>' +
    '<div style="position:absolute;bottom:-10px;right:-10px;font-size:60px;opacity:.1;">⭐</div>' +
    '<div style="font-size:52px;margin-bottom:8px;">' + m.emoji + '</div>' +
    '<div class="tiny-name" style="font-size:1.1rem;font-weight:800;margin-bottom:4px;">Hello ' + ctx.first + '! 🙏</div>' +
    '<div style="font-size:.82rem;opacity:.85;margin-bottom:14px;">"Ready to do some maths magic today?"</div>' +
    '<div style="display:flex;justify-content:center;gap:5px;margin-bottom:8px;flex-wrap:wrap;">' + stars + '</div>' +
    '<div class="tiny-streak-num" style="display:none;">' + ctx.streak + '</div>' +
    '<div style="font-size:.72rem;opacity:.8;">' + streakLine + '</div>' +
  '</div>';
}

function heroEncouraging(ctx) {
  return '' +
  '<div class="hero">' +
    '<div class="hero-top">' +
      '<div>' +
        '<div class="hero-greeting">' + greet() + '!</div>' +
        '<div class="hero-name">' + ctx.name + ' 🌟</div>' +
        '<div class="hero-sub">Level ' + ctx.level + ' · ' + levelName(ctx.level) +
          (ctx.age ? ' · Age ' + ctx.age : '') + '</div>' +
      '</div>' +
      '<div class="streak-box">' +
        '<div class="streak-icon">🔥</div>' +
        '<div class="streak-num">' + ctx.streak + '</div>' +
        '<div class="streak-label">day streak</div>' +
      '</div>' +
    '</div>' +
    (ctx.P.show.xpBar ?
    '<div class="xp-wrap">' +
      '<div class="xp-labels"><span>⚡ ' + ctx.xp + ' XP</span><span>' + ctx.xpNext + ' XP → Level up!</span></div>' +
      '<div class="xp-bar"><div class="xp-fill" style="width:' + ctx.xpPct + '%"></div></div>' +
      '<div class="xp-hint">' + (100 - ctx.xpPct) + '% to go — keep going!</div>' +
    '</div>' : '') +
  '</div>';
}

function heroDirect(ctx) {
  var lb   = ctx.stats.leaderboard || [];
  var myIx = lb.findIndex(function (l) { return l.id === ctx.uid; });
  var rankLine = lb.length && myIx > -1
    ? 'Rank #' + (myIx + 1) + ' in batch this week'
    : 'Keep practising to enter the leaderboard';

  return '' +
  '<div style="background:linear-gradient(135deg,#0D47A1,#1A237E);border-radius:20px;padding:18px;margin-bottom:14px;color:#fff;position:relative;overflow:hidden;">' +
    '<div style="position:absolute;top:0;right:0;width:100px;height:100%;background:linear-gradient(135deg,transparent,rgba(255,255,255,.03));border-radius:20px;"></div>' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:10px;">' +
      '<div>' +
        '<div style="font-size:.72rem;opacity:.6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Level ' +
          ctx.level + ' · ' + levelName(ctx.level) + '</div>' +
        '<div style="font-size:1.15rem;font-weight:800;">' + ctx.name + ' 🚀</div>' +
        '<div style="font-size:.75rem;opacity:.7;margin-top:2px;">' + rankLine + '</div>' +
      '</div>' +
      '<div style="text-align:right;background:rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;flex-shrink:0;">' +
        '<div style="font-size:1.2rem;font-weight:800;color:#FFD600;">🔥 ' + ctx.streak + '</div>' +
        '<div style="font-size:.65rem;opacity:.7;">day streak</div>' +
      '</div>' +
    '</div>' +
    '<div style="font-size:.72rem;opacity:.7;margin-bottom:5px;display:flex;justify-content:space-between;">' +
      '<span>⚡ ' + ctx.xp + ' XP</span><span>' + Math.max(0, ctx.xpNext - ctx.xp) + ' XP to next level</span>' +
    '</div>' +
    '<div style="height:8px;background:rgba(255,255,255,.15);border-radius:20px;overflow:hidden;">' +
      '<div style="height:100%;width:' + ctx.xpPct + '%;background:linear-gradient(90deg,#FFD600,#FF6F00);border-radius:20px;"></div>' +
    '</div>' +
  '</div>';
}

/* ── Actions ─────────────────────────────────────────────── */
function actionTile(href, bg, emoji, name, sub, badge) {
  return '<a href="' + href + '" class="action-btn" style="background:' + bg + ';text-decoration:none;">' +
    '<span class="action-emoji">' + emoji + '</span>' +
    '<div class="action-name">' + name + '</div>' +
    '<div class="action-sub">' + sub + '</div>' +
    (badge ? '<span class="action-badge">' + badge + '</span>' : '') +
  '</a>';
}

function actionsBlock(ctx) {
  var pending = ctx.stats.homeworkPending || 0;
  var tiles = [
    actionTile('practice.html', 'linear-gradient(145deg,#1565C0,#1976D2)', '⚡',
               'Practice now', 'Flash cards · Level ' + ctx.level, '+10 XP'),
    actionTile('worksheets.html', 'linear-gradient(145deg,#E65100,#F57C00)', '📋',
               'Worksheets', pending > 0 ? pending + ' pending' : 'All done!', pending > 0 ? '!' : ''),
    actionTile('lessons.html', 'linear-gradient(145deg,#2E7D32,#388E3C)', '▶️',
               'Lessons', 'Watch and learn', '')
  ];
  if (ctx.P.show.weeklyChallenge) {
    tiles.push(actionTile('weekly-quiz.html', 'linear-gradient(145deg,#6A1B9A,#7B1FA2)', '🏅',
               'Weekly challenge', 'Puzzles and quizzes', ''));
  }
  return '<div class="section-title">Quick actions</div>' +
         '<div class="actions-grid" style="margin-bottom:14px;">' + tiles.join('') + '</div>';
}

// Younger children get fewer, larger choices — a menu of six is a
// menu of none at five years old.
function simpleActionsBlock(ctx) {
  var pending = ctx.stats.homeworkPending || 0;
  return '<div class="section-title">What do you want to do?</div>' +
    '<div class="actions-grid" style="margin-bottom:14px;">' +
      actionTile('practice.html', 'linear-gradient(145deg,#1976D2,#42A5F5)', '⚡',
                 'Play maths!', 'Flash cards', '+10 ⚡') +
      actionTile('worksheets.html', 'linear-gradient(145deg,#E65100,#FF8A50)', '📋',
                 'My worksheet', pending > 0 ? pending + ' waiting!' : 'All done! 🎉', pending > 0 ? '!' : '') +
      actionTile('lessons.html', 'linear-gradient(145deg,#2E7D32,#66BB6A)', '▶️',
                 'Watch videos', 'Learn new things', '') +
    '</div>';
}

/* ── Sticker book ─────────────────────────────────────────────
   Filled asynchronously by fillStickerBook() from the child's
   real collection. It used to be a fixed row of emoji that
   looked identical for every child.
   ─────────────────────────────────────────────────────────── */
function stickerBlock(ctx) {
  return '<div id="stickerBookSlot">' +
    '<div class="sticker-card"><div class="sticker-header">' +
    '<div class="sticker-title">🎁 My sticker book</div></div>' +
    '<div class="sticker-hint">Loading your stickers…</div></div>' +
  '</div>';
}

async function fillStickerBook(studentId) {
  var slot = document.getElementById('stickerBookSlot');
  if (!slot || typeof loadStickers !== 'function') return;
  try {
    var rows = await loadStickers(studentId);
    slot.innerHTML = renderStickerBook(rows);
  } catch (e) {
    slot.innerHTML = '';
  }
}

/* ── Badges ──────────────────────────────────────────────── */
function badgeBlock(ctx) {
  return '<div class="section-title">My badges</div>' +
         '<div class="badges-row">' + renderBadges(ctx.stats.badges) + '</div>' +
         getBadgeHint(ctx.stats.badges);
}

/* ── Level progress ───────────────────────────────────────────
   Shows what the curriculum actually says about this level.
   The previous version displayed invented percentages —
   "Small friends addition 82%" for every student regardless of
   what they had done.
   ─────────────────────────────────────────────────────────── */
function levelBlock(ctx) {
  var row   = (typeof LEVELS !== 'undefined') ? LEVELS['L' + ctx.level] : null;
  var focus = row && row.core_focus ? row.core_focus : '';

  var done  = ctx.stats.worksheetsCompleted || 0;
  var total = ctx.stats.worksheetsTotal || 0;
  var pct   = total > 0 ? Math.round(done / total * 100) : 0;

  return '<div class="section-title">Level ' + ctx.level + ' — ' + levelName(ctx.level) + '</div>' +
    '<div class="progress-card">' +
      (focus ? '<div style="font-size:.8rem;color:var(--text2);line-height:1.6;margin-bottom:10px;">' +
               focus + '</div>' : '') +
      (total > 0
        ? '<div class="progress-item">' +
            '<div class="progress-icon">📋</div>' +
            '<div class="progress-label">Worksheets completed</div>' +
            '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + pct +
              '%;background:var(--green)"></div></div>' +
            '<div class="progress-pct">' + done + '/' + total + '</div>' +
          '</div>'
        : '<div style="font-size:.8rem;color:var(--text3);">Your teacher has not set any worksheets yet.</div>') +
    '</div>';
}

/* ── Leaderboard — Champions only ─────────────────────────── */
function leaderboardBlock(ctx) {
  return '<div class="section-title">Batch leaderboard — this week</div>' +
         '<div class="lb-card">' + renderLeaderboard(ctx.stats.leaderboard, ctx.uid) + '</div>';
}

/* ── Mascot ──────────────────────────────────────────────── */
function mascotBlock(ctx) {
  var m = ctx.P.mascot;
  return '<div class="mascot-card">' +
    '<div class="mascot-em">' + m.emoji + '</div>' +
    '<div>' +
      '<div class="mascot-name">' + m.name + ' says…</div>' +
      '<div class="mascot-msg">"' +
        getMascotMessage(ctx.streak, ctx.xpPct, ctx.stats.streakInSession) + '"</div>' +
    '</div>' +
  '</div>';
}

/* ============================================================
   Shared helpers — unchanged
   ============================================================ */

const BADGE_DEFS = [
  { key: 'speed_star',    emoji: '⭐', name: 'Speed star'    },
  { key: 'perfect_score', emoji: '🎯', name: 'Perfect!'      },
  { key: 'streak_5',      emoji: '🔥', name: '5-day fire'    },
  { key: 'streak_7',      emoji: '🥇', name: '7-day legend'  },
  { key: 'streak_30',     emoji: '🌟', name: '30-day star'   },
  { key: 'puzzle_pro',    emoji: '🧩', name: 'Puzzle pro'    },
  { key: 'top_batch',     emoji: '🏆', name: 'Top of batch'  },
  { key: 'abacus_ninja',  emoji: '🥷', name: 'Abacus ninja'  },
  { key: 'first_login',   emoji: '🎉', name: 'First login!'  },
];

function renderBadges(earned) {
  const earnedKeys = new Set((earned||[]).map(b => b.badge_type || b.type || b.key));
  const earnedDefs = BADGE_DEFS.filter(b =>  earnedKeys.has(b.key));
  const lockedDefs = BADGE_DEFS.filter(b => !earnedKeys.has(b.key)).slice(0, 3);
  const all = [...earnedDefs, ...lockedDefs];

  if (!all.length) return '<div style="font-size:.82rem;color:var(--text3);padding:8px;">Complete activities to earn your first badge!</div>';

  return all.map(b => {
    const isEarned = earnedKeys.has(b.key);
    return `<div class="badge-item ${isEarned ? 'earned' : 'locked'}">
      <div class="badge-emoji">${b.emoji}</div>
      <div class="badge-name">${b.name}</div>
    </div>`;
  }).join('');
}

function getBadgeHint(earned) {
  const earnedKeys = new Set((earned||[]).map(b => b.badge_type || b.type || b.key));
  const next = BADGE_DEFS.find(b => !earnedKeys.has(b.key));
  if (!next) return '<div class="badge-hint">🏆 You have earned all badges! Incredible!</div>';
  const hints = {
    speed_star:    'Answer 10 questions in a row with speed to earn <strong>Speed star</strong>!',
    perfect_score: 'Get 100% on any worksheet to earn <strong>Perfect!</strong>',
    streak_5:      'Login 5 days in a row to earn <strong>5-day fire</strong>!',
    streak_7:      'Login 7 days in a row to earn <strong>7-day legend</strong>!',
    puzzle_pro:    'Solve 5 puzzles to earn <strong>Puzzle pro</strong>!',
    top_batch:     'Reach #1 on the batch leaderboard to earn <strong>Top of batch</strong>!',
    abacus_ninja:  'Complete Level 8 to become an <strong>Abacus ninja</strong>!',
    first_login:   'Just login to earn your first badge!',
  };
  return `<div class="badge-hint">👉 ${hints[next.key] || 'Keep practising to earn more badges!'}</div>`;
}

const RANK_ICONS = ['🥇','🥈','🥉','4','5'];
function renderLeaderboard(lb, myId) {
  if (!lb?.length) return '<div style="padding:12px;text-align:center;color:var(--text3);font-size:.82rem;">Complete activities this week to appear on the leaderboard!</div>';
  const myRank = lb.findIndex(l => l.id === myId);
  const top = lb.slice(0, 5);
  return top.map((l, i) => {
    const isMe = l.id === myId;
    const gap  = i === 0 ? '' : `<div style="font-size:.68rem;color:var(--text3);">${top[0].xp - l.xp} XP behind #1</div>`;
    return `<div class="lb-item ${isMe ? 'lb-you' : ''}">
      <div class="lb-rank">${RANK_ICONS[i]||i+1}</div>
      <div class="lb-name" style="${i===0?'color:var(--orange-dk)':isMe?'color:var(--blue-dk)':'color:var(--text2)'}">${l.name}${isMe?' (you!)':''}</div>
      <div>
        <div class="lb-xp">${l.xp.toLocaleString('en-IN')} XP</div>
        ${!isMe && i > 0 ? gap : ''}
      </div>
    </div>`;
  }).join('') + (myRank > -1 ? `<div class="lb-hint">💪 ${myRank === 0 ? "You're #1 this week! 🏆 Defend your spot!" : `${lb[0].xp - lb[myRank].xp} XP behind #1 — keep going!`}</div>` : '');
}

function getMascotMessage(streak, xpPct, streakInSession=0) {
  if (xpPct >= 90) return "You are SO close to filling the power bar! Just one more session! ✨";
  if (streak >= 5) return `${streak} days in a row — you are AMAZING! Keep going, superstar! 🌟`;
  if (streak === 0) return "I missed you! Come on, let's do some maths magic together today! 🎉";
  return "Just 2 more right answers and the PUZZLE door opens! You can do it! 🚪✨";
}

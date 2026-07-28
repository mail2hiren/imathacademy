function buildDashboard(profile, stats, group, session_user_id) {
  const age = getAgeFromDOB(profile.date_of_birth);
  const name    = profile.full_name || 'Student';
  const level   = profile.current_level || 1;
  const xp      = profile.xp_points || 0;
  const streak  = profile.streak_days || 0;
  const xpNext  = (Math.floor(xp / 500) + 1) * 500;
  const xpPct   = Math.min(100, Math.round((xp % 500) / 500 * 100));
  const isMobile = window.innerWidth <= 768;

  // Topbar
  document.getElementById('topbarGreeting').textContent = `${greet()}, ${name.split(' ')[0]}! 🙏`;
  if (isMobile) document.getElementById('mobileLogout').style.display = 'flex';

  // Desktop sidebar
  document.getElementById('desktopAv').textContent   = initials(name);
  document.getElementById('desktopName').textContent = name;
  document.getElementById('desktopGroup').textContent = groupLabel(group);

  // Homework badge
  if (stats.homeworkPending > 0) {
    document.getElementById('hwBadge').style.display = 'flex';
  }

  const content = document.getElementById('mainContent');

  // ── TINY (5-7) ─────────────────────────────────────────────
  if (group === 'tiny') {
    content.innerHTML = `

      <!-- Mascot hero -->
      <div style="background:linear-gradient(135deg,#E91E8C,#9C27B0);border-radius:20px;padding:20px;margin-bottom:14px;color:#fff;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-10px;left:-10px;font-size:60px;opacity:.1;">🐘</div>
        <div style="position:absolute;bottom:-10px;right:-10px;font-size:60px;opacity:.1;">⭐</div>
        <div style="font-size:52px;margin-bottom:8px;">🐘</div>
        <div style="font-size:1.1rem;font-weight:800;margin-bottom:4px;">Hello ${name.split(' ')[0]}! 🙏</div>
        <div style="font-size:.82rem;opacity:.85;margin-bottom:14px;">"Ready to do some maths magic today?"</div>
        <div style="display:flex;justify-content:center;gap:5px;margin-bottom:8px;flex-wrap:wrap;">
          ${Array.from({length:7},(_,i)=>`<span style="font-size:${i<streak?'1.6':'1.2'}rem;opacity:${i<streak?1:.2};transition:all .3s;">⭐</span>`).join('')}
        </div>
        <div style="font-size:.72rem;opacity:.8;">${streak} day${streak!==1?'s':''} in a row! ${streak<7?`${7-streak} more for a SUPER STAR badge!`:' AMAZING streak! 🎉'}</div>
      </div>

      <!-- XP blocks -->
      <div style="background:#FFF9C4;border:2px solid #F9A825;border-radius:16px;padding:12px 14px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:.82rem;font-weight:800;color:#E65100;">⚡ Power bar</div>
          <div style="font-size:.82rem;font-weight:800;color:#E65100;">${xp} / ${xpNext}</div>
        </div>
        <div style="display:flex;gap:3px;flex-wrap:wrap;">
          ${Array.from({length:10},(_,i)=>`<div style="width:calc(10% - 3px);height:18px;background:${i<Math.floor(xpPct/10)?'#FF6F00':'#FFF9C4'};border-radius:4px;border:1px ${i<Math.floor(xpPct/10)?'solid #E65100':'dashed #F9A825'};"></div>`).join('')}
          <span style="font-size:1rem;margin-left:4px;">🏆</span>
        </div>
        <div style="font-size:.72rem;color:#E65100;margin-top:5px;">Fill all blocks to level up! 🎉</div>
      </div>

      <!-- Action buttons -->
      <div class="section-title">What do you want to do?</div>
      <div class="actions-grid" style="margin-bottom:14px;">
        <a href="practice.html" class="action-btn" style="background:linear-gradient(145deg,#1976D2,#42A5F5);border:3px solid #1565C0;text-decoration:none;">
          <span class="action-emoji">⚡</span>
          <div class="action-name">Play maths!</div>
          <div class="action-sub">Flash cards</div>
          <span class="action-badge">+10 ⚡</span>
        </a>
        <div class="action-btn" style="background:linear-gradient(145deg,#7B1FA2,#AB47BC);border:3px solid #4A148C;opacity:.7;cursor:default;">
          <span class="action-emoji">🔒</span>
          <div class="action-name">Puzzle time!</div>
          <div class="action-sub">Get 5 right first!</div>
          <span class="action-badge">+30 ⚡</span>
        </div>
        <a href="homework.html" class="action-btn" style="background:linear-gradient(145deg,#E65100,#FF8A50);border:3px solid #BF360C;text-decoration:none;">
          <span class="action-emoji">📚</span>
          <div class="action-name">Homework</div>
          <div class="action-sub">${stats.homeworkPending > 0 ? stats.homeworkPending+' waiting!' : 'All done! 🎉'}</div>
          ${stats.homeworkPending > 0 ? '<span class="action-badge">!</span>' : ''}
        </a>
        <a href="lessons.html" class="action-btn" style="background:linear-gradient(145deg,#2E7D32,#66BB6A);border:3px solid #1B5E20;text-decoration:none;">
          <span class="action-emoji">▶️</span>
          <div class="action-name">Watch videos</div>
          <div class="action-sub">Learn new things</div>
        </a>
      </div>

      <!-- Sticker book -->
      <div class="sticker-card">
        <div class="sticker-header">
          <div class="sticker-title">🎁 My sticker book</div>
          <div class="sticker-count">${stats.stickers} stickers!</div>
        </div>
        <div class="stickers-row">
          <span class="sticker-em">🐘</span><span class="sticker-em">🦁</span><span class="sticker-em">🐯</span>
          <span class="sticker-em">🐬</span><span class="sticker-em">🦒</span>
          <span class="sticker-locked">❓</span><span class="sticker-locked">❓</span>
        </div>
        <div class="sticker-hint">Solve 5 more sums to unlock a new animal! 🐆</div>
      </div>

      <!-- Badges -->
      <div style="background:#FFF3E0;border:2px solid #FF9800;border-radius:16px;padding:14px;margin-bottom:12px;">
        <div style="font-size:.82rem;font-weight:800;color:#E65100;margin-bottom:10px;">🏅 My badges</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${renderBadges(stats.badges)}
        </div>
      </div>

      <!-- Mascot message -->
      <div class="mascot-card">
        <div class="mascot-em">🐘</div>
        <div>
          <div class="mascot-name">Jumbo says...</div>
          <div class="mascot-msg">"${getMascotMessage(streak, xpPct, stats.streakInSession)}"</div>
        </div>
      </div>`;

  // ── RISING (8-10) ───────────────────────────────────────────
  } else if (group === 'rising') {
    content.innerHTML = `

      <!-- Hero -->
      <div class="hero">
        <div class="hero-top">
          <div>
            <div class="hero-greeting">${greet()}!</div>
            <div class="hero-name">${name} 🌟</div>
            <div class="hero-sub">Level ${level} · Abacus${age ? ' · Age '+age : ''}</div>
          </div>
          <div class="streak-box">
            <div class="streak-icon">🔥</div>
            <div class="streak-num">${streak}</div>
            <div class="streak-label">day streak</div>
          </div>
        </div>
        <div class="xp-wrap">
          <div class="xp-labels"><span>⚡ ${xp} XP</span><span>${xpNext} XP → Level up!</span></div>
          <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
          <div class="xp-hint">${100-xpPct}% to go — keep going!</div>
        </div>
      </div>

      <!-- Daily missions -->
      <div id="vcDashCard" style="display:none;margin-bottom:14px;"></div>

      <div class="mission-card">
        <div class="mission-header">
          <div class="mission-title">🎯 Today's missions</div>
          <div class="mission-timer" id="missionTimer">Resets midnight</div>
        </div>

        <!-- Mission 1: Practice session -->
        <div class="mission-item ${stats.practiceToday ? 'mission-done' : ''}" onclick="go(\"practice.html\")">
          <div class="mission-icon">${stats.practiceToday ? '✅' : '⚡'}</div>
          <div class="mission-info">
            <div class="mission-name">Complete 1 practice session</div>
            <div style="height:5px;background:var(--border);border-radius:20px;margin:5px 0 3px;overflow:hidden;">
              <div style="height:100%;width:${stats.practiceToday?'100':'0'}%;background:var(--green);border-radius:20px;transition:width .5s;"></div>
            </div>
            <div class="mission-desc">${stats.practiceToday ? '✨ Done! +10 XP earned!' : 'Tap to start practising'}</div>
          </div>
          <div class="mission-xp">+10 XP</div>
        </div>

        <!-- Mission 2: Questions today -->
        <div class="mission-item ${stats.questionsToday >= 20 ? 'mission-done' : ''}" onclick="go(\"practice.html\")">
          <div class="mission-icon">${stats.questionsToday >= 20 ? '✅' : '🧮'}</div>
          <div class="mission-info">
            <div class="mission-name">Solve 20 questions today</div>
            <div style="height:5px;background:var(--border);border-radius:20px;margin:5px 0 3px;overflow:hidden;">
              <div style="height:100%;width:${Math.min(100,Math.round(stats.questionsToday/20*100))}%;background:var(--blue);border-radius:20px;transition:width .5s;"></div>
            </div>
            <div class="mission-desc">${stats.questionsToday >= 20 ? '✨ Done! +15 XP earned!' : stats.questionsToday+' / 20 questions — '+Math.max(0,20-stats.questionsToday)+' more to go!'}</div>
          </div>
          <div class="mission-xp">+15 XP</div>
        </div>

        <!-- Mission 3: 5 in a row -->
        <div class="mission-item ${stats.streakInSession >= 5 ? 'mission-done' : ''}" onclick="go(\"practice.html\")">
          <div class="mission-icon">${stats.streakInSession >= 5 ? '✅' : '🔥'}</div>
          <div class="mission-info">
            <div class="mission-name">Get 5 correct in a row</div>
            <div style="height:5px;background:var(--border);border-radius:20px;margin:5px 0 3px;overflow:hidden;">
              <div style="height:100%;width:${Math.min(100,stats.streakInSession/5*100)}%;background:var(--orange);border-radius:20px;transition:width .5s;"></div>
            </div>
            <div class="mission-desc">${stats.streakInSession >= 5 ? '✨ Done! Puzzle unlocked!' : stats.streakInSession > 0 ? stats.streakInSession+' / 5 in a row — keep going!' : 'Start practising to build your streak!'}</div>
          </div>
          <div class="mission-xp">+20 XP</div>
        </div>

        <!-- Mission 4: Puzzle -->
        <div class="mission-item ${stats.streakInSession >= 5 ? 'mission-done' : ''}" style="${stats.streakInSession < 5 ? 'opacity:.6;' : ''}" onclick="go(\"practice.html\")">
          <div class="mission-icon">${stats.streakInSession >= 5 ? '🧩' : '🔒'}</div>
          <div class="mission-info">
            <div class="mission-name">Solve today's puzzle</div>
            <div style="height:5px;background:var(--border);border-radius:20px;margin:5px 0 3px;overflow:hidden;">
              <div style="height:100%;width:${stats.streakInSession >= 5 ? '100' : '0'}%;background:var(--purple);border-radius:20px;transition:width .5s;"></div>
            </div>
            <div class="mission-desc">${stats.streakInSession >= 5 ? '🧩 Puzzle unlocked — tap to play!' : 'Unlock by getting 5 in a row first'}</div>
          </div>
          <div class="mission-xp">+30 XP</div>
        </div>

        <!-- Mission 5: Weekly quiz -->
        <div class="mission-item ${stats.quizDoneThisWeek ? 'mission-done' : ''}" onclick="go(\"weekly-quiz.html\")">
          <div class="mission-icon">${stats.quizDoneThisWeek ? '✅' : '⚡'}</div>
          <div class="mission-info">
            <div class="mission-name">Weekly quiz</div>
            <div style="height:5px;background:var(--border);border-radius:20px;margin:5px 0 3px;overflow:hidden;">
              <div style="height:100%;width:${stats.quizDoneThisWeek ? '100' : '0'}%;background:var(--orange);border-radius:20px;transition:width .5s;"></div>
            </div>
            <div class="mission-desc">${stats.quizDoneThisWeek ? '✨ Done this week! +50 XP!' : 'Resets every Monday · 10 questions'}</div>
          </div>
          <div class="mission-xp">+50 XP</div>
        </div>

        <!-- Mission 6: Worksheet (injected by JS) -->
        <div id="mission6Slot"></div>

      </div>

      <!-- Actions -->
      <div class="section-title">Quick actions</div>
      <div class="actions-grid" style="margin-bottom:14px;">
        <a href="practice.html" class="action-btn" style="background:linear-gradient(145deg,#1565C0,#1976D2);text-decoration:none;">
          <span class="action-emoji">⚡</span>
          <div class="action-name">Practice now</div>
          <div class="action-sub">Flash cards · Level ${level}</div>
          <span class="action-badge">+10 XP</span>
        </a>
        <div class="action-btn" style="background:linear-gradient(145deg,#6A1B9A,#7B1FA2);opacity:.7;cursor:default;">
          <span class="action-emoji">🧩</span>
          <div class="action-name">Today's puzzle</div>
          <div class="action-sub">Locked — get 5 right!</div>
          <span class="action-lock">🔒</span>
        </div>
        <a href="homework.html" class="action-btn" style="background:linear-gradient(145deg,#E65100,#F57C00);text-decoration:none;">
          <span class="action-emoji">📚</span>
          <div class="action-name">Homework</div>
          <div class="action-sub">${stats.homeworkPending > 0 ? stats.homeworkPending+' pending' : 'All done!'}</div>
          ${stats.homeworkPending > 0 ? '<span class="action-badge">!</span>' : ''}
        </a>
        <a href="lessons.html" class="action-btn" style="background:linear-gradient(145deg,#2E7D32,#388E3C);text-decoration:none;">
          <span class="action-emoji">▶️</span>
          <div class="action-name">Lessons</div>
          <div class="action-sub">Watch and learn</div>
        </a>
      </div>

      <!-- Live badges -->
      <div class="section-title">My badges</div>
      <div class="badges-row" id="risingBadgesRow">
        ${renderBadges(stats.badges)}
      </div>
      ${getBadgeHint(stats.badges)}

      <!-- Level progress -->
      <div class="section-title">Level ${level} progress</div>
      <div class="progress-card">
        <div class="progress-item">
          <div class="progress-icon">✅</div>
          <div class="progress-label" style="color:var(--green-dk)">Big friends addition</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:100%;background:var(--green)"></div></div>
          <div class="progress-pct" style="color:var(--green-dk)">100%</div>
        </div>
        <div class="progress-item">
          <div class="progress-icon">🔄</div>
          <div class="progress-label" style="color:var(--orange-dk)">Small friends addition</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:82%;background:var(--orange)"></div></div>
          <div class="progress-pct" style="color:var(--orange-dk)">82%</div>
        </div>
        <div class="progress-item" style="opacity:.4">
          <div class="progress-icon">🔒</div>
          <div class="progress-label">Big friends subtraction</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:0%"></div></div>
          <div class="progress-pct" style="color:var(--text3)">—</div>
        </div>
      </div>`;

  // ── CHAMPIONS (11-12) ────────────────────────────────────────
  } else {
    content.innerHTML = `

      <!-- Dark hero -->
      <div style="background:linear-gradient(135deg,#0D47A1,#1A237E);border-radius:20px;padding:18px;margin-bottom:14px;color:#fff;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;right:0;width:100px;height:100%;background:linear-gradient(135deg,transparent,rgba(255,255,255,.03));border-radius:20px;"></div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:10px;">
          <div>
            <div style="font-size:.72rem;opacity:.6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">Level ${level} · Week 3 of 12</div>
            <div style="font-size:1.15rem;font-weight:800;">${name} 🚀</div>
            <div style="font-size:.75rem;opacity:.7;margin-top:2px;">${stats.leaderboard.length ? 'Rank #'+(stats.leaderboard.findIndex(l=>l.id===session_user_id)+1||'?')+' in batch this week' : 'Keep practising!'}</div>
          </div>
          <div style="text-align:right;background:rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;flex-shrink:0;">
            <div style="font-size:1.2rem;font-weight:800;color:#FFD600;">🔥 ${streak}</div>
            <div style="font-size:.65rem;opacity:.7;">day streak</div>
          </div>
        </div>
        <div style="font-size:.72rem;opacity:.7;margin-bottom:5px;display:flex;justify-content:space-between;">
          <span>⚡ ${xp} XP this week</span><span>${xpNext-xp} XP to #1</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.15);border-radius:20px;overflow:hidden;">
          <div style="height:100%;width:${xpPct}%;background:linear-gradient(90deg,#FFD600,#FF6F00);border-radius:20px;"></div>
        </div>
        <div style="font-size:.68rem;opacity:.6;margin-top:4px;text-align:right;">${stats.leaderboard.length && stats.leaderboard[0].id !== session_user_id ? 'Just '+(stats.leaderboard[0].xp - xp)+' XP behind #1 — do one speed drill now!' : stats.leaderboard[0]?.id === session_user_id ? 'You are #1 this week! 🏆 Keep it up!' : 'Start practising to claim the top spot!'}</div>
      </div>

      <!-- Title chip -->
      <div class="title-chip">⚡ Maths Wizard <span style="opacity:.7;font-weight:400;font-size:.72rem;margin-left:4px;">· next: Speed Legend at ${xpNext} XP</span></div>

      <!-- Weekly challenge -->
      <div style="background:linear-gradient(135deg,#B71C1C,#E53935);border-radius:14px;padding:12px 14px;margin-bottom:14px;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div>
          <div style="font-size:.72rem;opacity:.8;margin-bottom:2px;">⏱ Weekly speed challenge</div>
          <div style="font-size:.95rem;font-weight:800;">Multiplication master</div>
          <div style="font-size:.72rem;opacity:.8;margin-top:2px;">Ends Sunday · You're 2nd</div>
        </div>
        <a href="practice.html" style="background:#fff;color:#B71C1C;border-radius:10px;padding:8px 14px;font-size:.82rem;font-weight:800;text-decoration:none;white-space:nowrap;flex-shrink:0;">Join now →</a>
      </div>

      <!-- Actions -->
      <div class="actions-grid" style="margin-bottom:14px;">
        <a href="practice.html" class="action-btn" style="background:linear-gradient(145deg,#1565C0,#1976D2);text-decoration:none;">
          <span class="action-emoji">⚡</span>
          <div class="action-name">Speed drill</div>
          <div class="action-sub">Multiplication · L${level}</div>
          <span class="action-badge">+25 XP</span>
        </a>
        <div class="action-btn" style="background:linear-gradient(145deg,#4A148C,#6A1B9A);">
          <span class="action-emoji">🧩</span>
          <div class="action-name">Sudoku 9×9</div>
          <div class="action-sub">New puzzle ready!</div>
          <span class="action-badge">+40 XP</span>
        </div>
        <a href="homework.html" class="action-btn" style="background:linear-gradient(145deg,#E65100,#F57C00);text-decoration:none;">
          <span class="action-emoji">📚</span>
          <div class="action-name">Homework</div>
          <div class="action-sub">${stats.homeworkPending > 0 ? stats.homeworkPending+' pending' : 'All done!'}</div>
          ${stats.homeworkPending > 0 ? '<span class="action-badge">!</span>' : ''}
        </a>
        <a href="lessons.html" class="action-btn" style="background:linear-gradient(145deg,#1B5E20,#388E3C);text-decoration:none;">
          <span class="action-emoji">▶️</span>
          <div class="action-name">Lessons</div>
          <div class="action-sub">Watch and learn</div>
        </a>
      </div>

      <!-- Live leaderboard -->
      <div class="section-title">Batch leaderboard — this week</div>
      <div class="lb-card">
        ${renderLeaderboard(stats.leaderboard, session_user_id)}
      </div>

      <!-- Live badges -->
      <div class="section-title">My badges</div>
      <div class="badges-row">
        ${renderBadges(stats.badges)}
      </div>
      ${getBadgeHint(stats.badges)}`;
  }
}

// ── BADGE DEFINITIONS ───────────────────────────────────────
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

  // Show earned first, then show up to 3 locked badges as preview
  const earnedDefs  = BADGE_DEFS.filter(b =>  earnedKeys.has(b.key));
  const lockedDefs  = BADGE_DEFS.filter(b => !earnedKeys.has(b.key)).slice(0, 3);
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

// ── LOAD ALL LIVE DATA ──────────────────────────────────────
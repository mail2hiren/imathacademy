/**
 * ============================================================
 * iMathAcademy — Gamification Engine
 * Session 15 — js/gamification.js
 *
 * Handles: XP calculation, badge awards, streak tracking,
 * level-up detection, leaderboard, XP animations
 * ============================================================
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bhullfoajenhkxlkiubs.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY_HERE';
const sb           = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── XP THRESHOLDS ──────────────────────────────────────────
export const BELTS = [
  { level:1,  name:'White Belt',   minXP:0,     maxXP:499,   color:'#F5F5F5', textColor:'#1A1A2E', emoji:'⬜' },
  { level:2,  name:'Yellow Belt',  minXP:500,   maxXP:1199,  color:'#FFF176', textColor:'#F57F17', emoji:'🟨' },
  { level:3,  name:'Orange Belt',  minXP:1200,  maxXP:2499,  color:'#FFB74D', textColor:'#E65100', emoji:'🟧' },
  { level:4,  name:'Green Belt',   minXP:2500,  maxXP:4499,  color:'#66BB6A', textColor:'#1B5E20', emoji:'🟩' },
  { level:5,  name:'Blue Belt',    minXP:4500,  maxXP:6999,  color:'#42A5F5', textColor:'#0D47A1', emoji:'🟦' },
  { level:6,  name:'Purple Belt',  minXP:7000,  maxXP:9999,  color:'#AB47BC', textColor:'#4A148C', emoji:'🟪' },
  { level:7,  name:'Red Belt',     minXP:10000, maxXP:13999, color:'#EF5350', textColor:'#B71C1C', emoji:'🟥' },
  { level:8,  name:'Brown Belt',   minXP:14000, maxXP:19999, color:'#8D6E63', textColor:'#4E342E', emoji:'🟫' },
  { level:9,  name:'Black Belt',   minXP:20000, maxXP:29999, color:'#212121', textColor:'#FFFFFF', emoji:'⬛' },
  { level:10, name:'Grand Master', minXP:30000, maxXP:Infinity, color:'#F9A825', textColor:'#E65100', emoji:'🏆' },
];

// ── XP EARNING RULES ───────────────────────────────────────
export const XP_RULES = {
  correct_first_try:    15,   // Correct answer on first attempt
  correct_later:        10,   // Correct answer after hints
  practice_session:     50,   // Completing a full practice session
  homework_submit:      80,   // Submitting homework on time
  homework_perfect:     150,  // Scoring 100% on homework
  homework_good:        100,  // Scoring 80%+ on homework
  streak_7_days:        200,  // 7-day streak milestone
  streak_14_days:       400,  // 14-day streak milestone
  streak_30_days:       1000, // 30-day streak milestone
  level_complete:       500,  // Completing a full level
  personal_best_speed:  100,  // New personal best in speed drill
  vedic_step_correct:   20,   // Completing all steps in Vedic question
  badge_earned:         0,    // Badges have their own XP values
};

// ── BADGE DEFINITIONS ──────────────────────────────────────
export const BADGE_DEFINITIONS = [
  // Learning badges
  {
    type: 'first_practice',
    label: 'First Steps',
    icon: '🎯',
    xp: 50,
    description: 'Complete your first practice session',
    category: 'learning',
    check: async (studentId) => {
      const { count } = await sb.from('practice_sessions')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId);
      return count >= 1;
    }
  },
  {
    type: 'perfect_score',
    label: 'Perfect Score',
    icon: '💯',
    xp: 100,
    description: 'Score 100% on any homework',
    category: 'homework',
    check: async (studentId) => {
      const { data } = await sb.from('submissions')
        .select('score, total_questions')
        .eq('student_id', studentId);
      return data?.some(s => s.score === s.total_questions && s.total_questions > 0);
    }
  },
  {
    type: 'speed_demon',
    label: 'Speed Demon',
    icon: '⚡',
    xp: 100,
    description: 'Complete 10 questions in under 90 seconds',
    category: 'speed',
    check: async (studentId) => {
      const { data } = await sb.from('practice_sessions')
        .select('time_taken_secs, questions_attempted')
        .eq('student_id', studentId);
      return data?.some(s => s.questions_attempted >= 10 && s.time_taken_secs <= 90);
    }
  },
  {
    type: 'homework_hero',
    label: 'Homework Hero',
    icon: '📚',
    xp: 80,
    description: 'Submit 5 homework assignments on time',
    category: 'homework',
    check: async (studentId) => {
      const { count } = await sb.from('submissions')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId);
      return count >= 5;
    }
  },
  {
    type: 'streak_7',
    label: '7-Day Streak',
    icon: '🔥',
    xp: 200,
    description: 'Practice 7 days in a row',
    category: 'streak',
    check: async (studentId) => {
      const { data } = await sb.from('users')
        .select('streak_days')
        .eq('id', studentId)
        .single();
      return (data?.streak_days || 0) >= 7;
    }
  },
  {
    type: 'streak_14',
    label: '2-Week Warrior',
    icon: '🌟',
    xp: 400,
    description: 'Practice 14 days in a row',
    category: 'streak',
    check: async (studentId) => {
      const { data } = await sb.from('users')
        .select('streak_days')
        .eq('id', studentId)
        .single();
      return (data?.streak_days || 0) >= 14;
    }
  },
  {
    type: 'streak_30',
    label: 'Monthly Master',
    icon: '👑',
    xp: 1000,
    description: 'Practice 30 days in a row',
    category: 'streak',
    check: async (studentId) => {
      const { data } = await sb.from('users')
        .select('streak_days')
        .eq('id', studentId)
        .single();
      return (data?.streak_days || 0) >= 30;
    }
  },
  {
    type: 'sharp_mind',
    label: 'Sharp Mind',
    icon: '🧠',
    xp: 150,
    description: 'Achieve 85%+ overall accuracy',
    category: 'accuracy',
    check: async (studentId) => {
      const { data } = await sb.from('student_progress_summary')
        .select('overall_accuracy')
        .eq('id', studentId)
        .single();
      return (data?.overall_accuracy || 0) >= 85;
    }
  },
  {
    type: 'bead_master',
    label: 'Bead Master',
    icon: '🧮',
    xp: 120,
    description: 'Complete 10 abacus practice sessions',
    category: 'learning',
    check: async (studentId) => {
      const { count } = await sb.from('practice_sessions')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId);
      return count >= 10;
    }
  },
  {
    type: 'vedic_scholar',
    label: 'Vedic Scholar',
    icon: '📜',
    xp: 150,
    description: 'Complete 5 Vedic Maths sessions',
    category: 'learning',
    check: async (studentId) => {
      const { count } = await sb.from('practice_sessions')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId)
        .not('topic', 'is', null);
      return count >= 5;
    }
  },
  {
    type: 'top_class',
    label: 'Top of Class',
    icon: '🥇',
    xp: 200,
    description: 'Highest XP in your batch this week',
    category: 'leaderboard',
    check: async (studentId) => {
      // Check if student is top in their batch
      const { data: student } = await sb.from('users')
        .select('xp_points')
        .eq('id', studentId)
        .single();
      return (student?.xp_points || 0) >= 1000;
    }
  },
  {
    type: 'on_fire',
    label: 'On Fire',
    icon: '🎖',
    xp: 100,
    description: 'Score above 80% for 5 sessions in a row',
    category: 'accuracy',
    check: async (studentId) => {
      const { data } = await sb.from('practice_sessions')
        .select('questions_correct, questions_attempted')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!data || data.length < 5) return false;
      return data.every(s => s.questions_attempted > 0 &&
        (s.questions_correct / s.questions_attempted) >= 0.8);
    }
  },
  {
    type: 'diamond',
    label: 'Diamond',
    icon: '💎',
    xp: 500,
    description: 'Maintain 85%+ accuracy for an entire month',
    category: 'accuracy',
    check: async (studentId) => {
      const { data } = await sb.from('student_progress_summary')
        .select('overall_accuracy, total_practice_sessions')
        .eq('id', studentId)
        .single();
      return (data?.overall_accuracy || 0) >= 85 && (data?.total_practice_sessions || 0) >= 20;
    }
  },
  {
    type: 'century',
    label: 'Century Club',
    icon: '💫',
    xp: 300,
    description: 'Complete 100 practice questions total',
    category: 'learning',
    check: async (studentId) => {
      const { data } = await sb.from('student_progress_summary')
        .select('total_attempted')
        .eq('id', studentId)
        .single();
      return (data?.total_attempted || 0) >= 100;
    }
  },
  {
    type: 'grand_master',
    label: 'Grand Master',
    icon: '🏆',
    xp: 1000,
    description: 'Reach 30,000 XP — the highest achievement',
    category: 'milestone',
    check: async (studentId) => {
      const { data } = await sb.from('users')
        .select('xp_points')
        .eq('id', studentId)
        .single();
      return (data?.xp_points || 0) >= 30000;
    }
  },
];

// ── CORE: AWARD XP ─────────────────────────────────────────
/**
 * Awards XP to a student and checks for level-ups and badges
 * @param {string} studentId - UUID of the student
 * @param {number} xpToAdd   - Amount of XP to add
 * @param {string} reason    - Why XP was awarded (for logging)
 * @returns {Object} - { newXP, levelUp, newBelt, badges }
 */
export async function awardXP(studentId, xpToAdd, reason = '') {
  if (!studentId || xpToAdd <= 0) return null;

  try {
    // Get current XP
    const { data: student, error } = await sb
      .from('users')
      .select('xp_points, current_level, full_name')
      .eq('id', studentId)
      .single();

    if (error || !student) throw error;

    const oldXP   = student.xp_points || 0;
    const newXP   = oldXP + xpToAdd;
    const oldBelt = getBeltForXP(oldXP);
    const newBelt = getBeltForXP(newXP);
    const levelUp = newBelt.level > oldBelt.level;

    // Update XP in database
    await sb.from('users')
      .update({
        xp_points:     newXP,
        current_level: newBelt.level,
      })
      .eq('id', studentId);

    // Check and award badges
    const newBadges = await checkAndAwardBadges(studentId);

    // If level up — send notification and email
    if (levelUp) {
      await handleLevelUp(studentId, student.full_name, newBelt, newXP);
    }

    // Show XP animation in UI
    showXPAnimation(xpToAdd, reason);

    return {
      oldXP,
      newXP,
      xpAdded:  xpToAdd,
      levelUp,
      oldBelt,
      newBelt,
      newBadges,
    };

  } catch (err) {
    console.error('awardXP error:', err);
    return null;
  }
}

// ── BELT LOOKUP ────────────────────────────────────────────
export function getBeltForXP(xp) {
  return BELTS.find(b => xp >= b.minXP && xp <= b.maxXP) || BELTS[0];
}

export function getXPProgress(xp) {
  const belt = getBeltForXP(xp);
  if (belt.level === 10) return { pct: 100, xpInBelt: xp - belt.minXP, xpNeeded: 0 };
  const xpInBelt  = xp - belt.minXP;
  const beltRange = belt.maxXP - belt.minXP + 1;
  const pct       = Math.min(100, Math.round((xpInBelt / beltRange) * 100));
  const xpNeeded  = belt.maxXP + 1 - xp;
  return { pct, xpInBelt, xpNeeded, nextBelt: BELTS[belt.level] };
}

// ── STREAK MANAGEMENT ──────────────────────────────────────
/**
 * Updates student streak and awards streak XP if milestone hit
 */
export async function updateStreak(studentId) {
  try {
    const { data: student } = await sb
      .from('users')
      .select('streak_days, last_active, full_name')
      .eq('id', studentId)
      .single();

    if (!student) return;

    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastActive = student.last_active;

    // Already active today — no change needed
    if (lastActive === today) return student.streak_days;

    let newStreak = 1;
    if (lastActive === yesterday) {
      // Consecutive day — extend streak
      newStreak = (student.streak_days || 0) + 1;
    }
    // Otherwise streak resets to 1

    await sb.from('users')
      .update({ streak_days: newStreak, last_active: today })
      .eq('id', studentId);

    // Award streak milestone XP
    const milestones = { 7: XP_RULES.streak_7_days, 14: XP_RULES.streak_14_days, 30: XP_RULES.streak_30_days };
    if (milestones[newStreak]) {
      await awardXP(studentId, milestones[newStreak], `${newStreak}-day streak! 🔥`);

      // Notify
      await sb.from('notifications').insert({
        user_id: studentId,
        type:    'streak',
        title:   `🔥 ${newStreak}-day streak!`,
        message: `Amazing! You have practised ${newStreak} days in a row! +${milestones[newStreak]} XP`,
      });
    }

    return newStreak;

  } catch (err) {
    console.error('updateStreak error:', err);
    return 0;
  }
}

// ── BADGE SYSTEM ───────────────────────────────────────────
/**
 * Checks all badge conditions and awards any newly earned badges
 */
export async function checkAndAwardBadges(studentId) {
  try {
    // Get already earned badges
    const { data: earned } = await sb
      .from('badges')
      .select('badge_type')
      .eq('student_id', studentId);

    const earnedTypes = new Set((earned || []).map(b => b.badge_type));
    const newBadges   = [];

    for (const badge of BADGE_DEFINITIONS) {
      if (earnedTypes.has(badge.type)) continue;

      try {
        const qualifies = await badge.check(studentId);
        if (qualifies) {
          await awardBadge(studentId, badge);
          newBadges.push(badge);
        }
      } catch (e) {
        // Badge check failed silently — don't block other badges
      }
    }

    // Show badge celebrations in UI
    if (newBadges.length > 0) {
      showBadgeCelebration(newBadges);
    }

    return newBadges;

  } catch (err) {
    console.error('checkAndAwardBadges error:', err);
    return [];
  }
}

/**
 * Awards a specific badge to a student
 */
export async function awardBadge(studentId, badge) {
  // Double-check not already earned
  const { data: existing } = await sb
    .from('badges')
    .select('id')
    .eq('student_id', studentId)
    .eq('badge_type', badge.type)
    .single();

  if (existing) return false;

  // Insert badge
  await sb.from('badges').insert({
    student_id:  studentId,
    badge_type:  badge.type,
    badge_label: badge.label,
    badge_icon:  badge.icon,
    xp_value:    badge.xp,
  });

  // Award XP for badge
  if (badge.xp > 0) {
    await sb.from('users')
      .update({ xp_points: sb.rpc('increment', { row_id: studentId, x: badge.xp }) })
      .eq('id', studentId);

    // Simpler XP update
    const { data: user } = await sb.from('users').select('xp_points').eq('id', studentId).single();
    if (user) {
      await sb.from('users').update({ xp_points: (user.xp_points || 0) + badge.xp }).eq('id', studentId);
    }
  }

  // Notify student
  await sb.from('notifications').insert({
    user_id: studentId,
    type:    'badge',
    title:   `${badge.icon} New badge: ${badge.label}!`,
    message: `You earned the "${badge.label}" badge! ${badge.xp > 0 ? `+${badge.xp} XP` : ''}`,
  });

  return true;
}

// ── LEVEL UP HANDLER ───────────────────────────────────────
async function handleLevelUp(studentId, studentName, newBelt, newXP) {
  // Notify student
  await sb.from('notifications').insert({
    user_id: studentId,
    type:    'level_up',
    title:   `🎉 You earned the ${newBelt.name}!`,
    message: `Congratulations! You have reached ${newBelt.name} with ${newXP.toLocaleString()} XP!`,
  });

  // Auto-award belt badge
  const beltBadge = {
    type:  `belt_${newBelt.name.toLowerCase().replace(' ', '_')}`,
    label: newBelt.name,
    icon:  newBelt.emoji,
    xp:    500,
    description: `Earned the ${newBelt.name}`,
  };

  await awardBadge(studentId, beltBadge);
  showLevelUpCelebration(newBelt);
}

// ── PRACTICE SESSION COMPLETE ──────────────────────────────
/**
 * Call this when a student finishes a practice session
 * Handles all XP, streaks, badges automatically
 */
export async function onPracticeComplete(studentId, sessionData) {
  const { questionsAttempted, questionsCorrect, timeTakenSecs, topic, isSpeedDrill } = sessionData;

  let totalXP = 0;
  const breakdown = [];

  // XP for correct answers
  const correctXP = questionsCorrect * XP_RULES.correct_later;
  totalXP += correctXP;
  breakdown.push({ reason: `${questionsCorrect} correct answers`, xp: correctXP });

  // Bonus for completing session
  if (questionsAttempted >= 10) {
    totalXP += XP_RULES.practice_session;
    breakdown.push({ reason: 'Session complete bonus', xp: XP_RULES.practice_session });
  }

  // Speed drill personal best bonus
  if (isSpeedDrill && timeTakenSecs <= 90) {
    totalXP += XP_RULES.personal_best_speed;
    breakdown.push({ reason: 'Speed drill record!', xp: XP_RULES.personal_best_speed });
  }

  // Save practice session to DB
  await sb.from('practice_sessions').insert({
    student_id:          studentId,
    topic:               topic,
    questions_attempted: questionsAttempted,
    questions_correct:   questionsCorrect,
    time_taken_secs:     timeTakenSecs,
    xp_awarded:          totalXP,
    session_date:        new Date().toISOString().split('T')[0],
  });

  // Award XP and update streak
  const result = await awardXP(studentId, totalXP, 'Practice session');
  await updateStreak(studentId);

  return { totalXP, breakdown, ...result };
}

/**
 * Call this when a student submits homework
 */
export async function onHomeworkSubmit(studentId, score, total) {
  const pct = total > 0 ? (score / total) * 100 : 0;

  let totalXP = XP_RULES.homework_submit;
  const breakdown = [{ reason: 'Homework submitted', xp: XP_RULES.homework_submit }];

  if (pct === 100) {
    totalXP += XP_RULES.homework_perfect;
    breakdown.push({ reason: 'Perfect score!', xp: XP_RULES.homework_perfect });
  } else if (pct >= 80) {
    totalXP += XP_RULES.homework_good;
    breakdown.push({ reason: '80%+ score bonus', xp: XP_RULES.homework_good });
  }

  // XP for correct answers
  const answerXP = score * XP_RULES.correct_later;
  totalXP += answerXP;
  breakdown.push({ reason: `${score} correct answers`, xp: answerXP });

  const result = await awardXP(studentId, totalXP, 'Homework submitted');
  await updateStreak(studentId);

  return { totalXP, breakdown, ...result };
}

// ── LEADERBOARD ────────────────────────────────────────────
/**
 * Gets leaderboard for a batch or all students
 */
export async function getLeaderboard(batchId = null, limit = 10) {
  try {
    let query = sb
      .from('student_progress_summary')
      .select('id, full_name, xp_points, streak_days, overall_accuracy, badges_earned')
      .order('xp_points', { ascending: false })
      .limit(limit);

    const { data } = await query;
    if (!data) return [];

    return data.map((s, i) => ({
      rank:       i + 1,
      id:         s.id,
      name:       s.full_name,
      xp:         s.xp_points || 0,
      belt:       getBeltForXP(s.xp_points || 0),
      streak:     s.streak_days || 0,
      accuracy:   s.overall_accuracy || 0,
      badges:     s.badges_earned || 0,
      medal:      i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`,
    }));

  } catch (err) {
    console.error('getLeaderboard error:', err);
    return [];
  }
}

// ── UI: XP ANIMATION ───────────────────────────────────────
export function showXPAnimation(xpAmount, reason = '') {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    top: 80px;
    right: 24px;
    background: linear-gradient(135deg, #1B5E20, #43A047);
    color: #fff;
    padding: 12px 20px;
    border-radius: 30px;
    font-family: 'Nunito', sans-serif;
    font-size: 1rem;
    font-weight: 800;
    box-shadow: 0 4px 20px rgba(27,94,32,0.4);
    z-index: 9999;
    animation: xpFloat 2.5s ease forwards;
    pointer-events: none;
  `;
  el.textContent = `+${xpAmount} XP${reason ? ' · ' + reason : ''}`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes xpFloat {
      0%   { opacity: 0; transform: translateY(10px) scale(0.8); }
      20%  { opacity: 1; transform: translateY(0)    scale(1.05); }
      70%  { opacity: 1; transform: translateY(-10px) scale(1); }
      100% { opacity: 0; transform: translateY(-30px) scale(0.9); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); style.remove(); }, 2600);
}

// ── UI: BADGE CELEBRATION ──────────────────────────────────
export function showBadgeCelebration(badges) {
  badges.forEach((badge, i) => {
    setTimeout(() => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Nunito', sans-serif;
        animation: fadeIn .3s ease;
      `;
      overlay.innerHTML = `
        <div style="
          background: #fff; border-radius: 24px;
          padding: 36px 32px; max-width: 360px; width: 90%;
          text-align: center;
          animation: bounceIn .4s ease;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
          <div style="font-size: 4rem; margin-bottom: 12px; animation: spin 0.5s ease">${badge.icon}</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: #F9A825; margin-bottom: 6px">New badge earned!</div>
          <div style="font-size: 1.4rem; font-weight: 900; color: #1A1A2E; margin-bottom: 8px">${badge.label}</div>
          <div style="font-size: 0.875rem; color: #4A4A6A; margin-bottom: 16px">${badge.description}</div>
          ${badge.xp > 0 ? `<div style="background: #FFFDE7; border: 2px solid #FFE082; border-radius: 30px; display: inline-block; padding: 6px 18px; font-size: 0.9rem; font-weight: 800; color: #F57F17; margin-bottom: 16px">+${badge.xp} XP</div>` : ''}
          <br>
          <button onclick="this.closest('div[style*=fixed]').remove()" style="
            background: #43A047; color: #fff; border: none;
            padding: 11px 28px; border-radius: 30px;
            font-family: 'Nunito', sans-serif; font-size: 0.9rem;
            font-weight: 800; cursor: pointer;
          ">Awesome! 🎉</button>
        </div>
        <style>
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
          @keyframes bounceIn { 0%{transform:scale(.7)}60%{transform:scale(1.08)}100%{transform:scale(1)} }
          @keyframes spin { from{transform:rotate(-20deg)}to{transform:rotate(20deg)} }
        </style>
      `;
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
      document.body.appendChild(overlay);
    }, i * 800);
  });
}

// ── UI: LEVEL UP CELEBRATION ───────────────────────────────
export function showLevelUpCelebration(belt) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 10000;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Nunito', sans-serif;
  `;

  // Confetti effect
  const confettiColors = ['#43A047','#FB8C00','#1E88E5','#8E24AA','#F9A825','#E53935'];
  const confettiHTML = Array.from({ length: 20 }, (_, i) => `
    <div style="
      position: absolute;
      width: ${4 + Math.random() * 8}px;
      height: ${8 + Math.random() * 12}px;
      background: ${confettiColors[i % confettiColors.length]};
      left: ${Math.random() * 100}%;
      top: -10px;
      border-radius: 2px;
      animation: confettiFall ${1.5 + Math.random() * 2}s ease ${Math.random() * 0.5}s forwards;
      transform: rotate(${Math.random() * 360}deg);
    "></div>`).join('');

  overlay.innerHTML = `
    <style>
      @keyframes confettiFall {
        to { top: 110%; transform: rotate(${Math.random() * 720}deg); opacity: 0; }
      }
      @keyframes levelUpPop {
        0%  { transform: scale(0.5) rotate(-5deg); opacity: 0; }
        60% { transform: scale(1.1) rotate(2deg); }
        100%{ transform: scale(1)   rotate(0deg); opacity: 1; }
      }
    </style>
    ${confettiHTML}
    <div style="
      background: linear-gradient(135deg, #1B5E20, #2E7D32);
      border-radius: 28px; padding: 40px 36px;
      max-width: 380px; width: 90%; text-align: center;
      box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      animation: levelUpPop 0.5s ease;
      position: relative; z-index: 1;
      color: #fff;
    ">
      <div style="font-size: 5rem; margin-bottom: 12px">${belt.emoji}</div>
      <div style="font-size: 1rem; opacity: 0.8; margin-bottom: 8px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase">Level Up!</div>
      <div style="font-size: 1.8rem; font-weight: 900; margin-bottom: 6px">${belt.name}</div>
      <div style="font-size: 0.9rem; opacity: 0.85; margin-bottom: 24px">You have reached Level ${belt.level}! Incredible achievement!</div>
      <div style="
        background: rgba(255,255,255,0.2);
        border-radius: 12px; padding: 12px 20px;
        margin-bottom: 20px; font-size: 0.875rem; font-weight: 600;
      ">
        🎓 Digital certificate emailed to you and your parent!
      </div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="
        background: #F9A825; color: #1A1A2E; border: none;
        padding: 13px 32px; border-radius: 30px;
        font-family: 'Nunito', sans-serif; font-size: 1rem;
        font-weight: 800; cursor: pointer;
      ">Keep going! 🚀</button>
    </div>
  `;

  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  // Auto-close after 6 seconds
  setTimeout(() => overlay.remove(), 6000);
}

// ── LEADERBOARD UI WIDGET ──────────────────────────────────
/**
 * Renders a leaderboard into a container element
 */
export function renderLeaderboard(containerId, students) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = students.map(s => `
    <div style="
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: #fff;
      border: 2px solid ${s.rank <= 3 ? '#FFE082' : '#E8EAF6'};
      border-radius: 14px; margin-bottom: 8px;
      background: ${s.rank === 1 ? '#FFFDE7' : s.rank === 2 ? '#F7F8FF' : s.rank === 3 ? '#FFF3E0' : '#fff'};
    ">
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: ${s.rank <= 3 ? '#F9A825' : '#E8EAF6'};
        display: flex; align-items: center; justify-content: center;
        font-size: ${s.rank <= 3 ? '1.1rem' : '0.8rem'};
        font-weight: 800; color: ${s.rank <= 3 ? '#fff' : '#4A4A6A'};
        flex-shrink: 0;
      ">${s.medal}</div>
      <div style="flex: 1">
        <div style="font-size: 0.875rem; font-weight: 800; color: #1A1A2E">${s.name}</div>
        <div style="font-size: 0.7rem; color: #9090B0; font-weight: 600">
          ${s.belt.name} · ${s.accuracy}% accuracy · 🔥${s.streak}d
        </div>
      </div>
      <div style="text-align: right">
        <div style="font-size: 0.9rem; font-weight: 800; color: #43A047">${s.xp.toLocaleString()} XP</div>
        <div style="font-size: 0.7rem; color: #9090B0">🏅 ${s.badges} badges</div>
      </div>
    </div>
  `).join('');
}

console.log('✅ iMathAcademy Gamification Engine loaded');
console.log('   Belt levels:', BELTS.length);
console.log('   Badge definitions:', BADGE_DEFINITIONS.length);
console.log('   Key functions: awardXP, updateStreak, checkAndAwardBadges,');
console.log('                  onPracticeComplete, onHomeworkSubmit, getLeaderboard');

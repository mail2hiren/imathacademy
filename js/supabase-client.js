/* ============================================================
   iMathAcademy — Supabase Client
   Session 2 — js/supabase-client.js
   Replace YOUR_SUPABASE_URL and YOUR_ANON_KEY with your values
   ============================================================ */

// ── CONFIGURATION ─────────────────────────────────────────
// IMPORTANT: Replace these with your actual Supabase values
// Found in: Supabase Dashboard → Settings → API
const SUPABASE_URL = 'https://bhullfoajenhkxlkiubs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodWxsZm9hamVuaGt4bGtpdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzcwMjUsImV4cCI6MjA5MzExMzAyNX0.RUcKFGluRhu9H8sZdLb-ow4ORoCd2-oIzYXJqyNZ5Uc'; // Paste your regenerated key here

// ── INITIALISE SUPABASE ────────────────────────────────────
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── TOAST NOTIFICATION HELPER ──────────────────────────────
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── AUTH HELPERS ───────────────────────────────────────────
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) window.location.href = '/login.html';
}

// ── STUDENT HELPERS ────────────────────────────────────────
export async function getStudentDashboard(studentId) {
  // Get student profile
  const { data: student } = await supabase
    .from('users')
    .select('*')
    .eq('id', studentId)
    .single();

  // Get pending homework
  const { data: homework } = await supabase
    .from('homework')
    .select(`
      *,
      batches!inner(batch_students!inner(student_id))
    `)
    .eq('batches.batch_students.student_id', studentId)
    .gt('due_date', new Date().toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  // Get recent practice sessions
  const { data: practice } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get badges
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .eq('student_id', studentId)
    .order('earned_at', { ascending: false });

  return { student, homework: homework || [], practice: practice || [], badges: badges || [] };
}

export async function getWeakTopics(studentId) {
  const { data, error } = await supabase
    .from('student_weak_topics')
    .select('*')
    .eq('student_id', studentId)
    .limit(5);
  return data || [];
}

// ── QUESTION HELPERS ───────────────────────────────────────
export async function getQuestionsForPractice(levelId, topic = null, count = 10) {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('level_id', levelId)
    .eq('is_active', true);

  if (topic) query = query.eq('topic', topic);

  // Random selection by ordering by random
  const { data } = await query.limit(count * 3);

  if (!data) return [];

  // Shuffle and return requested count
  return shuffleArray(data).slice(0, count);
}

export async function getHomeworkQuestions(questionIds) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds);
  return data || [];
}

// ── PRACTICE SESSION HELPERS ───────────────────────────────
export async function savePracticeSession(studentId, levelId, programId, topic, results) {
  const correct = results.filter(r => r.correct).length;
  const xp = calculateXP(correct, results.length);

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({
      student_id: studentId,
      level_id: levelId,
      program_id: programId,
      topic: topic,
      questions_attempted: results.length,
      questions_correct: correct,
      time_taken_secs: results.reduce((acc, r) => acc + (r.timeSecs || 0), 0),
      xp_awarded: xp,
    })
    .select()
    .single();

  // Update student XP
  await updateStudentXP(studentId, xp);

  // Update streak
  await updateStreak(studentId);

  // Check for weak topics and auto-assign if needed
  await checkAndAutoAssignHomework(studentId, levelId, topic, results);

  // Check for badges
  await checkAndAwardBadges(studentId);

  return { session: data, xpAwarded: xp };
}

// ── HOMEWORK HELPERS ───────────────────────────────────────
export async function getStudentHomework(studentId) {
  // Get batches this student is in
  const { data: batches } = await supabase
    .from('batch_students')
    .select('batch_id')
    .eq('student_id', studentId);

  if (!batches || batches.length === 0) return [];

  const batchIds = batches.map(b => b.batch_id);

  const { data: homework } = await supabase
    .from('homework')
    .select(`
      *,
      submissions(id, score, total_questions, submitted_at)
    `)
    .in('batch_id', batchIds)
    .eq('is_active', true)
    .order('due_date', { ascending: true });

  return homework || [];
}

export async function submitHomework(studentId, homeworkId, answers, timeSecs) {
  // Auto-grade the submission
  const homework = await supabase
    .from('homework')
    .select('question_ids')
    .eq('id', homeworkId)
    .single();

  const questions = await getHomeworkQuestions(homework.data.question_ids);
  let score = 0;

  questions.forEach(q => {
    if (answers[q.id] &&
        answers[q.id].trim().toLowerCase() === q.answer.trim().toLowerCase()) {
      score++;
    }
  });

  const xp = calculateXP(score, questions.length, true);

  const { data } = await supabase
    .from('submissions')
    .insert({
      student_id: studentId,
      homework_id: homeworkId,
      answers: answers,
      score: score,
      total_questions: questions.length,
      time_taken_secs: timeSecs,
      graded_at: new Date().toISOString(),
      xp_awarded: xp,
    })
    .select()
    .single();

  await updateStudentXP(studentId, xp);
  await checkAndAwardBadges(studentId);

  return { submission: data, score, total: questions.length, xpAwarded: xp };
}

// ── XP & GAMIFICATION ──────────────────────────────────────
export function calculateXP(correct, total, isHomework = false) {
  const base = correct * 10;
  const bonus = correct === total ? (isHomework ? 150 : 50) : 0;
  const hwBonus = isHomework ? 80 : 0;
  return base + bonus + hwBonus;
}

export async function updateStudentXP(studentId, xpToAdd) {
  const { data: student } = await supabase
    .from('users')
    .select('xp_points')
    .eq('id', studentId)
    .single();

  await supabase
    .from('users')
    .update({ xp_points: (student?.xp_points || 0) + xpToAdd })
    .eq('id', studentId);
}

export async function updateStreak(studentId) {
  const { data: student } = await supabase
    .from('users')
    .select('streak_days, last_active')
    .eq('id', studentId)
    .single();

  const today = new Date().toISOString().split('T')[0];
  const lastActive = student?.last_active;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let newStreak = student?.streak_days || 0;

  if (lastActive === yesterday) {
    newStreak += 1; // Continued streak
  } else if (lastActive !== today) {
    newStreak = 1; // Reset streak
  }

  await supabase
    .from('users')
    .update({ streak_days: newStreak, last_active: today })
    .eq('id', studentId);

  // Award streak badges
  if (newStreak === 7)  await awardBadge(studentId, 'streak_7',  '7-Day Streak!', '🔥', 200);
  if (newStreak === 30) await awardBadge(studentId, 'streak_30', '30-Day Legend!', '⚡', 1000);
}

// ── BADGE SYSTEM ───────────────────────────────────────────
const BADGE_DEFINITIONS = [
  { type: 'first_practice',   label: 'First Steps',    icon: '🎯',  xp: 50,   check: async (sid) => { const { count } = await supabase.from('practice_sessions').select('id', {count:'exact'}).eq('student_id', sid); return count >= 1; }},
  { type: 'perfect_score',    label: 'Perfect Score!', icon: '💯',  xp: 100,  check: async (sid) => { const { data } = await supabase.from('submissions').select('score,total_questions').eq('student_id', sid); return data?.some(s => s.score === s.total_questions); }},
  { type: 'speed_demon',      label: 'Speed Demon',    icon: '⚡',  xp: 100,  check: async (sid) => { const { data } = await supabase.from('practice_sessions').select('time_taken_secs,questions_attempted').eq('student_id', sid); return data?.some(s => s.questions_attempted >= 10 && s.time_taken_secs < 120); }},
  { type: 'homework_hero',    label: 'Homework Hero',  icon: '📚',  xp: 80,   check: async (sid) => { const { count } = await supabase.from('submissions').select('id', {count:'exact'}).eq('student_id', sid); return count >= 5; }},
  { type: 'top_accuracy',     label: 'Sharp Mind',     icon: '🧠',  xp: 150,  check: async (sid) => { const { data } = await supabase.from('student_progress_summary').select('overall_accuracy').eq('id', sid).single(); return (data?.overall_accuracy || 0) >= 85; }},
  { type: 'bead_master',      label: 'Bead Master',    icon: '🧮',  xp: 120,  check: async (sid) => { const { count } = await supabase.from('practice_sessions').select('id', {count:'exact'}).eq('student_id', sid).eq('topic','Single digit addition'); return count >= 10; }},
];

export async function checkAndAwardBadges(studentId) {
  // Get already earned badge types
  const { data: earned } = await supabase
    .from('badges')
    .select('badge_type')
    .eq('student_id', studentId);

  const earnedTypes = new Set((earned || []).map(b => b.badge_type));
  const newBadges = [];

  for (const def of BADGE_DEFINITIONS) {
    if (!earnedTypes.has(def.type)) {
      try {
        const qualifies = await def.check(studentId);
        if (qualifies) {
          await awardBadge(studentId, def.type, def.label, def.icon, def.xp);
          newBadges.push(def);
        }
      } catch (e) {
        // Badge check failed silently
      }
    }
  }

  return newBadges;
}

export async function awardBadge(studentId, type, label, icon, xpValue) {
  // Check not already awarded
  const { data: existing } = await supabase
    .from('badges')
    .select('id')
    .eq('student_id', studentId)
    .eq('badge_type', type)
    .single();

  if (existing) return; // Already has this badge

  await supabase.from('badges').insert({
    student_id: studentId,
    badge_type: type,
    badge_label: label,
    badge_icon: icon,
    xp_value: xpValue,
  });

  await updateStudentXP(studentId, xpValue);

  // Notify
  await supabase.from('notifications').insert({
    user_id: studentId,
    type: 'badge',
    title: 'New Badge Earned!',
    message: `You earned the "${label}" badge! +${xpValue} XP`,
  });
}

// ── SMART HOMEWORK AUTO-ASSIGN ─────────────────────────────
export async function checkAndAutoAssignHomework(studentId, levelId, topic, results) {
  if (!topic) return;

  const correct = results.filter(r => r.correct).length;
  const accuracy = (correct / results.length) * 100;

  // Only auto-assign if accuracy is below 55%
  if (accuracy >= 55) return;

  // Check no open homework exists for this topic
  const { data: existing } = await supabase
    .from('homework')
    .select(`
      id,
      batches!inner(batch_students!inner(student_id))
    `)
    .eq('topic', topic)
    .eq('is_auto_assigned', true);

  if (existing && existing.length > 0) return;

  // Get student's batch
  const { data: batches } = await supabase
    .from('batch_students')
    .select('batch_id')
    .eq('student_id', studentId)
    .limit(1);

  if (!batches || batches.length === 0) return;

  // Pick 8 questions on this topic
  const questions = await getQuestionsForPractice(levelId, topic, 8);
  if (questions.length === 0) return;

  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  await supabase.from('homework').insert({
    batch_id: batches[0].batch_id,
    level_id: levelId,
    title: `Revision: ${topic}`,
    topic: topic,
    question_ids: questions.map(q => q.id),
    due_date: dueDate,
    is_auto_assigned: true,
    auto_reason: `Accuracy was ${Math.round(accuracy)}% — below 55% threshold`,
  });

  // Notify student
  await supabase.from('notifications').insert({
    user_id: studentId,
    type: 'homework',
    title: 'Revision homework assigned!',
    message: `You have new revision homework on "${topic}" to help you improve. Due in 3 days.`,
  });
}

// ── TEACHER HELPERS ────────────────────────────────────────
export async function getTeacherBatches(teacherId) {
  const { data } = await supabase
    .from('batches')
    .select(`
      *,
      programs(name, slug),
      levels(name, belt_name),
      batch_students(
        student_id,
        users(id, full_name, xp_points, streak_days, mode, current_level)
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('is_active', true);
  return data || [];
}

export async function assignHomework(batchId, teacherId, levelId, topic, difficulty, count, dueDate) {
  const { data: level } = await supabase
    .from('levels')
    .select('id')
    .eq('id', levelId)
    .single();

  const questions = await getQuestionsForPractice(levelId, topic, count);

  if (questions.length === 0) {
    throw new Error('No questions available for this topic and level.');
  }

  const { data, error } = await supabase
    .from('homework')
    .insert({
      teacher_id: teacherId,
      batch_id: batchId,
      level_id: levelId,
      title: `${topic} — Practice`,
      topic: topic,
      question_ids: questions.map(q => q.id),
      difficulty: difficulty,
      due_date: dueDate,
    })
    .select()
    .single();

  if (error) throw error;

  // Get all students in batch and notify them
  const { data: students } = await supabase
    .from('batch_students')
    .select('student_id')
    .eq('batch_id', batchId);

  if (students) {
    const notifications = students.map(s => ({
      user_id: s.student_id,
      type: 'homework',
      title: 'New homework assigned!',
      message: `"${topic}" — ${count} questions due on ${dueDate}`,
    }));
    await supabase.from('notifications').insert(notifications);
  }

  return data;
}

// ── ADMIN HELPERS ──────────────────────────────────────────
export async function getAdminOverview() {
  const [
    { count: totalStudents },
    { data: feeData },
    { data: inactiveData },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student').eq('is_active', true),
    supabase.from('fees').select('amount, status'),
    supabase.from('users').select('id').eq('role', 'student')
      .lt('last_active', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ]);

  const collected = (feeData || []).filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
  const overdueFees = (feeData || []).filter(f => f.status === 'overdue').length;
  const inactiveStudents = (inactiveData || []).length;

  return {
    totalStudents: totalStudents || 0,
    collectedThisMonth: collected,
    overdueFees,
    inactiveStudents,
  };
}

export async function createStudentAccount(fullName, email, program, level, mode) {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) throw authError;

  // Create profile in users table
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'student',
      program,
      current_level: level,
      mode: mode || 'online',
    })
    .select()
    .single();

  if (error) throw error;

  // Send welcome notification
  await supabase.from('notifications').insert({
    user_id: data.id,
    type: 'welcome',
    title: 'Welcome to iMathAcademy!',
    message: `Welcome ${fullName}! Your account is ready. Start learning today!`,
  });

  return data;
}

// ── UTILITY FUNCTIONS ──────────────────────────────────────
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days} days ago`;
}

export function getDaysDiff(dateStr) {
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due - now) / 86400000);
}

export function getDueColor(daysLeft) {
  if (daysLeft < 0)  return 'pill-gray';
  if (daysLeft === 0) return 'pill-red';
  if (daysLeft <= 2) return 'pill-red';
  if (daysLeft <= 4) return 'pill-orange';
  return 'pill-green';
}

export function getDueLabel(daysLeft) {
  if (daysLeft < 0)  return 'Submitted';
  if (daysLeft === 0) return 'Due today!';
  if (daysLeft === 1) return 'Due tomorrow!';
  return `${daysLeft} days left`;
}

export function getAccuracyColor(pct) {
  if (pct >= 80) return 'var(--green)';
  if (pct >= 60) return 'var(--blue)';
  if (pct >= 40) return 'var(--orange)';
  return 'var(--red)';
}

export function getBeltInfo(xp) {
  const belts = [
    { name: 'White Belt',  minXP: 0,     maxXP: 499,   color: '#F5F5F5', icon: '⬜' },
    { name: 'Yellow Belt', minXP: 500,   maxXP: 1199,  color: '#FFF176', icon: '🟨' },
    { name: 'Orange Belt', minXP: 1200,  maxXP: 2499,  color: '#FFB74D', icon: '🟧' },
    { name: 'Green Belt',  minXP: 2500,  maxXP: 4499,  color: '#66BB6A', icon: '🟩' },
    { name: 'Blue Belt',   minXP: 4500,  maxXP: 6999,  color: '#42A5F5', icon: '🟦' },
    { name: 'Purple Belt', minXP: 7000,  maxXP: 9999,  color: '#AB47BC', icon: '🟪' },
    { name: 'Red Belt',    minXP: 10000, maxXP: 13999, color: '#EF5350', icon: '🟥' },
    { name: 'Brown Belt',  minXP: 14000, maxXP: 19999, color: '#8D6E63', icon: '🟫' },
    { name: 'Black Belt',  minXP: 20000, maxXP: 29999, color: '#212121', icon: '⬛' },
    { name: 'Grand Master',minXP: 30000, maxXP: Infinity, color: '#F9A825', icon: '🏆' },
  ];
  return belts.find(b => xp >= b.minXP && xp <= b.maxXP) || belts[0];
}

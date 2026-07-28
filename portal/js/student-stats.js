async function loadStats(userId) {
  const stats = {
    homeworkPending:    0,
    practiceToday:      false,
    stickers:           0,
    puzzlesToday:       false,
    weeklyXP:           0,
    leaderboard:        [],
    badges:             [],
    conceptProgress:    [],
    streakInSession:    0,
    questionsToday:     0,   // live count for mission progress bar
    worksheetsToday:    0,   // worksheets submitted today
    quizDoneThisWeek:   false,
    newWorksheets:      0,
    worksheetsTotal:     0,   // every worksheet assigned to this student
    worksheetsCompleted: 0,   // how many they have submitted
  };

  try {
    // 1. Homework pending — from batches this student belongs to
    const { data: batches } = await sb
      .from('batch_students').select('batch_id').eq('student_id', userId);
    const batchIds = (batches || []).map(b => b.batch_id);

    const { data: wsResponses } = await sb
      .from('worksheet_responses').select('worksheet_id').eq('student_id', userId);
    const doneWsIds = new Set((wsResponses||[]).map(r => r.worksheet_id));

    // A student who is not in any batch still receives worksheets
    // assigned to them directly, so this must not sit behind a
    // batch check — several students have no batch yet.
    let wsFilter = 'student_id.eq.' + userId;
    if (batchIds.length) wsFilter += ',batch_id.in.(' + batchIds.join(',') + ')';

    const { data: allHw } = await sb.from('lx_worksheets').select('id')
      .eq('is_active', true).or(wsFilter);

    stats.worksheetsTotal     = (allHw || []).length;
    stats.worksheetsCompleted = (allHw || []).filter(w =>  doneWsIds.has(w.id)).length;
    stats.homeworkPending     = stats.worksheetsTotal - stats.worksheetsCompleted;

    // 2. Practice today — check practice_sessions
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const { data: sessions } = await sb
      .from('practice_sessions')
      .select('id')
      .eq('student_id', userId)
      .gte('created_at', todayStart.toISOString())
      .limit(1);
    stats.practiceToday = (sessions?.length || 0) > 0;

    // 3. Badges earned
    const { data: badges } = await sb
      .from('badges')
      .select('*')
      .eq('student_id', userId)
      .order('earned_at', { ascending: false });
    stats.badges = badges || [];

    // 4. Weekly XP — sum from practice_sessions this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0,0,0,0);
    const { data: weekSessions } = await sb
      .from('practice_sessions')
      .select('xp_awarded')
      .eq('student_id', userId)
      .gte('created_at', weekStart.toISOString());
    stats.weeklyXP = (weekSessions || []).reduce((s,r) => s + (r.xp_awarded||0), 0);

    // 5. Leaderboard — top students in same batch by XP this week
    if (batchIds.length) {
      const { data: batchmates } = await sb
        .from('batch_students')
        .select('student_id, users!student_id(full_name, xp_points)')
        .in('batch_id', batchIds);

      if (batchmates?.length) {
        stats.leaderboard = batchmates
          .map(b => ({ name: b.users?.full_name || '?', xp: b.users?.xp_points || 0, id: b.student_id }))
          .sort((a,b) => b.xp - a.xp)
          .slice(0, 5);
      }
    }

    // 6. Sticker count (use badges count as proxy until stickers table exists)
    stats.stickers = stats.badges.length;

    // 7. In-session correct answer streak + total questions today
    const { data: todaySessions } = await sb
      .from('practice_sessions')
      .select('questions_correct,questions_attempted,topic')
      .eq('student_id', userId)
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });
    if (todaySessions?.length) {
      stats.streakInSession = todaySessions[0].questions_correct || 0;
      stats.questionsToday = todaySessions.reduce((s,r) => s + (r.questions_attempted||0), 0);
      stats.worksheetsToday = todaySessions.filter(r => r.topic==='worksheet').length;
    }

    // 8. Quiz done this week
    const weekNum = (() => { const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+4-(d.getDay()||7)); const y=new Date(d.getFullYear(),0,1); return Math.ceil((((d-y)/86400000)+1)/7); })();
    const { data: quizDone } = await sb.from('quiz_results')
      .select('id').eq('student_id', userId).eq('week_number', weekNum).limit(1);
    stats.quizDoneThisWeek = (quizDone?.length||0) > 0;

    // 9. New worksheets count
    if (batchIds.length) {
      const { data: wsResponses } = await sb.from('worksheet_responses').select('worksheet_id').eq('student_id', userId);
      const doneIds = new Set((wsResponses||[]).map(r => r.worksheet_id));
      const { data: allWs } = await sb.from('lx_worksheets').select('id').eq('is_active', true)
        .or('student_id.eq.' + userId + ',batch_id.in.(' + batchIds.join(',') + ')');
      stats.newWorksheets = (allWs||[]).filter(w => !doneIds.has(w.id)).length;
    }

  } catch(e) { console.error('loadStats error:', e); }

  // Update homework badge on bottom nav
  if (stats.homeworkPending > 0) {
    const badge = document.getElementById('hwBadge');
    if (badge) badge.style.display = 'flex';
  }

  return stats;
}

// ── AUTH + INIT ──────────────────────────────────────────────
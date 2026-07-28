async function logout() {
  await sb.auth.signOut();
  window.location.href = '../../login.html';
}

async function init() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = '../../login.html'; return; }

    // Subscription check
    const active = await checkSubscription(session.user.id);
    if (!active) return;

    // Load profile
    const { data: profile, error } = await sb.from('users').select('*').eq('id', session.user.id).single();
    if (error || !profile) { window.location.href = '../../login.html'; return; }

    // Determine age group
    const group = getGroup(profile);

    // Load stats and notifications in parallel
    const [stats] = await Promise.all([
      loadStats(session.user.id),
      loadNotifications(session.user.id),
    ]);

    // Build dashboard — pass session user id for leaderboard highlight
    buildDashboard(profile, stats, group, session.user.id);
    injectWorksheetMission(stats.newWorksheets || 0);
    loadVirtualClassCard(session.user.id);

    // Get batch IDs for quest card
    const { data: bl } = await sb.from('batch_students').select('batch_id').eq('student_id', session.user.id);
    const batchIds = (bl||[]).map(b => b.batch_id);

    // Today's quest card
    renderTodaysQuest(session.user.id, batchIds);

    // Voice reading for tiny champs
    setupVoiceReading(group);

  } catch(err) {
    console.error('Dashboard init error:', err);
    document.getElementById('mainContent').innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--red)">
        Something went wrong. <a href="../../login.html" style="color:var(--blue)">Please login again</a>
      </div>`;
  }
}

init();

// ── DASHBOARD LIVE BADGES ────────────────────────────────────
async function loadDashboardBadges(userId) {
  try {
    // Get student batches
    const { data: batchLinks } = await sb.from('batch_students').select('batch_id').eq('student_id', userId);
    const batchIds = (batchLinks||[]).map(b => b.batch_id);

    // New worksheets
    let wsCount = 0;
    if (batchIds.length) {
      const { data: wsResponses } = await sb.from('worksheet_responses').select('worksheet_id').eq('student_id', userId);
      const doneIds = new Set((wsResponses||[]).map(r => r.worksheet_id));
      const { data: allWs } = await sb.from('lx_worksheets').select('id').eq('is_active', true)
        .or('student_id.eq.' + userId + ',batch_id.in.(' + batchIds.join(',') + ')');
      wsCount = (allWs||[]).filter(w => !doneIds.has(w.id)).length;
    }


    // Pending homework = lx_worksheets not yet submitted (same source as wsCount)
    let hwCount = wsCount; // same pending worksheets = homework pending

    // Update worksheet badge on dashboard
    const wsBadge = document.getElementById('wsDashBadge');
    if (wsBadge) { wsBadge.textContent = wsCount > 0 ? wsCount + ' new' : ''; wsBadge.style.display = wsCount > 0 ? 'inline-block' : 'none'; }

    // Update homework card on dashboard
    const hwBadge = document.getElementById('hwDashBadge');
    if (hwBadge) { hwBadge.textContent = hwCount > 0 ? hwCount + ' due' : ''; hwBadge.style.display = hwCount > 0 ? 'inline-block' : 'none'; }

    // Update bottom nav badges
    const wsBnav = document.getElementById('wsBnavBadge');
    if (wsBnav) { wsBnav.textContent = wsCount; wsBnav.style.display = wsCount > 0 ? 'flex' : 'none'; }
    const hwBnav = document.getElementById('hwBnavBadge');
    if (hwBnav) { hwBnav.textContent = hwCount; hwBnav.style.display = hwCount > 0 ? 'flex' : 'none'; }

  } catch(e) { console.error('loadDashboardBadges:', e); }
}

// ── LEVEL UP CEREMONY ─────────────────────────────────────────
function checkLevelUp(oldXP, newXP, level) {
  const thresholds = [0,500,1200,2200,3500,5000,7000,9500,12500,16000];
  const oldLevel = thresholds.findIndex((t,i) => oldXP >= t && (i===thresholds.length-1||oldXP<thresholds[i+1]));
  const newLevel = thresholds.findIndex((t,i) => newXP >= t && (i===thresholds.length-1||newXP<thresholds[i+1]));
  if (newLevel > oldLevel && newLevel > 0) showLevelUp(newLevel);
}

function showLevelUp(newLevel) {
  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';
  const LEVEL_NAMES = ['','Abacus Beginner','Rising Star','Maths Whiz','Formula Master','Anzan Hero','Multiply Pro','Division Expert','Decimal Wizard','Grand Master'];
  overlay.innerHTML = `<div class="levelup-card">
    <div class="levelup-emoji">🎓</div>
    <div class="levelup-title">Level Up!</div>
    <div class="levelup-sub">You have reached <strong>Level ${newLevel}</strong><br>${LEVEL_NAMES[newLevel]||''}! Keep going — you are amazing! 🌟</div>
    <button class="levelup-btn" onclick="this.closest('.levelup-overlay').remove()">Awesome! 🚀</button>
  </div>`;
  document.body.appendChild(overlay);
  spawnConfetti();
}

function spawnConfetti() {
  const colors = ['#FFD600','#FF6F00','#1E88E5','#8E24AA','#43A047','#E53935'];
  for(let i=0; i<40; i++) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'2px'};z-index:9999;animation:confettiFall ${1+Math.random()*2}s ease ${Math.random()*0.5}s forwards;pointer-events:none;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

// ── MISSION COUNTDOWN TIMER ──────────────────────────────────
function updateMissionTimer() {
  const el = document.getElementById('missionTimer');
  if (!el) return;
  const now = new Date();
  const midnight = new Date(); midnight.setHours(24,0,0,0);
  const diff = midnight - now;
  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff%3600000)/60000);
  el.textContent = `Resets in ${h}h ${m}m`;
}
updateMissionTimer();
setInterval(updateMissionTimer, 60000);

// ── INJECT MISSION 6 (worksheet) safely after DOM render ─────
function injectWorksheetMission(count) {
  const slot = document.getElementById('mission6Slot');
  if (!slot) return;
  if (count > 0) {
    slot.className = 'mission-item';
    slot.setAttribute('onclick', "location.href='worksheets.html'");
    slot.style.cursor = 'pointer';
    slot.innerHTML =
      '<div class="mission-icon">📋</div>' +
      '<div class="mission-info">' +
        '<div class="mission-name">Complete new worksheet</div>' +
        '<div style="height:5px;background:var(--border);border-radius:20px;margin:5px 0 3px;overflow:hidden;">' +
          '<div style="height:100%;width:0%;background:var(--green);border-radius:20px;"></div>' +
        '</div>' +
        '<div class="mission-desc">' + count + ' worksheet' + (count > 1 ? 's' : '') + ' waiting — tap to solve!</div>' +
      '</div>' +
      '<div class="mission-xp">+25 XP</div>';
  } else {
    slot.style.display = 'none';
  }
}

// ── VIRTUAL CLASS CARD ───────────────────────────────────────
async function loadVirtualClassCard(userId) {
  var cardEl = document.getElementById('vcDashCard');
  if (!cardEl) return;
  try {
    var bsRes = await sb.from('batch_students').select('batch_id').eq('student_id', userId);
    if (!bsRes.data || !bsRes.data.length) return;
    var batchIds = bsRes.data.map(function(b) { return b.batch_id; });

    var bRes = await sb.from('batches').select('id,name,schedule_json,meet_link').in('id', batchIds);
    if (!bRes.data || !bRes.data.length) return;

    var now = new Date();
    var liveClass = null;
    var nextClass = null;

    bRes.data.forEach(function(batch) {
      var sj = batch.schedule_json;
      if (!sj) return;
      var meetLink = sj.meet_link || batch.meet_link;
      if (!meetLink) return;
      var topic = sj.text || 'Virtual Class';

      // If next_class date is set, use it; otherwise just show the schedule
      if (sj.next_class) {
        var classDate = new Date(sj.next_class + 'T00:00:00');
        var diffHours = (classDate - now) / 3600000;
        if (diffHours >= -2 && diffHours <= 2) {
          // Within 2 hrs of class date — show as live
          liveClass = { name: batch.name, topic: topic, meet_link: meetLink, date: classDate };
        } else {
          // Show as upcoming regardless of how far away — weekly class always visible
          if (!nextClass || classDate < nextClass.date) {
            nextClass = { name: batch.name, topic: topic, meet_link: meetLink, date: classDate };
          }
        }
      } else {
        // No specific date — show as a standing schedule
        if (!nextClass) {
          nextClass = { name: batch.name, topic: topic, meet_link: meetLink, date: null };
        }
      }
    });

    cardEl.style.display = 'block';

    if (liveClass) {
      cardEl.innerHTML = '<a href="' + liveClass.meet_link + '" target="_blank" class="vc-dashboard-card live">'
        + '<div class="vc-icon">📹</div>'
        + '<div class="vc-info">'
        + '<div class="vc-title">🔴 Live now — ' + liveClass.topic + '</div>'
        + '<div class="vc-meta">' + liveClass.name + ' · Class is happening now — tap to join!</div>'
        + '</div><span class="vc-join">Join now →</span></a>';
    } else if (nextClass) {
      var dateStr = nextClass.date
        ? nextClass.date.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'short'})
        : 'Scheduled';
      cardEl.innerHTML = '<a href="' + nextClass.meet_link + '" target="_blank" class="vc-dashboard-card upcoming">'
        + '<div class="vc-icon">📅</div>'
        + '<div class="vc-info">'
        + '<div class="vc-title">' + nextClass.topic + '</div>'
        + '<div class="vc-meta">' + nextClass.name + ' · ' + dateStr + '</div>'
        + '</div><span class="vc-join">Join →</span></a>';
    }
  } catch(e) { console.warn('VC card error:', e.message); }
}


// ── TODAY'S QUEST CARD ───────────────────────────────────────
async function renderTodaysQuest(userId, batchIds) {
  const card = document.getElementById('todaysQuestCard');
  if (!card) return;
  try {
    const { data: allWs } = await sb.from('lx_worksheets')
      .select('id, title, questions_count, student_id, batch_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!allWs || !allWs.length) { card.innerHTML = ''; return; }

    const relevant = allWs.filter(w =>
      w.student_id === userId ||
      (batchIds && batchIds.includes(w.batch_id))
    );

    const { data: responses } = await sb.from('worksheet_responses')
      .select('worksheet_id').eq('student_id', userId);
    const doneIds = new Set((responses||[]).map(r => r.worksheet_id));

    const quest = relevant.find(w => !doneIds.has(w.id)) || relevant[0];
    if (!quest) { card.innerHTML = ''; return; }

    const isDone  = doneIds.has(quest.id);
    const qTitle  = quest.title || 'Practice Quest';
    const qCount  = quest.questions_count ? quest.questions_count + ' questions' : 'Complete your daily quest';

    card.innerHTML = `
      <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);border-radius:18px;padding:16px;margin-bottom:14px;color:#fff;box-shadow:0 4px 16px rgba(27,94,32,.3);position:relative;overflow:hidden;">
        <div style="position:absolute;right:12px;top:8px;font-size:2.5rem;opacity:.15;pointer-events:none;">🎯</div>
        <div style="font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#A5D6A7;margin-bottom:4px;">${isDone ? '✅ Quest Complete!' : "Today's Quest"}</div>
        <div style="font-size:1.05rem;font-weight:900;margin-bottom:4px;">${qTitle}</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,.7);margin-bottom:12px;">${qCount}</div>
        ${isDone
          ? `<button onclick="location.href='worksheets.html'" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:50px;padding:9px 18px;font-family:inherit;font-size:.875rem;font-weight:900;cursor:pointer;">📋 View Result</button>`
          : `<button onclick="location.href='worksheets.html#${quest.id}'" style="background:#fff;color:#1B5E20;border:none;border-radius:50px;padding:9px 18px;font-family:inherit;font-size:.875rem;font-weight:900;cursor:pointer;">🚀 Start Quest</button>`
        }
        <div style="position:absolute;right:14px;bottom:14px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:3px 10px;font-size:.72rem;font-weight:900;color:#FFD54F;">+50 XP ⚡</div>
      </div>`;
  } catch(e) { console.warn('renderTodaysQuest:', e.message); }
}

// ── CELEBRATION OVERLAY ──────────────────────────────────────
function showCelebration(score, total, xp, wsId) {
  const existing = document.getElementById('celebOverlay');
  if (existing) existing.remove();

  const pct   = total > 0 ? Math.round(score/total*100) : 0;
  const emoji = pct===100?'🏆':pct>=80?'🎉':pct>=60?'😊':'💪';
  const title = pct===100?'Perfect!':pct>=80?'Excellent!':pct>=60?'Good job!':'Keep going!';
  const color = pct>=80?'#1565C0':pct>=60?'#2E7D32':'#E65100';

  if (!document.getElementById('celebStyle')) {
    const s = document.createElement('style');
    s.id = 'celebStyle';
    s.textContent = '@keyframes celebPop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }

  const overlay = document.createElement('div');
  overlay.id = 'celebOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:999;';

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:28px 22px;text-align:center;max-width:300px;width:90%;animation:celebPop .4s cubic-bezier(.34,1.56,.64,1);">
      <div style="font-size:3.5rem;margin-bottom:8px;">${emoji}</div>
      <div style="font-size:1.5rem;font-weight:900;color:${color};margin-bottom:6px;">${title}</div>
      <div style="font-size:2rem;font-weight:900;color:#1A1A2E;margin-bottom:4px;">${score}/${total} correct</div>
      <div style="font-size:1rem;font-weight:800;color:#F57F17;margin-bottom:14px;">+${xp} XP earned! ⚡</div>
      ${pct>=60 ? `<div style="background:linear-gradient(135deg,#F57F17,#E65100);border-radius:12px;padding:10px 14px;color:#fff;font-size:.82rem;font-weight:800;margin-bottom:14px;line-height:1.5;">🔥 Play again for <strong>DOUBLE XP!</strong><br>Next round: +${xp*2} XP ⚡</div>` : ''}
      <div style="display:flex;gap:8px;">
        <button onclick="document.getElementById('celebOverlay').remove()" style="flex:1;padding:11px;border:2px solid #E0E0E0;border-radius:12px;background:#fff;font-family:inherit;font-size:.82rem;font-weight:800;cursor:pointer;color:#555;">🏠 Home</button>
        <button onclick="document.getElementById('celebOverlay').remove();location.href='worksheets.html#${wsId||''}'" style="flex:2;padding:11px;border:none;border-radius:12px;background:linear-gradient(135deg,#1565C0,#6A1B9A);color:#fff;font-family:inherit;font-size:.875rem;font-weight:900;cursor:pointer;">${pct>=60?'🔄 Play Again (2× XP!)':'🔄 Try Again'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  if (pct >= 60) spawnConfetti();
}

// Check for celebration data when returning from worksheets
window.addEventListener('load', function() {
  const raw = sessionStorage.getItem('celebrationData');
  if (raw) {
    sessionStorage.removeItem('celebrationData');
    try {
      const d = JSON.parse(raw);
      setTimeout(() => showCelebration(d.score, d.total, d.xp, d.wsId), 800);
    } catch(e) {}
  }
});

// ── VOICE READING FOR TINY CHAMPS (age 5-7) ─────────────────
function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.85;
  utt.pitch = 1.1;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang.startsWith('en')) || null;
  if (v) utt.voice = v;
  window.speechSynthesis.speak(utt);
}

function setupVoiceReading(group) {
  if (group !== 'tiny') return;
  setTimeout(() => {
    const nameEl = document.querySelector('.tiny-name, .hero-name');
    const name = nameEl ? nameEl.textContent.replace(/[🌟✨]/g,'').trim() : '';
    const streakEl = document.querySelector('.tiny-streak-num, .streak-num');
    const streak = streakEl ? parseInt(streakEl.textContent)||0 : 0;
    const msg = 'Welcome back' + (name ? ', ' + name.split(' ')[0] : '') + '! ' +
      (streak > 0 ? 'You have a ' + streak + ' day streak. Amazing!' : "Ready to do some maths magic today?");
    speakText(msg);
  }, 1200);
}

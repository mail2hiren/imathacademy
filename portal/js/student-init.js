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
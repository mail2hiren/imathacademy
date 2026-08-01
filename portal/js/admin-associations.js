async function markPaid(id) {
  try {
    const { error } = await sb.from('fees').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    toast('✅ Marked as paid!', 'success');
    await loadAll(); renderFees();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

// ── ASSOCIATION TAB SWITCHER ────────────────────────────────
function switchAssocTab(type) {
  ['parent','student','teacher','program'].forEach(t => {
    document.getElementById(`assoc-${t}-section`).style.display = t === type ? 'block' : 'none';
    const btn = document.getElementById(`assoc-tab-btn-${t}`);
    btn.className = t === type ? 'btn btn-green' : 'btn btn-ghost';
  });
  if (type === 'parent')  renderAssociations();
  if (type === 'student') renderStudentBatches();
  if (type === 'teacher') renderTeacherBatches();
  if (type === 'program') renderPrograms();
}

// ── STUDENT ↔ BATCH ─────────────────────────────────────────
async function assignStudentBatch() {
  const sid = document.getElementById('sb-student').value;
  const bid = document.getElementById('sb-batch').value;
  if (!sid || !bid) { toast('Please select both student and batch', 'error'); return; }
  try {
    // Remove from existing batch first
    await sb.from('batch_students').delete().eq('student_id', sid);
    const { error } = await sb.from('batch_students').insert({ batch_id: bid, student_id: sid });
    if (error) throw error;
    toast('✅ Student assigned to batch!', 'success');
    await loadAll();
    renderStudentBatches();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function renderStudentBatches() {
  const tbody = document.getElementById('studentBatchTbody');
  // Build from allBatches + allStudents
  const rows = [];
  allBatches.forEach(b => {
    (b.batch_students || []).forEach(bs => {
      const student = allStudents.find(s => s.id === bs.student_id);
      if (student) rows.push({ student, batch: b });
    });
  });
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No student-batch assignments yet</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="av av-g" style="width:28px;height:28px;font-size:.7rem">${initials(r.student.full_name)}</div>
        <div>
          <div style="font-weight:800">${r.student.full_name}</div>
          <div style="font-size:.7rem;color:var(--text3)">${r.student.email}</div>
        </div>
      </div>
    </td>
    <td style="font-weight:800">${r.batch.name}</td>
    <td><span class="pill ${r.batch.program==='vedic'?'pill-p':'pill-b'}">${r.batch.program||'—'}</span></td>
    <td>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)"
        onclick="removeStudentFromBatch('${r.student.id}','${r.batch.id}','${r.student.full_name}','${r.batch.name}')">
        Remove
      </button>
    </td>
  </tr>`).join('');
}

async function removeStudentFromBatch(sid, bid, sname, bname) {
  showConfirm(`Remove ${sname} from ${bname}?`, 'Student will no longer be in this batch.', async () => {
    try {
      const { error } = await sb.from('batch_students').delete().eq('student_id', sid).eq('batch_id', bid);
      if (error) throw error;
      toast('✅ Removed from batch', 'success');
      await loadAll(); renderStudentBatches();
    } catch(err) { toast('❌ ' + err.message, 'error'); }
  });
}

// ── TEACHER ↔ BATCH ─────────────────────────────────────────
async function assignTeacherBatch() {
  const tid = document.getElementById('tb-teacher').value;
  const bid = document.getElementById('tb-batch').value;
  if (!tid || !bid) { toast('Please select both teacher and batch', 'error'); return; }
  try {
    const { error } = await sb.from('batches').update({ teacher_id: tid }).eq('id', bid);
    if (error) throw error;
    toast('✅ Teacher assigned to batch!', 'success');
    await loadAll(); renderTeacherBatches();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

function renderTeacherBatches() {
  const tbody = document.getElementById('teacherBatchTbody');
  const assigned = allBatches.filter(b => b.teacher_id);
  if (!assigned.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No teacher-batch assignments yet</td></tr>';
    return;
  }
  tbody.innerHTML = assigned.map(b => {
    const teacher = allTeachers.find(t => t.id === b.teacher_id);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="av av-t" style="width:28px;height:28px;font-size:.7rem">${initials(teacher?.full_name||'?')}</div>
          <div style="font-weight:800">${teacher?.full_name||'Unknown'}</div>
        </div>
      </td>
      <td style="font-weight:800">${b.name}</td>
      <td><span style="font-weight:800">${b.batch_students?.length||0}</span> students</td>
      <td>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)"
          onclick="removeTeacherFromBatch('${b.id}','${b.name}')">
          Remove
        </button>
      </td>
    </tr>`;
  }).join('');
}

async function removeTeacherFromBatch(bid, bname) {
  showConfirm(`Remove teacher from ${bname}?`, 'Batch will have no assigned teacher.', async () => {
    try {
      const { error } = await sb.from('batches').update({ teacher_id: null }).eq('id', bid);
      if (error) throw error;
      toast('✅ Teacher removed from batch', 'success');
      await loadAll(); renderTeacherBatches();
    } catch(err) { toast('❌ ' + err.message, 'error'); }
  });
}

// ── STUDENT ↔ PROGRAM ────────────────────────────────────────
async function assignProgram() {
  const sid     = document.getElementById('sp-student').value;
  const program = document.getElementById('sp-program').value;
  const level   = parseInt(document.getElementById('sp-level').value);
  if (!sid) { toast('Please select a student', 'error'); return; }
  try {
    const { error } = await sb.from('users').update({ program, current_level: level }).eq('id', sid);
    if (error) throw error;
    toast('✅ Program updated!', 'success');
    await loadAll(); renderPrograms();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

function renderPrograms() {
  const tbody = document.getElementById('programTbody');
  if (!allStudents.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No students yet</td></tr>';
    return;
  }
  tbody.innerHTML = allStudents.map(s => `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="av av-g" style="width:28px;height:28px;font-size:.7rem">${initials(s.full_name)}</div>
        <div>
          <div style="font-weight:800">${s.full_name}</div>
          <div style="font-size:.7rem;color:var(--text3)">${s.email}</div>
        </div>
      </div>
    </td>
    <td><span class="pill ${s.program==='vedic'?'pill-p':'pill-b'}">${s.program||'—'}</span></td>
    <td>
        <span style="font-weight:800">L${s.current_level ?? 0}</span>
        ${s.age_group ? `<div style="font-size:.65rem;margin-top:2px;">${s.age_group==='tiny'?'🐣 Tiny':s.age_group==='rising'?'🌟 Rising':'🚀 Champions'}</div>` : s.date_of_birth ? `<div style="font-size:.65rem;color:var(--text3);margin-top:2px;">auto group</div>` : ''}
      </td>
    <td>
      <button class="btn btn-blue btn-sm" onclick="quickChangeProgram('${s.id}','${s.full_name}','${s.program||'abacus'}',${s.current_level ?? 0})">
        ✏️ Change
      </button>
    </td>
  </tr>`).join('');
}

function quickChangeProgram(id, name, currentProgram, currentLevel) {
  document.getElementById('sp-student').value = id;
  document.getElementById('sp-program').value = currentProgram;
  document.getElementById('sp-level').value   = currentLevel;
  toast(`Selected ${name} — update program above`, 'info');
}

// ── AUTH ────────────────────────────────────────────────────
// ── SUBSCRIPTIONS ───────────────────────────────────────────

// SUB_PLANS lives in admin-core.js, which loads first and has the
// complete set including the annual plan. Redeclaring a const that an
// earlier script already declared makes the browser throw for this
// entire file, so nothing in it gets defined — which is what broke
// three of the four association tabs.
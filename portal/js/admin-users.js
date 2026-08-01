function renderStudents() {
  const tbody = document.getElementById('studentsTbody');
  document.getElementById('s-count').textContent = `${allStudents.length} students`;
  if (!allStudents.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No students yet</td></tr>'; return; }
  tbody.innerHTML = allStudents.map(s => {
    const batch = allBatches.find(b => b.batch_students?.some(bs => bs.student_id === s.id));
    return `<tr class="${s.is_active === false ? 'inactive' : ''}">
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="av av-g">${initials(s.full_name)}</div>
          <div>
            <div style="font-weight:800">${s.full_name}</div>
            <div style="font-size:.7rem;color:var(--text3)">${s.email}</div>
            ${s.date_of_birth ? `<div style="font-size:.7rem;color:var(--text3)">DOB: ${new Date(s.date_of_birth).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>` : ''}
          </div>
        </div>
      </td>
      <td><span class="pill ${s.program==='vedic'?'pill-p':'pill-b'}">${s.program||'—'}</span></td>
      <td>
        <span style="font-weight:800">L${s.current_level ?? 0}</span>
        ${s.age_group ? `<div style="font-size:.65rem;margin-top:2px;">${s.age_group==='tiny'?'🐣 Tiny':s.age_group==='rising'?'🌟 Rising':'🚀 Champions'}</div>` : s.date_of_birth ? `<div style="font-size:.65rem;color:var(--text3);margin-top:2px;">auto group</div>` : ''}
      </td>
      <td style="font-size:.82rem;color:var(--text2)">${batch ? batch.name : '—'}</td>
      <td>${statusPill(s.is_active)}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-blue btn-sm" onclick="openEdit('${s.id}')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="resetPwd('${s.email}')">Reset pwd</button>
          <button class="btn btn-ghost btn-sm" style="color:${s.is_active===false?'var(--green)':'var(--red)'}" onclick="toggleActive('${s.id}','${s.full_name}',${s.is_active===false?0:1})">${s.is_active===false?'Reactivate':'Deactivate'}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── RENDER TEACHERS ─────────────────────────────────────────
function renderTeachers() {
  const tbody = document.getElementById('teachersTbody');
  document.getElementById('t-count').textContent = `${allTeachers.length} teachers`;
  if (!allTeachers.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No teachers yet</td></tr>'; return; }
  tbody.innerHTML = allTeachers.map(t => {
    const tBatches = allBatches.filter(b => b.teacher_id === t.id);
    return `<tr class="${t.is_active === false ? 'inactive' : ''}">
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="av av-t">${initials(t.full_name)}</div>
          <div style="font-weight:800">${t.full_name}</div>
        </div>
      </td>
      <td style="font-size:.82rem;color:var(--text2)">${t.email}</td>
      <td><span style="font-weight:800">${tBatches.length}</span> <span style="color:var(--text3);font-size:.78rem">batch${tBatches.length!==1?'es':''}</span></td>
      <td>${statusPill(t.is_active)}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-blue btn-sm" onclick="openEdit('${t.id}')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="resetPwd('${t.email}')">Reset pwd</button>
          <button class="btn btn-ghost btn-sm" style="color:${t.is_active===false?'var(--green)':'var(--red)'}" onclick="toggleActive('${t.id}','${t.full_name}',${t.is_active===false?0:1})">${t.is_active===false?'Reactivate':'Deactivate'}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── RENDER PARENTS ──────────────────────────────────────────
function renderParents() {
  const tbody = document.getElementById('parentsTbody');
  document.getElementById('p-count').textContent = `${allParents.length} parents`;
  if (!allParents.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No parents yet</td></tr>'; return; }
  tbody.innerHTML = allParents.map(p => `<tr class="${p.is_active === false ? 'inactive' : ''}">
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="av av-o">${initials(p.full_name)}</div>
        <div style="font-weight:800">${p.full_name}</div>
      </div>
    </td>
    <td style="font-size:.82rem;color:var(--text2)">${p.email}</td>
    <td style="font-size:.82rem;color:var(--text2)">${p.phone||'—'}</td>
    <td>${statusPill(p.is_active)}</td>
    <td>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-blue btn-sm" onclick="openEdit('${p.id}')">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="resetPwd('${p.email}')">Reset pwd</button>
        <button class="btn btn-ghost btn-sm" style="color:${p.is_active===false?'var(--green)':'var(--red)'}" onclick="toggleActive('${p.id}','${p.full_name}',${p.is_active===false?0:1})">${p.is_active===false?'Reactivate':'Deactivate'}</button>
      </div>
    </td>
  </tr>`).join('');
}

// ── RENDER BATCHES ──────────────────────────────────────────
function renderBatches() {
  const tbody = document.getElementById('batchesTbody');
  if (!allBatches.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No batches yet</td></tr>'; return; }
  tbody.innerHTML = allBatches.map(b => `<tr>
    <td style="font-weight:800">${b.name}</td>
    <td><span class="pill ${b.program==='vedic'?'pill-p':'pill-b'}">${b.program||'—'}</span></td>
    <td style="font-size:.82rem">${b.users?.full_name || '—'}</td>
    <td><span style="font-weight:800">${b.batch_students?.length||0}</span> students</td>
    <td style="font-size:.82rem;color:var(--text2)">${b.schedule_json?.text||'—'}</td>
    <td>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteBatch('${b.id}','${b.name}')">Delete</button>
    </td>
  </tr>`).join('');
}

// ── RENDER ASSOCIATIONS ─────────────────────────────────────
async function renderAssociations() {
  const tbody = document.getElementById('assocTbody');
  const { data, error } = await sb.from('parent_student')
    .select('id, users!parent_id(full_name), students:users!student_id(full_name)');
  if (error || !data?.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">No associations yet</td></tr>'; return;
  }
  tbody.innerHTML = data.map(a => `<tr>
    <td style="font-weight:800">${a.users?.full_name||'—'}</td>
    <td style="font-weight:800">${a.students?.full_name||'—'}</td>
    <td><button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="unlinkAssoc('${a.id}')">Unlink</button></td>
  </tr>`).join('');
}

// ── RENDER LESSONS ──────────────────────────────────────────
async function renderLessons() {
  const tbody = document.getElementById('lessonsTbody');
  const { data, error } = await sb.from('lessons').select('*').order('level').order('order_index');
  if (error) { tbody.innerHTML = `<tr><td colspan="6" class="empty">${error.message}</td></tr>`; return; }
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No lessons yet — upload one above</td></tr>'; return; }
  tbody.innerHTML = data.map(l => `<tr>
    <td style="font-weight:800">${l.title}</td>
    <td><span class="pill pill-b">L${l.level}</span></td>
    <td style="font-size:.82rem;color:var(--text2)">${l.topic||'—'}</td>
    <td style="font-size:.82rem;color:var(--text2)">${l.duration||'—'}</td>
    <td><span class="pill ${l.published?'pill-g':'pill-y'}">${l.published?'Published':'Draft'}</span></td>
    <td>
      <div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="togglePublish('${l.id}',${l.published})">${l.published?'Unpublish':'Publish'}</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteLesson('${l.id}','${l.title}')">Delete</button>
      </div>
    </td>
  </tr>`).join('');
}

// ── RENDER FEES ─────────────────────────────────────────────
function renderFees() {
  const paid    = allFees.filter(f => f.status === 'paid').reduce((s,f) => s+f.amount, 0);
  const pending = allFees.filter(f => f.status === 'pending').length;
  const overdue = allFees.filter(f => f.status === 'overdue').length;
  document.getElementById('fees-collected').textContent = `₹${paid.toLocaleString('en-IN')}`;
  document.getElementById('fees-pending').textContent   = pending;
  document.getElementById('fees-overdue').textContent   = overdue;

  const tbody = document.getElementById('feesTbody');
  if (!allFees.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No fee records</td></tr>'; return; }
  tbody.innerHTML = allFees.map(f => `<tr>
    <td style="font-weight:800">${f.users?.full_name||'—'}</td>
    <td>₹${f.amount?.toLocaleString('en-IN')||'—'}</td>
    <td style="font-size:.82rem">${fmt(f.due_date)}</td>
    <td><span class="pill ${f.status==='paid'?'pill-g':f.status==='overdue'?'pill-r':'pill-y'}">${f.status||'—'}</span></td>
    <td>
      ${f.status !== 'paid'
        ? `<button class="btn btn-green btn-sm" onclick="markPaid('${f.id}')">Mark paid</button>`
        : '<span style="color:var(--text3);font-size:.78rem">Paid</span>'
      }
    </td>
  </tr>`).join('');
}

// ── EDIT USER ───────────────────────────────────────────────
function openEdit(id) {
  const user = [...allStudents, ...allTeachers, ...allParents].find(u => u.id === id);
  if (!user) return;
  document.getElementById('edit-id').value    = user.id;
  document.getElementById('edit-role').value  = user.role;
  document.getElementById('edit-name').value  = user.full_name || '';
  document.getElementById('edit-email').value = user.email || '';
  document.getElementById('edit-phone').value = user.phone || '';
  document.getElementById('editModalTitle').textContent = `Edit ${user.role}`;
  const isStudent = user.role === 'student';
  document.getElementById('edit-student-fields').style.display = isStudent ? 'block' : 'none';
  if (isStudent) {
    document.getElementById('edit-program').value = user.program || 'abacus';
    document.getElementById('edit-level').value   = user.current_level ?? 0;
    document.getElementById('edit-mode').value    = user.mode || 'online';
  }
  openModal('editModal');
}

async function saveEdit() {
  const id    = document.getElementById('edit-id').value;
  const role  = document.getElementById('edit-role').value;
  const name  = document.getElementById('edit-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  if (!name || !email) { toast('Name and email are required', 'error'); return; }
  const btn = document.getElementById('saveEditBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const updates = { full_name: name, email, phone: phone || null };
    if (role === 'student') {
      updates.program       = document.getElementById('edit-program').value;
      updates.current_level = parseInt(document.getElementById('edit-level').value);
      updates.mode          = document.getElementById('edit-mode').value;
    }
    const { error } = await sb.from('users').update(updates).eq('id', id);
    if (error) throw error;
    toast('✅ User updated!', 'success');
    closeModal('editModal');
    await loadAll();
    if (role === 'student') renderStudents();
    if (role === 'teacher') renderTeachers();
    if (role === 'parent')  renderParents();
  } catch(err) {
    toast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save changes';
  }
}

// ── TOGGLE ACTIVE ───────────────────────────────────────────
async function toggleActive(id, name, currentState) {
  const isActive = parseInt(currentState) === 1;
  const newState = !isActive;
  const action   = isActive ? 'Deactivate' : 'Reactivate';
  // Use browser native confirm — no custom dialog issues
  if (!window.confirm(`${action} ${name}?

${isActive ? 'They will not be able to login until reactivated.' : 'They will be able to login again.'}`)) return;
  try {
    const { error } = await sb.from('users').update({ is_active: newState }).eq('id', id);
    if (error) throw error;
    toast(`✅ ${name} ${isActive ? 'deactivated' : 'reactivated'}!`, 'success');
    await loadAll();
    if (currentTab === 'students') renderStudents();
    if (currentTab === 'teachers') renderTeachers();
    if (currentTab === 'parents')  renderParents();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

// ── RESET PASSWORD ──────────────────────────────────────────
function resetPwd(email) {
  showConfirm('Reset password?', `Send a password reset email to ${email}?`, async () => {
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://imathacademy.net/login.html' });
      if (error) throw error;
      toast(`✅ Reset email sent to ${email}`, 'success');
    } catch(err) { toast('❌ ' + err.message, 'error'); }
  }, 'Send email', false);
}

// ── BATCH OPERATIONS ────────────────────────────────────────
async function createBatch() {
  const name     = document.getElementById('b-name').value.trim();
  const program  = document.getElementById('b-program').value;
  const level    = document.getElementById('b-level') ? document.getElementById('b-level').value : null;
  const teacher  = document.getElementById('b-teacher').value;
  const schedule = document.getElementById('b-schedule').value.trim();
  const meet     = document.getElementById('b-meet').value.trim();
  if (!name) { toast('Batch name is required', 'error'); return; }
  const btn = document.getElementById('createBatchBtn');
  btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const { error } = await sb.from('batches').insert({
      name,
      program_id:    program  || null,
      level_id:      level    || null,
      teacher_id:    teacher  || null,
      schedule_json: schedule ? { text: schedule } : null,
      meet_link:     meet     || null,
      is_active:     true,
    });
    if (error) throw error;
    toast(`✅ Batch "${name}" created!`, 'success');
    ['b-name','b-schedule','b-meet'].forEach(id => { document.getElementById(id).value = ''; });
    await loadAll();
    renderBatches();
  } catch(err) {
    toast('❌ ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '➕ Create batch';
  }
}

async function deleteBatch(id, name) {
  showConfirm(`Delete batch "${name}"?`, 'This will remove all student assignments from this batch.', async () => {
    try {
      await sb.from('batch_students').delete().eq('batch_id', id);
      const { error } = await sb.from('batches').delete().eq('id', id);
      if (error) throw error;
      toast(`✅ Batch deleted`, 'success');
      await loadAll(); renderBatches();
    } catch(err) { toast('❌ ' + err.message, 'error'); }
  });
}

async function addStudentToBatch() {
  const sid = document.getElementById('abs-student').value;
  const bid = document.getElementById('abs-batch').value;
  if (!sid || !bid) { toast('Please select both student and batch', 'error'); return; }
  try {
    const { error } = await sb.from('batch_students').insert({ batch_id: bid, student_id: sid });
    if (error) {
      if (error.message.includes('duplicate')) throw new Error('Student is already in this batch');
      throw error;
    }
    toast('✅ Student added to batch!', 'success');
    await loadAll(); renderBatches();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

// ── ASSOCIATIONS ────────────────────────────────────────────
async function linkParentStudent() {
  const pid = document.getElementById('assoc-parent').value;
  const sid = document.getElementById('assoc-student').value;
  if (!pid || !sid) { toast('Please select both parent and student', 'error'); return; }
  try {
    const { error } = await sb.from('parent_student').insert({ parent_id: pid, student_id: sid });
    if (error) throw error;
    toast('✅ Parent linked to student!', 'success');
    renderAssociations();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function unlinkAssoc(id) {
  showConfirm('Unlink parent and student?', 'This removes the parent-student connection.', async () => {
    try {
      const { error } = await sb.from('parent_student').delete().eq('id', id);
      if (error) throw error;
      toast('✅ Unlinked', 'success');
      renderAssociations();
    } catch(err) { toast('❌ ' + err.message, 'error'); }
  });
}

// ── LESSONS ─────────────────────────────────────────────────
// ── ENQUIRIES ────────────────────────────────────────────────
async function loadEnquiries() {
  try {
    const { data, error } = await sb
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allEnquiries = data || [];
    renderEnquiries(allEnquiries);
    document.getElementById('enq-count').textContent = allEnquiries.length;
    const today = new Date().toDateString();
    const todayCount = allEnquiries.filter(e =>
      new Date(e.created_at).toDateString() === today
    ).length;
    document.getElementById('enq-today').textContent = todayCount;
  } catch(err) {
    console.error('loadEnquiries error:', err);
    toast('Error loading enquiries: ' + err.message, 'error');
  }
}

function renderEnquiries(list) {
  const tbody = document.getElementById('enqTbody');
  if (!tbody) return;
  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No enquiries yet</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(e => {
    const date = new Date(e.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour:'2-digit', minute:'2-digit'
    });
    const statusCls = e.status === 'contacted' ? 'pill-g' : e.status === 'converted' ? 'pill-b' : 'pill-o';
    const statusTxt = e.status === 'contacted' ? '✅ Contacted' : e.status === 'converted' ? '🎉 Converted' : '🆕 New';
    return `<tr>
      <td>
        <div style="font-weight:800">${e.parent_name || '—'}</div>
        <div style="font-size:.72rem;color:var(--text3)">${e.email || ''}</div>
      </td>
      <td style="font-size:.82rem">${e.phone || '—'}</td>
      <td style="font-size:.82rem">${e.child_name || '—'} ${e.child_age ? '(Age '+e.child_age+')' : ''}</td>
      <td style="font-size:.78rem;max-width:180px">${e.message || '—'}</td>
      <td><span class="pill ${statusCls}">${statusTxt}</span></td>
      <td style="font-size:.75rem;color:var(--text3)">${date}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${e.status !== 'contacted' ? `<button class="btn btn-green btn-sm" onclick="markEnquiry('${e.id}','contacted')">Mark contacted</button>` : ''}
          ${e.status !== 'converted' ? `<button class="btn btn-blue btn-sm" onclick="markEnquiry('${e.id}','converted')">Converted</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function markEnquiry(id, status) {
  try {
    const { error } = await sb.from('enquiries').update({ status }).eq('id', id);
    if (error) throw error;
    const idx = allEnquiries.findIndex(e => e.id === id);
    if (idx > -1) allEnquiries[idx].status = status;
    renderEnquiries(allEnquiries);
    toast('Enquiry marked as ' + status, 'success');
  } catch(err) {
    toast('Error: ' + err.message, 'error');
  }
}

function filterEnquiries(status, btn) {
  document.querySelectorAll('.enq-filter').forEach(b => b.classList.replace('btn-blue','btn-ghost'));
  if (btn) { btn.classList.replace('btn-ghost','btn-blue'); }
  const filtered = status === 'all' ? allEnquiries : allEnquiries.filter(e => e.status === status);
  renderEnquiries(filtered);
}

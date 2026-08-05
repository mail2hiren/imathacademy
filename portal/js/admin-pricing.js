async function loadPricing() {
  const { data, error } = await sb.from('pricing_plans')
    .select('*')
    .order('country_code')
    .order('duration_days');
  if (error) { toast('Error loading pricing: ' + error.message, 'error'); return; }
  console.log('Pricing data loaded:', data);
  allPricing = data || [];
  if (!allPricing.length) {
    var pg = document.getElementById('pricingGrid');
    if (pg) {
      pg.innerHTML = '';
      var emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'padding:20px;text-align:center;color:#888;';
      emptyDiv.innerHTML = '<div style="font-size:2rem;margin-bottom:8px;">💰</div><div style="font-weight:800;">No pricing data found</div>';
      pg.appendChild(emptyDiv);
    }
    return;
  }
  renderPricingGrid('IN');
}

function switchPricingCountry(code, btn) {
  currentPricingCountry = code;
  document.querySelectorAll('.pricing-tab').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderPricingGrid(code);
}

function renderPricingGrid(countryCode) {
  var grid = document.getElementById('pricingGrid');
  if (!grid) return;
  var country = COUNTRIES[countryCode] || {};
  var plans = allPricing.filter(function(p) { return p.country_code === countryCode; });
  console.log('Rendering', plans.length, 'plans for', countryCode);

  grid.innerHTML = '';

  if (!plans.length) {
    grid.innerHTML = '<div style="padding:20px;text-align:center;color:#888;"><div style="font-size:2rem">💰</div><div>No plans for ' + (country.name||countryCode) + '</div></div>';
    return;
  }

  plans.forEach(function(p) {
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border:2px solid #DEE2F5;border-radius:14px;padding:18px;margin-bottom:12px;';

    // Header row
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px;';

    var icon = document.createElement('span');
    icon.style.fontSize = '1.5rem';
    icon.textContent = PLAN_ICONS[p.plan_code] || '💳';

    var info = document.createElement('div');
    var planName = document.createElement('div');
    planName.style.cssText = 'font-size:.95rem;font-weight:800;';
    planName.textContent = PLAN_NAMES[p.plan_code] || p.plan_name;
    var planSub = document.createElement('div');
    planSub.style.cssText = 'font-size:.72rem;color:#888;';
    planSub.textContent = p.duration_days + ' days · ' + (country.flag||'') + ' ' + (country.name||countryCode);
    info.appendChild(planName);
    info.appendChild(planSub);

    var badge = document.createElement('span');
    badge.style.cssText = 'margin-left:auto;padding:3px 10px;border-radius:20px;font-size:.68rem;font-weight:800;background:' + (p.is_active ? '#E8F5E9' : '#FFEBEE') + ';color:' + (p.is_active ? '#2E7D32' : '#C62828') + ';';
    badge.textContent = p.is_active ? 'Active' : 'Inactive';

    hdr.appendChild(icon);
    hdr.appendChild(info);
    hdr.appendChild(badge);
    card.appendChild(hdr);

    // Fields grid
    var fieldsGrid = document.createElement('div');
    fieldsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;';

    function makeField(labelText, inputId, value, step) {
      var fg = document.createElement('div');
      var lbl = document.createElement('label');
      lbl.htmlFor = inputId;
      lbl.style.cssText = 'display:block;font-size:.68rem;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px;';
      lbl.textContent = labelText;
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.id = inputId;
      inp.value = value;
      inp.step = step || '1';
      inp.min = '0';
      inp.style.cssText = 'width:100%;padding:9px 12px;border:2px solid #DEE2F5;border-radius:10px;font-family:inherit;font-size:.875rem;font-weight:700;outline:none;';
      inp.addEventListener('focus', function() { this.style.borderColor = '#1565C0'; });
      inp.addEventListener('blur',  function() { this.style.borderColor = '#DEE2F5'; });
      fg.appendChild(lbl);
      fg.appendChild(inp);
      return fg;
    }

    fieldsGrid.appendChild(makeField((country.symbol||'') + ' Price (' + (country.code||countryCode) + ')', 'price-' + p.id, p.amount, '0.01'));
    fieldsGrid.appendChild(makeField('₹ Equivalent (INR)', 'inr-' + p.id, p.amount_inr, '1'));
    fieldsGrid.appendChild(makeField('Duration (days)', 'days-' + p.id, p.duration_days, '1'));
    card.appendChild(fieldsGrid);

    // Active toggle
    var toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:12px;';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'active-' + p.id;
    cb.checked = p.is_active;
    var cblbl = document.createElement('label');
    cblbl.htmlFor = 'active-' + p.id;
    cblbl.style.cssText = 'font-size:.82rem;font-weight:700;cursor:pointer;';
    cblbl.textContent = 'Active (show on enrollment page)';
    toggleRow.appendChild(cb);
    toggleRow.appendChild(cblbl);
    card.appendChild(toggleRow);

    grid.appendChild(card);
  });

  // INR note
  var note = document.createElement('div');
  note.style.cssText = 'background:#FFF8E1;border:1.5px solid #FFD54F;border-radius:10px;padding:12px 14px;font-size:.78rem;color:#E65100;margin-top:4px;';
  note.innerHTML = '<strong>⚠️ INR Equivalent</strong> — This is what Razorpay charges in rupees. Update when exchange rates change significantly.';
  grid.appendChild(note);
}


/* The admin sidebar is <aside class="sidebar"> with no id, so
   getElementById('sidebar') returned null and the hamburger did
   nothing at all. It is found by class, and both overlay ids are
   handled because the markup carries one of each. */
function _sidebarEl()  { return document.getElementById('sidebar') || document.querySelector('.sidebar'); }
function _overlayEls() {
  return [document.getElementById('overlay'),
          document.getElementById('sidebarOverlay')].filter(Boolean);
}

function toggleSidebar() {
  var s = _sidebarEl();
  if (!s) return;
  var open = s.classList.toggle('open');
  _overlayEls().forEach(function (o) {
    o.style.display = open ? 'block' : 'none';
    o.classList.toggle('show', open);
  });
}

function closeSidebar() {
  var s = _sidebarEl();
  if (s) s.classList.remove('open');
  _overlayEls().forEach(function (o) {
    o.style.display = 'none';
    o.classList.remove('show');
  });
}


async function savePricing() {
  var plans = allPricing.filter(function(p) { return p.country_code === currentPricingCountry; });
  if (!plans.length) { toast('Nothing to save', 'error'); return; }
  var saveBtn = document.querySelector('[onclick="savePricing()"]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
  try {
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      var amountEl = document.getElementById('price-' + p.id);
      var inrEl    = document.getElementById('inr-'   + p.id);
      var daysEl   = document.getElementById('days-'  + p.id);
      var activeEl = document.getElementById('active-'+ p.id);
      if (!amountEl) continue;
      var upd = {
        amount:        parseFloat(amountEl.value) || 0,
        amount_inr:    parseFloat(inrEl ? inrEl.value : p.amount_inr) || 0,
        duration_days: parseInt(daysEl ? daysEl.value : p.duration_days) || 30,
        is_active:     activeEl ? activeEl.checked : true,
        updated_at:    new Date().toISOString(),
      };
      var { error } = await sb.from('pricing_plans').update(upd).eq('id', p.id);
      if (error) throw error;
      var idx2 = allPricing.findIndex(function(x){ return x.id === p.id; });
      if (idx2 > -1) Object.assign(allPricing[idx2], upd);
    }
    var cname = (COUNTRIES[currentPricingCountry]||{}).name || currentPricingCountry;
    toast('✅ Pricing saved for ' + cname + '!', 'success');
  } catch(err) {
    toast('❌ Error: ' + err.message, 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save All Prices'; }
  }
}

async function init() {
  // Set DOB max date (today) and sensible min (15 years ago)
  const dobInput = document.getElementById('s-dob');
  if (dobInput) {
    const today = new Date();
    dobInput.max = today.toISOString().split('T')[0];
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 15);
    dobInput.min = minDate.toISOString().split('T')[0];
  }
  document.getElementById('topbarDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = '../../login.html'; return; }
    const { data: profile } = await sb.from('users').select('full_name, role').eq('id', session.user.id).single();
    if (!profile || profile.role !== 'admin') { window.location.href = '../../login.html'; return; }
    const name = profile.full_name || 'Admin';
    document.getElementById('adminAv').textContent   = initials(name);
    document.getElementById('adminName').textContent = name;
    await loadAll();
  } catch(err) {
    console.error('Init error:', err);
    if (err?.message?.includes('not authenticated')) window.location.href = '../../login.html';
  }
}

init();

function filterBatchLevels(programId) {
  var abacusGrp = document.getElementById('abacus-levels');
  var vedicGrp  = document.getElementById('vedic-levels');
  var levelSel  = document.getElementById('b-level');
  if (!abacusGrp || !vedicGrp) return;
  if (programId === '503089d2-3d04-4071-8200-b411d0429ae6') {
    abacusGrp.style.display = '';
    vedicGrp.style.display  = 'none';
  } else if (programId === '237e82b5-212c-49be-98fb-8561f33624e0') {
    abacusGrp.style.display = 'none';
    vedicGrp.style.display  = '';
  } else {
    abacusGrp.style.display = '';
    vedicGrp.style.display  = '';
  }
  if (levelSel) levelSel.value = '';
}


// ── PRICING MANAGER ──────────────────────────────────────────
var allPricing = [];
var currentPricingCountry = 'IN';

const COUNTRIES = {
  IN: { name: 'India',    flag: '🇮🇳', symbol: '₹',   code: 'INR' },
  US: { name: 'USA',      flag: '🇺🇸', symbol: '$',   code: 'USD' },
  AE: { name: 'UAE',      flag: '🇦🇪', symbol: 'AED', code: 'AED' },
  GB: { name: 'UK',       flag: '🇬🇧', symbol: '£',   code: 'GBP' },
};

const PLAN_ICONS = {
  monthly:    '📅',
  halfyearly: '📆',
  annual:     '🗓️',
};

const PLAN_NAMES = {
  monthly:    'Monthly',
  halfyearly: 'Half-yearly',
  annual:     'Annual',
};
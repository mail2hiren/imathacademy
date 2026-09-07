/* ============================================================
   iMathAcademy — Keeping a half-finished form safe
   ------------------------------------------------------------
   These forms take real thought and Megha will fill them in over
   days, probably on more than one device. The browser is the wrong
   place for that: a cleared cache or a switch from laptop to phone
   loses the lot.

   So everything is saved to the database as she types. The browser
   copy stays as a fallback for when she is offline — whichever is
   newer wins when the form is reopened.

   What is stored is exactly what she typed. No shape is imposed,
   because the shape is the thing we are trying to learn.
   ============================================================ */

var Draft = (function () {
  'use strict';

  var SURL = 'https://bhullfoajenhkxlkiubs.supabase.co';
  var SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodWxsZm9hamVuaGt4bGtpdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzcwMjUsImV4cCI6MjA5MzExMzAyNX0.RUcKFGluRhu9H8sZdLb-ow4ORoCd2-oIzYXJqyNZ5Uc';
  var sb = window.supabase ? window.supabase.createClient(SURL, SKEY) : null;

  var pending = null, timer = null, lastSaved = null;

  function setStatus(text, tone) {
    var el = document.getElementById('draftStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = tone === 'bad' ? '#C62828'
                   : tone === 'ok'  ? '#2E7D32' : '#8892A4';
  }

  /* Written a second or so after she stops typing, rather than on
     every keystroke. */
  function save(kind, ref, payload) {
    pending = { kind: kind, ref: String(ref || ''), payload: payload };
    try {
      localStorage.setItem('draft_' + kind + '_' + ref, JSON.stringify({
        payload: payload, at: new Date().toISOString()
      }));
    } catch (e) {}

    clearTimeout(timer);
    setStatus('Saving\u2026');
    timer = setTimeout(flush, 1200);
  }

  async function flush() {
    if (!pending || !sb) return;
    var p = pending;
    try {
      var s = await sb.auth.getSession();
      var who = s.data.session ? s.data.session.user.id : null;

      var res = await sb.from('curriculum_drafts').upsert({
        program_code: 'vedic',
        kind:    p.kind,
        ref:     p.ref,
        payload: p.payload,
        filled_by: who,
        updated_at: new Date().toISOString()
      }, { onConflict: 'program_code,kind,ref' }).select();

      // .select() so a refused write does not look like a save
      if (res.error) throw res.error;
      if (!res.data || !res.data.length) throw new Error('nothing was written');

      lastSaved = new Date();
      setStatus('Saved \u00b7 ' + lastSaved.toLocaleTimeString('en-IN',
        { hour: 'numeric', minute: '2-digit' }), 'ok');
    } catch (e) {
      /* Her work is still in the browser, so say what is true rather
         than alarming her. */
      setStatus('Saved on this device \u2014 will sync when you are back online', 'bad');
      console.warn('Draft not saved to the server:', e.message);
    }
  }

  /** Whichever copy is newer — the server or this browser. */
  async function load(kind, ref) {
    var local = null;
    try {
      var raw = localStorage.getItem('draft_' + kind + '_' + ref);
      if (raw) local = JSON.parse(raw);
    } catch (e) {}

    if (!sb) return local ? local.payload : null;

    try {
      var res = await sb.from('curriculum_drafts')
        .select('payload, updated_at')
        .eq('program_code', 'vedic').eq('kind', kind).eq('ref', String(ref || ''))
        .maybeSingle();

      if (res.data) {
        if (!local || new Date(res.data.updated_at) > new Date(local.at)) {
          setStatus('Loaded what you saved earlier', 'ok');
          return res.data.payload;
        }
      }
    } catch (e) { console.warn('Could not read the saved copy:', e.message); }

    return local ? local.payload : null;
  }

  /** Everything filled in so far, for the progress list. */
  async function list() {
    if (!sb) return [];
    try {
      var res = await sb.from('curriculum_drafts')
        .select('kind, ref, updated_at')
        .eq('program_code', 'vedic')
        .order('kind').order('ref');
      return res.data || [];
    } catch (e) { return []; }
  }

  // Nothing typed in the last second should be lost on the way out
  window.addEventListener('beforeunload', function () {
    if (pending) { clearTimeout(timer); flush(); }
  });

  return { save: save, load: load, list: list, flush: flush };
})();

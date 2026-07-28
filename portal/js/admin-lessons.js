function getVideoId(url) {
  if (!url) return null;
  // Handles: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/shorts\/([^?&\s]+)/,
    /youtube\.com\/v\/([^?&\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function previewLesson() {
  const vid = getVideoId(document.getElementById('l-url').value);
  if (!vid) { toast('Enter a valid YouTube URL first', 'error'); return; }
  document.getElementById('l-iframe').src = `https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1&fs=1&playsinline=1`;
  document.getElementById('l-preview').style.display = 'block';
}

async function saveLesson(publish) {
  const title    = document.getElementById('l-title').value.trim();
  const url      = document.getElementById('l-url').value.trim();
  const level    = parseInt(document.getElementById('l-level').value);
  const topic    = document.getElementById('l-topic').value;
  const duration = document.getElementById('l-duration').value.trim();
  const desc     = document.getElementById('l-desc').value.trim();
  if (!title) { toast('Lesson title is required', 'error'); return; }
  if (!url || !getVideoId(url)) { toast('Please enter a valid YouTube URL', 'error'); return; }
  try {
    const { error } = await sb.from('lessons').insert({
      title, video_url: url, level, topic,
      duration: duration || null, order_index: 1,
      description: desc || null, published: publish,
    });
    if (error) throw error;
    toast(publish ? `✅ "${title}" published!` : `💾 "${title}" saved as draft`, 'success');
    ['l-title','l-url','l-duration','l-desc'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('l-preview').style.display = 'none';
    document.getElementById('l-iframe').src = '';
    renderLessons();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function togglePublish(id, current) {
  try {
    const { error } = await sb.from('lessons').update({ published: !current }).eq('id', id);
    if (error) throw error;
    toast(current ? '📝 Moved to drafts' : '✅ Published!', 'success');
    renderLessons();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function deleteLesson(id, title) {
  showConfirm(`Delete "${title}"?`, 'This cannot be undone.', async () => {
    try {
      const { error } = await sb.from('lessons').delete().eq('id', id);
      if (error) throw error;
      toast('Lesson deleted', 'info');
      renderLessons();
    } catch(err) { toast('❌ ' + err.message, 'error'); }
  });
}

// ── FEES ────────────────────────────────────────────────────
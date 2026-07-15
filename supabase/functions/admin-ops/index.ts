import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization') || '';
    const userToken  = authHeader.replace('Bearer ', '');
    
    const anonSb = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '');
    const { data: { user }, error: authErr } = await anonSb.auth.getUser(userToken);
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

    const adminSb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check user is admin
    const { data: profile } = await adminSb.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

    const body   = await req.json();
    const action = body.action;

    // ── CREATE BATCH ──────────────────────────────────────
    if (action === 'create_batch') {
      const { name, program_id, teacher_id, schedule_json, meet_link } = body;
      if (!name) return new Response(JSON.stringify({ error: 'Batch name required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
      
      const { data, error } = await adminSb.from('batches').insert({
        name,
        program_id:    program_id    || null,
        teacher_id:    teacher_id    || null,
        schedule_json: schedule_json || null,
        meet_link:     meet_link     || null,
        is_active:     true,
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, batch: data }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // ── UPDATE BATCH ──────────────────────────────────────
    if (action === 'update_batch') {
      const { id, ...updates } = body;
      delete updates.action;
      const { data, error } = await adminSb.from('batches').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, batch: data }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // ── DELETE BATCH ──────────────────────────────────────
    if (action === 'delete_batch') {
      const { id } = body;
      const { error } = await adminSb.from('batches').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // ── ADD STUDENT TO BATCH ──────────────────────────────
    if (action === 'add_to_batch') {
      const { batch_id, student_id } = body;
      const { error } = await adminSb.from('batch_students').insert({ batch_id, student_id });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // ── UPDATE FEE ────────────────────────────────────────
    if (action === 'update_fee') {
      const { id, ...updates } = body;
      delete updates.action;
      const { error } = await adminSb.from('fees').update(updates).eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action: ' + action }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

  } catch (err) {
    console.error('admin-ops error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  }
});

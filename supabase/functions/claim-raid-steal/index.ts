import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Browser input deliberately contains no player, defender, placement, or eligibility. */
Deno.serve(async (request) => {
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.clientActionId !== 'string' || typeof body.raidId !== 'string' || typeof body.targetSummonInstanceId !== 'string') return Response.json({ error: 'clientActionId, raidId and targetSummonInstanceId are required.' }, { status: 400 });
  const { data, error } = await client.rpc('claim_raid_steal', { p_raid_id: body.raidId, p_target: body.targetSummonInstanceId, p_action_id: body.clientActionId });
  return error ? Response.json({ error: error.message }, { status: 409 }) : Response.json(data);
});

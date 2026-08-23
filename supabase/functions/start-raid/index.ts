import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Deliberately fail-closed PR09 transport boundary. PR12 supplies authenticated player
 * persistence and wires this handler to the shared Raid authority adapter described in
 * README.md. The request has no attacker/defender/seed/outcome fields by design.
 */
Deno.serve(async (request) => {
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } },
  );
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { clientActionId?: unknown } | null;
  if (!body || typeof body.clientActionId !== 'string' || !body.clientActionId) return Response.json({ error: 'clientActionId is required.' }, { status: 400 });
  return Response.json({ error: 'Raid authority persistence is not enabled in this alpha build.' }, { status: 503 });
});

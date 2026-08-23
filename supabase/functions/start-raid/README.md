# `start-raid` authority boundary

This Edge Function is the production counterpart of the alpha's `RaidAuthority` interface.

1. Read the authenticated user from the Supabase JWT; never accept an attacker ID from the body.
2. Use `economy_actions(user_id, client_action_id)` as the idempotency lock. A completed action returns its stored `RaidResult` unchanged.
3. Re-load and validate every attacker instance belonging to that user, then load the selected defender and its server-owned defense snapshot.
4. Pin both canonical snapshots to the server's current content version, generate a JSON-safe root seed, and call the shared `@psyblr/raid-core` simulation adapter.
5. Persist the authoritative active-round response in `raid_matches` / `raid_rounds` and write it to `economy_actions.result` atomically. After the 2v2, 4v4, and 6v6 rounds are all present, persist the deterministic best-of-three result.

The current alpha deliberately uses the local tutorial implementation while anonymous auth and durable account state are deferred to PR12. The implementation must import the shared Raid simulation/validation adapter; it must not reproduce combat rules in Deno.

# Authoritative functions to implement
- `release-ball`: idempotently consume one ball, select reward server-side, create summon, return reward slot + instance.
- `merge-summons`: lock both parent rows, validate same owner/definition/tier, consume parents, create next-tier result, place result atomically.
- `start-raid`: validate squads, snapshot both sides + content version, generate seed, simulate combat-core, persist rounds/result.
- `claim-raid-steal`: lock raid + target, validate win/eligibility/capacity, transfer ownership and placement atomically.
- `save-defense`: validate per-round uniqueness and ownership before replacing defense rows.

All calls require authenticated user context. Never accept owner/attacker identity from request body as authority.

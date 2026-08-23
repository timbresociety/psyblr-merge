# Authoritative functions to implement
- `release-ball`: idempotently consume one ball, select reward server-side, create summon, return reward slot + instance.
- `merge-summons`: lock both parent rows, validate same owner/definition/tier, consume parents, create next-tier result, place result atomically.
- `start-raid`: validate the active 2/4/6 field, snapshot both sides + content version, generate or reuse the raid-session seed, simulate that one combat round, and persist its authoritative response. Final best-of-three resolution is written after round three.
- `claim-raid-steal`: lock raid + target, validate win/eligibility/capacity, transfer ownership and placement atomically.
- `save-defense`: validate per-round uniqueness and ownership before replacing defense rows.

All calls require authenticated user context. Never accept owner/attacker identity from request body as authority.

`start-raid/README.md` defines the production transaction and idempotency boundary used by PR09's shared Raid authority adapter.

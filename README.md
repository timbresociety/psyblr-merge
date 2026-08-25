# PSYBLR

PSYBLR is a landscape-first incremental anime-style auto battler built around a fixed 6x6 Summon inventory, merging, configurable Pachinko spawning, persistent Campaign progression, and risk-bearing asynchronous Raids.

## Source of truth

Read these before changing gameplay:

1. [`PRODUCT_FINAL.md`](./PRODUCT_FINAL.md) - canonical product and gameplay rules.
2. [`AGENTS.md`](./AGENTS.md) - implementation boundaries and engineering constitution.
3. This file - repository operation only.

If implementation and `PRODUCT_FINAL.md` disagree, the product document wins until an intentional product change updates it.

## Runtime stack

- TypeScript
- PlayCanvas Engine directly, no React gameplay layer
- Vite
- Zod shared contracts
- Supabase Postgres + Edge Functions for authoritative persistence and transactions
- Vitest
- Playwright

`apps/game` is the only gameplay frontend and deployment target.

## Repository map

```text
apps/
└── game/                 Direct PlayCanvas client and game assets

packages/
├── contracts/            Shared schemas and API contracts
│   └── src/catalog.ts    Canonical launch catalog contract
├── game-content/         Versioned static content
├── game-rules/           Pure progression/inventory/formation rules
├── combat-core/          Deterministic automatic combat and event log
├── raid-core/            Deterministic Raid construction and resolution
└── tutorial-core/        Tutorial state rules

supabase/
├── functions/            Privileged server mutations
└── migrations/           Database schema

tests/e2e/                User-path Playwright tests
```

See `AGENTS.md` for the target internal structure under `apps/game/src` as the client is decomposed.

## Launch content contract

The final character sheet plugs into `@psyblr/contracts/catalog`.

It expects:

- exactly 36 active Summon definitions,
- exactly 6 Alliances,
- exactly 6 Summons in each Alliance,
- exactly 10 ordered progression tiers,
- four required skill references per Summon: `basic`, `skill1`, `skill2`, `ultimate`,
- one separate required `passiveId` per Summon,
- exactly one `allianceId` per Summon,
- Alliance thresholds at exactly 2, 4, and 6 deployed Summons.

Tier IDs, tier labels, final Alliance names, stats, skill coefficients, passives, and exact balance values remain content data until the final 36-character sheet locks them.

The current six-character prototype still uses legacy Origin/Combat Function fields, nine hard-coded tiers, nullable later skills, and a Skill-1-only combat path. Do not extend those assumptions. They are migration-only.

## First run

```bash
npm install
cp .env.example .env.local
npm run validate:content
npm run dev
```

The game dev server runs through the `@psyblr/game` Vite workspace on port `5174`.

For the local development authority shim:

```bash
npm run dev:all
```

## Commands

```bash
npm run dev              # Direct PlayCanvas game client
npm run build            # Production build for apps/game
npm run typecheck        # Workspace typecheck
npm run test             # Workspace unit tests
npm run test:e2e         # Playwright user-path tests
npm run validate:content # Validate versioned static content
npm run local-db         # Local development authority shim
```

## Current branch hygiene

Before the current cleanup PR can merge, regenerate `package-lock.json` from the root package manifest. The existing lockfile still records the removed `apps/web` workspace and React-era dependencies.

After regenerating the lockfile, the required verification sequence is:

```bash
npm run validate:content
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Do not mark the cleanup PR ready until these commands pass against the regenerated lockfile.

## Deployment

Vercel builds the root workspace and serves `apps/game/dist`.

Production economy, Campaign progression, and Raid ownership mutations must use server-authoritative gateways. Local simulation, `localStorage`, localhost authority shims, and client randomness are development-only and must never be silent production fallbacks.

Authoritative Campaign and Raid sessions pin a content version when they start so a later content deployment cannot change an in-flight result.

## Content note

Current anime character names and likeness references are prototype placeholders. Commercial content must be licensed or replaced by original IP. Summon identity, stats, Alliance, passive, abilities, tier labels, and assets are deliberately data-driven so replacement does not require a combat rewrite.

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
│   └── src/catalog.ts    Canonical 36-Summon launch catalog contract
├── game-content/         Versioned static content
├── game-rules/           Pure progression/inventory/formation rules
├── combat-core/          Deterministic combat simulator and event log
├── raid-core/            Deterministic Raid construction and resolution
└── tutorial-core/        Tutorial state rules

supabase/
├── functions/            Privileged server mutations
└── migrations/           Database schema

tests/e2e/                User-path Playwright tests
```

See `AGENTS.md` for the target internal structure under `apps/game/src` as the client is decomposed.

## Launch content contract

The final content sheet plugs into `@psyblr/contracts/catalog`.

It expects:

- exactly 36 active Summon definitions,
- exactly 10 ordered progression tiers,
- four required skills per Summon: `basic`, `skill1`, `skill2`, `ultimate`,
- exactly one `allianceId` per Summon,
- Alliance thresholds at exactly 2, 4, and 6 deployed Summons.

The current six-character prototype content still uses legacy Origin/Combat Function fields. Do not extend that taxonomy. It will be cut over when the final 36-character balance sheet is supplied.

## First run

```bash
npm install
cp .env.example .env.local
npm run validate:content
npm run dev
```

The game dev server runs through the `@psyblr/game` Vite workspace, currently on port `5174`.

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

## Deployment

Vercel builds the root workspace and serves `apps/game/dist`.

Production economy, Campaign progression, and Raid ownership mutations must use server-authoritative gateways. Local client simulation is development-only and must never be a silent production fallback.

## Content note

Current anime character names and likeness references are prototype placeholders. Commercial content must be licensed or replaced by original IP. Summon identity, stats, Alliance, abilities, tier labels, and assets are deliberately data-driven so replacement does not require a combat rewrite.

# README.md

# Psyblr Merge

Psyblr Merge is a landscape-first anime-style incremental auto battler built with TypeScript and PlayCanvas.

Players collect Summons through an arcade Spawn Machine, merge duplicates from `F` through `X`, build formations around Alliances, climb a persistent Campaign, configure a dedicated Defense world, and raid other players through deterministic asynchronous PvP.

Combat is fully automatic but designed to feel like a cinematic anime fight sequence rather than a passive result visualization.

---

# Source of Truth

Read these files in this order:

1. [`PRODUCT_FINAL.md`](./PRODUCT_FINAL.md)
   - Canonical gameplay and product rules

2. [`AGENTS.md`](./AGENTS.md)
   - Engineering architecture, authority, migration rules, tests, and contributor constraints

3. `README.md`
   - Setup, commands, repo structure, deployment, and operational guidance

No other root document should compete with these files.

---

# Launch Contract

V1 targets:

- 36 Summon identities
- 6 Alliances
- 6 Summons per Alliance
- 10 tiers:
  - F
  - E
  - D
  - C
  - B
  - A
  - S
  - SS
  - SSS
  - X
- 1 Alliance per Summon
- Basic Attack
- Passive
- Skill 1
- Skill 2
- Ultimate
- Alliance thresholds at 2 / 4 / 6
- 36-cell Battle Camp
- Medal (メダル) Spawn currency
- Dealer Medal generation
- Arcade Spawn Machine
- Illuminati slot protection
- Time Shield
- Persistent Campaign
- Dedicated Defense world
- 3-round Raid
- Raid win/draw/loss
- Cinematic 3D combat presentation

---

# Stack

## Client

- TypeScript
- PlayCanvas
- Vite
- PWA/browser runtime

## Backend

- Supabase
- Postgres
- Server-authoritative mutation and settlement

## Shared Packages

- Contracts
- Game content
- Product rules
- Deterministic combat
- Raid rules
- Tutorial rules

## Testing

- Unit tests
- Content validation
- Playwright E2E

---

# Runtime Rule

There is one production gameplay runtime:

```text
apps/game
```

Do not add a React gameplay app.

Do not reintroduce:

```text
apps/web
@psyblr/web
@playcanvas/react
```

The game is built directly with PlayCanvas and TypeScript.

---

# Repository Layout

Target structure:

```text
.
├── AGENTS.md
├── PRODUCT_FINAL.md
├── README.md
│
├── apps/
│   └── game/
│       ├── public/
│       └── src/
│           ├── bootstrap/
│           ├── state/
│           ├── routing/
│           ├── scenes/
│           │   ├── base/
│           │   ├── campaign/
│           │   ├── defense/
│           │   ├── raid/
│           │   └── opponent-camp/
│           ├── summons/
│           ├── gateways/
│           ├── presentation/
│           │   ├── camera/
│           │   ├── cinematic/
│           │   ├── motion/
│           │   ├── audio/
│           │   └── vfx/
│           ├── ui/
│           └── dev/
│
├── packages/
│   ├── contracts/
│   ├── game-content/
│   ├── game-rules/
│   ├── combat-core/
│   ├── raid-core/
│   └── tutorial-core/
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── tests/
│   └── e2e/
│
├── playwright.config.ts
├── package.json
├── package-lock.json
└── vercel.json
```

---

# Prerequisites

Recommended:

- Node.js current LTS
- npm
- Git
- Supabase CLI for local backend work
- Modern Chromium-based browser

Check:

```bash
node --version
npm --version
git --version
```

---

# Install

```bash
npm install
```

For reproducible CI after the lockfile is current:

```bash
npm ci
```

---

# Development

Start game client:

```bash
npm run dev
```

Equivalent:

```bash
npm run dev:game
```

If the local backend bridge is configured:

```bash
npm run dev:all
```

---

# Build

```bash
npm run build
```

Production deployment targets `apps/game`.

---

# Typecheck

```bash
npm run typecheck
```

Game only:

```bash
npm run typecheck:game
```

---

# Unit Tests

```bash
npm run test
```

---

# Content Validation

```bash
npm run validate:content
```

Production validation must enforce:

```text
36 Summons
6 Alliances
6 Summons per Alliance
10 tiers exactly F/E/D/C/B/A/S/SS/SSS/X
1 Alliance per Summon
1 Basic
1 Passive
1 Skill 1
1 Skill 2
1 Ultimate
2/4/6 Alliance thresholds
valid references
unique IDs
```

---

# E2E

```bash
npm run test:e2e
```

Canonical configuration:

```text
playwright.config.ts
```

Do not add competing root Playwright configs.

---

# Full Local Verification

Before merge:

```bash
npm run validate:content
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

CI should run the equivalent sequence with `npm ci`.

---

# Product Architecture

```text
PRODUCT_FINAL.md
        │
        ▼
shared contracts + content
        │
        ├──────────────┐
        ▼              ▼
   game-rules      combat-core
        │              │
        └──────┬───────┘
               ▼
            gateways
       ┌───────┴────────┐
       ▼                ▼
  apps/game          Supabase
presentation        authority
```

The client presents state.

The server owns durable state and settlement.

---

# World Model

```text
WORLD
├── CAMPAIGN
├── BASE
│   ├── Battle Camp
│   ├── Summon Inspect
│   ├── Dealer
│   └── Spawn Machine
├── DEFENSE
│   ├── Setup
│   ├── Rewards
│   └── Raid History
├── RAID
└── OPPONENT CAMP
```

The Defense Podium is visible in Base but opens the dedicated Defense world.

---

# Key Product Invariants

## Battle Camp

- 6x6
- Exactly 36 usable cells
- No action may create usable Summon #37
- Raid start reserves one free cell

## Merge

- Same identity
- Same tier
- Target survives
- Source consumed
- Tier advances one step
- X is maximum

## Release

Release refunds 50% of F-equivalent Spawn cost, rounded down:

```text
F     0
E     1
D     2
C     4
B     8
A     16
S     32
SS    64
SSS   128
X     256
```

## Alliances

- One Alliance per Summon
- Thresholds 2 / 4 / 6

## Combat

- Fully automatic
- Basic + Passive + Skill 1 + Skill 2 + Ultimate
- Deterministic authoritative simulation
- Cinematic anime-style choreography
- Free 3D camera override
- 1x / 2x / 4x presentation speeds
- Explicit anti-stall Overdrive and Final Collapse

## Power

Product terminology:

```text
Power Level
Summon Power Level
Formation Power Level
Account Power Level
Enemy Power Level
```

---

# Medal (メダル) Economy

Medal is the canonical Spawn currency.

The wallet may exceed 100.

Do not call the economic currency `Ball`.

A gacha ball or capsule may exist only as Spawn Machine presentation.

---

# Dealer

Dealer generates:

```text
100 Medals / 24 hours
12 epochs
2 hours / epoch
```

Every 2-hour epoch unlocks deterministic Dealer generation, and 12 consecutive epochs total exactly 100 Medals.

Dealer uncollected stock cap:

```text
100
```

Collection is available only while:

```text
player Medal wallet < 100
```

Eligible collection transfers the entire current Dealer stock.

It may push the wallet above 100.

Example:

```text
95 + 25 = 120
```

---

# Spawn Machine

The Spawn Machine is an arcade presentation that consumes Medals.

Current V1 presentation:

```text
Pachinko gacha
```

Future presentation may change without changing Medal as the currency.

Daily global pool probabilities:

```text
10% | 15% | 25% | 25% | 15% | 10%
```

All normal V1 rewards are F tier.

The server resolves the reward before the client arcade reveal.

---

# Shield System

Exactly two V1 shield concepts:

## Illuminati

- Protected Battle Camp slots
- 6 default
- 12 after permanent upgrade
- Protects a defender's Summons from Raid theft
- Does not protect an attacker from surrender after losing an outgoing Raid

## Time Shield

- Protects account from new incoming Raid matchmaking
- Maximum 8 hours
- Outgoing Raid breaks it
- Defender loss grants full 8 hours
- Draw grants none
- Defender win grants none

---

# Defense Editing

When Time Shield is inactive:

```text
view allowed
edit disabled
save disabled
```

When Time Shield is active:

```text
view allowed
edit may be enabled
save may be enabled after server revalidation
```

Any active Raid lock blocks edit/save.

---

# Campaign

- Persistent ladder
- Up to 6 Summons
- Mini-boss every 10
- Arc boss every 100
- Auto Progress pauses before bosses
- Medal rewards every 10 cleared levels
- Anti-stall combat rules apply

---

# Raid

Rounds:

```text
2v2
4v4
6v6
```

Setup timers:

```text
10s
20s
30s
```

Outcomes:

```text
win
draw
loss
```

Attacker win:

- Steal one exposed defender Summon
- Defender receives 8-hour Time Shield

Draw:

- No transfer
- No defender Time Shield

Attacker loss:

- Surrender one distinct Summon actually used
- Illuminati does not protect the losing attacker
- Defender reward enters FIFO

---

# Server Authority

Server-authoritative systems include:

- Medal wallet
- Dealer stock and generation
- Inventory ownership
- Merge
- Release refund
- Spawn reward
- Daily Spawn pool
- Blob state
- Time Shield
- Illuminati slots
- Campaign progression
- Campaign rewards
- Defense
- Raid history
- Raid matchmaking
- Raid locks
- Raid combat
- Raid outcome
- Raid settlement
- Ownership transfer
- Defense reward queue

Do not use local state as a silent production fallback.

---

# Combat Reproducibility

Authoritative battles should record:

```text
contentVersion
rulesVersion
powerLevelResolverVersion
seed
combat snapshot
```

---

# Current Migration Direction

Prototype concepts that may still exist temporarily include:

```text
Origin
Combat Function
originId
combatFunctionId
nine-tier-only assumptions
Skill-1-only combat
manual cast commands
Ball currency naming
refill-to-100 Dealer logic
per-user Spawn pool
Ball <=100 database constraint
Defense as Base overlay
```

Do not build new systems against them.

The final cutover should remove them once production callers and data are migrated.

---

# Recommended Schema Migration Order

1. Regenerate and verify the current lockfile.
2. Add CI and repo-integrity checks.
3. Finalize canonical 36-Summon content.
4. Populate 10 tiers including X and 6 Alliances.
5. Migrate shared contracts.
6. Rename economic Ball state to Medal.
7. Migrate Dealer to generated-stock accrual.
8. Migrate release refunds.
9. Migrate combat to the full automatic kit.
10. Add deterministic anti-stall phases.
11. Add cinematic replay event support.
12. Add forward Supabase V1 migration.
13. Move Campaign authority server-side.
14. Create dedicated Defense world and server state.
15. Move Raid authority and draw settlement server-side.
16. Remove compatibility contracts.
17. Run full verification.

Do not rewrite historical migrations.

---

# Database Changes Expected During V1 Cutover

The forward V1 migration should address:

- 10 canonical tiers including X
- Character tier form labels
- Full identity fields
- Full stat model
- Medal wallet naming
- No global Medal wallet max 100
- Dealer generated stock
- Dealer epoch generation
- Global daily Spawn pool
- Independent Blob state
- Time Shield
- Illuminati protected slots
- Release Medal refunds
- Campaign persistence
- Defense snapshots
- Defense reward FIFO
- Raid history
- Raid session state
- Raid participant locks
- Raid Camp-slot reservation
- Raid draw settlement
- Settlement idempotency
- Content/rules/Power Level version IDs
- Removal of manual auto-cast state after runtime cutover

See `AGENTS.md` for implementation constraints.

---

# CI

A production-ready repository should run:

```bash
npm ci
npm run validate:content
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

CI failures should block merge.

---

# Repository Hygiene

Do not commit:

- Generated screenshot dumps
- Old runtime duplicates
- Competing PRDs
- Temporary source-of-truth docs
- Redundant Playwright configs
- Deprecated app shells after cutover

A repo-integrity test should enforce these rules.

---

# Deployment

Deploy target:

```text
apps/game
```

Backend schema/functions deploy separately through Supabase or the selected authoritative backend pipeline.

---

# Security and Economy Rule

Anything that changes:

- Medals
- Dealer stock
- Inventory
- Ownership
- Raid result
- Campaign reward
- Protection
- Spawn reward
- Release refund

must be validated and mutated authoritatively.

Never trust a client-submitted economic result.

---

# Contributor Checklist

Before opening a PR:

```text
[ ] Read PRODUCT_FINAL.md
[ ] Read AGENTS.md
[ ] Confirm feature belongs in the correct layer
[ ] Avoid a second authority path
[ ] Add or update tests
[ ] Run content validation
[ ] Run typecheck
[ ] Run unit tests
[ ] Run build
[ ] Run E2E when relevant
[ ] Delete obsolete code after migration
```

---

# Product Status

The product model is locked enough for implementation.

The remaining major content input is the final launch sheet defining:

- 36 Summons
- 6 Alliance identities
- Per-character forms across F through X
- Stats
- Basic attacks
- Passives
- Skill 1
- Skill 2
- Ultimates
- Unlock progression
- Balance values
- Asset manifests

Once that content is supplied, the codebase should migrate to it rather than invent temporary launch semantics.

# AGENTS.md

# Psyblr Merge Engineering Constitution

This file defines how agents, contributors, and automated coding systems must implement Psyblr Merge.

For gameplay behavior and product rules, read `PRODUCT_FINAL.md`.

For setup, repository layout, commands, and operations, read `README.md`.

If implementation conflicts with `PRODUCT_FINAL.md`, the implementation is wrong.

---

# 1. Core Engineering Principles

1. Product truth lives in `PRODUCT_FINAL.md`.
2. One production gameplay runtime: PlayCanvas + TypeScript.
3. No React gameplay runtime.
4. Durable state is server-authoritative.
5. Combat is deterministic and replayable.
6. Combat presentation is cinematic, not merely functional.
7. Content is data-driven.
8. Presentation does not own game rules.
9. Legacy prototype contracts are migration-only.
10. No silent production fallback to local or random behavior.
11. The repository must converge toward one obvious implementation path.

---

# 2. Canonical Root Documentation

The permanent active root documentation set is:

```text
AGENTS.md
README.md
PRODUCT_FINAL.md
```

Do not add competing product or architecture source-of-truth files.

Temporary execution plans belong in issues or PR descriptions.

---

# 3. Technology Contract

Production client:

- TypeScript
- PlayCanvas
- Vite
- Browser/PWA runtime

Backend:

- Supabase/Postgres
- Server functions or equivalent authoritative services

Testing:

- Unit tests
- Contract tests
- Content validation
- Playwright E2E

Do not introduce:

- React as a gameplay runtime
- `@playcanvas/react`
- A second game engine
- A parallel SPA shell that owns gameplay
- Client-only production authority

---

# 4. Target Repository Architecture

Preferred target:

```text
apps/
└── game/
    └── src/
        ├── bootstrap/
        │   ├── main.ts
        │   └── GameApp.ts
        ├── state/
        │   ├── GameSessionState.ts
        │   ├── PlayerState.ts
        │   └── selectors/
        ├── routing/
        │   ├── WorldRouter.ts
        │   ├── ModeRouter.ts
        │   └── InputRouter.ts
        ├── scenes/
        │   ├── base/
        │   │   ├── BattleCamp/
        │   │   ├── SummonInspect/
        │   │   ├── Dealer/
        │   │   └── SpawnMachine/
        │   ├── campaign/
        │   ├── defense/
        │   ├── raid/
        │   └── opponent-camp/
        ├── summons/
        ├── gateways/
        ├── presentation/
        │   ├── camera/
        │   ├── cinematic/
        │   ├── motion/
        │   ├── audio/
        │   └── vfx/
        ├── ui/
        │   └── shared/
        └── dev/

packages/
├── contracts/
├── game-content/
├── game-rules/
├── combat-core/
├── raid-core/
└── tutorial-core/

supabase/
├── migrations/
└── functions/

tests/
└── e2e/
```

The exact folder tree may evolve, but ownership boundaries must remain clear.

---

# 5. Layer Ownership

## `apps/game`

Owns:

- Rendering
- Scene composition
- Input collection
- Camera
- Cinematic Director
- Presentation timing
- VFX
- Audio
- Local transient UI state
- Gateway calls
- Replaying authoritative combat events

Must not own:

- Durable inventory truth
- Medal settlement
- Dealer generation
- Spawn randomness
- Raid outcome calculation
- Ownership transfer
- Campaign progression authority
- Time Shield authority

## `packages/contracts`

Owns:

- Shared schemas
- Durable IDs
- API payload contracts
- Combat snapshots
- Version identifiers

## `packages/game-content`

Owns:

- Tiers
- Alliances
- Summons
- Passives
- Skills
- Campaign configuration
- Spawn configuration
- Dealer configuration
- Asset manifests

## `packages/game-rules`

Owns pure product rules outside deterministic simulation.

Examples:

- Merge legality
- Alliance activation
- Camp capacity
- Release refund
- Formation legality
- Dealer accrual and collection rules
- Power Level composition helpers

## `packages/combat-core`

Owns deterministic combat simulation.

No DOM.
No PlayCanvas.
No network calls.
No wall-clock dependence.
No unseeded randomness.

## `packages/raid-core`

Owns pure Raid rules, outcome handling, and deterministic state transitions.

## Supabase / server

Owns durable mutation and settlement.

---

# 6. Launch Content Invariants

Production validation must enforce:

```text
36 Summons exactly
6 Alliances exactly
6 Summons per Alliance exactly
10 tiers exactly
tier order exactly F/E/D/C/B/A/S/SS/SSS/X
1 Alliance per Summon exactly
1 Basic Attack reference
1 Passive reference
1 Skill 1 reference
1 Skill 2 reference
1 Ultimate reference
Alliance thresholds exactly 2/4/6
```

Unknown references are build failures.

Duplicate IDs are build failures.

Character-specific form labels may vary by Summon and tier.

---

# 7. Forbidden Legacy Contracts

The following prototype concepts must not be extended as V1 architecture:

```text
Origin
Combat Function
originId
combatFunctionId
OriginDefinition
CombatFunctionDefinition
nine-tier-only schema
nullable Skill 2
nullable Ultimate
missing Passive
manual skill casting
Skill-1-only combat snapshots
Ball as canonical Spawn currency
refill-to-100 Dealer behavior
per-user daily Spawn pools
client Math.random settlement
client-owned Campaign progression
production localStorage authority
Defense as a Base-only overlay
```

Compatibility code may exist temporarily during migration.

New features must target the canonical model.

Delete compatibility code once no callers remain.

---

# 8. Tier Contract

Canonical V1 tier IDs:

```ts
type TierId =
  | "F"
  | "E"
  | "D"
  | "C"
  | "B"
  | "A"
  | "S"
  | "SS"
  | "SSS"
  | "X";
```

Canonical order is fixed.

Character-specific display form names remain content-driven.

Do not derive progression from lexical sorting.

Use a shared tier-order resolver.

---

# 9. Summon Contract

Each canonical Summon definition must include equivalent fields for:

```ts
{
  id: string;
  displayName: string;
  description: string;
  quote: string;
  allianceId: string;
  passiveId: string;
  skills: {
    basic: string;
    skill1: string;
    skill2: string;
    ultimate: string;
  };
  stats: ...;
  formsByTier: ...;
  assetManifest: ...;
}
```

Each owned Summon instance must contain:

- Stable instance ID
- Summon definition ID
- Canonical tier ID
- Battle Camp cell where applicable
- Durable ownership metadata where required

Do not duplicate mutable content values into instance rows unless required for an immutable snapshot.

---

# 10. Stat Contract

Summon Inspect must expose the complete resolved stat model.

At minimum, support grouping for:

```text
Core:
HP
ATK
DEF

Offensive:
Attack Speed
Critical Chance
Critical Damage where applicable

Defensive:
Block Chance
Dodge Chance

Ability:
Skill Power
Cooldown modifiers

Mobility and Range:
Attack Range
Movement Speed

Sustain:
Healing Power
Drain
```

If the combat model gains another canonical player-relevant stat, the drawer must expose it.

Do not maintain a hidden simulation-only stat that materially affects player decisions without an understandable UI representation.

---

# 11. Skill Architecture

Prefer composable skill definitions.

Conceptual model:

```ts
type SkillDefinition = {
  id: string;
  trigger: ...;
  targeting: ...;
  cooldown: ...;
  effects: SkillEffect[];
};
```

The combat engine automatically resolves:

- Basic
- Passive
- Skill 1
- Skill 2
- Ultimate

Do not reintroduce manual cast commands.

---

# 12. Determinism

Every authoritative combat must be reproducible.

Do not use:

- `Math.random()`
- wall-clock reads inside simulation
- network calls inside simulation
- renderer state as simulation input
- camera state as simulation input
- playback speed as simulation input

Simulation receives explicit:

- snapshot
- seed
- `contentVersion`
- `rulesVersion`
- `powerLevelResolverVersion`

Same inputs must produce the same authoritative result and event sequence.

---

# 13. Anti-Stall Simulation Contract

No battle may run forever.

The combat engine must support explicit deterministic phases equivalent to:

```text
NORMAL
OVERDRIVE
FINAL_COLLAPSE
TERMINAL
```

## Overdrive

Must increase pressure over time and counter sustain.

Supported levers may include:

- Damage amplification
- Healing reduction
- Shield reduction
- Other deterministic anti-sustain modifiers

## Final Collapse

Must guarantee practical termination.

Use deterministic unmitigable pressure such as escalating percentage-max-HP damage that cannot be indefinitely healed or shielded.

## Safety Cap

Every battle also has a hard authoritative maximum duration or tick count.

If reached due an engine edge case, use mode-specific terminal resolution.

Campaign only clears on a canonical player victory.

Raid may end as win, draw, or loss.

Tests must include heal-greater-than-DPS and tank-versus-tank scenarios.

---

# 14. Cinematic Combat Presentation

The client is not allowed to treat combat presentation as a simple debug replay.

Build presentation systems for:

- Animation choreography
- Attack anticipation
- Hit reactions
- Movement transitions
- Dashes and leaps
- Projectile readability
- Skill-specific VFX
- Ultimate moments
- Audio impact
- Camera composition
- Final elimination moments

The battle should feel like an anime fight sequence.

## Cinematic Director

Implement a presentation-only director capable of camera cuts and tracking around major combat events.

## Free Camera

Allow player camera override where practical:

- Orbit
- Pan
- Zoom
- Focus target
- Return to cinematic mode

Camera never feeds back into simulation.

## Speed

1x, 2x, and 4x affect replay timing only.

---

# 15. Power Level Resolver

The canonical product term is `Power Level`.

There must be one versioned resolver for:

- Summon Power Level
- Formation Power Level
- Account Power Level
- Enemy Power Level

Do not maintain separate hand-coded UI and matchmaking formulas.

Persist `powerLevelResolverVersion` for authoritative sessions.

---

# 16. Camp Capacity

Battle Camp capacity is exactly 36.

Every mutation that may add a usable Summon must check capacity transactionally.

Examples:

- Spawn
- Raid steal
- Defense queue claim
- Tutorial grant
- Purchase
- Recovery

Raid start reserves one Camp slot.

No race may create instance 37.

---

# 17. Merge and Release

## Merge

Valid only for same identity + same tier.

Target survives.
Source is consumed.
Tier advances one canonical step.

## Release

Release refund is derived from canonical F-equivalent Spawn cost.

```text
F     -> 0
E     -> 1
D     -> 2
C     -> 4
B     -> 8
A     -> 16
S     -> 32
SS    -> 64
SSS   -> 128
X     -> 256
```

Refund is server-authoritative.

Client must not compute and credit its own refund.

---

# 18. Shield Model

Exactly two V1 shield concepts:

```text
Illuminati
Time Shield
```

Do not overload one schema field to represent both.

## Illuminati

Slot-level persistent theft protection.

Default protected slots: 6.
Upgraded protected slots: 12.

Illuminati protects a defender's exposed-theft pool.

It does not protect an attacker from surrender liability after losing an outgoing Raid.

## Time Shield

Account-wide incoming Raid matchmaking protection.

Maximum remaining duration: 8 hours.

Starting an outgoing Raid breaks it.

Defender loss grants full 8 hours.

Draw and defender win grant none.

---

# 19. Medal Currency

Canonical Spawn currency is:

```text
Medal (メダル)
```

Do not use `Ball` as the economic currency name.

A Ball, gacha capsule, coin, claw token, or other visible object may exist as machine presentation, but the wallet currency is Medal.

Database and API naming should migrate toward:

```text
medals
medal_balance
```

rather than `balls`.

---

# 20. Dealer Model

Dealer has separate generated stock.

Canonical constants:

```text
100 Medals per 24 hours
12 epochs
2 hours per epoch
Dealer stock cap = 100
```

Every 2-hour epoch must unlock deterministic Dealer accrual, and 12 consecutive epochs must total exactly 100 Medals.

Use fixed-point accrual or an equivalent deterministic schedule. Do not make an arbitrary integer split part of product semantics.

## Claim Gate

Player may claim Dealer stock only if:

```text
playerMedals < 100
```

When eligible:

```text
playerMedals += dealerStock
dealerStock = 0
```

Do not clamp the wallet to 100.

Example:

```text
95 wallet + 25 stock = 120 wallet
```

If wallet >= 100:

- Claim disabled
- Dealer continues generating until `dealerStock == 100`

Server owns generation and collection.

---

# 21. Spawn Authority

The Spawn Machine is an arcade presentation over an authoritative Spawn settlement.

Current V1 presentation is pachinko.

Future presentation may be:

- Slot
- Claw
- Other arcade machine

Currency remains Medal.

Settlement sequence:

1. Validate player.
2. Validate Camp capacity.
3. Validate Medal balance.
4. Resolve reward from current global daily pool.
5. Atomically consume one Medal.
6. Atomically create one F-tier Summon.
7. Return authoritative reward and replay metadata.
8. Client animates the arcade reveal.

The visual gacha path does not determine the reward.

---

# 22. Daily Spawn Pool

One global six-Summon pool per fixed server day.

Not per-user.

Probabilities:

```text
10% | 15% | 25% | 25% | 15% | 10%
```

All V1 normal Spawn rewards are F tier.

---

# 23. Blob State

Treat each Blob as independent configuration.

Prefer generic state such as:

```text
blob_id
progress
content_version
```

Do not encode one specific effect permanently into database column names.

---

# 24. Campaign Authority

Campaign progression is durable server state.

Persist:

- Current level
- Highest level
- Formation
- Combat snapshot
- Seed
- Result
- Version metadata

Auto Progress can drive repeated authoritative battles while the app is active.

Boss pause behavior must be enforced by product rules.

Campaign Medal rewards may push wallet above 100.

---

# 25. Defense World

Defense is a top-level world.

Do not implement it as only a Base HUD.

Base contains a Defense Podium gateway.

Defense world owns presentation for:

- Setup board
- 2/4/6 formations
- Formation Power Levels
- Alliance state
- Shield state
- Reward FIFO
- Raid history

Server remains source of truth.

---

# 26. Defense Editing Concurrency

Time Shield state controls whether editing is safe.

## Shield inactive

- View allowed
- Edit disabled
- Save disabled

## Shield active

- View allowed
- Edit may be enabled
- Save may be enabled after server revalidation

Any active Raid lock disables edit/save.

The server must reject stale saves if Time Shield expires or a lock appears during editing.

Never depend only on client UI gating.

---

# 27. Raid State Machine

Represent Raid progression explicitly.

Recommended states:

```text
MATCHMAKING
LOCKED
ROUND_1_SETUP
ROUND_1_RESOLVED
ROUND_2_SETUP
ROUND_2_RESOLVED
ROUND_3_SETUP
ROUND_3_RESOLVED
STEAL_SELECTION
SURRENDER_SELECTION
DRAW_SETTLEMENT
SETTLING
SETTLED
CANCELLED
```

Equivalent names are acceptable if transitions remain explicit and auditable.

---

# 28. Raid Outcomes

Canonical outcomes:

```text
win
draw
loss
```

From attacker perspective.

## Win

- Steal one eligible exposed defender Summon
- Losing defender gets full 8-hour Time Shield

## Draw

- No ownership transfer
- No defender Time Shield
- Attacker's broken Time Shield stays broken
- Release reservation and locks

## Loss

- Attacker surrenders one distinct Summon actually used
- Illuminati status from the attacker's Camp does not protect it
- Defender receives surrendered Summon in reward FIFO
- Defender receives no Time Shield

---

# 29. Raid Locks

Raid concurrency must be enforced server-side.

Prevent:

- One attacker running two active Raids
- One defender receiving two active Raids
- One Camp slot being reserved twice
- Duplicate settlement

Use transactions, unique constraints, TTL recovery, and idempotency keys as appropriate.

---

# 30. Raid Settlement

Ownership transfer must be atomic and idempotent.

## Attacker win timeout

Server selects randomly from eligible exposed defender Summons.

Do not select strongest.

## Attacker loss timeout

Server selects the weakest eligible distinct Summon actually used by the attacker using the canonical Power Level resolver.

Illuminati does not exclude attacker-used Summons from surrender.

## Draw

No transfer.

No defender Time Shield.

---

# 31. Defense Reward FIFO

Pending Defense rewards are not usable Camp inventory.

They must not participate in:

- Power Level
- Alliance counts
- Combat
- Defense
- Merge
- Release
- Camp occupancy

Only the oldest pending item may be claimed.

Server enforces FIFO ordering.

---

# 32. Input Router

All input must pass through one ownership model:

```text
blocking system modal
    ↓
active feature UI
    ↓
active scene
    ↓
camera
```

Do not attach competing global pointer listeners that independently mutate game state.

During combat, camera controls must yield to feature UI controls.

---

# 33. State Ownership

`GameApp` orchestrates.

It must not become a god object containing product rules.

Prefer:

- `GameSessionState`
- `PlayerState`
- selectors
- routers
- gateways

Worlds and HUDs must not become durable databases.

---

# 34. Gateway Rule

Every authoritative feature uses an explicit gateway.

Examples:

```text
PlayerGateway
SpawnGateway
DealerGateway
CampaignGateway
DefenseGateway
RaidGateway
CatalogGateway
```

Production gateways call authoritative services.

Dev/test gateways may provide deterministic mocks.

Never silently switch from failed production authority to local fake settlement.

---

# 35. Asset Manifests

Summon rendering must be manifest-driven.

Manifest supports:

- Model
- Portrait
- Animation clips
- Scale
- Offsets
- Attack origin
- Projectile origin
- VFX anchors
- Audio hooks
- Tier form overrides
- Procedural fallback

The presentation architecture must support cinematic choreography without per-character hard-coded scene logic wherever data can express the behavior.

---

# 36. Database Migration Rules

Never rewrite historical migrations after they have been shared or deployed.

Add forward migrations.

The V1 cutover should address:

- 10 canonical tiers including X
- Character form labels by tier
- Full Summon identity fields
- Full stat model
- Medal wallet replacing Ball currency naming
- Removal of global wallet max 100
- Dealer generated stock
- Dealer epoch generation state
- Global daily Spawn pool
- Generic Blob progress
- Time Shield
- Illuminati protected slots or entitlement
- Release refund settlement
- Campaign persistence
- Immutable Defense snapshots
- Defense reward FIFO
- Raid history
- Raid locks and state
- Raid draw settlement
- Camp-slot reservation
- Content/rules/Power Level version fields
- Removal of manual casting state after runtime cutover

Backward compatibility should exist only as long as required to migrate data and callers.

---

# 37. Content and Rules Versioning

Use separate version identities.

Example:

```text
contentVersion = 2026.09.14-content-3
rulesVersion = combat-v4
powerLevelResolverVersion = power-v2
```

Authoritative sessions store all required versions.

---

# 38. Tests Required for Product Contracts

At minimum:

## Catalog

- Exactly 36 Summons
- Exactly 6 Alliances
- Exactly 6 Summons per Alliance
- Exactly 10 tiers
- Tier order F through X
- One Alliance per Summon
- Four active skill refs
- One passive ref
- Identity includes description and quote
- Thresholds 2/4/6
- References valid
- IDs unique

## Merge

- Same identity + same tier succeeds
- Different identity fails
- Different tier fails
- X cannot advance
- Target survives
- Source consumed

## Release

Verify refunds:

```text
F 0
E 1
D 2
C 4
B 8
A 16
S 32
SS 64
SSS 128
X 256
```

## Camp

- Cannot create instance 37
- Raid reservation blocks competing incoming mutation
- Release frees a cell

## Dealer

- Generates 100 over 12 two-hour epochs
- Twelve 2-hour epochs total exactly 100 Medals
- Dealer stock caps at 100
- Wallet can exceed 100
- Claim disabled at wallet >= 100
- Eligible claim transfers entire stock
- 95 + 25 becomes 120

## Spawn

- Uses Medal
- Uses global daily pool
- Probabilities sum to 100
- Only F-tier normal rewards
- Camp full consumes no Medal
- Server reward authoritative
- Client pachinko path cannot change reward

## Shields

- Illuminati protects defender theft pool
- Illuminati does not protect losing attacker surrender
- Time Shield max 8 hours
- Outgoing Raid breaks shield
- Defender loss grants 8 hours
- Draw grants none
- Defender win grants none

## Campaign

- Formation persists
- Defeat stops Auto Progress
- Level 10 pauses
- Level 100 pauses
- Rewards only every 10 levels

## Combat Anti-Stall

- Healing greater than incoming DPS terminates
- Shield loop terminates
- Tank versus tank terminates
- Overdrive deterministic
- Final Collapse deterministic
- Hard safety cap respected
- Campaign non-win does not clear
- Raid may draw

## Raid

- Setup timers 10/20/30
- Auto-deploy strongest legal formation on timeout
- Same instance may be reused across rounds
- No duplicate instance inside one round
- Win timeout steals random eligible exposed instance
- Loss timeout surrenders weakest eligible used instance
- Draw transfers nothing
- Settlement idempotent
- Defender lock exclusive

## Defense Editing

- Shield inactive blocks edit/save
- Shield active may edit/save
- Active Raid lock blocks edit/save
- Stale save rejected server-side

## Defense FIFO

- Only head claimable
- Pending does not count toward Camp or Power Level
- Queue order immutable

---

# 39. CI Gate

Every pull request should run:

```bash
npm ci
npm run validate:content
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

A failing contract test blocks merge.

---

# 40. Repo Integrity Gate

Add an automated integrity test that prevents regression.

It should fail if production code reintroduces:

```text
apps/web
@psyblr/web
@playcanvas/react
OriginDefinition
CombatFunctionDefinition
originId
combatFunctionId
manual skill casting
Ball as canonical wallet currency
duplicate Playwright configs
duplicate root product docs
```

Temporary migration exceptions must be explicit and removed at cutover.

---

# 41. Deletion Rule

Once production callers are migrated, tests pass, data is migrated, and no compatibility consumer remains, delete the legacy layer.

Do not preserve dead architecture indefinitely.

---

# 42. Change Discipline

When changing a locked product rule:

1. Update `PRODUCT_FINAL.md`.
2. Update contracts.
3. Update tests.
4. Update migrations if durable state changes.
5. Update implementation.
6. Update `README.md` only if operation changes.

Do not let code silently redefine the product.

---

# 43. Completion Standard

A feature is complete only when:

- Product rule is represented correctly
- Server authority is correct
- Determinism is preserved
- Cinematic presentation meets the intended quality bar where relevant
- Anti-stall behavior is covered
- Content validation passes
- Error cases are explicit
- Tests cover invariants
- Legacy path is removed or deliberately isolated
- Build and E2E pass

This file is the engineering constitution.

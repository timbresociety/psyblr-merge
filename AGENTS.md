# PSYBLR Engineering Constitution

`PRODUCT_FINAL.md` is the canonical product and gameplay source of truth. `README.md` is operational. This file defines implementation constraints.

If code conflicts with `PRODUCT_FINAL.md`, migrate the code. Do not reinterpret the product around an accidental implementation.

## Runtime ownership

1. `apps/game` is the only gameplay client and deployable frontend.
2. Gameplay is pure TypeScript using the PlayCanvas Engine directly. Do not introduce React, `@playcanvas/react`, DOM gameplay overlays, or a second gameplay UI framework.
3. Keep one PlayCanvas `Application`. Worlds and Base focus modes are logical states, not separate applications.
4. `GameApp` is a composition root. It wires routers, state, gateways, scenes, presentation systems, and lifecycle. It must not own Campaign rules, Raid rules, economy rules, matchmaking, or persistent player state.

## Canonical state hierarchy

```text
WORLD
├── CAMPAIGN
│   ├── SETUP
│   ├── COMBAT
│   ├── AUTO_PROGRESS
│   ├── BOSS_PAUSE
│   └── ROADBLOCK_SUMMARY
├── BASE
│   ├── IDLE
│   ├── SUMMON_INSPECT
│   ├── DEALER
│   ├── SPAWN_MACHINE
│   └── DEFENSE
├── RAID
│   ├── MATCHMAKING
│   ├── ROUND_1_SETUP
│   ├── ROUND_1_COMBAT
│   ├── ROUND_2_SETUP
│   ├── ROUND_2_COMBAT
│   ├── ROUND_3_SETUP
│   ├── ROUND_3_COMBAT
│   └── RESULT
└── OPPONENT_CAMP
    ├── STEAL_SELECTION
    ├── AUTO_STEAL
    └── RAID_SHIELD_APPLIED
```

Dealer, Spawn Machine, Defense, and Summon Inspect are Base focus modes. Preserve Base spatial continuity when entering them.

## Target client structure

New work should converge on this shape in tested slices:

```text
apps/game/src/
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
│   │   ├── SpawnMachine/
│   │   └── Defense/
│   ├── campaign/
│   ├── raid/
│   └── opponent-camp/
├── summons/
├── gateways/
├── presentation/
│   ├── camera/
│   ├── motion/
│   ├── audio/
│   └── vfx/
├── ui/shared/
└── dev/
```

Do not perform mechanical moves that leave broken imports. Move ownership and behavior in small tested slices.

## Shared domain boundaries

- `packages/contracts`: shared schemas, snapshots, request/result contracts, and serialization types.
- `packages/contracts/src/catalog.ts`: canonical launch catalog contract.
- `packages/game-content`: versioned Summon, Alliance, passive, ability, enemy, Spawn, and Arc content.
- `packages/game-rules`: pure inventory, merge, Alliance, formation, power-score, protection, and progression rules.
- `packages/combat-core`: deterministic automatic combat simulation and event log. No PlayCanvas, browser API, database, network, or wall-clock dependencies.
- `packages/raid-core`: deterministic Raid snapshots, seeds, round construction, series resolution, and tie resolution.
- `packages/tutorial-core`: tutorial state and completion rules, not presentation.
- Add `campaign-core` or `spawn-core` only when those domains justify a pure package.
- `supabase/functions`: privileged mutations, matchmaking, timers, reward resolution, and ownership transfers.

## Launch catalog invariants

1. Launch content contains exactly 36 active Summon definitions.
2. Launch content contains exactly 6 Alliances.
3. Each Alliance contains exactly 6 launch Summons so its 6-piece threshold is achievable.
4. Progression contains exactly 10 ordered tiers. Tier IDs and labels are content-defined until the final character sheet locks them and must not be hard-coded into client architecture.
5. Tier is instance progression state, not a separate character definition.
6. Every Summon has exactly four required skill references: `basic`, `skill1`, `skill2`, `ultimate`.
7. Every Summon also has exactly one required passive reference, stored separately as `passiveId`.
8. Every Summon has exactly one `allianceId`.
9. Every Alliance defines exactly three thresholds: 2, 4, and 6 deployed Summons.
10. Alliance modifiers may only target the approved stat families defined by the catalog contract: offense, defense, mobility, skill economy, status control, and sustain.
11. The old Origin and Combat Function taxonomy is legacy prototype schema. Do not add new content or product behavior that depends on it.

## Authority model

Production economy and PvP are server authoritative.

Use explicit gateway interfaces such as `PlayerGateway`, `SpawnGateway`, `CampaignGateway`, `DefenseGateway`, and `RaidGateway`. A dev mock adapter may be selected explicitly in development. Production must never silently fall back from a failed server call to `Math.random`, `localStorage`, client-side mutation, or a localhost service.

Every persistent mutation requires an idempotent `clientActionId` or equivalent action key. Ownership-changing operations must be atomic.

The server owns at minimum:

- Summon creation, merge consumption, and release.
- Ball balances and Dealer refill timing.
- Daily Spawn pool and Spawn rewards.
- Time Shield and Illuminati entitlement state.
- Campaign formation, progress, and milestone rewards.
- Defense formations and immutable match snapshots.
- Raid matchmaking and exclusive player locks.
- Raid combat inputs, deterministic seeds, and final outcomes.
- Steal and surrender transfers.
- Defense reward FIFO.

## Hard gameplay invariants

1. `BATTLE_CAMP_CAPACITY = 36`. No production mutation may create Summon number 37 in the Camp.
2. Base Illuminati protects 6 Camp cells. The permanent paid entitlement protects 12 total cells while Camp capacity remains 36.
3. A Raid cannot start without at least one free Camp slot. Reserve one slot for the attacker for the duration of the Raid.
4. Pending Defense rewards are not Camp inventory. They cannot battle, merge, be reordered, count toward Power or Alliances, or participate in gameplay until the FIFO head is claimed into a free Camp cell.
5. A Summon instance has one owner at a time. Raid transfer settlement is atomic and idempotent.
6. Alliance is the only player-facing synergy taxonomy.
7. Starting an outgoing Raid breaks the attacker's Time Shield.
8. `1x`, `2x`, and `4x` are presentation speeds only.
9. Combat has no manual skill-cast control in V1.
10. Raid series settlement cannot remain a draw. Any combat or series tie must resolve through one deterministic server-owned tie-break path.

## Combat and replay

Combat is automatic after formation lock. The deterministic simulator resolves combat. PlayCanvas presents the returned event stream.

The canonical combat model must support the full character kit: Basic, Passive, Skill 1, Skill 2, and Ultimate. Ability availability, upgrades, cooldowns, targeting, status effects, and tier unlock state are simulation data, never UI-owned rules.

Replay speed must never change seed, targeting, cooldowns, simulated time, damage, movement decisions, event ordering, or winner.

A scene being hidden or destroyed must not mutate an authoritative combat result. Leaving Campaign while server Auto Progress is enabled must not accidentally stop that Campaign session.

## Input and direct manipulation

Only one layer consumes a gesture. Input priority is:

```text
blocking system modal
-> active feature UI
-> active scene interaction
-> camera gesture
```

Battle Camp behavior:

- Drag to empty cell moves.
- Drag to another non-mergeable Summon swaps.
- Drag identical definition and identical tier merges.
- Tap selects and opens the non-modal Summon drawer.
- Tap-to-move is supported as a mobile-friendly fallback.

The Summon drawer must not block the Camp grid.

## Scene and asset lifecycle

- Lazy-load heavy world and character asset bundles.
- A scene or focus mode must clean up listeners, transient entities, timers, and presentation resources it owns.
- Persistent server sessions are not owned by scene visibility.
- Every Summon uses a data-driven asset manifest with model, portrait, animation clips, scale, ground offset, attack/projectile origin, VFX anchors, and optional tier-form overrides.
- Procedural placeholder presenters are fallbacks, not the long-term content architecture.

## UX constraints

- Landscape first, desktop and mobile landscape both supported.
- World remains the visual anchor wherever possible.
- Prefer direct spatial interaction over modal pickers and confirmation flows.
- Combat should read like an anime battle without compromising deterministic simulation.
- New-player bootstrap begins in Campaign tutorial. Returning players begin in Base.

## Legacy cutover gate

The current prototype may remain temporarily runnable, but the following symbols and behaviors are not valid launch architecture:

- hard-coded nine-tier `TierSchema`, `TIERS`, and `TIER_MULTIPLIER`,
- `originId`, `combatFunctionId`, `OriginDefinition`, `CombatFunctionDefinition`, and `resolveFormationSynergies`,
- nullable launch `skill2` or `ultimate`,
- missing passive references,
- manual `cast_skill_1` combat commands and tutorial actions,
- combat snapshots that only model Skill 1,
- unresolved `draw` Raid outcomes,
- client-owned Campaign progression, Raid outcomes, or ownership mutation,
- HUD or World classes as durable state stores,
- production `localStorage` or `Math.random` authority,
- the app-local onboarding director as a competing tutorial state machine.

Do not delete a legacy contract until all callers have moved to its canonical replacement. Do not preserve a legacy contract simply because a caller has not yet been migrated.

## Content-version rule

All authoritative Campaign battles, Defense snapshots, Raid locks, Raid combat snapshots, and settlements must pin the content version they started with. An in-flight battle or Raid never changes rules because a new catalog was deployed. The server must retain enough versioned content or resolved snapshot data to replay and settle an already-started session.

Stable IDs are migration boundaries. Player-owned instances reference stable Summon definition IDs and tier IDs, not display names.

## Testing definition of done

A feature is not complete because an internal method can be called. Test the user path.

Required layers:

- Vitest for pure rules, deterministic simulations, schema validation, and idempotency helpers.
- Playwright for real pointer and touch interaction.
- Visual regression at desktop `1280x720` and mobile landscape around `844x390` for important spatial states.
- Server tests for transactional ownership and matchmaking locks.

Critical regression cases include:

- Camp capacity and full-Camp Spawn rejection without Ball consumption.
- Dealer refill semantics.
- Six Alliances with exactly six launch characters each.
- Four required skills plus one passive per Summon.
- Raid slot reservation, Time Shield break/reset, and parallel Raid prevention.
- Setup timeout auto-deploy.
- Random steal timeout and weakest-used surrender timeout.
- Deterministic no-draw Raid settlement.
- FIFO restrictions.
- Campaign boss pauses and continuation after in-app navigation.
- `1x/2x/4x` replay invariance.
- Catalog validation for 36 Summons, 10 tiers, one Alliance, six Alliances total, and 2/4/6 thresholds.
- Content-version pinning for in-flight Campaign and Raid sessions.

## Product change protocol

If a task intentionally changes a locked product rule, update `PRODUCT_FINAL.md` in the same change before encoding the new behavior. Do not create competing product specs or completion documents.

The permanent root documentation set is:

- `PRODUCT_FINAL.md`
- `AGENTS.md`
- `README.md`

Current anime names and likenesses are prototype content. Commercial content must be licensed or original and remain replaceable through content and asset contracts.

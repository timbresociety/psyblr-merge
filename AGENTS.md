# PSYBLR Engineering Constitution

`PRODUCT_FINAL.md` is the canonical product and gameplay source of truth. `README.md` is operational. This file defines implementation constraints.

If code conflicts with `PRODUCT_FINAL.md`, migrate the code. Do not reinterpret the product around an accidental implementation.

## Runtime ownership

1. `apps/game` is the only gameplay client and deployable frontend.
2. Gameplay is pure TypeScript using the PlayCanvas Engine directly. Do not introduce React, `@playcanvas/react`, DOM gameplay overlays, or a second UI framework.
3. Keep one PlayCanvas `Application`. Worlds and Base focus modes are logical states, not separate applications.
4. `GameApp` is a composition root. It wires routers, state, gateways, scenes, presentation systems, and lifecycle. It must not become the owner of campaign rules, raid rules, economy rules, matchmaking, or persistent player state.

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

A Base focus mode such as Dealer or Spawn Machine is not a standalone world. It retains Base spatial continuity and reframes the camera/UI around a structure.

## Target client structure

New work should converge on this shape rather than adding more feature logic to broad `app`, `world`, `economy`, or HUD files.

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

Move toward this incrementally with compiling, tested slices. Do not perform mechanical moves that leave broken imports.

## Shared domain boundaries

- `packages/contracts`: canonical schemas, snapshots, request/result contracts and serialization types.
- `packages/game-content`: versioned static Summon, Alliance, ability, enemy, Spawn and Arc content.
- `packages/game-rules`: pure inventory, merge, Alliance, formation, power-score, protection and progression rules.
- `packages/combat-core`: deterministic combat simulation and event log. No PlayCanvas, browser API, database, network or wall-clock dependencies.
- `packages/raid-core`: deterministic Raid snapshots, seeds, round construction and series resolution.
- `packages/tutorial-core`: tutorial state and completion rules, not presentation.
- Add `campaign-core` or `spawn-core` when those domains become substantial enough to justify pure packages. Do not hide domain rules inside PlayCanvas scenes.
- `supabase/functions`: privileged mutations, matchmaking, timers, reward resolution and ownership transfers.

## Authority model

Production economy and PvP are server authoritative.

Use explicit gateway interfaces such as `PlayerGateway`, `SpawnGateway`, `CampaignGateway`, `DefenseGateway` and `RaidGateway`. A dev mock adapter may be selected explicitly in development. Production must never silently fall back from a failed server call to `Math.random`, `localStorage`, or client-side mutation.

Every persistent mutation requires an idempotent `clientActionId` or equivalent action key. Ownership-changing operations must be atomic.

The server owns at minimum:

- Summon creation, merge consumption and release.
- Ball balances and Dealer refill timing.
- Daily Spawn pool and Spawn rewards.
- Time Shield and Illuminati entitlement state.
- Campaign progress and milestone rewards.
- Defense snapshots.
- Raid matchmaking and exclusive player locks.
- Raid combat inputs, deterministic seeds and final outcomes.
- Steal and surrender transfers.
- Defense reward FIFO.

## Hard invariants

1. `BATTLE_CAMP_CAPACITY = 36`. No production mutation may create Summon number 37 in the Camp.
2. Base Illuminati protects 6 Camp cells. The permanent paid entitlement protects 12 total cells while Camp capacity remains 36.
3. A Raid cannot start without at least one free Camp slot. Reserve one slot for the attacker for the duration of the Raid so another mutation cannot consume the win destination.
4. Pending defense rewards are not Camp inventory. They cannot battle, merge, be reordered, count toward Power or Alliances, or participate in any gameplay until the FIFO head is claimed into a free Camp cell.
5. A Summon instance has one owner at a time. Raid transfer settlement is atomic and idempotent.
6. Alliances are the only player-facing synergy taxonomy. Do not introduce separate Origin, class, role or Combat Function synergy systems.
7. Tier is instance progression state. One Summon definition spans F, E, D, C, B, A, S, SS and SSS.

## Combat and replay

Combat is automatic after formation lock. The deterministic simulator resolves combat. PlayCanvas presents the returned event stream.

`1x`, `2x` and `4x` are replay/presentation speeds only. They must never change seed, targeting, cooldowns, simulated time, damage, movement decisions or outcome.

A scene being hidden or destroyed must not mutate an authoritative combat result. Conversely, leaving Campaign while server Auto Progress is enabled must not accidentally stop the Campaign session.

## Input and direct manipulation

Only one layer consumes a gesture. Input priority is:

```text
blocking system modal
→ active feature UI
→ active scene interaction
→ camera gesture
```

The Battle Camp is direct manipulation first:

- Drag to empty cell moves.
- Drag to another non-mergeable Summon swaps.
- Drag identical definition + identical tier merges.
- Tap selects and opens the non-modal Summon drawer.
- Tap-to-move is supported as a mobile/accessibility fallback.

The Summon drawer must not block the Camp grid. Do not add a fullscreen backdrop for inspection.

## Scene and asset lifecycle

- Lazy-load heavy world and character asset bundles. Do not instantiate every future world and every heavy asset at bootstrap.
- A scene/focus mode must own and clean up its listeners, transient entities, timers and presentation resources.
- Persistent/server sessions are not owned by scene visibility.
- Every Summon uses a data-driven asset manifest. The manifest must be able to define a world model, portrait/icon, idle/run/basic/skill/hit/death clips, scale, ground offset, attack/projectile origin, VFX anchors and optional tier-form overrides.
- Procedural placeholder presenters are fallbacks, not the long-term content architecture.

## UX constraints

- Landscape first, desktop and mobile landscape both supported.
- World remains the visual anchor wherever possible.
- Prefer direct spatial interaction over modal pickers and confirmation flows.
- Combat should read like an anime battle, with clear movement, retargeting, attacks, skills, hit reactions and deaths without compromising deterministic simulation.
- New-player bootstrap begins in Campaign tutorial. Returning players begin in Base.

## Testing definition of done

A feature is not complete because an internal method can be called. Test the user path.

Required layers:

- Vitest for pure rules, deterministic simulations and idempotency helpers.
- Playwright for real pointer/touch interaction.
- Visual regression at desktop `1280x720` and mobile landscape around `844x390` for important spatial states.
- Server tests for transactional ownership and matchmaking locks.

Critical regression cases include Camp capacity, full-Camp Spawn rejection without Ball consumption, Dealer refill semantics, Raid slot reservation, shield break/reset, parallel Raid prevention, setup timeout auto-deploy, steal/surrender timeout settlement, FIFO restrictions, Campaign boss pauses, Campaign continuation after navigation, and `1x/2x/4x` replay invariance.

## Product change protocol

If a task intentionally changes a locked product rule, update `PRODUCT_FINAL.md` in the same change before encoding the new behavior. Do not create competing product specs or completion documents. The permanent root documentation set is:

- `PRODUCT_FINAL.md`
- `AGENTS.md`
- `README.md`

Anime names and likenesses in current content are placeholders for prototyping. Production content must be licensed or original and remain replaceable through content and asset contracts.

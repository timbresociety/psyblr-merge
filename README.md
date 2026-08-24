# PSYBLR

PSYBLR is an anime-styled incremental auto battler built around collecting, merging, deploying, defending, and stealing Summons.

The product is world-first. The player lives in a persistent Base, grows a Battle Camp, acquires Summons through a physical pachinko-style Spawn Machine, powers them up through merging, progresses through an infinite Campaign, and raids other players in three escalating auto-battler rounds.

## Core loop

`Claim Balls -> Spawn Summons -> Arrange Battle Camp -> Merge -> Campaign / Raid -> Grow collection -> repeat`

## Player-facing systems

### Base
The home scene and first playable location.

The Base contains:
- Battle Camp
- Dealer
- Spawn Machine
- Campaign Gate
- Raid Gate
- Defense Podium

The Battle Camp is the collection surface. Summons physically occupy it and can be inspected, moved, merged, protected, deployed, or stolen when exposed.

### Dealer
The Dealer gives the player 100 free Balls every 24 hours.

Balls are spent at the Spawn Machine.

### Spawn Machine
A pachinko/gacha machine embedded in Base.

Each Ball is physically released through the machine and lands in one of six reward slots using the daily probability layout:

`30 / 15 / 5 / 5 / 15 / 30`

The reward is authoritative before the animation starts. Physics is presentation.

Two bounce targets also progress a Shield meter. Completing the meter grants one hour of Raid protection.

### Summons
Summons are both inventory and combat units.

They can be:
- placed in Battle Camp,
- merged,
- used in Campaign,
- used in Raid attack,
- assigned to Raid defense,
- protected,
- stolen from defeated opponents when exposed.

Tier progression:

`F -> E -> D -> C -> B -> A -> S -> SS -> SSS`

Two identical Summons of the same tier merge into one of the next tier.

### Campaign
Campaign is a separate world scene reached through the Campaign Gate.

The player fights with six Summons.

Progression cadence:
- normal levels: creeps,
- every 10 levels: mini boss,
- every 100 levels: main boss,
- every 100 levels: a new story Arc.

Campaign is designed to scale indefinitely.

### Raid
Raid is a separate world scene reached through the Raid Gate.

Every Raid has three sequential rounds:
1. 2v2
2. 4v4
3. 6v6

Each round is a real auto-battler fight. Summons move around the board, choose targets, attack, cast abilities, take damage, and die in-world.

The attacker uses owned Battle Camp Summons. There is no shared shop and no shared unit pool.

Winning the Raid opens the defeated opponent's Battle Camp. The winner may steal exactly one eligible exposed Summon. Protected Summons cannot be stolen.

### Defense Podium
The player configures three persistent Raid-defense formations:
- 2 units
- 4 units
- 6 units

These formations are used when another player attacks.

## Technical direction

The target architecture is PlayCanvas-first.

PlayCanvas owns:
- scenes,
- world interaction,
- cameras,
- Spawn Machine presentation,
- combat movement and playback,
- spatial placement,
- world VFX.

React owns only the lightweight application shell and UI that should not naturally live inside the 3D world.

The repository currently contains legacy React gameplay overlays from an earlier implementation. Those should be removed as equivalent PlayCanvas systems are established. Do not preserve duplicate gameplay implementations merely for compatibility.

## Repository structure

- `apps/web`: game client
- `packages/game-rules`: pure game rules
- `packages/combat-core`: deterministic combat simulation
- `packages/contracts`: shared data contracts
- `packages/game-content`: static content definitions
- `supabase`: authoritative persistence and mutations
- `tests`: end-to-end coverage

## Source of truth

Read these three files before changing product behavior:
1. `AGENTS.md`
2. `README.md`
3. `docs/PRODUCT_SPEC.md`

If code conflicts with these documents, the documents describe the intended target behavior unless the user explicitly changes the product direction.

## Local development

```bash
npm install
cp .env.example .env.local
npm run validate:content
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Current migration priority

1. make Base the default scene,
2. establish one PlayCanvas scene router,
3. remove obsolete React gameplay overlays and their CSS,
4. rebuild Base interactions in PlayCanvas,
5. make Campaign and Raid true scene transitions,
6. make summon combat movement readable and stable,
7. rebuild the Spawn Machine as physical pachinko gameplay,
8. implement the Base-first tutorial,
9. retain authoritative/idempotent economy rules while replacing presentation architecture.

## Prototype content notice

Existing anime names and likeness references are prototype content only. A commercial release requires licensed IP or original characters. Gameplay systems must remain content-agnostic so character definitions can be replaced without changing game logic.

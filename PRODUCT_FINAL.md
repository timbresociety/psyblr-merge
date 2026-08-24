# PSYBLR Product Final

Status: canonical V1 product and gameplay source of truth.

`PRODUCT_FINAL.md` defines what the game is. `AGENTS.md` defines implementation constraints. `README.md` is operational. When current code conflicts with this document, migrate the code unless the product decision itself is intentionally changed here first.

## 1. Product promise

PSYBLR is an incremental auto battler built around one physical constraint: every usable Summon lives inside a fixed 6x6 Battle Camp.

Players acquire F-tier Summons through a tactile Pachinko Spawn Machine, merge duplicates into stronger tiers, construct six-unit builds around Alliances and positioning, auto-progress through an increasingly difficult persistent Campaign, and risk actual Summon ownership in asynchronous PvP Raids.

The product should combine the satisfaction of merge/inventory games with the strategic readability of an auto battler and the escalating momentum of an incremental game.

## 2. Product pillars

1. **Visible ownership.** The Battle Camp is the inventory. Valuable units are physical objects in the world, not rows in an unlimited menu.
2. **Hard inventory pressure.** Camp capacity is always 36. Progress requires merging, releasing, risking, or later using temporary storage without increasing usable Camp capacity.
3. **Tactile acquisition.** Balls physically run through a configurable Pachinko machine rather than a generic summon button.
4. **Preparation is the skill.** The player chooses what to own, protect, merge, deploy and position. Combat itself is automatic.
5. **Incremental momentum with roadblocks.** Campaign can push itself through ordinary levels but stops before bosses and on defeat.
6. **PvP has downside.** An attacker can win a defender Summon, but a losing attacker surrenders one of the Summons they actually used.
7. **Server authority protects value.** Creation, destruction, timers, matchmaking and ownership transfers are authoritative, atomic and idempotent.
8. **Content is replaceable.** Current anime identities are prototype content, not hard-coded game architecture.

## 3. World and mode hierarchy

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
│   ├── ROUND_1_SETUP       10 seconds
│   ├── ROUND_1_COMBAT
│   ├── ROUND_2_SETUP       20 seconds
│   ├── ROUND_2_COMBAT
│   ├── ROUND_3_SETUP       30 seconds
│   ├── ROUND_3_COMBAT
│   └── RESULT
└── OPPONENT_CAMP
    ├── STEAL_SELECTION     30 seconds
    ├── AUTO_STEAL
    └── RAID_SHIELD_APPLIED
```

Campaign, Base, Raid and Opponent Camp are primary worlds. Dealer, Spawn Machine, Defense and Summon Inspect are Base focus modes, not independent worlds.

## 4. Core loop

```text
Dealer refills Balls
        ↓
Spawn Machine produces F-tier Summons
        ↓
Battle Camp receives them
        ↓
Merge identical Summons to increase tier
        ↓
Build and position a six-unit formation
        ↓
Campaign Auto Progress pushes until a boss or defeat
        ↓
Earn milestone Balls / diagnose roadblock / rebuild
        ↓
Configure 2 / 4 / 6 Raid defense
        ↓
Raid a similar-power opponent
        ↓
Win a Summon or risk surrendering one
        ↓
Protect, rebuild, merge and push farther
```

## 5. Summon identity and tier progression

A `SummonDefinition` describes an identity, copy, base stats, abilities, Alliances and assets. A `SummonInstance` is one uniquely owned copy with a current tier.

```text
F → E → D → C → B → A → S → SS → SSS
```

Merge rules:

- Two instances must have the same definition and the same tier.
- The source instance is permanently consumed.
- The target instance survives and advances exactly one tier.
- SSS is the maximum V1 tier.
- Merge is a server-authoritative ownership mutation.

Tier is instance state. Do not create a separate character definition for every tier. Asset manifests may provide tier-form visual overrides.

## 6. Battle Camp: the central invariant

The Battle Camp is exactly `6 x 6 = 36` usable inventory cells.

```text
BATTLE_CAMP_CAPACITY = 36
```

Inventory expansion is explicitly not allowed. Every usable owned Summon occupies one Camp cell.

No Spawn, Raid steal, purchase, reward claim or recovery path may create Summon number 37 in the Camp.

When Camp is full:

- Spawn is disabled before Ball consumption.
- Defense FIFO rewards cannot be claimed.
- Outgoing Raid is disabled because a Raid win needs a destination.
- The player must merge or permanently release a Summon to make room.

A basic permanent Summon Release action must exist before inventory pressure can hard-lock the player. Future paid temporary storage may hold Summons outside active Camp, but it does not increase the 36 usable Camp cells.

### Raid slot reservation

Raid entry requires at least one free Camp cell. Once matchmaking starts, one free cell is reserved for the attacker until settlement/cancellation. Spawn and other incoming Camp mutations treat that reserved cell as unavailable.

## 7. Battle Camp interaction

The Camp remains the primary Base surface.

- Drag to empty cell: move.
- Drag onto a non-mergeable Summon: swap.
- Drag onto the same definition and same tier: merge.
- Tap Summon: select and open inspection.
- Tap-to-move is supported as a mobile-friendly alternative to drag.
- Invalid targets stay stable and clearly explain failure. No jitter, accidental selection or click-through.

Interaction should have the directness and predictability of a mature auto battler board rather than a sequence of inventory modals.

## 8. Summon Inspect

Selecting a Summon automatically opens a contextual right-side drawer while the Battle Camp remains visible and interactive.

The drawer is non-modal and must not add a fullscreen backdrop. Selecting another Summon updates the same drawer immediately.

Show at minimum:

- identity and tier,
- Summon Power,
- resolved stats,
- abilities and cooldowns,
- Alliance memberships,
- active and next Alliance thresholds when relevant,
- merge progression,
- permanent Release action.

On narrow landscape screens, reframe the Camp to preserve grid access rather than covering important cells.

## 9. Alliances

**Alliance is the only player-facing synergy system.** The old Origin + Combat Function distinction is retired.

Target definition:

```ts
SummonDefinition {
  id
  displayName
  summary
  allianceIds: string[]
  stats
  skills
  assetManifestId
}
```

```ts
AllianceDefinition {
  id
  name
  description
  thresholds[]
}
```

A Summon may belong to multiple Alliances. During migration, the existing prototype concepts Ascendant, Rebel, Mastermind, Striker, Controller and Disruptor can all become ordinary Alliances so current balance is preserved while the duplicate taxonomy disappears.

Alliance activation is calculated only from the actual formation being evaluated, never the entire Battle Camp.

## 10. Power system

Power communicates expected strength and supports matchmaking, but it does not guarantee a winner.

### Summon Power

A deterministic score from resolved tier stats and combat-relevant ability coefficients.

### Formation Power

The score of the actual deployed formation after active Alliance modifiers. Used in Campaign and formation previews.

### Account Power

The score of the six strongest usable Battle Camp Summons. Used as the primary Raid matchmaking signal.

### Enemy Power

Campaign difficulty target for the current level.

All power calculations live in one versioned shared `PowerScoreResolver`. UI must not invent independent formulas.

Players should still be able to beat a numerically stronger opponent through composition, positioning, Alliances and ability matchups.

## 11. Base

### IDLE

Returning-player home. Camera prioritizes the full 6x6 Camp and surrounding structures.

### SUMMON_INSPECT

Non-modal contextual drawer described above.

### DEALER

Free Ball refill and education surface now, future IAP shop later.

### SPAWN_MACHINE

Pachinko focus mode inside Base.

### DEFENSE

Configure Raid defenses, inspect protection status and manage defended-Raid reward claims.

## 12. Balls and Dealer

Balls power the Spawn Machine.

Ball balance may exceed 100 through Campaign milestones, purchases or future rewards.

The Dealer is a refill, not a +100 grant.

```text
REFILL_TARGET = 100
REFILL_COOLDOWN = 2 hours after successful refill
```

A refill is available only if:

1. two hours have elapsed since the last successful Dealer refill, and
2. current Ball balance is below 100.

Settlement:

```text
balls_after = 100
balls_granted = 100 - balls_before
```

If the cooldown finishes while Ball balance is 100 or higher, the refill remains waiting. As soon as balance later drops below 100, it can be collected immediately.

Dealer timing and Ball balance are server authoritative.

## 13. Spawn Machine

The Spawn Machine is configurable. The architecture must not assume today's bin distribution or Blob behavior is permanent.

### Daily global six

For V1, every player sees the same six Summon identities for a server day. The server creates one global daily pool from six random active Summon identities, without replacement when the catalog has at least six candidates.

The global pool changes once per fixed server-day boundary. Use a stable `dailyPoolId` so all clients resolve the same configuration.

All six base reward bins produce **F-tier** Summons. E and D are earned through merging rather than directly dropped in V1.

Current left-to-right probabilities:

```text
10% | 15% | 25% | 25% | 15% | 10%
```

Identity and probabilities are authoritative configuration, not a client economy constant.

### Spawn authority

Server determines reward, commits Ball consumption and Summon creation, and returns a deterministic presentation/replay descriptor.

Pachinko physics is the satisfying visual realization of an authoritative result. Production may not silently fall back to client `Math.random` if authority is unavailable.

A Ball can be released only when the player owns at least one Ball and Camp has an unreserved free cell. Failure consumes nothing.

### Blob targets

Two visually obvious special Blob targets exist in the machine. Each owns an independent meter and configurable effect because the two Blob functions may diverge later into mini-games or other benefits.

A Blob contract should support:

```text
id
visual identity
hitsRequired
meter state
effect type
effect amount
availability rules
```

For V1, a Blob may grant Time Shield progress. Initial tuning can use 5 registered hits for +1 hour, independently configurable per Blob.

## 14. Time Shield

Time Shield protects the **entire Battle Camp from incoming Raid selection**.

Rules:

- Maximum remaining Time Shield: 8 hours.
- New grants extend remaining duration only up to 8 hours.
- A shielded player cannot be matched as a defender.
- Starting an outgoing Raid immediately breaks the attacker's Time Shield.
- A defender who loses a Raid receives a full 8-hour Time Shield reset at settlement.
- Shield uses authoritative server time.

Time Shield does not protect individual exposed cells after a Raid has already been validly locked. Illuminati handles cell-level protection.

## 15. Illuminati protection

Illuminati protects specific Camp cells from theft.

Base entitlement:

```text
6 protected + 30 exposed = 36 total
```

The first protected row contains six cells.

Permanent paid entitlement:

```text
12 protected + 24 exposed = 36 total
```

The upgrade unlocks a second protected row. It does not add inventory capacity.

A Summon in an Illuminati cell is excluded from the stealable pool in the authoritative Raid snapshot.

## 16. Campaign

Campaign is a persistent ladder with no V1 run reset.

### Setup

Player explicitly selects up to six owned Summons and positions them on the player side. The formation persists across ordinary Auto Progress battles until the player changes it or ownership invalidates it.

Never infer Campaign formation from roster order such as `slice(0, 6)`.

### Combat

Once started, combat is fully automatic.

### Level rhythm

- Ordinary levels fill the ladder.
- Mini-boss every 10 levels except multiples of 100.
- Main Arc boss every 100 levels.
- Each 100-level block represents a new story Arc.
- Enemy Power continually increases according to versioned balance curves.

### Auto Progress

A small symbolic Auto Progress control appears in the battle UI.

When enabled:

- ordinary wins automatically advance to the next ordinary level,
- the same deployed formation continues fighting,
- the authoritative progression session continues even if the player navigates elsewhere inside the app,
- defeat stops Auto Progress,
- Auto Progress pauses **before** every Level 10 mini-boss milestone,
- Auto Progress pauses **before** every Level 100 Arc boss.

The player deliberately starts boss battles. Auto Progress may resume afterward.

Closed-app/offline farming is not promised in V1, but the server contract should not prevent that future extension.

### Campaign Ball rewards

Ordinary levels do not continuously generate Balls.

Every 10-level milestone can grant Balls. Initial balance may preserve +10 at mini-boss milestones and +25 at Level 100 Arc bosses, but exact quantities are balance configuration.

Campaign rewards are additive and may push Ball balance above 100.

### Roadblock summary

On defeat, stop Auto Progress and make the failure useful.

Show:

- Formation Power versus Enemy Power,
- damage dealt by each Summon,
- damage taken by each Summon,
- first deaths,
- surviving enemies and remaining health,
- active Alliances,
- near-miss Alliance thresholds,
- important enemy traits/abilities,
- concise data-grounded build suggestions.

The player should understand whether the next move is repositioning, a different Alliance mix, merging, acquiring a missing Summon or freeing Camp space to pursue a new build.

## 17. Defense Podium

Defense stores three persistent formations:

```text
Round 1: 2 Summons
Round 2: 4 Summons
Round 3: 6 Summons
```

Rules:

- Build by dragging/selecting actual Camp Summons.
- Same instance may appear across different rounds.
- Same instance cannot appear twice within one round.
- Position/cell is gameplay state.
- Show Formation Power and Alliances while editing.
- Show Time Shield state and expiry.
- Save a server-authoritative canonical Defense formation using real Summon instance IDs.
- Ownership changes must revalidate saved Defense rather than fabricate unavailable units.

When matched, the server creates an immutable versioned snapshot for that Raid.

### Defended-Raid reward FIFO

A losing attacker transfers their surrendered Summon to the defender's unlimited pending FIFO queue.

The queue is intentionally not controllable storage.

Pending Summons:

- are ordered strictly FIFO,
- cannot be reordered,
- cannot merge,
- cannot be released or sold while pending,
- cannot battle or defend,
- do not count toward Power or Alliances,
- do not occupy Camp,
- can only claim from the queue head into a free Camp cell.

## 18. Raid matchmaking

Raid is asynchronous PvP against saved Defense.

### Attacker requirements

- at least one free/unreserved Camp slot,
- not already in a Raid,
- valid account/inventory state.

Starting matchmaking:

- immediately breaks attacker's Time Shield,
- reserves one free Camp destination cell,
- acquires an exclusive active-Raid lock.

### Defender requirements

- Time Shield inactive,
- no existing Raid lock/reservation,
- valid 2/4/6 Defense,
- at least one exposed stealable Summon,
- within server-configured Account Power matchmaking range.

A defender can be reserved by exactly one attacker at a time. The server lock has a TTL/recovery strategy for abandoned sessions.

Matchmaking primarily compares Account Power, with balance-configurable search bands.

## 19. Raid series

Every Raid is three automatic combat rounds:

```text
Round 1: 2v2
Round 2: 4v4
Round 3: 6v6
```

Attacker setup timers:

```text
Round 1: 10 seconds
Round 2: 20 seconds
Round 3: 30 seconds
```

If the player does not complete a legal setup in time, the server automatically deploys the strongest legal 2/4/6 formation and starts that round.

A Summon can be reused across rounds but cannot occupy multiple slots inside one round.

Each round resets HP, cooldowns, statuses, temporary effects and other transient combat state.

Combat is deterministic from authoritative snapshots and seeds. Each round ultimately resolves win/loss so best-of-three always settles. If battle duration reaches a cap, use deterministic tie-break rules in combat-core, ending with a seeded tie-break only if prior metrics are exactly equal.

Client disconnect does not stop server setup or settlement timers.

## 20. Attacker wins: steal settlement

If attacker wins the series:

1. Show `OPPONENT_CAMP.STEAL_SELECTION` from the locked defender Camp snapshot.
2. Only exposed, non-Illuminati instances are eligible.
3. Attacker has 30 seconds to choose one.
4. Timeout causes the **server to select randomly from the eligible pool**, not the strongest unit.
5. Server atomically transfers that exact Summon instance to the attacker's reserved Camp cell.
6. Defender gets a full 8-hour Time Shield reset.
7. Raid locks release only after idempotent settlement completes.

## 21. Attacker loses: surrender settlement

If attacker loses the series:

1. Create the candidate pool from distinct Summon instances actually used across the 12 deployment slots in the `2 + 4 + 6` rounds.
2. Reusing one instance across multiple rounds still makes it one candidate.
3. Attacker has 30 seconds to select the surrendered Summon.
4. Timeout causes the server to select the **weakest eligible used Summon** according to the canonical Power resolver.
5. Server atomically removes ownership from attacker.
6. Defender receives the Summon at the tail of Defense reward FIFO.
7. Attacker's reserved win slot is released.
8. Attacker's Time Shield remains broken.

This makes outgoing Raids meaningfully risky.

## 22. Combat and anime presentation

Combat is automatic after formation lock, but it should look and read like a short anime battle.

Required visual readability:

- movement toward valid targets,
- coherent targeting and retargeting,
- anticipation and hit feedback for basic attacks,
- distinct skills and VFX,
- visible crowd-control/status outcomes,
- understandable deaths and remaining threats.

Battle viewer supports:

```text
1x | 2x | 4x
```

These are presentation speeds only. Speed changes may not alter simulation seed, targeting, cooldowns, movement decisions, damage, event order or winner.

Server/deterministic simulation produces the event stream. PlayCanvas presents it.

## 23. Tutorial

New players boot into Campaign tutorial. Returning players boot into Base.

Tutorial should use world affordances and concise guidance rather than blocking modal instruction cards.

Canonical first journey:

1. **Campaign:** select/position a starter formation and watch automatic combat.
2. **Battle Camp:** learn that the 6x6 Camp is the physical inventory.
3. **Illuminati:** move a Summon into a protected cell.
4. **Dealer:** learn Balls, 2-hour refill-to-100 and Time Shield.
5. **Spawn Machine:** release an F-tier Ball reward and interact with a special Blob meter.
6. **Merge:** use an explicitly scripted tutorial duplicate to merge F → E.
7. **Defense:** configure basic 2/4/6 defense and see Alliances/protection.
8. **Raid:** experience timed setup and automatic combat.
9. **Opponent Camp:** after a tutorial-safe win, steal an exposed Summon.

Tutorial reward scripting is explicitly server-authoritative and separate from normal daily random outcomes.

Do not teach manual skill casting or Auto-Cast. V1 combat is always automatic.

## 24. Authority, timers and ownership

The client submits intent. The server commits value.

Persistent/economic actions require idempotent action IDs, including:

- Spawn,
- merge/release,
- Dealer refill,
- Campaign milestone settlement,
- Defense save,
- matchmaking reservation,
- Raid timeout auto-deploy,
- Raid result settlement,
- steal/surrender selection or timeout,
- Time Shield break/reset,
- FIFO claim.

Ownership transfers use database transactions and locking so retries, disconnects or concurrent requests cannot duplicate a Summon or transfer one instance twice.

Client local storage may cache non-economic preferences such as camera/replay speed. It is not authoritative for Summons, Balls, progress, protection or PvP.

## 25. Content and assets

Static game content is versioned and data-driven.

Each Summon asset manifest must be able to describe:

```text
world model / GLB
portrait / icon
idle animation
run animation
basic attack animation
skill animations
hit animation
death animation
scale
ground offset
attack or projectile origin
VFX anchors
optional tier-form overrides
fallback presenter
```

Heavy worlds and character assets load lazily. Do not instantiate every future world or heavy asset at boot.

## 26. Input and layout

Landscape is the primary orientation, supporting desktop pointer and mobile touch.

Input priority:

```text
blocking system modal
→ active feature UI
→ active scene interaction
→ camera gesture
```

Only one layer consumes a gesture. Summon Inspect is deliberately non-modal. Other true blocking system modals must prevent world click-through.

## 27. V1 acceptance invariants

V1 is not correct until automated tests protect these statements:

- Camp never exceeds 36 usable Summons.
- Full Camp Spawn consumes no Ball.
- Raid reserves its win destination slot.
- Dealer refills below-100 balance to exactly 100 after each eligible 2-hour cooldown.
- Daily global Spawn uses six F-tier identities at `10/15/25/25/15/10` bin probabilities.
- Blob meters can be independently configured.
- Time Shield caps at 8 hours.
- Outgoing Raid breaks attacker Shield.
- Defender Raid loss resets Shield to full 8 hours.
- Illuminati protects 6 base cells or 12 upgraded cells while total Camp remains 36.
- No player participates in parallel Raids.
- Matchmaking is server-side and Power-aware.
- Raid setup timeouts auto-deploy legal 2/4/6 formations.
- Winning steal timeout chooses randomly from eligible exposed defender pool.
- Losing surrender timeout chooses the weakest distinct used attacker Summon.
- Ownership transfer is atomic and idempotent.
- Defense FIFO is unlimited but unusable/unreorderable until claimed.
- Campaign formation is explicitly selected and positioned.
- Campaign Auto Progress continues while navigating inside the app, stops on defeat and pauses before 10/100 bosses.
- `1x/2x/4x` affects presentation only.
- New-player tutorial starts Campaign.
- Summon Inspect keeps Camp usable.
- Alliances are the only synergy terminology exposed to players.

## 28. V1 non-goals and future seams

Not required in V1:

- closed-app/offline Campaign farming,
- Camp inventory expansion,
- separate Origin/Combat Function synergy categories,
- manual combat skill casting,
- Campaign run resets,
- destructible Spawn Machine,
- full Dealer IAP shop,
- paid temporary Vault/storage,
- advanced alternate Blob mini-games.

Future systems may extend these seams but cannot bypass the 36-cell economy, authority model or ownership transaction rules without an explicit product change here.

## 29. IP boundary

Current named anime characters such as Goku, Naruto, Luffy, Eren, L and Lelouch are prototype placeholders only. Commercial release requires licensing or original replacement IP. Game rules, Alliances and assets must remain replaceable without rewriting combat systems.

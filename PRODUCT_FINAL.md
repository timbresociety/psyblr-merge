# PSYBLR Product Final

Status: canonical V1 product and gameplay source of truth.

`PRODUCT_FINAL.md` defines the product. `AGENTS.md` defines implementation constraints. `README.md` defines repository operation. If code conflicts with this document, migrate the code unless the product decision is intentionally changed here first.

## 1. Product promise

PSYBLR is an incremental auto battler built around one hard physical constraint: every usable Summon lives inside a fixed 6x6 Battle Camp.

Players acquire F-equivalent entry-tier Summons through a tactile Pachinko Spawn Machine, merge identical copies into stronger tiers, construct six-unit formations around positioning and one Alliance per character, auto-progress through an increasingly difficult persistent Campaign, and risk actual Summon ownership in asynchronous PvP Raids.

The experience combines merge-game satisfaction, auto-battler preparation, anime-style combat presentation, and long-term incremental progression.

## 2. Product pillars

1. **Visible ownership.** The Battle Camp is the inventory.
2. **Hard inventory pressure.** Camp capacity is always 36 usable Summons.
3. **Tactile acquisition.** Balls run through a configurable Pachinko machine rather than a generic summon button.
4. **Preparation is the skill.** Ownership, merging, positioning, Alliance composition, and protection matter. Combat itself is automatic.
5. **Incremental momentum with roadblocks.** Campaign can advance ordinary levels automatically but stops before bosses and on defeat.
6. **PvP has downside.** A successful Raid can steal a defender Summon. A failed Raid forces the attacker to surrender one they actually used.
7. **Server authority protects value.** Creation, destruction, timers, matchmaking, and ownership transfers are authoritative, atomic, and idempotent.
8. **Content is replaceable.** Character identities, tier labels, Alliances, stats, abilities, and assets are data-driven.

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

Campaign, Base, Raid, and Opponent Camp are primary worlds. Dealer, Spawn Machine, Defense, and Summon Inspect are Base focus modes and must preserve Base spatial continuity.

## 4. Launch content contract

Launch content is built around exactly:

```text
36 Summon identities
10 ordered progression tiers
4 required skills per Summon
1 Alliance per Summon
Alliance thresholds at 2 / 4 / 6 deployed Summons
```

The final 36-character roster, tier names, exact Alliance names, character stats, skill coefficients, and Alliance tuning are supplied through content data, not hard-coded client logic.

The canonical schema lives at `@psyblr/contracts/catalog`.

### 4.1 Summon definition

A launch `SummonDefinition` contains at minimum:

```text
id
displayName
summary
allianceId
base stats
basic skill id
skill1 id
skill2 id
ultimate id
asset manifest
portrait
```

Every launch character has all four skill slots defined. Unlock timing, scaling, and presentation may vary across the ten tiers.

### 4.2 Ten-tier progression

There are exactly ten ordered progression tiers.

Tier IDs and player-facing labels are content-defined. Client architecture must not assume the current prototype labels are permanent.

Merge rules:

- Two Summon instances must have the same identity and same tier.
- The source instance is permanently consumed.
- The target instance survives and advances exactly one tier.
- The highest tier cannot merge upward.
- Tier is instance progression state, not a separate character definition.
- Merge is a server-authoritative ownership mutation.

With ten tiers, reaching the top tier from entry-tier copies requires nine merge steps.

### 4.3 Four skills

Each character owns exactly four canonical skill references:

```text
basic
skill1
skill2
ultimate
```

Combat is fully automatic. Skill activation is resolved by deterministic combat rules and tier/content configuration, not manual player casting.

## 5. Alliances

Alliance is the only player-facing synergy taxonomy.

Each Summon has exactly one `allianceId`.

Every Alliance defines exactly three activation thresholds:

```text
2 deployed Summons
4 deployed Summons
6 deployed Summons
```

Alliance activation is calculated from the actual formation being evaluated, never the entire Battle Camp.

Alliance definitions are finalized with the character balance sheet. Their effects may modify only the following approved families.

### Offense

- ATK
- Crit chance and/or crit damage

### Defense

- DEF
- Block

### Mobility

- Attack Speed
- Dodge
- Movement Speed

### Skill economy

- Skill Power
- Cooldown reduction

### Status control

- Buff potency
- Debuff potency
- Crowd-control effectiveness or duration

### Sustain

- HP
- Healing
- Drain

One Alliance may affect multiple stats inside its approved family at a threshold. All mechanics and values remain data-driven.

The old Origin and Combat Function distinction is retired. Current prototype code using those fields is migration-only and must not shape new content.

## 6. Battle Camp: the central invariant

The Battle Camp is exactly:

```text
6 x 6 = 36 usable inventory cells
BATTLE_CAMP_CAPACITY = 36
```

Inventory expansion is not allowed.

No Spawn, Raid steal, purchase, reward claim, recovery path, or future feature may create Summon number 37 in usable Camp inventory.

When Camp is full:

- Spawn is disabled before Ball consumption.
- Defense FIFO rewards cannot be claimed.
- Outgoing Raid is disabled because a Raid win needs a destination.
- The player must merge or permanently release a Summon to make room.

A permanent Summon Release action must exist before inventory pressure can hard-lock the player.

Future temporary storage may hold Summons outside active Camp, but it does not increase the 36 usable Camp cells and must be an explicit separate system.

### Raid slot reservation

Raid entry requires at least one free Camp cell. Once matchmaking starts, one free cell is reserved for the attacker until settlement or cancellation. Spawn and other incoming Camp mutations treat that reserved cell as unavailable.

## 7. Battle Camp interaction

The Camp remains the primary Base surface.

- Drag to empty cell: move.
- Drag onto a non-mergeable Summon: swap.
- Drag onto the same identity and same tier: merge.
- Tap Summon: select and open inspection.
- Tap-to-move is supported as a mobile-friendly alternative.
- Invalid targets remain stable and explain failure without accidental click-through.

Interaction should feel like a mature auto-battler board, not an inventory menu.

## 8. Summon Inspect

Selecting a Summon automatically opens a contextual right-side drawer while the Battle Camp remains visible and interactive.

The drawer is non-modal and has no fullscreen backdrop. Selecting another Summon updates the same drawer immediately.

Show at minimum:

- identity and tier,
- Summon Power,
- resolved stats,
- four skills and relevant cooldown/unlock state,
- Alliance,
- active and next Alliance threshold when relevant,
- merge progression,
- permanent Release action.

On narrow landscape screens, reframe the Camp to preserve grid access rather than covering important cells.

## 9. Power system

Power communicates expected strength and supports matchmaking, but does not guarantee a winner.

### Summon Power

Deterministic score from resolved tier stats and combat-relevant skill coefficients.

### Formation Power

Score of the actual deployed formation after active Alliance modifiers. Used in Campaign and formation previews.

### Account Power

Score of the six strongest usable Battle Camp Summons. Used as the primary Raid matchmaking signal.

### Enemy Power

Campaign difficulty target for the current level.

All calculations live in one versioned shared `PowerScoreResolver`. UI must not invent independent formulas.

## 10. Base

### BASE.IDLE

Returning-player home. Camera prioritizes the full 6x6 Camp and surrounding structures.

### BASE.SUMMON_INSPECT

Non-modal contextual drawer described above.

### BASE.DEALER

Free Ball refill and education surface now. Future IAP shop later.

### BASE.SPAWN_MACHINE

Pachinko focus mode inside Base.

### BASE.DEFENSE

View saved Raid defense, protection state, and defended-Raid rewards. Editing and saving 2/4/6 defense is allowed only while Time Shield is inactive.

## 11. Balls and Dealer

Balls power the Spawn Machine.

Ball balance may exceed 100 through Campaign milestones, purchases, or future non-Dealer rewards.

The Dealer is a refill, not a +100 grant.

```text
REFILL_TARGET = 100
REFILL_COOLDOWN = 2 hours after successful refill
```

A refill can settle only when:

1. two hours have elapsed since the last successful Dealer refill, and
2. current Ball balance is below 100.

Settlement:

```text
balls_after = 100
balls_granted = 100 - balls_before
```

If the cooldown finishes while Ball balance is 100 or higher, the refill remains ready. When balance later drops below 100, it can be collected immediately.

Dealer timing and Ball balance are server authoritative.

## 12. Spawn Machine

The Spawn Machine is content/config driven. Do not hard-code today's bin distribution or Blob behavior into world logic.

### 12.1 Daily global six

For V1, every player sees the same six reward identities for a server day.

The server creates one global daily pool from six random active Summon identities. Use distinct identities when at least six active candidates exist.

The pool changes once per fixed server-day boundary and has a stable `dailyPoolId`.

All six base reward bins produce entry-tier Summons. Direct higher-tier drops are not part of V1.

Current left-to-right probabilities:

```text
10% | 15% | 25% | 25% | 15% | 10%
```

This means 100 Balls create 100 entry-tier Summon instances before merges, not an accelerated equivalent value through direct E/D drops.

### 12.2 Spawn authority

Server determines reward, commits Ball consumption and Summon creation, and returns a deterministic presentation/replay descriptor.

Pachinko physics is the visual realization of an authoritative result. Production may not silently fall back to client randomness if authority is unavailable.

A Ball can be released only when the player owns at least one Ball and Camp has an unreserved free cell. Failure consumes nothing.

### 12.3 Blob targets

Two visually obvious Blob targets exist in the machine.

Each owns an independent meter and independent configurable effect contract:

```text
id
visual identity
hitsRequired
meter state
effect type
effect amount
availability rules
```

For V1, Blob effects can grant Time Shield progress. Exact hit thresholds and time grants are balance configuration, not product constants.

## 13. Time Shield

Time Shield protects the entire Battle Camp from incoming Raid selection.

Rules:

- Maximum remaining Time Shield is 8 hours.
- New grants extend remaining duration only up to 8 hours.
- A shielded player cannot be matched as a defender.
- Starting an outgoing Raid immediately breaks the attacker's Time Shield.
- A defender who loses a Raid receives a full 8-hour Time Shield reset at settlement.
- Shield uses authoritative server time.

Time Shield does not protect individual exposed cells after a Raid has already been validly locked. Illuminati handles cell-level protection.

## 14. Illuminati protection

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

## 15. Campaign

Campaign is a persistent ladder with no V1 run reset.

### 15.1 Setup

Player selects up to six owned Summons and positions them on the player side. The formation persists across ordinary Auto Progress battles until changed or invalidated by ownership changes.

Never infer Campaign formation from roster order.

### 15.2 Combat

Once started, combat is fully automatic.

### 15.3 Level rhythm

- Ordinary levels fill the ladder.
- Mini-boss every 10 levels except multiples of 100.
- Main Arc boss every 100 levels.
- Each 100-level block represents a new story Arc.
- Enemy Power continually increases according to versioned balance curves.

### 15.4 Auto Progress

A small symbolic Auto Progress control appears in the battle UI.

When enabled:

- ordinary wins automatically advance to the next ordinary level,
- the same deployed formation continues fighting,
- progression continues if the player navigates elsewhere inside the active app,
- defeat stops Auto Progress immediately,
- Auto Progress pauses before every Level 10 mini-boss,
- Auto Progress pauses before every Level 100 Arc boss.

The player deliberately starts boss battles. Auto Progress may resume afterward.

Closed-app/offline farming is not promised in V1.

### 15.5 Campaign Ball rewards

Ordinary levels do not continuously generate Balls.

Ball rewards occur only at every 10 cleared levels. Exact quantities are balance configuration. These rewards are additive and may push Ball balance above 100.

### 15.6 Roadblock summary

On defeat, stop Auto Progress and show enough information to make rebuilding strategic.

Show:

- Formation Power versus Enemy Power,
- damage dealt by each Summon,
- damage taken by each Summon,
- first deaths,
- surviving enemies and remaining health,
- active Alliance threshold,
- near-miss Alliance threshold when relevant,
- important enemy traits and abilities.

## 16. Defense Podium

Defense stores three persistent formations:

```text
Round 1: 2 Summons
Round 2: 4 Summons
Round 3: 6 Summons
```

Rules:

- Build from actual Camp Summon instance IDs.
- Same instance may appear across different rounds.
- Same instance cannot appear twice within one round.
- Position/cell is gameplay state.
- Show Formation Power and Alliance state while editing.
- Show Time Shield state and expiry.
- Save canonical Defense server-side.
- Ownership changes must revalidate Defense rather than fabricate unavailable units.
- View is allowed while shielded. Editing/saving is disabled while Time Shield is active.

When matched, the server creates an immutable versioned Defense snapshot for that Raid.

### 16.1 Defended-Raid reward FIFO

A losing attacker transfers their surrendered Summon to the defender's unlimited pending FIFO queue.

This queue is intentionally not controllable storage.

Pending Summons:

- are ordered strictly FIFO,
- cannot be reordered,
- cannot merge,
- cannot be released or sold while pending,
- cannot battle or defend,
- do not count toward Power or Alliance activation,
- do not occupy Camp,
- can only claim from the queue head into a free Camp cell.

The queue may be unlimited because the user cannot use it as active inventory or choose which pending reward to access first.

## 17. Raid matchmaking

Raid is asynchronous PvP against saved Defense.

### Attacker requirements

- at least one free/unreserved Camp slot,
- not already in a Raid,
- valid account and inventory state.

Starting matchmaking:

- immediately breaks the attacker's Time Shield,
- reserves one free Camp destination cell,
- acquires an exclusive active-Raid lock.

### Defender requirements

- Time Shield inactive,
- no existing Raid lock/reservation,
- valid 2/4/6 Defense,
- at least one exposed stealable Summon,
- within server-configured Account Power matchmaking range.

A defender can be reserved by exactly one attacker at a time. Server locks must have TTL/recovery handling for abandoned sessions.

Matchmaking primarily compares Account Power.

## 18. Raid series

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

Each round resets HP, cooldowns, statuses, temporary effects, and other transient combat state.

Combat is deterministic from authoritative snapshots and seeds. Round and series resolution must always settle deterministically. Client disconnect does not stop setup or settlement timers.

## 19. Attacker wins: steal settlement

If attacker wins the series:

1. Show `OPPONENT_CAMP.STEAL_SELECTION` from the locked defender Camp snapshot.
2. Only exposed, non-Illuminati instances are eligible.
3. Attacker has 30 seconds to choose one.
4. Timeout causes the server to select randomly from the eligible pool, not the strongest unit.
5. Server atomically transfers that exact Summon instance to the attacker's reserved Camp cell.
6. Defender gets a full 8-hour Time Shield reset.
7. Raid locks release only after idempotent settlement completes.

Random timeout selection uses authoritative server randomness and is auditable from the Raid settlement record.

## 20. Attacker loses: surrender settlement

If attacker loses the series:

1. Build the candidate pool from distinct Summon instances actually used across the 12 deployment slots in the `2 + 4 + 6` rounds.
2. Reusing one instance across rounds still creates only one candidate.
3. Attacker has 30 seconds to choose the surrendered Summon.
4. Timeout causes the server to select the weakest eligible used Summon according to the canonical Power resolver.
5. Server atomically removes ownership from attacker.
6. Defender receives the Summon at the tail of Defense reward FIFO.
7. Attacker's reserved win slot is released.
8. Attacker's Time Shield remains broken.

## 21. Combat and anime presentation

Combat is automatic after formation lock, but should read like a short anime battle.

Required readability:

- movement toward valid targets,
- coherent targeting and retargeting,
- anticipation and hit feedback for basic attacks,
- distinct skill animations and VFX,
- visible crowd-control/status outcomes,
- understandable deaths and remaining threats.

Battle viewer supports:

```text
1x | 2x | 4x
```

These are presentation speeds only. They may not alter simulation seed, targeting, cooldowns, movement decisions, damage, event order, or winner.

Server/deterministic simulation produces the event stream. PlayCanvas presents it.

## 22. Tutorial

New players boot into Campaign tutorial. Returning players boot into Base.

Tutorial uses world affordances and concise guidance rather than blocking instruction cards.

Canonical first journey:

1. **Campaign:** select and position a starter formation and watch automatic combat.
2. **Battle Camp:** learn that the 6x6 Camp is physical inventory.
3. **Illuminati:** move a Summon into a protected cell.
4. **Dealer:** learn Balls, 2-hour refill-to-100, and Time Shield.
5. **Spawn Machine:** release an entry-tier reward and interact with a Blob meter.
6. **Merge:** use a scripted duplicate to perform the first tier upgrade.
7. **Defense:** configure basic 2/4/6 defense and see Alliance/protection state.
8. **Raid:** experience timed setup and automatic combat.
9. **Opponent Camp:** after a tutorial-safe win, steal an exposed Summon.

Tutorial reward scripting is server authoritative and separate from normal daily random outcomes.

Do not teach manual skill casting or Auto-Cast. V1 combat is automatic.

## 23. Authority, timers, and ownership

The client submits intent. The server commits value.

Persistent/economic actions require idempotent action IDs, including:

- Spawn,
- merge and release,
- Dealer refill,
- Campaign milestone settlement,
- Defense save,
- matchmaking reservation,
- Raid timeout auto-deploy,
- Raid result settlement,
- steal and surrender selection or timeout,
- Time Shield break and reset,
- FIFO claim.

Ownership transfers use database transactions and locking so retries, disconnects, or concurrent requests cannot duplicate a Summon or transfer one instance twice.

Client local storage may cache non-economic preferences such as camera and replay speed. It is not authoritative for Summons, Balls, progress, protection, or PvP.

## 24. Content and assets

Static content is versioned and data-driven.

Each Summon asset manifest must support:

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

## 25. Input and layout

Landscape is the primary orientation, supporting desktop pointer and mobile touch.

Input priority:

```text
blocking system modal
→ active feature UI
→ active scene interaction
→ camera gesture
```

Only one layer consumes a gesture. Summon Inspect is deliberately non-modal. True blocking modals must prevent world click-through.

## 26. Architecture contract

`apps/game` owns presentation and interaction only.

Pure gameplay rules belong in shared packages. Durable state belongs to server-authoritative persistence. HUDs and worlds do not own durable player state.

Production gateway failures must fail explicitly. Do not silently fall back to client-side economy, local storage authority, or random settlement.

One PlayCanvas Application serves all worlds. Logical world/mode routers control lifecycle. Heavy assets load lazily.

## 27. V1 acceptance invariants

V1 is not correct until automated tests protect these statements:

- Launch catalog validator accepts exactly 36 Summon definitions and rejects any other count.
- Tier progression validator accepts exactly 10 unique ordered tiers.
- Every launch Summon has exactly four required skill references.
- Every launch Summon has exactly one `allianceId`.
- Every Alliance defines exactly 2/4/6 thresholds.
- Alliance modifiers stay inside the approved six effect families.
- Camp never exceeds 36 usable Summons.
- Full Camp Spawn consumes no Ball.
- Raid reserves its win destination slot.
- Dealer refills eligible below-100 balance to exactly 100 after the 2-hour cooldown.
- Daily global Spawn uses six entry-tier identities at `10/15/25/25/15/10` probabilities.
- Blob meters are independently configurable.
- Time Shield caps at 8 hours.
- Outgoing Raid breaks attacker Time Shield.
- Defender Raid loss resets Shield to full 8 hours.
- Illuminati protects 6 base cells or 12 upgraded cells while total Camp remains 36.
- No player participates in parallel Raids.
- Matchmaking is server-side and Power-aware.
- Raid setup timeouts auto-deploy legal 2/4/6 formations.
- Winning steal timeout chooses randomly from the eligible exposed defender pool.
- Losing surrender timeout chooses the weakest distinct used attacker Summon.
- Ownership transfer is atomic and idempotent.
- Defense FIFO is unlimited but unusable and unreorderable until claimed.
- Campaign formation is explicitly selected and positioned.
- Campaign Auto Progress continues during in-app navigation, stops on defeat, and pauses before 10/100 bosses.
- `1x/2x/4x` affects presentation only.
- New-player tutorial starts in Campaign.
- Summon Inspect keeps Camp usable.
- Alliance is the only synergy terminology exposed to players.

## 28. V1 non-goals and future seams

Not required in V1:

- closed-app/offline Campaign farming,
- Camp inventory expansion,
- separate Origin/Combat Function synergy categories,
- manual combat skill casting,
- Campaign run resets,
- destructible Spawn Machine,
- full Dealer IAP shop,
- paid temporary storage,
- advanced alternate Blob mini-games.

Future systems may extend these seams but cannot bypass the 36-cell economy, authority model, or ownership transaction rules without an explicit product change here.

## 29. Migration status

The repository currently contains a six-character prototype whose legacy schema uses nine hard-coded tier labels plus Origin and Combat Function fields.

That prototype is not the launch content contract.

The new launch schema is available at `@psyblr/contracts/catalog` and locks:

```text
36 Summons
10 tiers
4 skills
1 Alliance per Summon
2/4/6 Alliance thresholds
```

Do not invent temporary launch character assignments merely to remove the legacy fields. When the final 36-character spec sheet arrives, migrate `packages/game-content`, shared rules, runtime presentation, and validators to the canonical catalog in one tested cutover.

## 30. IP boundary

Current named anime characters are prototype content only. Commercial release requires appropriate licensing or original replacement IP. Game rules, Alliance definitions, tier progression, abilities, and asset contracts must remain replaceable without rewriting the core systems.

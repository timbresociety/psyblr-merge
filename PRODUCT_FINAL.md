# PSYBLR Product Final

Status: canonical V1 product and gameplay source of truth.

`PRODUCT_FINAL.md` defines the product. `AGENTS.md` defines implementation constraints. `README.md` defines repository operation. If code conflicts with this document, migrate the code unless the product decision is intentionally changed here first.

## 1. Product promise

PSYBLR is an incremental auto battler built around one hard physical constraint: every usable Summon lives inside a fixed 6x6 Battle Camp.

Players acquire entry-tier Summons through a tactile Pachinko Spawn Machine, merge identical copies into stronger tiers, build formations around positioning and Alliance composition, auto-progress through an increasingly difficult persistent Campaign, and risk actual Summon ownership in asynchronous PvP Raids.

The experience combines merge-game satisfaction, auto-battler preparation, anime-style combat presentation, and long-term incremental progression.

## 2. Product pillars

1. **Visible ownership.** The Battle Camp is the inventory.
2. **Hard inventory pressure.** Camp capacity is always 36 usable Summons.
3. **Tactile acquisition.** Balls run through a configurable Pachinko machine rather than a generic summon button.
4. **Preparation is the skill.** Ownership, merging, positioning, Alliance composition, protection, and formation design matter. Combat itself is automatic.
5. **Incremental momentum with roadblocks.** Campaign can advance ordinary levels automatically but stops before bosses and on defeat.
6. **PvP has downside.** A successful Raid can steal a defender Summon. A failed Raid forces the attacker to surrender one they actually used.
7. **Server authority protects value.** Creation, destruction, timers, matchmaking, progression, and ownership transfers are authoritative, atomic, and idempotent.
8. **Content is replaceable.** Character identities, tier labels, Alliances, stats, passives, abilities, and assets are data-driven.

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

Launch content is exactly:

```text
36 Summon identities
6 Alliances
6 Summons per Alliance
10 ordered progression tiers
4 required skill references per Summon
1 required passive reference per Summon
1 Alliance per Summon
Alliance thresholds at 2 / 4 / 6 deployed Summons
```

The four required skill references are:

```text
basic
skill1
skill2
ultimate
```

The passive is a separate required reference:

```text
passiveId
```

This preserves the intended kit of Basic + Passive + Skill 1 + Skill 2 + Ultimate while keeping the passive structurally distinct from active skill execution.

The final 36-character roster, tier IDs and labels, per-character tier form names, exact Alliance names, base stats, skill coefficients, passive mechanics, tier unlocks, and Alliance tuning are supplied through versioned content data rather than hard-coded client logic.

The canonical launch schema lives at `@psyblr/contracts/catalog`.

## 5. Summon progression and merge

There are exactly ten ordered progression tiers.

Tier IDs and labels remain content-defined until the final character sheet locks them. Client architecture must not assume the current prototype nine-tier enum or invent a permanent tenth label.

Every Summon identity can progress through the full ten-tier ladder. Tier is state on a Summon instance, not a separate character definition.

Merge rules:

- Two Summon instances must have the same identity and same tier.
- The source instance is permanently consumed.
- The target instance survives and advances exactly one tier.
- The highest tier cannot merge upward.
- Merge is a server-authoritative ownership mutation.
- Merge frees one Camp cell.

Reaching the tenth tier from entry-tier copies requires nine merge steps.

Per-character visual form names, skill unlocks, passive mutations, skill upgrades, and tier-specific asset changes are content. They do not create extra combat buttons beyond Basic, Skill 1, Skill 2, and Ultimate.

## 6. Combat kit

Every launch Summon has exactly:

- one Basic attack,
- one Passive,
- Skill 1,
- Skill 2,
- one Ultimate.

Combat is fully automatic. There is no manual skill casting in V1.

Ability activation, cooldowns, targeting, tier unlock state, passive triggers, buffs, debuffs, crowd control, healing, drain, and other effects are resolved by deterministic combat rules and versioned content.

## 7. Alliances

Alliance is the only player-facing synergy taxonomy.

There are exactly six launch Alliances. Each launch Alliance contains exactly six Summons. This guarantees that every Alliance can reach its 6-piece threshold while every character still belongs to only one Alliance.

Every Summon has exactly one `allianceId`.

Every Alliance defines exactly three activation thresholds:

```text
2 deployed Summons
4 deployed Summons
6 deployed Summons
```

Alliance activation is calculated from the actual formation being evaluated, never the entire Battle Camp.

Alliance effects may modify only these approved families:

1. **Offense:** ATK, Crit.
2. **Defense:** DEF, Block.
3. **Mobility:** Attack Speed, Dodge, Movement Speed.
4. **Skill economy:** Skill Power, Cooldown reduction.
5. **Status control:** buffs, debuffs, crowd-control effectiveness or duration.
6. **Sustain:** HP, healing, drain.

One Alliance may affect multiple stats inside its approved family at a threshold. Exact values remain balance data.

The old Origin and Combat Function distinction is retired and must not shape launch content.

## 8. Battle Camp

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

## 9. Battle Camp interaction

The Camp remains the primary Base surface.

- Drag to empty cell: move.
- Drag onto a non-mergeable Summon: swap.
- Drag onto the same identity and same tier: merge.
- Tap Summon: select and open inspection.
- Tap-to-move is supported as a mobile-friendly alternative.
- Invalid targets remain stable and explain failure without accidental click-through.

Interaction should feel like a mature auto-battler board rather than an inventory menu.

## 10. Summon Inspect

Selecting a Summon opens a contextual right-side drawer while the Battle Camp remains visible and interactive.

The drawer is non-modal and has no fullscreen backdrop. Selecting another Summon updates the same drawer immediately. Dragging and Camp interaction remain available while it is open.

Show at minimum:

- identity and current tier,
- per-tier form name when content provides one,
- Summon Power,
- resolved stats,
- Basic, Passive, Skill 1, Skill 2, and Ultimate with relevant unlock/cooldown state,
- singular Alliance,
- active and next Alliance threshold when relevant,
- merge progression,
- permanent Release action.

On narrow landscape screens, reframe the Camp to preserve full grid access rather than covering important cells.

## 11. Power system

Power communicates expected strength and supports matchmaking, but does not guarantee a winner.

### Summon Power

Deterministic score from resolved tier stats, passive coefficients, and combat-relevant skill coefficients.

### Formation Power

Score of the actual deployed formation after active Alliance modifiers. Used in Campaign and formation previews.

### Account Power

Score of the six strongest usable Battle Camp Summons. Used as the primary Raid matchmaking signal.

### Enemy Power

Campaign difficulty target for the current level.

All calculations live in one versioned shared `PowerScoreResolver`. UI must not invent independent formulas.

## 12. Base

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

## 13. Balls and Dealer

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

## 14. Spawn Machine

The Spawn Machine is content/config driven. Do not hard-code the current bin distribution or Blob behavior into world logic.

### Daily global six

For V1, every player sees the same six reward identities for a fixed server day.

The server creates one global daily pool from six random active Summon identities. Use distinct identities when at least six active candidates exist. The pool has a stable `dailyPoolId`.

All six base reward bins produce entry-tier Summons. Direct higher-tier drops are not part of V1.

Current left-to-right probabilities are:

```text
10% | 15% | 25% | 25% | 15% | 10%
```

One Ball always resolves to one entry-tier Summon instance before merging. There is no hidden higher-tier equivalent payout.

### Spawn authority

Server determines reward, commits Ball consumption and Summon creation, and returns a deterministic presentation descriptor.

Pachinko physics is the visual replay of an authoritative result. Production may not silently fall back to client randomness if authority is unavailable.

A Ball can be released only when the player owns at least one Ball and Camp has an unreserved free cell. Failure consumes nothing.

### Blob targets

Two visually obvious Blob targets exist in the machine.

Each owns an independent configurable meter contract containing at minimum:

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

## 15. Time Shield

Time Shield protects the entire Battle Camp from incoming Raid matchmaking.

Rules:

- Maximum remaining Time Shield is 8 hours.
- New grants extend remaining duration only up to 8 hours.
- A shielded player cannot be matched as a defender.
- Starting an outgoing Raid immediately breaks the attacker's Time Shield.
- A defender who loses a Raid receives a full 8-hour Time Shield reset at settlement.
- Shield uses authoritative server time.

Time Shield does not retroactively invalidate an already valid locked Raid.

## 16. Illuminati protection

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

## 17. Campaign

Campaign is a persistent ladder with no V1 run reset.

### Setup

Player selects up to six owned Summons and positions them on the player side. The formation persists across ordinary Auto Progress battles until changed or invalidated by ownership changes.

Never infer Campaign formation from roster order.

### Combat

Once started, combat is fully automatic.

### Level rhythm

- Ordinary levels fill the ladder.
- Mini-boss every 10 levels except multiples of 100.
- Main Arc boss every 100 levels.
- Each 100-level block represents a new story Arc.
- Enemy Power increases according to versioned balance curves.

### Auto Progress

A small symbolic Auto Progress control appears in the battle UI.

When enabled:

- ordinary wins automatically advance to the next ordinary level,
- the same deployed formation continues fighting,
- progression continues if the player navigates elsewhere inside the active app,
- defeat stops Auto Progress immediately,
- Auto Progress pauses before every Level 10 mini-boss,
- Auto Progress pauses before every Level 100 Arc boss.

The player deliberately starts boss battles. Auto Progress may resume afterward.

Closed-app or offline farming is not promised in V1.

### Campaign Ball rewards

Ordinary levels do not continuously generate Balls.

Ball rewards occur only at every 10 cleared levels. Exact quantities are balance configuration. These rewards are additive and may push Ball balance above 100.

### Roadblock summary

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

## 18. Defense Podium

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
- View is allowed while shielded.
- Editing and saving are disabled while Time Shield is active.

When matched, the server creates an immutable versioned Defense snapshot for that Raid.

### Defended-Raid reward FIFO

A losing attacker transfers the surrendered Summon to the defender's unlimited pending FIFO queue.

The queue is intentionally non-interactive pending inventory.

Pending Summons:

- are ordered strictly FIFO,
- cannot be reordered,
- cannot merge,
- cannot be released or sold while pending,
- cannot battle or defend,
- do not count toward Power or Alliance activation,
- do not occupy Camp,
- can only claim from the queue head into a free Camp cell.

The queue may be unlimited because the user cannot use it as active storage or choose which pending reward to access first.

## 19. Raid matchmaking

Raid is asynchronous PvP against saved Defense.

### Attacker requirements

- at least one free and unreserved Camp slot,
- not already in a Raid,
- valid account and inventory state.

Starting matchmaking:

- immediately breaks the attacker's Time Shield,
- reserves one free Camp destination cell,
- acquires an exclusive active-Raid lock.

### Defender requirements

- Time Shield inactive,
- no existing Raid lock or reservation,
- valid 2/4/6 Defense,
- at least one exposed stealable Summon,
- within server-configured Account Power matchmaking range.

A defender can be reserved by exactly one attacker at a time. Server locks require TTL and recovery handling for abandoned sessions.

Matchmaking primarily compares Account Power.

## 20. Raid series

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

Each round resets HP, cooldowns, statuses, temporary effects, and all other transient combat state.

Combat is deterministic from authoritative snapshots and seeds. Client disconnect does not stop setup or settlement timers.

A Raid series must always resolve to an attacker win or attacker loss. Neither a combat timeout nor a tied round count may leave the series unresolved. The exact tie-break sequence belongs to deterministic server/combat rules and must be stable, versioned, replayable, and tested.

## 21. Attacker wins: steal settlement

If attacker wins the series:

1. Show `OPPONENT_CAMP.STEAL_SELECTION` from the locked defender Camp snapshot.
2. Only exposed, non-Illuminati instances are eligible.
3. Attacker has 30 seconds to choose one.
4. Timeout causes the server to select randomly from the eligible pool, not the strongest unit.
5. Server atomically transfers that exact Summon instance to the attacker's reserved Camp cell.
6. Defender gets a full 8-hour Time Shield reset.
7. Raid locks release only after idempotent settlement completes.

Random timeout selection uses authoritative server randomness and is auditable from the Raid settlement record.

## 22. Attacker loses: surrender settlement

If attacker loses the series:

1. Build the candidate pool from distinct Summon instances actually used across the 12 deployment slots in the `2 + 4 + 6` rounds.
2. Reusing one instance across rounds still creates only one candidate.
3. Attacker has 30 seconds to choose the surrendered Summon.
4. Timeout causes the server to select the weakest eligible used Summon according to the canonical Power resolver.
5. Server atomically removes ownership from attacker.
6. Defender receives the Summon at the tail of Defense reward FIFO.
7. Attacker's reserved win slot is released.
8. Attacker's Time Shield remains broken.

## 23. Combat presentation

Combat should read like a short anime battle while remaining a deterministic auto-battler.

Required readability:

- movement toward valid targets,
- coherent targeting and retargeting,
- anticipation and hit feedback for Basic attacks,
- distinct Skill 1, Skill 2, and Ultimate presentation,
- visible Passive triggers when they matter,
- visible crowd-control and status outcomes,
- understandable deaths and remaining threats.

Battle viewer supports:

```text
1x | 2x | 4x
```

These are presentation speeds only. They may not alter simulation seed, targeting, cooldowns, simulated time, movement decisions, damage, event order, or winner.

The deterministic simulator produces the event stream. PlayCanvas presents it.

## 24. Tutorial

New players boot into Campaign tutorial. Returning players boot into Base.

Tutorial uses world affordances and concise guidance rather than blocking instruction cards.

Canonical first journey:

1. **Campaign:** select and position a starter formation and watch automatic combat.
2. **Battle Camp:** learn that the 6x6 Camp is physical inventory.
3. **Illuminati:** move a Summon into a protected cell.
4. **Dealer:** learn Balls, 2-hour refill-to-100, and Time Shield.
5. **Spawn Machine:** release an entry-tier reward and interact with a Blob meter.
6. **Merge:** use a scripted duplicate to perform the first tier upgrade.
7. **Defense:** configure basic 2/4/6 defense and see Alliance and protection state.
8. **Raid:** experience timed setup and automatic combat.
9. **Opponent Camp:** after a tutorial-safe win, steal an exposed Summon.

Tutorial reward scripting is server authoritative and separate from normal daily random outcomes.

Do not teach manual skill casting or Auto-Cast. V1 combat is automatic.

## 25. Authority, timers, and ownership

The client submits intent. The server commits value.

Persistent or economic actions require idempotent action IDs, including:

- Spawn,
- merge and release,
- Dealer refill,
- Campaign progression and milestone settlement,
- Defense save,
- matchmaking reservation,
- Raid timeout auto-deploy,
- Raid result settlement,
- steal and surrender selection or timeout,
- Time Shield break and reset,
- FIFO claim.

Ownership transfers use database transactions and locking so retries, disconnects, or concurrent requests cannot duplicate a Summon or transfer one instance twice.

Client local storage may cache non-economic preferences such as camera and replay speed. It is not authoritative for Summons, Balls, Campaign progress, protection, Defense, or PvP.

## 26. Content versioning

Static content is versioned.

Authoritative Campaign battles, Defense snapshots, Raid locks, Raid combat snapshots, and settlements pin the content version they started with. An in-flight session does not change behavior because a new character balance or catalog version was deployed.

Stable identifiers are migration boundaries. Player-owned instances reference stable Summon definition IDs and tier IDs rather than display names.

The server must retain enough versioned content or fully resolved snapshot data to replay and settle an already-started session.

## 27. Content and assets

Each Summon asset manifest must support at minimum:

```text
world model / GLB
portrait / icon
idle animation
run animation
basic attack animation
skill 1 animation
skill 2 animation
ultimate animation
passive VFX hooks when relevant
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

## 28. Input and layout

Landscape is the primary orientation, supporting desktop pointer and mobile touch.

Input priority:

```text
blocking system modal
-> active feature UI
-> active scene interaction
-> camera gesture
```

Only one layer consumes a gesture. Summon Inspect is deliberately non-modal. True blocking modals must prevent world click-through.

## 29. Architecture contract

`apps/game` owns presentation and interaction only.

Pure gameplay rules belong in shared packages. Durable state belongs to server-authoritative persistence. HUDs and worlds do not own durable player state.

Production gateway failures must fail explicitly. Do not silently fall back to client-side economy, local storage authority, localhost services, or random settlement.

One PlayCanvas Application serves all worlds. Logical world and mode routers control lifecycle. Heavy assets load lazily.

## 30. V1 acceptance invariants

V1 is not correct until automated tests protect these statements:

- Launch catalog validator accepts exactly 36 Summon definitions and rejects any other count.
- Launch catalog contains exactly 6 Alliances and exactly 6 Summons per Alliance.
- Tier progression validator accepts exactly 10 unique ordered tiers.
- Every launch Summon has exactly four required skill references and one required passive reference.
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
- Raid series never remains a draw.
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
- In-flight Campaign and Raid sessions remain pinned to their starting content version.

## 31. V1 non-goals and future seams

Not required in V1:

- closed-app or offline Campaign farming,
- Camp inventory expansion,
- separate Origin and Combat Function synergy categories,
- multi-Alliance characters,
- manual combat skill casting,
- direct higher-tier Spawn drops,
- Campaign run resets,
- destructible Spawn Machine,
- full Dealer IAP shop,
- paid temporary storage,
- advanced alternate Blob mini-games.

Future systems may extend these seams but cannot bypass the 36-cell economy, authority model, single-Alliance character model, or ownership transaction rules without an explicit product change here.

## 32. Deferred balance and content inputs

The following are intentionally not product constants yet and should not be guessed in architecture:

- final ten tier IDs and labels,
- per-character tier form names,
- final six Alliance names,
- exact Alliance modifiers,
- final 36-character roster,
- base character stats,
- exact passive mechanics,
- skill coefficients and tier upgrades,
- `PowerScoreResolver` coefficients,
- Campaign enemy curves,
- Campaign milestone Ball quantities,
- Blob hit thresholds and Time Shield grant amounts,
- Raid matchmaking power band,
- exact deterministic Raid tie-break sequence.

These become versioned content or rules when the character and balance sheets are locked.

## 33. Migration status

The repository currently contains a six-character prototype whose legacy schema uses nine hard-coded tier labels, Origin and Combat Function fields, nullable later skills, no passive contract, and a combat path centered on Skill 1.

That prototype is not the launch content contract.

The canonical launch catalog contract locks:

```text
36 Summons
6 Alliances
6 Summons per Alliance
10 tiers
4 skill references
1 passive reference
1 Alliance per Summon
2/4/6 Alliance thresholds
```

Do not invent temporary launch character assignments merely to remove legacy fields. When the final 36-character sheet arrives, migrate content, contracts, rules, deterministic combat, runtime presentation, tutorial state, validators, and persistence together through a tested compatibility cutover.

## 34. IP boundary

Current named anime characters are prototype content only. Commercial release requires appropriate licensing or original replacement IP. Game rules, Alliance definitions, tier progression, abilities, passives, and asset contracts must remain replaceable without rewriting core systems.

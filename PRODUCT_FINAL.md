# PRODUCT_FINAL.md

# Psyblr Merge V1 Product Contract

This document is the canonical product contract for Psyblr Merge V1.

If implementation, tests, comments, prototypes, historical migrations, or older documents conflict with this file, this file wins for product behavior.

Engineering rules belong in `AGENTS.md`.
Repository setup and operations belong in `README.md`.

---

# 1. Product Definition

Psyblr Merge is a landscape-first incremental anime-style auto battler built around four connected loops:

1. **Collect** Summons through an arcade-style Spawn Machine.
2. **Merge** duplicate Summons through 10 progression tiers.
3. **Build** formations around one Alliance per Summon.
4. **Battle** through persistent Campaign progression and asynchronous PvP Raids.

The player owns a physical 6x6 Battle Camp containing their usable Summon inventory.

Combat is fully automatic.

Player expression comes from collection, merge progression, formation selection, positioning, Alliance composition, shield placement and timing, Campaign progression, and Raid risk and reward decisions.

Watching combat is itself a core part of the product experience. Battles must feel worth watching rather than like a result screen the player immediately wants to skip.

---

# 2. Launch Content Contract

V1 launches with:

- Exactly **36 Summon identities**
- Exactly **6 Alliances**
- Exactly **6 Summons per Alliance**
- Exactly **10 ordered progression tiers**
- Exactly **1 Alliance per Summon**
- Exactly **5 combat kit elements per Summon**
  - Basic Attack
  - Passive
  - Skill 1
  - Skill 2
  - Ultimate

Alliance thresholds are exactly:

- 2 deployed Summons
- 4 deployed Summons
- 6 deployed Summons

The final character sheet supplies:

- Summon names
- Basic descriptions
- Quotes
- Alliance names
- Per-character tier form names
- Base stats
- Passive definitions
- Skill definitions
- Coefficients
- Unlock tiers
- Alliance numerical effects
- Character asset manifests

Do not invent missing launch content in production code.

---

# 3. Tier Progression

The canonical V1 tier order is:

1. `F`
2. `E`
3. `D`
4. `C`
5. `B`
6. `A`
7. `S`
8. `SS`
9. `SSS`
10. `X`

`X` is the highest V1 tier.

These 10 ordered tiers are locked.

Each character may have a different visible form name at each tier while retaining the same canonical tier ID.

Example:

```text
Canonical tier: SSS
Character form: Ultra Instinct Super Saiyajin
```

Domain logic should rely on canonical tier IDs and order, while presentation may display character-specific form names.

## Merge Rule

A valid merge requires:

- Same Summon identity
- Same current tier
- Two distinct owned Summon instances

On merge:

- The target instance survives
- The source instance is consumed
- The target advances exactly one tier
- The target keeps its persistent instance identity
- One Battle Camp cell becomes free

A merge cannot exceed `X`.

No cross-character merges exist in V1.

---

# 4. Spawn-Equivalent Progression Cost

Because every normal Spawn reward in V1 begins at `F`, a higher-tier Summon represents a deterministic number of entry-tier Spawn outcomes.

| Tier | F-equivalent Summons |
| --- | ---: |
| F | 1 |
| E | 2 |
| D | 4 |
| C | 8 |
| B | 16 |
| A | 32 |
| S | 64 |
| SS | 128 |
| SSS | 256 |
| X | 512 |

This progression cost is used by the Release refund mechanic.

---

# 5. Alliances

Each Summon belongs to exactly one Alliance.

Alliance is the only player-facing formation synergy system in V1.

Origin, Combat Function, class, faction, role, and similar legacy concepts must not appear as parallel player-facing synergy systems.

Each Alliance has effects at exactly 2, 4, and 6 deployed Summons.

Alliance effects may use only these product families:

## Offense
- ATK
- Critical chance
- Critical damage

## Defense
- DEF
- Block

## Mobility
- Attack speed
- Dodge
- Movement speed

## Skill Economy
- Skill power
- Cooldown reduction

## Status Control
- Buff potency
- Debuff potency
- Crowd control effects or duration

## Sustain
- Max HP
- Healing
- Drain

Exact Alliance names and numerical values are content configuration.

Alliance counts are based on the actual deployed formation, not the player's entire inventory.

---

# 6. Combat

Combat is fully automatic.

There is no manual skill casting in V1.

Each Summon has:

- Basic Attack
- Passive
- Skill 1
- Skill 2
- Ultimate

Combat resolution uses deterministic server-authoritative rules from a versioned snapshot and seed.

The client presents the authoritative result as a choreographed 3D anime battle.

---

# 7. Combat Experience and Choreography

Combat must feel like a cinematic anime fight sequence, not a board simulation with effects layered on top.

The product quality bar includes:

- Strong character movement
- Readable spatial choreography
- Distinct attack animations
- Distinct skill animations
- Distinct Ultimate moments
- Anticipation before impactful attacks
- Contact and hit reactions
- Knockback, displacement, dashes, leaps, or other motion where appropriate
- Clear projectile travel where appropriate
- VFX with strong timing and hierarchy
- Character-specific combat personality
- Impact frames
- Camera-aware framing
- Audio cues and hit impact
- Clear ability readability despite visual spectacle
- Smooth transitions between movement, attacks, skills, reactions, and recovery

A correct combat result with boring choreography is not considered a successful combat implementation.

If players consistently prefer skipping combat because watching it has little entertainment value, the combat presentation has failed the intended product bar.

## Cinematic Director

The default viewing mode may use an automatic Cinematic Director that dynamically frames:

- Major attacks
- Ultimates
- Critical moments
- Low-health clashes
- Multi-target abilities
- Final eliminations

The Cinematic Director must never affect simulation.

## Free 3D Camera

The player may override cinematic framing and move the 3D camera during combat.

Supported presentation interactions should include, where practical:

- Orbit
- Pan
- Zoom
- Change viewing angle
- Focus on a Summon
- Return to Cinematic Director

Camera movement is presentation only.

It must never affect targeting, movement, damage, cooldowns, simulation timing, winner, or settlement.

---

# 8. Playback Speed

Players may view combat at:

- 1x
- 2x
- 4x

Playback speed changes presentation only.

It must never change simulation seed, targeting decisions, movement decisions, cooldowns, damage, event order, winner, or settlement.

Camera mode and playback speed are independent controls.

---

# 9. Anti-Stall Combat Resolution

No Campaign or Raid combat may run indefinitely.

The simulation must explicitly handle cases such as:

- Healing greater than opposing DPS
- Repeated shielding
- Extreme tank versus tank matchups
- Permanent sustain loops
- Pathing or targeting stalemates
- Abilities that create non-ending recovery cycles

Every battle has a server-authoritative finite combat timeline.

## Overdrive

After a configurable normal-combat threshold, the battle enters **Overdrive**.

Overdrive progressively increases pressure on both teams through deterministic rules such as:

- Increasing outgoing damage
- Reducing healing effectiveness
- Reducing shielding effectiveness
- Increasing anti-sustain pressure

## Final Collapse

If combat still has not concluded, a later **Final Collapse** phase applies escalating unmitigable combat pressure such as percentage-max-HP damage that:

- Cannot be blocked
- Cannot be shielded
- Cannot be healed back faster than the escalation
- Is deterministic

The purpose is to guarantee termination rather than allow infinite sustain.

Exact timing and escalation coefficients are balance configuration.

## Terminal Resolution

The server always ends the combat session.

For Campaign:

- The level clears only if the player's formation satisfies the canonical victory condition before terminal resolution.
- A non-win does not clear the level.

For Raid:

- Outcome may be `win`, `draw`, or `loss`.
- Simultaneous terminal elimination may produce a draw.
- An exact terminal tie under the canonical resolver may produce a draw.

A hard safety cap must exist even if Overdrive or Final Collapse encounters an engine edge case.

---

# 10. Power Level

The product term is **Power Level**.

Power Level is deterministic guidance, not a guaranteed predictor of battle outcome.

The product uses one shared, versioned Power Level resolver.

## Summon Power Level

Resolved from:

- Tier-adjusted stats
- Skill coefficients
- Passive contribution
- Other canonical combat coefficients

## Formation Power Level

Resolved from:

- Actual selected formation
- Summon Power Levels
- Active Alliance modifiers
- Formation-specific combat context where relevant

## Account Power Level

Account Power Level is the Power Level of the player's strongest legal six-Summon Battle Camp formation under the canonical resolver.

Account Power Level is the primary Raid matchmaking signal.

Pending Defense rewards do not count.

## Enemy Power Level

Campaign enemies expose Enemy Power Level for progression guidance and roadblock analysis.

---

# 11. Battle Camp

The Battle Camp is the player's active usable Summon inventory.

It is a physical **6x6 grid**.

Total usable capacity is exactly:

**36 Summon instances**

This is a hard limit.

No V1 action may create usable Summon instance number 37 inside the Battle Camp.

This includes Spawn, Raid steal, Defense reward claim, Purchase, Recovery, Tutorial grant, and other reward grants.

## Full Camp Rules

When the Battle Camp is full:

- Spawn is disabled before Medal consumption
- Raid attack is disabled because a win must be able to receive a stolen Summon
- Claims requiring Camp placement are blocked
- Merge remains available because it frees a cell
- Release remains available

---

# 12. Release

The player may permanently release a Summon from the Battle Camp.

Release exists both as:

- An inventory pressure valve
- A strategic economy decision

A released Summon refunds **50% of its canonical spawn-equivalent Medal cost, rounded down**.

| Tier | Release refund |
| --- | ---: |
| F | 0 Medals |
| E | 1 Medal |
| D | 2 Medals |
| C | 4 Medals |
| B | 8 Medals |
| A | 16 Medals |
| S | 32 Medals |
| SS | 64 Medals |
| SSS | 128 Medals |
| X | 256 Medals |

Formula:

```text
releaseRefund = floor(FEquivalentSpawnCost / 2)
```

Release creates an intentional Raid decision.

After stealing a Summon, a player may choose between:

- Taking a strong Summon that improves their formation or merge progression
- Taking a high-tier Summon primarily for its Release Medal value

Released Summons are permanently removed unless a future product system explicitly defines recovery.

## Future Storage

Future paid or temporary storage may exist outside the active Battle Camp.

It must never increase the 36-cell usable Battle Camp capacity unless a future product contract explicitly changes the cap.

---

# 13. Summon Inspect

Selecting a Summon opens a non-modal right-side drawer.

The Battle Camp remains usable while the drawer is open.

## Identity

Identity contains:

- Name
- Basic description
- Character quote
- Current canonical tier
- Current character form name where applicable

## Power Level

Show the Summon's resolved Power Level.

## Stat Split

The drawer must show the resolved stat split, grouped clearly.

### Core
- HP
- ATK
- DEF

### Offensive
- Attack speed
- Critical chance
- Critical damage where applicable

### Defensive
- Block chance
- Dodge chance

### Ability
- Skill Power
- Cooldown-related modifiers where applicable

### Mobility and Range
- Attack range
- Movement speed

### Sustain
- Healing Power
- Drain

If a future rules version adds another canonical resolved stat, the drawer must expose it in an appropriate group rather than hiding it.

## Combat Kit

Show:

- Basic Attack
- Passive
- Skill 1
- Skill 2
- Ultimate
- Cooldowns
- Unlock state
- Key coefficients or understandable effect descriptions where appropriate

## Alliance

Show:

- Alliance name
- Current active threshold
- Next threshold
- Current effect
- Next effect

## Progression

Show:

- Merge requirement
- Next tier
- Next character form where known
- Release refund

Selecting another Summon instantly switches the drawer.

Tapping empty world space closes it.

Dragging remains available while the drawer is open.

On narrow landscape displays, the Camp should reframe rather than hide cells behind the drawer.

---

# 14. Direct Battle Camp Manipulation

Dragging onto an empty cell:
- Moves the Summon

Dragging onto a non-mergeable occupied cell:
- Swaps the two Summons

Dragging onto the same identity at the same tier:
- Merges

A mobile-friendly tap-to-move alternative may exist.

---

# 15. Input Priority

Input must resolve in this order:

1. Blocking system modal
2. Active feature UI
3. Active scene interaction
4. Camera

Exactly one layer consumes each gesture.

During combat, camera input must not interfere with UI controls or simulation.

---

# 16. Base

The Base is the player's persistent home world.

It contains visible gateways or structures for:

- Battle Camp
- Dealer
- Spawn Machine
- Defense Podium
- Raid Gate
- Campaign Gate

Base focus modes include:

- Battle Camp idle
- Summon Inspect
- Dealer
- Spawn Machine

Defense is not a Base focus mode.

The Defense Podium is a gateway into the dedicated Defense world.

---

# 17. Shield System

There are exactly two V1 shield systems:

1. **Illuminati**
2. **Time Shield**

They protect against different risks and must not be conflated.

---

# 18. Illuminati

Illuminati is permanent slot-level Raid theft protection.

Specific Battle Camp slots are designated as Illuminati-protected slots.

A Summon is protected only while occupying one of those slots.

Protection belongs to the slot, not to the Summon identity.

## Base Protection

Default Camp:

- 6 Illuminati-protected slots
- 30 exposed slots
- 36 total slots

## Permanent Upgrade

Upgraded Camp:

- 12 Illuminati-protected slots
- 24 exposed slots
- 36 total slots

The upgrade does not increase inventory capacity.

Summons in Illuminati-protected slots:

- Remain fully usable
- Can fight
- Can merge
- Count toward Power Level
- Count toward Alliances
- Cannot be selected for theft when this player loses as a Raid defender

## Important Raid Exception

Illuminati does **not** protect an attacker from surrender after losing an outgoing Raid.

If an attacker deploys a Summon during a Raid and then loses the Raid, that Summon is eligible for the attacker's surrender pool even if it was stored in an Illuminati-protected Camp slot before the Raid.

Illuminati protects defender-side theft.

It does not remove attacker-side Raid risk.

---

# 19. Time Shield

Time Shield protects the entire Battle Camp from incoming Raid matchmaking.

Maximum remaining duration:

**8 hours**

New grants extend remaining duration only up to the 8-hour cap.

While Time Shield is active:

- The player cannot be matched as a new Raid defender

Starting an outgoing Raid:

- Immediately breaks the attacker's own Time Shield

A defender who **loses** a Raid:

- Receives a full 8-hour Time Shield at settlement

A defender who draws:

- Receives no Time Shield

A defender who wins:

- Receives no Time Shield

Time Shield does not retroactively invalidate a Raid that was validly locked before the Shield was granted.

Server time is authoritative.

---

# 20. Medal (メダル)

**Medal (メダル)** is the permanent Spawn currency.

Medals are independent of the visual arcade machine used to deliver a Spawn.

This currency remains constant even if the Spawn presentation later changes from Pachinko, Slot machine, Claw machine, or another arcade game.

Medal balance can exceed 100 through:

- Campaign rewards
- Purchases
- Dealer collection
- Future rewards
- Other explicitly configured systems

There is no global Medal wallet cap of 100.

---

# 21. Dealer

The Dealer is the Base shopkeeper and free Medal generator.

The Dealer does **not** refill the player's wallet to a target.

The Dealer maintains its own generated, uncollected Medal stock.

## Generation Rate

The Dealer generates:

**100 Medals per 24 hours**

Generation unlocks in:

**12 epochs of 2 hours each**

Every 2-hour epoch unlocks a deterministic amount of newly generated Medals. Across 12 consecutive epochs, the Dealer must generate exactly:

**100 Medals**

The exact integer distribution across the 12 epochs is an engineering or configuration detail. A fixed-point accrual model is acceptable. The product invariant is that generation is deterministic, unlocks every 2 hours, and totals exactly 100 Medals per 24 hours.

## Dealer Stock Cap

The Dealer can hold at most:

**100 uncollected Medals**

If the player does not collect, generation stops at 100 Dealer-held Medals.

This cap applies to Dealer stock, not the player's Medal wallet.

## Collection Rule

The player may collect the Dealer's currently generated stock only while the player's Medal wallet is **below 100**.

When eligible:

- The player collects the entire currently generated Dealer stock
- Dealer stock decreases by the collected amount
- The player wallet increases by the same amount

Dealer collection is **not refill-to-100**.

Example:

```text
Player wallet: 95
Dealer stock: 25
Collection result: 120
Dealer stock: 0
```

Therefore Dealer-generated Medals may push the player's wallet above 100.

If the player's wallet is already 100 or more:

- Dealer stock remains uncollected
- Dealer generation may continue until Dealer stock reaches 100
- The player may collect later after spending below 100

All generation, stock, eligibility, and collection are server-authoritative.

---

# 22. Spawn Machine

The Spawn Machine is an arcade-style Summon dispenser powered by Medals.

The visual arcade mechanic may change over the life of the product.

The permanent rule is:

```text
Medal consumed
    ↓
authoritative Spawn reward resolved
    ↓
arcade presentation reveals that reward
```

## Current V1 Presentation

For V1, the Spawn Machine is a pachinko-style gacha machine.

Flow:

1. Player spends one Medal.
2. Server resolves the Summon reward.
3. A gacha object is released into the pachinko structure.
4. The gacha bounces through the machine.
5. The visual path reveals the authoritative reward.
6. The resulting Summon enters the Battle Camp.

The pachinko simulation is presentation.

It does not decide the economic result.

Production must never silently use client randomness for settlement.

---

# 23. Daily Global Spawn Pool

Each fixed server day has one global pool shared by all players.

The server selects:

- Exactly 6 active Summon identities
- Distinct identities whenever at least 6 eligible identities exist
- A stable `dailyPoolId`

All six reward outcomes produce `F` tier Summons only.

No direct `E` through `X` drops exist in V1.

## Reward Probabilities

From left to right:

- 10%
- 15%
- 25%
- 25%
- 15%
- 10%

Across six reward outcomes.

One Medal produces one `F` Summon instance before merges.

## Full Camp

If no Camp cell is available:

- The Spawn cannot begin
- The Medal is not consumed

---

# 24. Blob Targets

The current pachinko Spawn Machine contains two visually obvious Blob targets.

Each Blob has independent state.

Blob mechanics are configuration-driven.

A Blob definition may contain:

- ID
- Visual identity
- Hits required
- Current progress
- Effect type
- Effect amount
- Availability

Exact Blob thresholds and exact grants are not hard-coded product constants.

V1 Blob effects may grant Time Shield progress or duration.

The client may animate Blob hits, but settlement is authoritative.

If the Spawn Machine presentation changes in the future, Blob mechanics may be replaced or remapped without changing Medal as the currency.

---

# 25. Campaign

Campaign is a persistent progression ladder.

There is no V1 run reset.

The player selects and positions up to 6 owned Summons.

The selected formation persists across ordinary Auto Progress battles until:

- The player changes it
- Ownership changes invalidate it
- A rules change explicitly requires revalidation

Combat is automatic.

## Campaign Structure

Every 10 levels:
- A mini-boss occurs

Every 100 levels:
- A major Arc boss occurs
- A new story Arc begins

Multiples of 100 are Arc bosses, not mini-bosses.

## Auto Progress

Auto Progress is a small persistent control.

When enabled:

- The current formation automatically fights ordinary Campaign levels
- Progress may continue while the player navigates elsewhere inside the active app

Auto Progress stops or pauses:

- Immediately on defeat
- Before every level 10 mini-boss
- Before every level 100 Arc boss

The player must explicitly enter boss encounters.

Closed-app or offline Campaign farming is not promised in V1.

## Rewards

Campaign grants Medals only every 10 cleared levels.

Exact Medal quantities are balance configuration.

Campaign rewards may increase Medal balance above 100.

## Difficulty

Enemy strength increases through versioned content curves.

## Roadblock Summary

On defeat, show:

- Formation Power Level vs Enemy Power Level
- Damage dealt per Summon
- Damage taken per Summon
- Healing done per Summon where relevant
- First deaths
- Survivors and remaining health
- Active Alliance threshold
- Near-miss Alliance threshold
- Relevant enemy traits or abilities
- Whether Overdrive or Final Collapse was reached

---

# 26. Defense World

Defense is a dedicated top-level world.

The Defense Podium remains visible in Base as the gateway.

Entering it transitions the player into the Defense environment.

The Defense world contains:

- Defense setup board
- 2v2 formation setup
- 4v4 formation setup
- 6v6 formation setup
- Formation Power Levels
- Alliance state
- Shield state
- Defense reward FIFO
- Raid history
- Relevant Raid result details

---

# 27. Defense Formation State

The defender configures three persistent formations:

- 2 Summons
- 4 Summons
- 6 Summons

Each formation stores:

- Exact Summon instance IDs
- Board positions

The same Summon instance may appear across multiple Defense rounds but may not appear twice inside one round.

Defense is canonical server state.

When a Raid begins, the server creates an immutable versioned Defense snapshot.

Ownership changes revalidate the editable Defense configuration.

---

# 28. Defense Editing and Time Shield

Defense editing is permitted only when it cannot conflict with incoming Raid state.

## While Time Shield is inactive

- Defense may be viewed
- Editing is disabled
- Saving is disabled

The player is eligible for incoming Raid matchmaking, so mutable Defense state must not race with Raid locking.

## While Time Shield is active

- Defense may be viewed
- Editing may be enabled
- Saving may be enabled

Saving still requires authoritative revalidation.

If a Raid lock already exists:

- Editing is disabled
- Saving is disabled

If Time Shield expires while the player is editing:

- The client may retain unsaved local edits
- The server must reject a save that is no longer safe
- The UI must surface the conflict clearly

---

# 29. Raid

Raid is asynchronous PvP resolved as a three-round series against the defender's saved Defense.

Rounds:

1. **2v2**
2. **4v4**
3. **6v6**

The attacker chooses and positions their formation for each round.

## Setup Timers

Round 1: **10 seconds**

Round 2: **20 seconds**

Round 3: **30 seconds**

If the attacker has not completed setup at timeout:

- The server automatically deploys the strongest legal 2, 4, or 6 Summons for that round

The same Summon instance may be reused across rounds.

It may not be duplicated inside one round.

Each round resets:

- HP
- Cooldowns
- Temporary statuses
- Transient combat state

Combat is server-resolved from immutable snapshots and deterministic seeds.

Client disconnect does not stop authoritative setup timers or settlement.

---

# 30. Raid Outcomes

A Raid may resolve as:

- Win
- Draw
- Loss

## Attacker Win

The attacker steals one eligible exposed defender Summon.

The defender receives a full 8-hour Time Shield.

## Draw

- No Summon transfers
- Defender receives no Time Shield
- Attacker's previously broken Time Shield remains broken
- Locks and reservations are released

## Attacker Loss

The attacker surrenders one eligible Summon actually used in the Raid.

The defender receives no Time Shield because the defender won.

---

# 31. Raid Matchmaking

Raid matchmaking primarily uses Account Power Level.

A valid defender must:

- Have no active Time Shield
- Have no existing Raid lock
- Have valid 2/4/6 Defense formations
- Have at least one exposed stealable Summon
- Fall within the configured matchmaking Power Level band

A defender cannot be concurrently raided by multiple attackers.

An exclusive server lock with TTL and recovery is required.

The attacker must have at least one free and unreserved Battle Camp cell.

Starting Raid matchmaking:

- Breaks the attacker's Time Shield
- Reserves one Camp cell for a possible stolen Summon

While that reservation exists, other incoming Camp mutations must treat the slot as unavailable.

All ownership transfers are atomic and idempotent.

---

# 32. Raid Win Settlement

If the attacker wins:

1. Show the Opponent Camp from the locked defender snapshot.
2. Only exposed, non-Illuminati defender Summon instances are eligible.
3. The attacker has 30 seconds to choose one eligible Summon.
4. If time expires, the server selects randomly from the eligible exposed pool.
5. Server randomness is authoritative and auditable from the settlement record.
6. The exact selected Summon instance transfers atomically into the attacker's reserved Camp slot.
7. The losing defender receives a full 8-hour Time Shield.
8. Raid locks release after settlement.

The timeout selection is random.

It is not strongest available.

---

# 33. Raid Loss Settlement

If the attacker loses:

The surrender candidate pool is the set of **distinct Summon instances actually deployed across the three Raid rounds**.

The round capacities are:

- 2
- 4
- 6

This creates up to 12 deployment slots, but reused instances count only once in the candidate pool.

Illuminati does not remove a used attacker Summon from this pool.

The attacker has 30 seconds to choose one eligible surrendered Summon.

If the timer expires:

- The server chooses the weakest eligible used Summon using the canonical Power Level resolver

The selected Summon is removed atomically from the attacker.

The defender receives it at the tail of the Defense reward FIFO.

The attacker's reserved win cell is released.

The attacker's Time Shield remains broken.

---

# 34. Defense Reward FIFO

Successful defenders receive surrendered attacker Summons into an unlimited pending reward queue.

This queue is intentionally non-interactive storage.

The queue is strict FIFO.

Only the head Summon may be claimed into a free Battle Camp cell.

Pending Summons:

- Cannot be reordered
- Cannot be merged
- Cannot be released
- Cannot be sold
- Cannot battle
- Cannot defend
- Do not count toward Power Level
- Do not count toward Alliances
- Do not occupy Battle Camp cells

This prevents the unlimited queue from becoming free controllable inventory.

---

# 35. Opponent Camp

Opponent Camp is entered only after an attacker Raid win.

State:

- `STEAL_SELECTION`
- `AUTO_STEAL`
- `RAID_SHIELD_APPLIED`

The attacker receives up to 30 seconds to select an eligible exposed defender Summon.

If no selection occurs, the server performs the random authoritative selection.

---

# 36. Tutorial

New users begin in Campaign.

Returning users begin in Base.

The V1 tutorial sequence is:

1. Campaign starter formation and automatic combat
2. Battle Camp as physical inventory
3. Summon Inspect and stat split
4. Illuminati slot protection
5. Dealer Medal generation and collection
6. Pachinko Spawn Machine and Medal spend
7. Blob target and Time Shield introduction where configured
8. Scripted first merge
9. Defense world, 2/4/6 formations, and Alliance explanation
10. Raid timed setup and automatic combat
11. Opponent Camp steal after a safe tutorial win

Tutorial reward scripting is server-authoritative and separate from the normal daily random Spawn pool.

The tutorial must not teach manual skill casting.

Combat is always automatic.

Playback speed and camera controls may be introduced as optional presentation tools.

---

# 37. World State Model

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
│   └── SPAWN_MACHINE
├── DEFENSE
│   ├── SETUP
│   ├── REWARDS
│   └── RAID_HISTORY
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

Primary worlds:

- Campaign
- Base
- Defense
- Raid
- Opponent Camp

---

# 38. Server Authority

The server is authoritative for all durable or economically meaningful state.

This includes:

- Medal wallet balance
- Dealer generated stock
- Dealer generation epochs
- Dealer collection eligibility
- Spawn reward result
- Daily Spawn pool
- Blob progress
- Time Shield
- Illuminati entitlement and protected slot definition
- Battle Camp ownership
- Merge settlement
- Release settlement and Medal refund
- Campaign progress
- Campaign rewards
- Defense
- Raid history
- Raid locks
- Raid formation deadlines
- Raid combat
- Raid outcome
- Steal selection
- Surrender selection
- Ownership transfer
- Defense reward FIFO

The client may predict or animate presentation state, but must not silently become the production source of truth.

---

# 39. Versioning

Every authoritative battle must be reproducible.

Persist or snapshot:

- `contentVersion`
- `rulesVersion`
- `powerLevelResolverVersion`
- deterministic seed
- combat snapshot

A combat session started under one version must complete under that version even if new content deploys before settlement.

---

# 40. Asset Contract

Each Summon has a first-class asset manifest.

A manifest may define:

- 3D model
- Portrait
- Animation clips
- Scale
- Ground offset
- Attack origin
- Projectile origin
- VFX anchors
- Audio hooks
- Tier-specific visual overrides
- Procedural development fallback

The asset and animation system must support cinematic combat choreography.

Tier progression should normally use manifest-driven form overrides rather than handwritten presenter logic.

---

# 41. Explicit Non-Goals for V1

V1 does not include:

- Manual skill casting
- Multi-Alliance characters
- Origin + Combat Function synergy
- More than 36 active Battle Camp cells
- Direct higher-tier Spawn drops
- Offline Campaign farming guarantee
- Interactive Defense reward storage
- Client-authoritative combat
- Client-authoritative Raid settlement
- Inventory expansion
- A second gameplay runtime
- React gameplay
- Parallel product source-of-truth documents

---

# 42. Unlocked Balance Configuration

The following remain configurable:

- Final Summon roster
- Alliance names
- Alliance numerical values
- Per-tier character form names
- Character stats
- Skill coefficients
- Passive coefficients
- Ability unlock tiers
- Campaign Medal reward quantities
- Campaign difficulty curves
- Blob hit thresholds
- Blob Time Shield grants
- Matchmaking Power Level bands
- Combat tuning
- Overdrive timing
- Final Collapse timing and coefficients
- VFX timing
- Animation timing
- Cinematic Director behavior

Changing these values does not require rewriting the product model unless the underlying rules change.

---

# 43. Product Change Rule

Any future change to a locked behavior in this document must explicitly update this file first.

Do not change product behavior solely through:

- Implementation shortcuts
- Database constraints
- UI assumptions
- Prototype content
- Historical migrations
- Test fixtures
- Comments

`PRODUCT_FINAL.md` is the product contract.

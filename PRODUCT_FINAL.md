# PSYBLR Product Final

Status: canonical V1 product and gameplay source of truth.

This document defines the intended product even where the current code has not migrated yet. `AGENTS.md` defines how to implement it. `README.md` defines how to operate the repository.

## 1. Product promise

PSYBLR is an incremental auto battler where the player's growing collection is physically constrained to a 6x6 Battle Camp. The satisfying loop is to acquire Summons through a Pachinko Spawn Machine, merge duplicates into stronger tiers, create increasingly effective six-unit builds, push an infinite Campaign until a roadblock, and risk real Summon ownership in asynchronous PvP Raids.

The game should feel immediate and tactile like a merge/inventory game while the battles read like short anime fights. Long-term depth comes from constrained inventory, tier progression, formation, Alliances, changing Spawn configurations, Campaign requirements and asymmetric PvP risk.

## 2. Design pillars

1. **Everything valuable is visible.** Owned Summons live in the Battle Camp, not an abstract infinite list.
2. **Inventory pressure creates decisions.** The 36-cell cap never expands. Progress eventually requires merging, releasing, risking, or later using paid temporary storage.
3. **Acquisition is tactile.** Balls run through a configurable Pachinko machine rather than a generic loot-box button.
4. **Combat is automatic, preparation is skill.** The player chooses what to own, merge, protect, deploy and position. Combat then resolves automatically.
5. **Numbers go up until strategy matters.** Campaign Auto Progress delivers incremental momentum but stops at meaningful boss checks and defeats.
6. **PvP has ownership stakes.** A Raid winner takes a Summon. An attacking loser can lose one too.
7. **Server authority protects the economy.** Any action that creates, destroys or transfers value is transactional and idempotent.
8. **Content is replaceable.** Current anime identities are prototype placeholders, not architecture.

## 3. Canonical world state

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

Campaign, Base, Raid and Opponent Camp are primary worlds. Dealer, Spawn Machine, Defense and Summon Inspect are focus modes inside Base and preserve Base spatial continuity.

## 4. Core loop

```text
Dealer refills Balls
      ↓
Spawn Machine creates F-tier Summons
      ↓
Battle Camp receives Summons
      ↓
Merge identical Summons to increase tier
      ↓
Build six-unit Campaign formations
      ↓
Auto-progress until boss or roadblock
      ↓
Earn milestone Balls / improve build
      ↓
Set 2 / 4 / 6 Raid defense
      ↓
Raid similar-power opponent
      ↓
Win a Summon or risk surrendering one
      ↓
Rebuild, merge, protect, progress
```

## 5. Summons and tiers

A `SummonDefinition` describes identity, copy, base stats, abilities, Alliances and asset manifest. A `SummonInstance` is one owned copy with a unique instance ID and current tier.

Tiers are:

```text
F → E → D → C → B → A → S → SS → SSS
```

Merge rule:

- Exactly two Summon instances with the same definition and same tier are merge-compatible.
- Merging permanently consumes the source instance.
- The target instance survives and advances exactly one tier.
- A merge is an ownership/economy mutation and is server authoritative.
- SSS cannot merge further in V1.

Tier is progression state, not a separate character definition. Presentation may use tier-form visual overrides while retaining one underlying Summon identity.

## 6. Battle Camp and the inventory constraint

The Battle Camp is a fixed `6 x 6` grid with exactly 36 cells.

```text
BATTLE_CAMP_CAPACITY = 36
```

This is a hard product invariant. Inventory expansion is not a feature.

Every usable owned Summon occupies exactly one Camp cell. No Spawn, Raid steal, purchase, claim or server correction may produce a 37th Camp Summon.

When Camp is full:

- Spawn Machine cannot release another Ball and no Ball is consumed.
- A pending Defense reward cannot be claimed.
- A player cannot enter an outgoing Raid because a Raid win requires a destination slot.
- The player must merge or permanently release a Summon before creating space.

A basic permanent Summon Release action must exist from inspection before inventory pressure can hard-lock progression. Paid temporary storage can be added later, but it must not increase the Battle Camp's 36 usable slots.

### Direct manipulation

The Camp is the primary Base interaction surface.

- Drag Summon to empty cell: move.
- Drag onto non-mergeable Summon: swap.
- Drag onto identical definition + identical tier: merge.
- Tap Summon: select it and open Summon Inspect.
- Tap-to-move is supported as a mobile-friendly alternative to drag.
- Invalid targets communicate why they are invalid without jittering or moving the wrong piece.

Spatial actions happen directly. Do not force the user through roster picker modals for ordinary Camp movement.

## 7. Summon Inspect

Selecting a Summon automatically opens a contextual drawer while the Battle Camp remains visible and interactive.

The drawer is non-modal. It has no fullscreen backdrop and must not consume pointer input intended for visible Camp cells outside the drawer.

It shows at minimum:

- Identity and current tier.
- Summon Power.
- Core stats.
- Ability descriptions and cooldowns.
- Alliance memberships.
- Active Alliance effects relevant to the currently viewed formation when applicable.
- Next Alliance threshold when applicable.
- Merge progression.
- Permanent Release action with appropriate destructive confirmation.

Selecting another Summon updates the open drawer immediately. On narrow landscape screens, reframe the Camp rather than covering critical cells.

## 8. Alliances

**Alliance is the only player-facing synergy taxonomy.** The previous Origin + Combat Function split is retired.

Canonical character shape:

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

Canonical Alliance shape:

```ts
AllianceDefinition {
  id
  name
  description
  thresholds[]
}
```

A Summon may belong to multiple Alliances. For migration, the current six prototype synergy identities can all become ordinary Alliances: Ascendant, Rebel, Mastermind, Striker, Controller and Disruptor.

Alliance counts come only from the actual deployed formation for the battle being evaluated. Owning a Summon elsewhere in Camp does not activate its Alliance.

Alliance configuration is static, versioned game content. Combat receives resolved modifiers through a deterministic rules package.

## 9. Power scores

Power is guidance and matchmaking infrastructure, not a guaranteed outcome.

### Summon Power

A deterministic score derived from the Summon's resolved tier stats and combat-relevant ability coefficients.

### Formation Power

The deterministic effective score of the actual deployed formation, including active Alliance modifiers. Used for Campaign preview and battle summaries.

### Account Power

The score of the player's six strongest usable Battle Camp Summons. Used as the primary Raid matchmaking strength signal.

### Enemy Power

The target score for a Campaign level or enemy formation.

All formulas and coefficients live in one versioned `PowerScoreResolver` in shared game rules. UI never reimplements the calculation.

The UI may show a power delta such as:

```text
YOUR FORMATION   18,420
ENEMY POWER      21,100
POWER DELTA        -13%
```

A lower-power formation can still win through positioning, abilities and Alliances.

## 10. Base

Base is the home world. Its center is the Battle Camp. Other structures are spatial anchors around it.

### BASE.IDLE

The default returning-player state. The Camp grid is the main focus.

### BASE.SUMMON_INSPECT

Non-modal drawer described above.

### BASE.DEALER

The Dealer is the free Ball faucet and future in-app-purchase shop surface. In V1 it explains Balls, Spawn and protection systems and performs free refills.

### BASE.SPAWN_MACHINE

Camera/UI focuses on the Pachinko machine while remaining conceptually inside Base.

### BASE.DEFENSE

Defense Podium setup and defended-Raid reward collection.

## 11. Balls and Dealer

Balls are consumed to run the Spawn Machine.

The player's Ball balance may exceed 100 from Campaign milestone rewards, purchases or future reward sources.

The Dealer is a **refill**, not a +100 grant.

Dealer rule:

```text
REFILL_TARGET = 100 Balls
REFILL_COOLDOWN = 2 hours after a successful refill
```

A Dealer refill is claimable only when:

1. the 2-hour cooldown has completed, and
2. current Ball balance is below 100.

On claim:

```text
balls_after = 100
balls_granted = 100 - balls_before
```

If the cooldown completed while the player had 100 or more Balls, the refill simply waits. Once the balance falls below 100, it may be claimed immediately because the time requirement has already been satisfied.

Dealer timing and Ball balance are server authoritative.

## 12. Spawn Machine

The Spawn Machine is a configurable Pachinko/gacha system. Product architecture must not assume today's reward bins or Blob effects are permanent.

### Daily global pool

For V1, all players share the same six Summon identities for a given server day. The pool resets globally at a fixed server reset boundary. Use a server-defined daily pool ID, preferably UTC date-based, so all clients reference the same pool.

Choose six random active Summon identities without replacement when at least six are available.

All six base reward bins spawn **F-tier** Summons. Direct E- and D-tier drops are not part of V1 because they bypass too much merge progression.

Current bin probabilities from left to right are:

```text
10% | 15% | 25% | 25% | 15% | 10%
```

These probabilities and identities are content/server configuration, not client constants.

### Authority and physics

The server determines the actual reward and returns a replay/presentation descriptor. Pachinko physics is a satisfying presentation of an authoritative outcome, not a client-controlled random economy.

Production cannot silently fall back to local random resolution if the server is unavailable.

A Ball may be released only if:

- player owns at least one Ball, and
- Battle Camp has at least one unreserved free cell.

If the Camp is full, the action fails before Ball consumption.

### Blob targets

There are two visually obvious special Blob targets. Each Blob owns an independent meter and a configurable effect contract because its purpose may change as progression expands.

A Blob definition should be able to configure:

```text
id
visual identity
hits required
meter state
reward/effect type
effect magnitude
availability rules
```

In V1, Blob effects may grant Time Shield progress. A reasonable initial tuning is 5 registered Blob hits for +1 hour of Time Shield, independently configurable per Blob.

## 13. Time Shield

Time Shield protects the **entire Battle Camp from being selected as an incoming Raid defender**.

Rules:

- Maximum active Time Shield duration: 8 hours.
- Additional Shield grants extend remaining time only up to the 8-hour cap.
- A shielded player is excluded from defender matchmaking.
- Starting an outgoing Raid immediately breaks the attacker's own Time Shield.
- If a defender loses a Raid, their Time Shield is reset to a full 8 hours at settlement.
- Time Shield does not expand inventory and does not replace Illuminati protection.

Time Shield expiry is server time, never device time.

## 14. Illuminati protection

Illuminati protects specific Battle Camp cells from Summon theft even when Time Shield is inactive.

Base entitlement:

```text
6 protected cells
24? no, total exposed = 30
```

The default protected area is one full row of the 6x6 Camp.

Permanent purchasable entitlement:

```text
12 protected cells
24 exposed cells
36 total cells unchanged
```

The upgrade unlocks a second full protected row. It does not create inventory capacity.

A Summon in a protected cell is never eligible for a successful attacker's steal pool. Moving Summons between exposed/protected cells changes future Raid eligibility, subject to authoritative snapshot timing.

## 15. Campaign

Campaign is a persistent infinite ladder. It is not a run-reset roguelike in V1.

### Setup

The player selects up to six owned Camp Summons and positions them on the player side of the Campaign battlefield. The selected formation persists across ordinary Auto Progress levels until changed or invalidated by ownership change.

Never choose the player's Campaign squad by `roster.slice(0, 6)` or an equivalent implicit ordering.

### Combat

Once started, combat is fully automatic.

### Level structure

- Ordinary level: all levels that are not boss milestones.
- Mini-boss: every 10 levels except multiples of 100.
- Main Arc boss: every 100 levels.
- Every 100-level block is a new story Arc.

Enemy difficulty and Enemy Power increase persistently. Exact curves are balance data, not hard-coded UI logic.

### Auto Progress

The battle interface has a small symbolic Auto Progress control.

When enabled:

- An ordinary victory automatically starts the next ordinary level using the same formation.
- Auto Progress continues as an authoritative session even if the player navigates to another game world inside the app.
- Auto Progress stops immediately on defeat.
- Auto Progress pauses **before** every mini-boss Level 10 milestone and every Level 100 Arc boss.
- The player deliberately starts that boss encounter. Auto Progress may resume afterward.

V1 does not promise unlimited closed-app/offline Campaign simulation. The server/session contract should leave that extension possible later.

### Campaign rewards

Ordinary victories do not continuously print Balls.

Ball rewards occur at every 10-level milestone. Current initial balance target can preserve +10 Balls for mini-boss milestones and +25 Balls for each Level 100 Arc boss, but those amounts are configurable balance values.

Because Balls can exceed 100, Campaign milestone rewards are additive and do not interact with the Dealer's refill ceiling.

### Roadblock summary

On defeat, stop Auto Progress and show a build-oriented battle summary including:

- player Formation Power vs Enemy Power,
- damage dealt per Summon,
- damage taken per Summon,
- order/identity of first deaths,
- surviving enemies and remaining health,
- active Alliances,
- near-miss Alliance thresholds,
- important enemy traits/abilities,
- concise suggestions grounded in the battle data rather than generic advice.

The goal is to make a dead end legible enough that the player can decide whether to reposition, change composition, merge, acquire new Summons or free inventory space for a different build.

## 16. Defense Podium

Defense defines the immutable formations other players may fight when this player is selected as a Raid defender.

The player configures three formations:

```text
Round 1: 2 Summons
Round 2: 4 Summons
Round 3: 6 Summons
```

Rules:

- Drag/select from actual Battle Camp inventory.
- A Summon instance may appear in multiple different rounds.
- A Summon instance may appear only once inside the same round.
- Formation cells and positions are gameplay state.
- Show active Alliances and Formation Power while editing.
- Show current Time Shield status and expiry/cooldown context.
- Save through a server-authoritative persistent Defense snapshot.
- If ownership changes and a saved defense references a missing Summon, the defense becomes invalid until repaired or server auto-repairs according to explicit rules. Do not silently fight with fabricated units.

When a player enters matchmaking as a defender, the server creates an immutable versioned Defense snapshot for that Raid.

### Defense reward FIFO

When an attacker loses and surrenders a Summon, the defender receives that Summon into an **unlimited server-owned FIFO pending reward queue**.

This is deliberately not controllable overflow inventory.

Pending reward rules:

- Unlimited queue length.
- Strict FIFO claim order. Only the head can be claimed.
- Cannot reorder.
- Cannot merge while pending.
- Cannot release/sell while pending.
- Cannot deploy in Campaign, Raid attack or Defense.
- Does not count toward Account Power, Formation Power or Alliances.
- Does not occupy a Battle Camp cell until claimed.
- Claim is disabled while Camp has no free cell.
- Claiming atomically transfers the FIFO head into a selected/free Camp cell.

## 17. Raid eligibility and matchmaking

Raid is asynchronous PvP against the defender's saved 2/4/6 Defense snapshot.

### Attacker eligibility

- At least one genuinely free Battle Camp slot.
- Not already in a Raid or Raid reservation.
- Valid owned inventory and account state.

At matchmaking start, reserve one attacker Camp slot for the potential stolen Summon. Other Spawn/claim mutations must treat that reserved slot as unavailable until Raid settlement or cancellation.

Starting matchmaking immediately clears the attacker's Time Shield.

### Defender eligibility

- Time Shield inactive.
- Not already locked/reserved/active in another Raid.
- Valid Defense snapshot.
- At least one exposed stealable Summon in the authoritative Camp snapshot.
- Within the server's configurable matchmaking power band.

### Power matching

Primary strength signal is Account Power: the player's six strongest usable Camp Summons. Matching bands may widen with search time but remain server controlled and observable for balancing.

### Exclusive locking

A defender can belong to only one active Raid reservation at a time. Matchmaking acquires an atomic server lock with an expiry/TTL before exposing the match to the attacker.

The same principle applies to the attacker: one active Raid at a time.

Summon instances whose ownership could change at Raid settlement must not be mergeable/releasable/transferred in a way that invalidates the locked Raid snapshot without an explicit transaction rule.

## 18. Raid series

Every Raid is a three-round series:

```text
Round 1: 2v2
Round 2: 4v4
Round 3: 6v6
```

### Attacker setup timers

- Round 1: 10 seconds.
- Round 2: 20 seconds.
- Round 3: 30 seconds.

During each timer, the attacker chooses and positions the required number of Summons.

If the timer expires before a complete legal setup, the server auto-deploys the strongest eligible legal formation for that round and resolves combat.

A Summon instance may be reused across rounds but cannot occupy two slots within one round.

Each round starts fresh. HP, cooldowns, temporary buffs/debuffs, statuses and transient combat state reset between rounds.

### Resolution

Combat is deterministic and server resolved from locked inputs and seeds. Each round must ultimately resolve to win/loss so the best-of-three series cannot stall on an unresolved draw. At the maximum combat duration, use deterministic tie-break criteria defined in combat rules, such as surviving unit count, remaining-team HP percentage, damage dealt and finally seeded tie-break if still identical.

First side to two round wins wins the series.

Disconnecting does not stop authoritative setup/result timers. Server auto-actions finalize the Raid if a client disappears.

## 19. Successful attacker settlement

If the attacker wins the series:

1. Open `OPPONENT_CAMP.STEAL_SELECTION` using the locked defender Camp snapshot.
2. Only exposed, non-Illuminati Summon instances are selectable.
3. Attacker has 30 seconds to select exactly one eligible Summon.
4. If no selection is made before timeout, the **server chooses randomly from the eligible exposed pool**.
5. Server atomically transfers the exact Summon instance from defender ownership into the attacker's reserved Camp slot.
6. The reserved slot is consumed by that new Summon.
7. Defender's Time Shield is reset to a full 8 hours.
8. Raid/player locks are released after successful idempotent settlement.

The random timeout choice is not strongest-unit auto-steal.

## 20. Losing attacker settlement

If the attacker loses the series:

1. Build the eligible surrender pool from the distinct Summon instances actually used across the 12 deployment slots of the `2 + 4 + 6` rounds.
2. Reusing one Summon in multiple rounds still creates one candidate instance.
3. Attacker has 30 seconds to choose exactly one eligible used Summon to surrender.
4. If no choice is made before timeout, the server selects the **weakest eligible used Summon** according to the canonical Power resolver.
5. Server atomically transfers that exact instance away from the attacker.
6. The defender receives it at the tail of the Defense reward FIFO.
7. Attacker's reserved win slot is released.
8. Attacker's Time Shield remains broken.
9. Raid/player locks are released after successful idempotent settlement.

Losing a Raid therefore has real downside and prevents risk-free attack spam.

## 21. Combat presentation

Combat control is automatic, but presentation should feel like a compact anime fight rather than passive spreadsheet resolution.

Desired readable behaviors:

- Units move toward valid targets.
- Targeting/retargeting is visible and coherent.
- Basic attacks have clear anticipation, contact/projectile and hit reaction.
- Skills have distinct animation/VFX language.
- Health loss, crowd control and deaths are understandable at a glance.
- Camera may add restrained emphasis for major skills without obscuring board state.

Battle viewer supports:

```text
1x | 2x | 4x
```

These are presentation replay speeds only. Switching speed cannot alter simulation seed, result, cooldown decisions, targeting, damage or event order.

## 22. Tutorial and first session

New players start in Campaign. Returning players start in Base.

Tutorial philosophy: affordance, demonstration, concise microcopy. Avoid blocking instruction cards that cover the world.

Canonical first journey:

1. **Campaign:** select and position the starter formation, start an automatic fight, understand that formation drives combat.
2. **Battle Camp:** arrive at Base and understand that Camp is the physical inventory.
3. **Illuminati:** move a Summon into a protected cell and learn permanent cell protection.
4. **Dealer:** learn Balls, the 2-hour refill-to-100 rule and basic Shield concept.
5. **Spawn Machine:** release a Ball, see an F-tier Summon arrive in Camp, interact with a special Blob and see its independent meter.
6. **Merge:** acquire/tutorial-guarantee a legal duplicate and merge identical F-tier Summons into E tier.
7. **Defense:** configure basic 2/4/6 Defense and see Alliances/Shield state.
8. **Raid:** enter a legal Raid, experience timed formation setup and automatic combat.
9. **Opponent Camp:** after a tutorial-safe win, select an exposed steal target and understand ownership risk.

Tutorial rewards may use explicitly scripted server-authoritative outcomes so onboarding does not depend on random luck. That script is separate from the normal global daily pool.

Tutorial copy must match actual controls. There is no manual skill-cast/Auto-Cast tutorial in V1 because combat is always automatic.

## 23. Persistence and authority

The client presents intent. The server commits value.

Every persistent action must be idempotent and retry-safe, including:

- move/merge where persistence matters,
- Spawn release,
- Dealer refill,
- Campaign milestone settlement,
- Defense save,
- Raid matchmaking reservation,
- timed Raid auto-deploy,
- combat resolution record,
- steal selection/timeout,
- surrender selection/timeout,
- shield reset/break,
- FIFO claim.

Ownership-changing settlement uses database transactions and row/advisory locks as appropriate. A concurrent retry cannot duplicate or transfer the same Summon twice.

Client local storage may cache non-authoritative preferences such as camera/replay speed. It is not the source of truth for Balls, Summons, Campaign progress, protection or PvP settlement.

## 24. Content and asset contracts

Static content is versioned and data-driven.

Each Summon asset manifest should be able to provide:

```text
world model / GLB
portrait and icon
idle animation
run animation
basic attack animation
skill animations
hit animation
death animation
scale
ground offset
attack / projectile origin
VFX anchors
optional tier-form overrides
fallback presenter
```

Heavy scene and character assets load lazily by world/bundle. Do not instantiate every possible world at startup.

A combat replay references content version + stable identity + event log so visual upgrades do not rewrite the underlying battle result.

## 25. UX and input

Primary orientation is landscape.

Support desktop pointer and mobile touch. The world remains the visual anchor wherever possible.

Input consumption priority:

```text
blocking system modal
→ active feature UI
→ active scene interaction
→ camera gesture
```

Only one layer consumes a gesture. Feature drawers cannot leak clicks into world actions beneath them, and non-modal drawers cannot unnecessarily block visible world space.

Base inspection and Defense setup should take inspiration from the clarity of established auto battlers: direct board manipulation, immediate unit inspection, visible synergy thresholds and predictable drag/tap behavior.

## 26. V1 acceptance invariants

The implementation is not V1-correct until these remain true under tests:

- Battle Camp never exceeds 36 Summons.
- Full Camp Spawn rejects before consuming Ball.
- Dealer refills to 100 every eligible 2 hours and never grants while balance is 100+.
- Daily Spawn pool is globally consistent and all six base rewards are F tier at `10/15/25/25/15/10` probabilities.
- Each Blob can own independent progress/effect configuration.
- Time Shield caps at 8h.
- Outgoing Raid breaks the attacker's Time Shield.
- Losing defender receives full 8h Time Shield reset.
- Base Illuminati protects 6 cells and purchased entitlement protects 12 without changing 36 capacity.
- Raid cannot start without a free/reservable Camp cell.
- No player participates in parallel Raids.
- Matchmaking is server-side and Power-aware.
- Raid setup timeouts auto-deploy 2/4/6 legal formations.
- Winning steal timeout selects randomly from eligible exposed defender pool.
- Losing surrender timeout selects weakest distinct used attacker Summon.
- Ownership transfer is atomic and idempotent.
- Defense reward FIFO is unlimited but non-usable/non-reorderable until claimed.
- Campaign formation is explicit, not first-six roster order.
- Campaign Auto Progress survives navigation inside the app, stops on defeat and pauses before each Level 10/100 boss milestone.
- `1x/2x/4x` changes replay speed only.
- New-player tutorial boots Campaign.
- Summon Inspect is non-modal and leaves the Camp usable.
- Alliances are the only synergy language exposed to players.

## 27. V1 non-goals and extension seams

Not required for V1:

- Closed-app/offline Campaign farming.
- Inventory expansion beyond 36.
- Separate Origin and Combat Function systems.
- Manual combat skill casting.
- Roguelike run resets.
- Destructible Spawn Machines.
- A fully monetized Dealer shop.
- Paid temporary storage/Vault, though the inventory architecture must allow it later without increasing usable Camp capacity.
- Advanced alternate Blob mini-games, though Blob contracts are deliberately configurable.

Future systems should extend these seams rather than bypass the core constraints.

## 28. IP boundary

Goku, Naruto, Luffy, Eren, L, Lelouch and similar named anime references are prototype content only. Commercial release requires licensed rights or original replacement characters. Game systems must not depend on any specific copyrighted identity.

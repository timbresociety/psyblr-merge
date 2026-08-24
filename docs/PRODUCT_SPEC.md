# PSYBLR Product Specification

## 1. Product summary

PSYBLR is an anime-styled incremental auto battler where the player's Summon collection is also their spatial inventory, progression system, attack roster, defense roster, and PvP risk surface.

The player lives in a persistent Base, claims a limited daily resource, converts that resource into randomized Summons through a physical pachinko machine, merges duplicates into higher tiers, progresses through an infinite PvE Campaign, and raids other players in three escalating auto-battler rounds for the right to steal one exposed Summon.

The game should feel closer to a living game world than an app with menus.

## 2. Product pillars

### 2.1 One collection, many uses
Every Summon belongs to one persistent collection. There are no separate abstract card inventories for Campaign, Raid, defense, and merging.

### 2.2 Spatial home
Base is the player's home screen. The Battle Camp is always visually central and systems are represented by physical objects around it.

### 2.3 Satisfying incremental growth
The player should repeatedly feel:
- another Ball claimed,
- another Summon spawned,
- another duplicate found,
- another tier merged,
- another Campaign level cleared,
- another defense improved,
- another Raid won,
- another valuable Summon stolen.

### 2.4 Readable auto combat
Combat must be visually legible like a board auto battler. Units visibly move, attack, cast, take damage, and die. The player should understand why a round is being won or lost by looking at the battlefield.

### 2.5 World navigation, not page navigation
Campaign and Raid are places reached through gates. The Spawn Machine and Dealer are physical Base objects. The Defense Podium is a physical Base object.

## 3. Core loop

1. Enter Base.
2. Claim available Balls from Dealer.
3. Spend Balls at Spawn Machine.
4. Receive Summons into Battle Camp / inventory.
5. Arrange, inspect, protect, and merge Summons.
6. Choose progression:
   - Campaign for PvE levels and story progression,
   - Raid for PvP risk/reward.
7. Improve Raid defense at Defense Podium.
8. Return to Base and repeat.

## 4. Scene architecture

### 4.1 Base Scene

Base is the default scene after loading and the scene the player returns to after activity completion.

Visual composition:
- Battle Camp grid in the center,
- Dealer near one side of Camp,
- Spawn Machine as a major landmark,
- Campaign Gate,
- Raid Gate,
- Defense Podium,
- future expansion sockets around the perimeter.

The camera should make the Base feel like one coherent location. Interacting with an object may use a smooth camera focus or local UI, but it must not accidentally turn into a fake page layered over Base.

Base supports:
- Camp summon placement,
- summon inspection,
- merge interaction,
- protected-zone management,
- daily Ball claim,
- Spawn Machine use,
- defense setup,
- Campaign entry,
- Raid entry.

### 4.2 Campaign Scene

Campaign is a dedicated combat scene.

Never display Campaign enemies or Campaign battle resolution on top of Base geometry.

The Campaign scene contains:
- auto-battler arena,
- player deployment region,
- encounter region,
- six owned Summons,
- creep/boss encounter composition,
- level and Arc context,
- combat HUD kept minimal enough to preserve battlefield readability.

### 4.3 Raid Scene

Raid is a dedicated combat scene.

Never display Raid combat inside Base.

A Raid session contains exactly three sequential battle rounds:
- Round 1: 2v2
- Round 2: 4v4
- Round 3: 6v6

Each round contains:
1. attacker placement,
2. defender formation reveal/placement,
3. round lock,
4. auto battle,
5. round result,
6. transition to next round.

After Round 3, resolve the Raid from the three round outcomes.

### 4.4 Opponent Camp Scene

A Raid victory transitions to the defeated player's Camp in read-only opponent mode.

Reuse the same Base spatial language. Do not create a disconnected card-list steal screen.

The player can visually inspect:
- protected Summons,
- exposed Summons,
- eligible steal targets.

Exactly one eligible Summon can be claimed.

## 5. Battle Camp

The Battle Camp is the player's core collection surface.

The current alpha grid remains 6x6 unless intentionally changed.

Camp behavior:
- each occupied cell represents one owned Summon instance,
- Summons can be repositioned,
- compatible identical same-tier Summons can merge,
- some Camp positions may be protected from Raid theft,
- Camp capacity is explicit,
- spawning or stealing cannot silently exceed capacity.

### Protected zone
The existing protected row concept remains valid for the alpha unless replaced by a later explicit design decision.

Protected occupants cannot be stolen after a Raid loss.

Protection must be visibly understandable in the Base itself, not explained only through text.

## 6. Summons

A Summon instance has at minimum:
- instance ID,
- definition ID,
- tier,
- combat stats,
- ability references,
- presentation manifest,
- ownership,
- Camp placement if placed.

Summons are reusable across Campaign and Raid modes. They are not consumed by normal combat.

### Tier progression

`F -> E -> D -> C -> B -> A -> S -> SS -> SSS`

Merge rule:
- source and target must share definition,
- source and target must share tier,
- they must be distinct instances,
- one instance is consumed,
- the survivor upgrades exactly one tier.

Tier increases should produce immediate readable feedback:
- visual burst,
- tier label change,
- power delta,
- new form/ability unlock when applicable.

## 7. Dealer and Ball economy

### Daily grant
The Dealer makes 100 free Balls available every 24 hours.

For alpha:
- free daily capacity: 100,
- claim interaction happens at Dealer,
- unclaimed/unused free allocation does not compound indefinitely,
- the next grant should have a clear timer.

The economy implementation must remain authoritative and idempotent.

The UI must distinguish:
- Balls currently owned,
- next free refill/claim time,
- whether the daily grant has been collected.

## 8. Spawn Machine

The Spawn Machine is a physical pachinko/gacha mechanic in Base.

### Core interaction
1. player spends one Ball,
2. authoritative system decides the reward,
3. a ball is released into the machine,
4. ball bounces through physical presentation,
5. bounce targets can advance Shield meter,
6. ball lands in one of six reward bins,
7. matching Summon dispense presentation plays,
8. created Summon enters player ownership and available Camp capacity.

### Daily summon pool
The machine exposes six possible Summons for the current daily combination.

Locked probability layout:

| Slot | Probability |
|---|---:|
| 1 | 30% |
| 2 | 15% |
| 3 | 5% |
| 4 | 5% |
| 5 | 15% |
| 6 | 30% |

The six displayed Summons must correspond directly to these slots so the player understands what can drop that day.

### Authority rule
The physical ball trajectory must never determine the economic reward on the client.

The authoritative result is selected first. Physics and landing animation must be driven or constrained so presentation resolves consistently with that result.

### Shield bounce targets
The machine contains two special bounce targets.

Each valid hit advances a Shield meter.

When the meter completes:
- award one Shield,
- activate one hour of Raid protection,
- show remaining protection time in Base,
- reset/advance the meter according to content tuning.

For v1, Shield protection is treated as global Raid protection for the player's Camp while active. If the desired rule later changes to per-Summon or stackable durations, update this spec before implementation.

## 9. Campaign

Campaign is an infinite level-based PvE progression mode.

### Team
The player fields six owned Summons.

### Encounter cadence
- ordinary level: creeps,
- every 10th level: mini boss unless it is also a 100th level,
- every 100th level: main boss.

Examples:
- Level 1: creeps
- Level 9: creeps
- Level 10: mini boss
- Level 20: mini boss
- Level 90: mini boss
- Level 100: main boss
- Level 110: mini boss
- Level 200: next main boss

### Arcs
Every 100 levels form one story Arc.

Example:
- Arc 1: Levels 1-100
- Arc 2: Levels 101-200
- Arc 3: Levels 201-300

Each Arc can change:
- environment,
- creep families,
- mini bosses,
- main boss,
- story framing,
- reward table,
- difficulty curve.

### Combat presentation
Campaign and Raid must share one combat grammar:
- nav/pathing,
- target acquisition,
- attack cadence,
- cast readability,
- health/shield display,
- death resolution,
- victory resolution.

Avoid bespoke combat presentation per mode.

## 10. Raid

Raid is asynchronous PvP built around a player's saved defense.

### Attacking roster
The attacker chooses from owned Summons.

There is:
- no shared shop,
- no reroll shop,
- no shared global summon pool,
- no battle royale lobby.

### Three-round structure

#### Round 1
2 attacker Summons versus 2 defender Summons.

#### Round 2
4 attacker Summons versus 4 defender Summons.

#### Round 3
6 attacker Summons versus 6 defender Summons.

The attacker may reuse an owned Summon across different rounds. A single instance cannot occupy two positions within the same round.

### Round combat
Once a round starts:
- placement locks,
- immutable combat snapshot is created,
- deterministic combat simulation resolves,
- PlayCanvas replays that result using moving Summons,
- no player repositioning occurs during the fight,
- ability automation follows combat rules.

The game can later introduce limited semi-auto choices, but v1 should not depend on constant manual actions.

### Raid result
Resolve overall Raid outcome from the three round results.

Recommended v1:
- win two or more rounds = Raid victory,
- lose two or more rounds = Raid defeat,
- explicit deterministic tie resolution if round draws make a 1-1-1 style state possible.

The combat-core, not animation timing, decides the result.

## 11. Raid steal reward

After a Raid victory, transition to opponent Camp.

Eligible target must:
- still be owned by defender,
- be physically present in defender Camp,
- not be in protected zone,
- not be protected by an active rule that forbids theft,
- still exist when claim executes,
- not have already been claimed from this Raid.

Player selects exactly one eligible target and confirms theft.

Claim transaction must atomically:
- verify Raid victory,
- verify eligibility,
- verify available destination capacity,
- transfer ownership,
- assign destination state,
- consume the Raid steal claim,
- remain idempotent under retries.

## 12. Defense Podium

Defense Podium is a Base object used to configure defense.

The player saves three formations:
- 2-unit defense,
- 4-unit defense,
- 6-unit defense.

The interaction should reuse Raid placement concepts so the user learns one placement language.

The saved defense is what opponents fight during asynchronous Raid.

Required state:
- selected owned Summon instances,
- board cells for each round size,
- content version,
- last saved timestamp.

Defense editing never starts a battle.

## 13. Combat system requirements

Combat-core is deterministic pure TypeScript.

PlayCanvas is presentation/playback.

Minimum combat behavior:
- unit position,
- movement speed,
- acquisition range,
- attack range,
- attack speed,
- damage,
- HP,
- defense mitigation,
- skill cooldown/energy if used,
- target selection,
- death,
- win/loss resolution.

Presentation minimum:
- Summons physically move toward relevant targets,
- melee and ranged units are visually distinct,
- attacks have anticipation and impact,
- units do not jitter between targets every frame,
- corpses/downed state clear cleanly,
- round-end camera does not cut before outcome is readable.

## 14. UI and UX specification

### Persistent HUD
Keep it sparse.

Recommended:
- top-left: player identity / level,
- top-right: Balls, Shield timer, important currencies,
- contextual scene information where needed,
- one primary action located consistently.

### Panels
Use panels only for information that cannot be communicated clearly in-world.

Rules:
- one blocking panel at a time,
- panels never overlap each other accidentally,
- responsive width is clamped,
- typography remains legible at 844x390,
- center battlefield remains visible whenever interaction requires it,
- no globally mounted stack of unrelated gameplay overlays.

### Summon inspection
Summon inspection should expose:
- name,
- tier,
- stats,
- role/function,
- origin/faction if retained,
- abilities,
- merge eligibility,
- progression preview.

Opening inspection should not move the world camera repeatedly due to DOM rerenders.

## 15. Tutorial

The tutorial begins in Base.

It teaches systems through actual play.

### Tutorial sequence
1. **Battle Camp**
   - identify Camp as the player's Summon collection.
2. **Dealer**
   - move/focus to Dealer,
   - claim tutorial Balls.
3. **Spawn Machine**
   - focus machine,
   - explain one Ball creates one Summon chance,
   - release a Ball,
   - show physical drop and resulting Summon.
4. **Camp placement**
   - show new Summon entering Camp.
5. **Merge**
   - tutorial grant/spawn sequence guarantees a valid duplicate pair,
   - player merges identical same-tier Summons,
   - explain tier power increase.
6. **Campaign Gate**
   - player enters separate Campaign scene.
7. **Campaign battle**
   - deploy/use six tutorial Summons as appropriate,
   - win a simple creep encounter,
   - observe movement-based auto combat.
8. **Return to Base**
   - establish Base as home.
9. **Defense Podium**
   - configure 2/4/6 defense with guided placements.
10. **Raid Gate**
   - enter separate Raid scene.
11. **Raid**
   - complete guided 2v2,
   - complete guided 4v4,
   - complete guided 6v6.
12. **Steal**
   - tutorial opponent should produce a deterministic Raid victory,
   - enter opponent Camp,
   - explain protected versus exposed,
   - steal one exposed Summon.
13. **Free play**
   - return to Base,
   - dismiss tutorial restrictions.

Tutorial state must persist across refresh/crash.

## 16. State ownership

Use a single authoritative client scene state for presentation routing.

Suggested scene IDs:
- `base`
- `campaign`
- `raid`
- `opponentCamp`

Focused Base interactions such as Spawn Machine and Defense Podium should be modeled as submodes/focus states, not fake scenes unless a future implementation truly loads a separate world.

Suggested interaction state:
- active scene,
- active Base focus,
- active panel,
- selected Summon,
- placement mode,
- tutorial step.

Do not allow unrelated booleans such as `spawnOpen`, `detailsOpen`, `raidBuilderOpen`, and multiple other overlays to all be true independently without a state machine controlling compatibility.

## 17. Architecture target

### PlayCanvas
Owns:
- Base world,
- Campaign world,
- Raid world,
- opponent Camp rendering,
- cameras,
- direct world input,
- summon entities,
- combat animation/playback,
- Spawn Machine physics/presentation,
- gates/buildings,
- spatial selection feedback.

### React
Owns:
- app boot/loading,
- account/settings,
- accessibility DOM controls,
- compact resource HUD,
- readable detail panels,
- error/retry UI,
- non-gameplay shell concerns.

### Shared pure packages
Preserve and strengthen:
- contracts,
- game rules,
- deterministic combat,
- content definitions.

## 18. Current-code migration plan

The latest remote implementation contains legacy React-authored gameplay UI and scene composition. The user's unpublished local work has moved more of the game into PlayCanvas and should be treated as the likely implementation base once available.

Migration order:

### Phase 1: establish ownership
- Base becomes initial scene.
- Introduce one explicit scene router/state machine.
- Introduce one panel/focus state machine.
- Ensure entering Raid unloads/hides Base world and loads Raid world.
- Ensure entering Campaign unloads/hides Base world and loads Campaign world.

### Phase 2: remove competing legacy UI
Delete obsolete React gameplay components as PlayCanvas replacements exist.

Likely legacy candidates from current remote code include:
- globally mounted Spawn Machine overlay,
- globally mounted Raid squad builder,
- globally mounted formation panel,
- legacy navigation dock,
- old scene-specific CSS that positions large overlays over the canvas.

Do not delete pure rules or contracts merely because presentation is replaced.

### Phase 3: rebuild Base
- stable camera,
- central Camp,
- Dealer,
- Spawn Machine,
- Campaign Gate,
- Raid Gate,
- Defense Podium,
- direct world hit targets,
- readable lightweight HUD.

### Phase 4: combat scenes
- shared auto-battler movement playback,
- Campaign encounters,
- Raid 2/4/6 sequential rounds,
- clear scene transitions.

### Phase 5: acquisition and defense
- physical Spawn Machine,
- Ball resource timing,
- Shield meter,
- defense formation save flow.

### Phase 6: tutorial
Implement the full Base-first guided loop only after the underlying actions work without tutorial overrides.

## 19. Acceptance criteria for the product reset

The reset is successful when a new player can:
1. load directly into a readable stable Base,
2. understand Battle Camp without opening a menu,
3. claim Balls from Dealer,
4. drop a physical Ball in Spawn Machine,
5. receive a Summon,
6. merge duplicates,
7. walk/transition through Campaign Gate to a separate Campaign scene,
8. watch six Summons move and fight an encounter,
9. return to Base,
10. configure defense,
11. transition through Raid Gate to a separate Raid scene,
12. play 2v2, 4v4, and 6v6 sequential fights,
13. win and visit opponent Camp,
14. steal one exposed Summon,
15. return to Base without stale Raid/Campaign overlays remaining mounted or visible.

At 844x390 and standard desktop landscape:
- no important card text is clipped,
- no blocking panels overlap,
- no interaction causes repeated layout jumping,
- no scene visually contains geometry from the previous scene unless explicitly designed as a transition effect.

## 20. Commercial content warning

Existing anime character names/assets are prototype references. Commercial distribution requires licensed content or original IP.

All gameplay logic must remain definition-driven so replacing prototype characters does not require combat, economy, or UI rewrites.

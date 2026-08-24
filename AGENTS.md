# PSYBLR Agent Instructions

PSYBLR is an anime-styled incremental auto battler. Treat this file, `README.md`, and `docs/PRODUCT_SPEC.md` as the only authoritative product documentation in the repository.

## 1. Product identity

The game is not a React dashboard with a 3D background. It is a world-first game with persistent spatial scenes.

The player owns Summons. Summons are simultaneously:
- collectible inventory,
- Battle Camp occupants,
- merge inputs,
- Campaign combatants,
- Raid attackers,
- Raid defenders,
- stealable PvP assets when exposed.

The core loop is:

`Dealer -> Balls -> Spawn Machine -> Summons -> Battle Camp -> Merge -> Campaign / Raid -> stronger collection -> repeat`

## 2. Scene model

There are three primary world scenes and one read-only derivative scene.

### Base
Base is the home screen and must be the first playable scene.

It contains:
- Battle Camp grid at the visual center,
- Dealer,
- Spawn Machine,
- Campaign Gate,
- Raid Gate,
- Defense Podium,
- future expansion sockets.

Base is for collection management, merging, spawning, claiming daily balls, defense configuration, and entering other modes.

### Campaign
Campaign is a separate combat scene. Never render Campaign combat inside Base.

Campaign is a 6-unit incremental PvE auto battler with:
- creeps on normal levels,
- mini bosses every 10 levels,
- main bosses every 100 levels,
- one new story Arc every 100 levels.

### Raid
Raid is a separate combat scene. Never render Raid combat inside Base.

A Raid is exactly three sequential rounds:
1. 2v2
2. 4v4
3. 6v6

Each round uses actual Summon movement and auto-combat presentation similar in readability to modern board auto battlers. Summons must move, acquire targets, attack, cast, take damage, die, and resolve the round in-world. Do not resolve combat as cards, static icons, progress bars, or a modal simulation.

### Opponent Camp
After a Raid victory, reuse the Base world layout in read-only opponent mode. Protected Summons cannot be stolen. The player may claim exactly one eligible exposed Summon.

## 3. Runtime ownership

PlayCanvas owns:
- world scenes,
- scene transitions,
- 3D cameras,
- world interaction,
- summon movement,
- battle playback,
- Spawn Machine physics/presentation,
- world VFX,
- spatial selection and placement feedback.

React owns only lightweight product shell UI that should not exist naturally inside the world, such as:
- account/settings,
- accessibility fallbacks,
- small persistent resource HUD,
- temporary readable panels,
- loading/error states.

Do not build a second gameplay system in React. Do not duplicate scene state in React components. Do not mount every overlay globally and hide them with CSS.

React must never decide which world scene is visually active. One authoritative scene state controls the PlayCanvas scene router.

## 4. UI rules

The 3D world is always the primary visual layer during gameplay.

Use these constraints:
- landscape-first gameplay,
- one dominant action at a time,
- readable type at 844x390 minimum,
- safe-area aware HUD,
- no overlapping description cards,
- no stacked translucent panels over the center of the board,
- no layout that changes geometry every frame,
- no React state updates for per-frame animation,
- no camera jitter caused by DOM measurement loops,
- no full-screen menu when a small anchored panel is sufficient.

All gameplay panels must have a single owner and explicit visibility state. Opening one blocking panel closes incompatible blocking panels.

## 5. Base layout rules

The Battle Camp is the anchor of Base. Other mechanics orbit it spatially and should be recognizable without labels once learned.

Required interactive objects:
- Dealer: claim daily balls,
- Spawn Machine: pachinko/gacha acquisition,
- Campaign Gate: travel to Campaign,
- Raid Gate: travel to Raid,
- Defense Podium: configure 2/4/6 Raid defense,
- Battle Camp: place, inspect, merge, and protect Summons.

Do not use a bottom navigation bar for Campaign, Raid, or Base travel. Gates are the canonical navigation mechanic.

## 6. Spawn Machine rules

The Dealer grants 100 free Balls every 24 hours. Free daily Balls do not stack beyond the free cap unless product rules are explicitly changed.

The Spawn Machine consumes one Ball per release.

The six reward slots use the daily distribution:
`30 / 15 / 5 / 5 / 15 / 30`

The server or authoritative game layer determines the reward before visual physics resolve. Pachinko physics communicates the result and must not become economy authority.

The machine also has two bounce targets that fill a Shield meter. A completed Shield grants one hour of Raid protection according to the current product spec.

The Spawn Machine should feel physical. A released ball should visibly travel, bounce, interact with pegs/targets, and land in a reward slot before the Summon dispense presentation completes.

## 7. Summon and merge rules

Tier order:
`F -> E -> D -> C -> B -> A -> S -> SS -> SSS`

Two identical Summons at the same tier merge into one Summon at the next tier.

Merge is a permanent inventory mutation, not a temporary battle buff.

Merging should be performed through direct Battle Camp interaction whenever possible. Selection, valid merge target, merge confirmation, consumption, upgraded result, and power increase must all be legible.

## 8. Raid rules

A Raid uses the player's owned Summons. There is no shared shop and no shared unit pool.

Each Raid round is prepared and resolved sequentially. Do not pre-resolve all three rounds.

The player may reuse a Summon in later rounds, but the same instance cannot occupy two slots in the same round.

After a Raid victory:
- transition to opponent camp,
- visually distinguish protected and exposed cells,
- allow exactly one eligible steal,
- explicitly confirm the claimed Summon,
- transfer it to the player's inventory/camp through authoritative state mutation.

## 9. Defense rules

The Defense Podium stores three defensive formations:
- 2-unit defense,
- 4-unit defense,
- 6-unit defense.

Defense uses owned Summons and mirrors the same placement language as Raid setup.

The protected zone in Battle Camp and timed Shield protection must be represented consistently in Raid eligibility rules.

## 10. Campaign rules

Campaign levels increase indefinitely.

Encounter cadence:
- ordinary creep encounter: every non-boss level,
- mini boss: every 10th level except main-boss levels,
- main boss: every 100th level,
- Arc changes after each main boss.

Campaign combat is 6 versus encounter composition. The presentation should use the same movement/combat language as Raid so the player learns one combat grammar.

## 11. Tutorial rules

The tutorial starts in Base, not Campaign.

Teach by making the player perform the actual loop:
1. understand the Battle Camp,
2. claim Balls from Dealer,
3. use Spawn Machine,
4. receive and place a Summon,
5. create a merge,
6. enter Campaign and win a basic fight,
7. return to Base,
8. configure Raid defense,
9. enter Raid,
10. complete the 2v2, 4v4, 6v6 sequence,
11. if the scripted tutorial Raid is won, steal one exposed Summon,
12. return to free play.

Tutorial steps must be event driven, resumable, and never implemented as scattered component conditionals.

## 12. Engineering boundaries

- `apps/web/src/game`: PlayCanvas world, scene router, input bridge, rendering, animation, battle playback.
- `apps/web/src/ui`: minimal DOM shell and accessible fallbacks only.
- `packages/game-rules`: pure progression, merge, formation, eligibility, campaign rules.
- `packages/combat-core`: deterministic combat simulation, independent of React and PlayCanvas.
- `packages/contracts`: shared schemas and API contracts.
- `packages/game-content`: static summon, encounter, Arc, tier, spawn-pool definitions.
- `supabase/functions`: privileged economy and ownership mutations.

Never put economy authority in browser-only presentation code.

Every persistent mutation must be idempotent.

## 13. Refactor rule for the current codebase

The repository currently contains legacy React gameplay overlays and React-authored scene components. When implementing the new PlayCanvas-first architecture:
- prefer deleting superseded gameplay UI over wrapping it,
- do not keep two implementations for compatibility,
- remove dead CSS with deleted components,
- centralize scene state,
- centralize modal/panel state,
- preserve pure rules, contracts, content, and deterministic combat where reusable,
- migrate behavior, not accidental architecture.

Do not edit around broken legacy layout if the component no longer belongs in the target architecture.

## 14. Definition of done

A gameplay change is not done until:
- the correct scene owns it,
- no hidden legacy UI competes with it,
- desktop and 844x390 landscape are readable,
- pointer and touch both work,
- transitions do not jitter,
- there are no new console errors,
- typecheck passes,
- relevant unit tests pass,
- the core happy path is covered by Playwright,
- persistent mutations survive retries without duplication.

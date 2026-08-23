# PSYBLR Alpha Product Specification

## Product promise
A world-first, asynchronous summon battler where players build a protected core collection, generate and merge summons, fight deterministic raids, and steal exposed summons from defeated opponents.

## Alpha happy flow
1. Start directly in Campaign Arena with guided tutorial.
2. Open Summon Inventory and inspect identity, stats and skills.
3. Deploy one F-tier summon, learn Origins and Combat Functions, then deploy all six.
4. Fight six creeps. Manually cast first ready skill, then enable Auto Cast.
5. Fly camera to the Battle Camp: 6x6 summon grid with a protected 6x1 Illuminati row.
6. Teach vulnerability and move the six starters into Illuminati.
7. Fly to Spawn Machine. Drop balls until camp reaches 36/36.
8. Return to camp, merge identical summons F→E→D→C; explain immediate upgrade and future silhouettes.
9. Enter Raid Gate. Deploy and resolve a 2v2 field, then a 4v4 field, then a 6v6 field. Repetition across rounds is allowed, but a Summon cannot occupy two slots in the same field.
10. Each field computes Origin and Combat Function synergies from the deployed Summons only. Resolve the best-of-three raid after the final field.
11. A raid victory travels directly into that opponent's read-only Camp. Illuminati occupants are protected; one exposed Summon may be selected and explicitly claimed.
12. Return home, configure a 2/4/6 defensive formation with the same spatial Raid placement interaction, save it, then finish the tutorial and unlock navigation.

## Core spatial model
### Campaign Arena
- Horizontal 8x8 board.
- Player and enemy deployment regions are configuration, not separate implementations.
- Six-summon tutorial cap.

### Battle Camp
- 6x6 summon occupancy grid.
- Row 0 is Illuminati: six protected cells.
- Rows 1-5 are exposed to raids.
- The base environment contains fixed building sockets for future systems. Do not build free-form building placement in alpha.

### Raid Arena
- Reuse combat scene and renderer.
- Sequential field sizes: 2, 4, 6.
- Resolve one field before opening the next; there is no pre-draft of future fields.
- Origin and Combat Function synergies resolve independently from each round's field composition, so their effect naturally scales at the 2, 4, and 6 thresholds.
- Best-of-three based on round W/D/L outcomes.

### Opponent Camp
- Reuse the Base scene with a read-only opponent-state mode; do not fork a second base implementation.

### Spawn Machine
- Remains a building/focus mode inside the Base scene; do not create a separate world scene.

## UI information architecture
There are no traditional gameplay pages. The 3D world remains mounted and React overlays appear on top.

### Persistent HUD
- Top-left: player identity/avatar placeholder.
- Top-center: contextual scene title only when useful.
- Top-right: balls/currency/debug indicators.
- Bottom-left: scene navigation after tutorial.
- Bottom-right: context-sensitive primary action (Start Battle, Drop, Raid, Confirm).

### Summon Picker
- Bottom sheet/tray.
- Bust cards only, never six+ live model viewports.
- Filters later; alpha prioritizes tier, origin and function chips.
- Drag from card to valid world cell. Click/tap selects and exposes a clear Place action as accessibility fallback.

### Summon Details
- Desktop: right panel ~38% width, world remains visible.
- Small landscape: near-full-height sheet.
- Tabs: Overview, Skills, Progression.
- Overview: identity, tier, Origin, Function, core stats.
- Skills: Basic, Skill 1, Skill 2, Ultimate; locked slots are visible.
- Progression: current tier emphasized; undiscovered major forms use silhouettes; next tier shows exact numeric/skill delta.

### Tutorial overlay
- Coach mark + focus mask + optional anchored speech bubble.
- One concept per step.
- Disable unrelated interactions only for mandatory actions.
- Camera movement completes before copy appears.
- Every step has an event-driven completion trigger and is resumable.

## Starter summons
The alpha uses six F-tier definitions so the player can freely choose the first and then deploy the remaining five.

| Summon | Origin | Function | HP | ATK | DEF | APS | Range |
|---|---|---:|---:|---:|---:|---:|---:|
| Goku | Ascendant | Striker | 1000 | 120 | 70 | 1.10 | 2.5 |
| Naruto | Ascendant | Controller | 950 | 100 | 65 | 1.15 | 3.0 |
| Luffy | Rebel | Striker | 1150 | 110 | 80 | 1.05 | 1.5 |
| Eren | Rebel | Disruptor | 1400 | 105 | 100 | 0.85 | 1.25 |
| L | Mastermind | Controller | 800 | 80 | 55 | 1.00 | 4.5 |
| Lelouch | Mastermind | Disruptor | 820 | 85 | 60 | 0.95 | 4.0 |

These are tuning placeholders. The identifiers and schemas are stable; numbers are not.

## Tier system
F → E → D → C → B → A → S → SS → SSS

Merge: two identical summon definitions at the same tier produce one instance at the next tier.

Recommended alpha multipliers:
- F 1.00
- E 1.15
- D 1.35 (major form 1, Skill 2)
- C 1.60
- B 1.90
- A 2.25 (major form 2, Ultimate)
- S 2.65
- SS 3.10
- SSS 3.65 (final form)

Visual forms are shared across tier bands: F/E, D/C/B, A/S/SS, SSS.

## Spawn Machine
- Capacity: 100 free balls.
- Global daily reset refills up to 100; unused free balls do not stack above cap.
- Six reward bins map to the player's six tutorial summons.
- Locked probability distribution: 30/15/5/5/15/30 = 100%.
- Two inactive blob targets exist from alpha day one: Shield and Tier Bonus. They have meshes/colliders/progress fields but `enabled=false`.
- During tutorial, a deterministic seed guarantees enough identical copies to reach C and fill the camp exactly.
- In production flow the server decides the reward before the ball animation. Pachinko physics is presentation, not economy authority.

## Raid rules
- Three sequential rounds: 2v2, 4v4, 6v6.
- Only the active field can be assembled. Players choose a Summon and place it directly on an open player-side raid cell; there are no abstract field-slot controls. It locks when started; the opponent placement, immutable snapshots, and event log are then created by the authority. The next field opens only after that round replay completes.
- A summon may be used in multiple rounds, but may not occupy multiple slots in the same round.
- Origin and Combat Function synergies are evaluated from the current field and apply only to that round's combat snapshot. Content thresholds provide stronger implications as matching field members rise from 2 to 4 to 6.
- Server simulates each locked field from immutable snapshots + content version + a raid-session RNG seed; the final result is the deterministic best-of-three resolution.
- Client shows each resolved field as a semi-automatic authoritative combat replay and keeps the active Origin/Combat Function synergy panel visible during the fight.
- A Raid victory records a pending opponent-camp handoff for one steal. Claim input contains only action, Raid, and target IDs; authority revalidates the Raid win, defender ownership, exposed placement, capacity, and idempotency in one transaction.

## Steal rules
Eligible if the target summon:
- is owned by defender,
- is placed in defender camp,
- is outside Illuminati,
- is not already involved in a completed steal,
- still exists at claim time.

The ownership transfer, destination placement, steal record, and consumed claim state update occur in one transaction. Defense snapshots use normalized player-side 2/4/6 cells and mirror onto the enemy half when attacked.

## Production blindspots already resolved
- Spawn weights total 100%.
- Tutorial randomness cannot soft-lock tier progression.
- Initial six are moved into Illuminati before 30 new spawns fill exposed cells, producing exactly 36/36.
- Reward RNG is not trusted to client-side physics.
- Raid result uses deterministic shared combat-core.
- Player must have destination capacity before a real steal can be claimed.
- All critical mutations are idempotent.
- Asset replacement is contract-driven.
- Tutorial is resumable after refresh/crash.
- Base growth uses building sockets instead of premature arbitrary-placement infrastructure.

## IP warning
The named anime characters are prototype content. A commercial release needs licensed IP or original characters. Keep content identifiers replaceable and avoid coupling gameplay logic to franchise-specific names.

# PSYBLR V2 — Product, Interaction & Technical Revamp Source of Truth
Version: 1.0  
Date: 24 August 2026  
Repository: github.com/timbresociety/psyblr-merge  

> **This file is the canonical V2 source of truth. Do not implement from chat memory when this document provides a rule.**  
> **PURPOSE** — Freeze the V2 product and implementation direction before further Antigravity work. Future implementation prompts must reference this document and the committed repository, not accumulated chat assumptions.

| Field | Value |
| :--- | :--- |
| **Version** | 1.0 |
| **Date** | 24 August 2026 |
| **Repository** | github.com/timbresociety/psyblr-merge |
| **Primary runtime decision** | Direct PlayCanvas Engine + TypeScript; gameplay React removed |
| **Status** | V2 revamp baseline; contains locked decisions plus explicitly marked open decisions |

---

## 1. Executive decision record

**PRIMARY DECISION** — Do not migrate PSYBLR to Godot or Unity for V2. The existing domain/backend work is worth preserving. Rebuild the player-facing runtime as a direct PlayCanvas game, with PlayCanvas-native game UI and no React-driven gameplay overlays.

| Area | V1 / Current Direction | V2 Decision |
| :--- | :--- | :--- |
| **Game runtime** | React application mounting `@playcanvas/react` | Direct PlayCanvas Engine application in TypeScript (`apps/game`) |
| **Gameplay UI** | React DOM HUDs, drawers, tutorial cards, spawn overlay | PlayCanvas Screen/Element UI + world-space UI |
| **Placement** | Selection modes plus projected DOM/world targets | Direct drag-and-drop only |
| **Tutorial** | Blocking cue cards and focus masks | Silent onboarding: affordance → demonstration → microcopy |
| **Pachinko** | Overlay screen with odds cards and DROP BALL button | Physical in-world machine, camera focus, lever interaction, animated ball |
| **Battle presentation** | Primitive board + web UI around it | Board-dominant authored game composition inspired by Underlords information hierarchy |
| **Summon progression UI** | Custom cards/panels that obscure the identity model | One Summon identity, compact card, Underlords-like readable tier progression |
| **Backend/domain** | Deterministic TS packages + Supabase authority | Preserve and evolve; do not rewrite for presentation reasons |
| **Legacy app** | `apps/web` | Keep temporarily during V2 vertical slice; archive/remove only after V2 replacement passes quality bar |

### 1.1 Non-negotiable V2 product principles
1. The player should feel like they are manipulating a game world, not operating a web application.
2. Direct manipulation beats selection, confirm dialogs, and abstract placement modes.
3. The world remains visually primary; UI explains state rather than creating unnecessary interaction state.
4. No onboarding cue card may interrupt live combat.
5. Animations confirm causality: the object touched visibly causes the result.
6. Every successful micro-interaction receives feedback, but celebration intensity is hierarchical.
7. The renderer never owns economic authority or deterministic combat outcomes.
8. Premium means clear hierarchy, timing, physicality, sound, and restraint—not maximum particles.

---

## 2. Canonical product definition

PSYBLR is an asynchronous collection-and-merge raid autobattler. Players grow a curated army of anime-inspired Summons in a persistent Base Camp, acquire F-tier copies through a physical pachinko/gacha machine, merge identical Summons upward from F to SSS, configure attacks and defenses, and fight asynchronous three-round raids in a top-down 3D arena.

**Visual reference language**: Dota Underlords / Auto Chess clarity and board hierarchy, not their exact art direction or economy. PSYBLR should feel more collectible, tactile, energetic, and anime-spectacular while preserving tactical readability.

### 2.1 Core loops
| Loop | Player action | Payoff |
| :--- | :--- | :--- |
| **Acquisition** | Visit physical pachinko machine; pull lever; watch result land | Receive an F-tier Summon from the current six-Summon pool |
| **Collection** | Organize limited Battle Camp occupants | Build a readable, valuable army |
| **Merge** | Drag identical same-tier Summon onto another | Permanent tier increase and visible power/form improvement |
| **Raid preparation** | Drag Summons directly from Battle Camp inventory dock onto battlefield | Create tactical formation with minimal friction |
| **Raid combat** | Semi-auto battle resolves in 2 / 4 / 6 escalation | Tactical spectacle and asynchronous PvP progress |
| **Defense** | Save a defensive six-Summon formation | Other players raid a frozen snapshot of the defense |

### 2.2 Tier system
Tier order is locked: **F → E → D → C → B → A → S → SS → SSS**. Two identical Summons at the same tier merge into one instance at the next tier. A tier is progression state on one Summon identity; it is not a separate character/card definition.

| Tier | Base copies represented | Presentation band |
| :--- | :--- | :--- |
| **F** | 1 | Base |
| **E** | 2 | Base |
| **D** | 4 | Awakened |
| **C** | 8 | Awakened |
| **B** | 16 | Awakened |
| **A** | 32 | Ascended |
| **S** | 64 | Ascended |
| **SS** | 128 | Ascended |
| **SSS** | 256 | Mythic |

Exact power multipliers remain a balance parameter. Do not hard-wire an arbitrary exponential curve into presentation code. Stats are derived from content/tier data.

---

## 3. Existing repository assessment: preserve vs replace

The current repository is not a throwaway. It already separates contracts, game content, game rules, deterministic combat, raid logic, tutorial logic, Supabase authority, and browser testing. The revamp is primarily a runtime/presentation reset plus a combat-content model evolution.

### 3.1 Preserve
- npm workspace / monorepo structure.
- `packages/contracts` as the canonical validation/type boundary, after V2 schema revisions.
- `packages/game-content` as versioned data-driven content.
- `packages/game-rules` for pure rules and coordinate logic.
- Deterministic fixed-tick combat principle and replay/event-log architecture.
- Supabase Auth/Postgres, row-level security, server-authoritative economy actions, idempotent client action IDs.
- Content versioning and immutable raid snapshots.
- Vitest/Playwright verification philosophy.
- Camp 6×6 logical occupancy and battlefield 8×8 logical coordinates unless later design testing proves they should change.

### 3.2 Replace or substantially refactor
- `apps/web` player-facing runtime as the final game client.
- `@playcanvas/react` dependency in the V2 game runtime.
- React DOM gameplay HUD, summon picker, summon details drawer, tutorial overlay, spawn machine overlay, raid builders and similar screen UI.
- Persistent `selectedSummon` / `placementMode` interaction concepts.
- The current giant pointer bridge that translates DOM pointer events into projected game targets.
- Primitive summon presentation as the target visual standard.
- Current hard-coded single-skill combat implementation and six-kind skill switch.
- Cue-card tutorial structure.
- Pachinko represented as a web overlay with a button.
- Any UI that introduces confirm steps for a reversible spatial manipulation.

---

## 4. V2 runtime architecture

**LOCKED ARCHITECTURE** — Create `apps/game` as a standalone Vite + direct PlayCanvas Engine + TypeScript game runtime. It may coexist with `apps/web` while V2 is proven. No React or `@playcanvas/react` in `apps/game`.

```text
apps/game/
├── src/main.ts
├── src/app/
│   ├── GameApp.ts
│   ├── SceneManager.ts
│   ├── InputManager.ts
│   ├── CameraDirector.ts
│   └── GameClock.ts
├── src/world/
│   ├── BaseWorld.ts
│   ├── RaidWorld.ts
│   └── PachinkoWorld.ts
├── src/summons/
│   ├── SummonEntity.ts
│   ├── SummonPresenter.ts
│   └── SummonAnimator.ts
├── src/interaction/
│   ├── DragController.ts
│   ├── DropTargetResolver.ts
│   └── InteractionFeedback.ts
├── src/presentation/
│   ├── MotionDirector.ts
│   ├── VFXDirector.ts
│   ├── AudioDirector.ts
│   ├── RewardDirector.ts
│   └── PresentationTokens.ts
├── src/ui/
│   ├── UIDirector.ts
│   ├── HUDRoot.ts
│   ├── BattleCampDock.ts
│   ├── SummonInspector.ts
│   ├── SynergyHUD.ts
│   └── RaidHUD.ts
└── src/debug/
    └── DebugOverlay.ts
```

### 4.1 Rendering layers
`WORLD` → `WORLD_FX` → `WORLD_UI` → `HUD` → `HUD_FX` → `TRANSITION` → `DEBUG`

Game-space entities, world-space labels, screen-space HUD, celebratory overlays, transitions, and developer diagnostics must not be mixed arbitrarily. The layer model is established early so later VFX and UI do not become z-order hacks.

### 4.2 State separation
| Persistent gameplay state | Transient interaction/presentation state |
| :--- | :--- |
| Summon instances, tier, ownership | `currentlyDragging` |
| Camp placements | `resolvedDropTarget` |
| Saved raid/defense formation | hover/press state |
| Health/energy/cooldowns in combat snapshot | camera transition |
| Raid result / rewards | active merge/pachinko/reward sequence |
| Economy actions | inspector open/close animation state |

**DELETE CONCEPT** — There is no persistent “selected Summon for placement” state in V2. A tap may inspect a Summon. A pointer-down and drag may move it. Those are different interactions.

---

## 5. Interaction design constitution

| Principle | Rule |
| :--- | :--- |
| **Direct manipulation** | Grab the object you mean; move it to the destination; release. Avoid select→action→target→confirm. |
| **World continuity** | Opening a machine, inspector, or raid transition reframes the world rather than replacing it with a disconnected webpage. |
| **Causal feedback** | The touched object visually causes the outcome. A merge happens between the two models; a lever releases the ball. |
| **Anticipation** | Important actions use ~60–150 ms anticipation before release/impact to create physicality. |
| **Interrupt restraint** | No tutorial or notification blocks live combat. Non-critical information waits or stays peripheral. |
| **Forgiving spatial input** | Targets magnetize. Invalid releases elastically return instead of showing error dialogs. |
| **Reversibility** | Reversible spatial choices do not require confirmations. |
| **Celebration hierarchy** | Small actions feel good; major milestones receive disproportionate spectacle. |

### 5.1 Feedback hierarchy
| Level | Examples | Response |
| :--- | :--- | :--- |
| **Touch** | Hover, press, valid target | Small scale/light response, soft tick |
| **Commit** | Place, swap, reposition | Snap/land, ring pulse, dust/energy, impact sound |
| **Gain** | Pachinko reward, synergy activation | Reveal sting, UI/world ripple, identity emphasis |
| **Upgrade** | F→E and normal merges | Compression, burst, tier reveal, stat delta |
| **Triumph** | SSS, perfect raid, major unlock | Cinematic light/camera/audio sequence |

### 5.2 Motion tokens
| Token | Range | Use |
| :--- | :--- | :--- |
| **MICRO** | 90–140 ms | Hover, target change, tiny UI response |
| **QUICK** | 180–240 ms | Dock movement, quick transitions |
| **STANDARD** | 280–380 ms | Panel/inspector and placement completion |
| **FOCUS** | 450–650 ms | Camera reframe, machine focus |
| **REWARD** | 700–1100 ms | Spawn reveal, normal merge reward |
| **HERO** | 1400–2400 ms | SSS / major milestone cinematic |

Easing personalities: `SNAP`, `LAND`, `FLOAT`, `SPRING`, `CINEMATIC`. Do not scatter arbitrary timing/easing constants across components.

### 5.3 Audio language
- **Pickup**: soft energy lift.
- **Valid target**: tiny harmonic tick.
- **Placement**: physical thump + magical resonance.
- **Swap**: short double-swoosh.
- **Merge ready**: restrained rising tone.
- **Merge**: compression → silence pocket → impact → crystalline resolve.
- **Pachinko pegs**: multiple randomized physical ticks with slight pitch/variant changes.
- **Ultimate ready**: single recognizable charge cue.
- **Round win**: short cadence; **perfect raid**: fuller cadence.
- Repeated interactions must use small sound variations so they do not feel like identical UI button clicks.

---

## 6. Base Camp experience

The Base is a living diorama and the player’s persistent collection space. It should be calm, readable, and tactile. The Base is not a dashboard.

### 6.1 Camera and composition
- Fixed crafted top-down/isometric camera preset; no free orbit during normal play.
- Battle Camp is the visual center; future buildings form a readable perimeter.
- Summons own saturation and movement; environment stays comparatively restrained.
- Camp logic remains a 6×6 occupancy model. Cell boundaries are implied by environment and revealed more strongly during drag interactions rather than permanently rendered as debug boxes.

### 6.2 Summon idle life
- Subtle breathing/body motion.
- Small facing/look adjustments.
- Soft base-ring energy.
- Ground contact shadow.
- Occasional identity-specific idle effect when real assets exist.
- Idle animation must be inexpensive and quiet. It should make the Base feel alive without creating visual noise.

### 6.3 Inspecting a Summon
Tap/click opens inspection only. It never arms placement. Camera may subtly reframe. The inspector is PlayCanvas-native and the Base remains visible behind it.

```text
GOKU A ────────────────────────────────────────
ASCENDANT STRIKER
[large portrait or live model]
HP    ATK    ARMOR    AS    RANGE
PASSIVE   ACTIVE 1   ACTIVE 2   ULTIMATE
F ─ E ─ D ─ C ─ B ─ [A] ─ S ─ SS ─ SSS
```

The inspector presents identity first, then Origin/Combat Function, compact core stats, four abilities, and a single progression rail. Do not create nine separate character cards for nine tiers.

---

## 7. Direct Summon manipulation

**LOCKED PLACEMENT MODEL** — Drag Summons from the Battle Camp inventory representation directly onto valid battlefield/camp cells. No selected-Summon mode, no PLACE button, no confirmation.

### 7.1 Grab → drag → magnetize → drop
- Pointer/touch down on Summon or its dock card.
- Summon/card lifts subtly within ~100–150 ms; ring brightens; player immediately knows it is held.
- Drag representation follows pointer with minimal interpolation and no perceptible latency.
- Closest legal cell magnetizes; only relevant valid region is emphasized.
- Crossing target cells produces a MICRO pulse/tick.
- Release commits to target with a 250–400 ms land sequence: final snap, downward motion, tiny squash, ground rune/particle pulse, soft impact.
- Interaction immediately returns to idle; no success toast.

### 7.2 Invalid release
No error message. No red modal. If no valid target exists, the object gives a tiny resistant/elastic response and returns smoothly to its source.

### 7.3 Battlefield dock behavior
- Raid preparation exposes a bottom Battle Camp dock representing available Camp Summons.
- Drag dock card → empty legal battlefield cell: **deploy**.
- Drag deployed Summon → empty legal cell: **reposition**.
- Drag inventory Summon → occupied legal cell: **swap**.
- Drag deployed Summon back to dock: **remove from formation**.
- Tap/click card or deployed Summon: **inspect only**.
- Fight becomes available when the round/formation requirement is satisfied; it does not require a separate confirmation for every placement.

---

## 8. Spawn Pachinko / Gacha experience

**REPLACE ENTIRE CURRENT UX** — The pachinko is a physical world destination. Never represent it as an empty overlay with odds cards and a DROP BALL button.

### 8.1 Entry and focus
- Player touches the physical machine in Base.
- Camera moves into a crafted machine-focus preset; the Base remains contextually present.
- Machine lights animate on; six current reward Summons/portraits and probabilities are integrated around physical bins.
- Player manipulates a physical lever or equivalent game-world control.
- Server/authority has already determined reward + presentation seed; client animation presents that result.

### 8.2 Ball sequence
- Lever has anticipation/resistance before release.
- Ball release has a distinctive CLACK and acceleration.
- Peg impacts use varied tactile audio and tiny local light/spark feedback.
- Near a destination, corresponding reward identity begins reacting subtly.
- Landing uses a brief audio/visual silence pocket followed by bin energy flood and reward reveal.
- Reward transfers visibly into the Camp rather than appearing only in an inventory counter.

### 8.3 Economy authority
- Locked: browser physics never determines economic reward. Authority chooses reward before animation. Pachinko physics may be deterministic/presentation-only and can be gently biased to reach the already-resolved bin.
- The six-Summon daily/rotation pool is drawn from the broader curated roster (initially 30 and expanding). Current repository probability distribution may be retained for prototype continuity, but probability tuning is a live-balance parameter and must remain data-driven.

---

## 9. Merge and progression feedback

Merging is one of the product’s primary dopamine interactions. It is performed by direct drag: identical same-tier Summon onto identical same-tier Summon.

### 9.1 Merge-ready affordance
- As matching Summons approach, both rings synchronize.
- Target exerts subtle magnetic attraction.
- A restrained rising audio cue signals compatibility.
- No tutorial card or confirmation is required.

### 9.2 Merge sequence
- Both Summons compress/pull inward.
- Light collapses to a focal point; sound builds.
- Short 50–80 ms silence pocket.
- Energy burst + micro camera impulse.
- Upgraded Summon resolves in place.
- Tier crest animates old→new; concise stat/ability delta appears briefly beside the character, not in a modal.

### 9.3 Escalation by tier
| Transition range | Presentation intensity |
| :--- | :--- |
| **F→E** | Small, fast burst; minimal camera emphasis. |
| **E→D / D→C / C→B** | Increasing ring complexity and energy response. |
| **B→A** | Noticeable form-band transition and short focus moment. |
| **A→S / S→SS** | Hero framing, stronger aura, richer audio. |
| **SS→SSS** | Major cinematic: environment lighting response, transformation silhouette, tier crest, nearby Summon reaction; intentionally screen-recordable. |

---

## 10. Raid preparation and battle structure

Raid is asynchronous: the attacker fights a frozen, authoritative defender formation/snapshot. The battle visually resembles a top-down auto-battler but is not a battle royale or synchronous TFT lobby.

### 10.1 Direct formation UX
The field occupies the visual majority. Battle Camp dock sits along the bottom. No squad-builder page. No selection mode. The player drags available Summons directly onto the legal half of the arena.

```text
┌────────────────────────────────────────────────────┐
│                   ENEMY SIDE                       │
│                                                    │
│                RAID BATTLEFIELD                    │
│                                                    │
│                   YOUR SIDE                        │
├────────────────────────────────────────────────────┤
│                  BATTLE CAMP                       │
│   [Goku A]  [Luffy C]  [Naruto B]  [Eren E]  [L F] →│
└────────────────────────────────────────────────────┘
```

### 10.2 Three-round escalation
Locked concept from the product brief: three rounds use 2, 4, and 6 Summons. The visual escalation should be felt as reinforcements entering a single raid experience rather than three unrelated pages.

- **RECOMMENDED V2 RULE (REQUIRES OWNER CONFIRMATION BEFORE BACKEND MIGRATION)**: Configure one ordered six-Summon formation once. Positions 1–2 fight Round 1; positions 1–4 fight Round 2; positions 1–6 fight Round 3. This removes repetitive drafting and makes deployment order a strategic resource. Do not migrate raid DB/contracts to this form until explicitly confirmed.
- **RECOMMENDED V2 SCORING (REQUIRES OWNER CONFIRMATION)**: Represent the three round wins as 0–3 raid stars so Round 3 remains meaningful even after the attacker has already secured two wins. Do not replace current best-of-three authority until confirmed.

### 10.3 Raid transition
- Raid Gate is a physical Base object with ambient energy.
- Touching it triggers a spatial camera/transition sequence, hiding loading work inside the traversal where possible.
- Opponent reveal is short (roughly 1–2 seconds), not a matchmaking table.
- Preparation UI appears only after arrival in the arena.

---

## 11. Combat presentation target

The battle board must dominate the screen. Underlords is the reference for information hierarchy: battlefield, unit silhouettes, health/energy, readable positioning, compact synergies, and contextual hero information. PSYBLR should exceed it in tactile animation and anime ability spectacle without losing causality.

### 11.1 Preparation vs combat modes
| Preparation | Combat |
| :--- | :--- |
| Battle Camp dock visible | Dock retreats/disappears |
| Valid placement region visible | No placement affordances |
| Inspector available | Inspector closed by default; optional compact non-blocking inspection later |
| Synergy changes previewed | Active synergies compact at edge |
| Formation controls active | Board/units receive ~80% visual attention |

### 11.2 Ability readability rule
Every important ability follows: **anticipation → origin → travel/telegraph → impact → reaction → clear**. Spectacle without these stages is rejected as unreadable.
- Basic attacks use small, fast feedback.
- Critical/amplified hits use a stronger but still brief number/impact treatment.
- AOE abilities telegraph shape and source clearly.
- Ultimates may use short camera tightening, hit-stop, local time/light effects, and camera impulse; they must not repeatedly hijack the full camera.
- Damage numbers aggregate when many hits would overlap.
- Death animation owns attention after the final hit.

### 11.3 Semi-auto control
**OPEN DESIGN DECISION** — The exact amount of manual ability control is not yet locked in this document. Recommended default: movement/basic attacks/passive/actives are automatic; Ultimate may be manual-or-auto via energy. Do not hard-code UX around manual Ultimate until confirmed.

---

## 12. Onboarding redesign

**DELETE CURRENT CUE-CARD PHILOSOPHY** — The V2 tutorial must not use recurring blocking cards, DOM focus masks, Continue buttons, or instructions that cover the interaction being taught.

### 12.1 Three-level silent onboarding
| Level | Behavior |
| :--- | :--- |
| **1. Affordance** | The relevant world object/cell subtly glows, moves, breathes, or becomes visually available. |
| **2. Demonstration** | If the player hesitates, a brief ghost-hand/ghost-object demonstrates the beginning of the gesture. |
| **3. Microcopy** | Only if needed: small anchored text such as “DRAG A SUMMON TO THE FIELD”. It disappears immediately on interaction and never blocks combat. |

Onboarding is event-driven and resumable as a product requirement, but its presentation is embedded into normal interaction feedback.

---

## 13. Summon card and inspector system

### 13.1 Compact card
Cards are compact handles for an existing Summon, not mini webpages. They should show portrait/identity, current tier, Origin, and Combat Function. No large prose, no embedded progression tree, no placement buttons.

```text
┌───────────────────┐
│     PORTRAIT      │
│                   │
│      GOKU A       │
│    ◇ Origin ⚔ Fn  │
└───────────────────┘
```

### 13.2 Progression model
One Summon definition is stable across F→SSS. Tier changes stats, ability rank, form band, VFX, model/skin presentation, and emblem. The data model must not duplicate identity/content nine times.

---

## 14. V2 Summon and ability content model

Each Summon has exactly one Origin and one Combat Function initially. Mechanics such as stun, dash, shield, execute, projectile, lifesteal, silence, knockback, summon, etc. are ability/effect tags, not additional synergy axes.

Each Summon has four abilities: 1 Passive, 2 Actives, 1 Ultimate. The current V1 hard-coded Skill 1-only simulator is evolved into a data-driven ability/effect grammar with a controlled custom-resolver escape hatch.

```typescript
type AbilitySlot = 'passive' | 'active1' | 'active2' | 'ultimate';

type AbilityEffect =
  | { type: 'damage'; damageType: 'physical' | 'magic' | 'pure'; coefficient: number; scaling: 'attack' | 'target_max_hp' }
  | { type: 'heal'; coefficient: number; scaling: 'attack' | 'max_hp' }
  | { type: 'shield'; coefficient: number; scaling: 'attack' | 'max_hp' }
  | { type: 'status'; statusId: string; durationMs: number; stacks?: number }
  | { type: 'displace'; mode: 'dash' | 'blink' | 'pull' | 'knockback'; distance: number }
  | { type: 'energy'; amount: number };

interface AbilityDefinition {
  id: string;
  name: string;
  slot: AbilitySlot;
  castMode: 'passive' | 'auto' | 'manual_or_auto';
  cooldownMs: number;
  energyCost: number;
  targeting: TargetingDefinition;
  effects: AbilityEffect[];
  resolverId?: string; // only for mechanics not expressible safely in the grammar
}
```

The effect grammar stays deliberately small. Do not turn JSON into a scripting language. Complex signature mechanics may use reviewed deterministic resolver functions.

### 14.1 Summon definition target
```typescript
interface SummonDefinition {
  id: string;
  displayName: string;
  originId: string;
  functionId: string;
  tags: string[];
  baseStats: {
    hp: number;
    attack: number;
    armor: number;
    magicResist: number;
    attackSpeed: number;
    attackRange: number;
    moveSpeed: number;
    startingEnergy: number;
    maxEnergy: 100;
  };
  basicAttack: {
    damageType: 'physical' | 'magic' | 'pure';
    windupMs: number;
    projectileSpeed?: number;
  };
  abilities: {
    passive: string;
    active1: string;
    active2: string;
    ultimate: string;
  };
  aiProfileId: string;
  assetSetId: string;
}
```

---

## 15. Contract/schema migration requirements

| Current concept | V2 change |
| :--- | :--- |
| `SummonDefinition.skills` basic/skill1/skill2/ultimate | Replace with `basicAttack` + `abilities.passive`/`active1`/`active2`/`ultimate`; add richer stats, `aiProfileId`, `assetSetId`. |
| `SkillMechanics.kind` enum with six hard-coded mechanics | Replace with composable targeting + effects + optional `resolverId`. |
| `CombatCommand` only `cast_skill_1` | Replace when control model is confirmed; commands must support any manual-authority actions without coupling to UI. |
| Selected placement state in app store | Delete in V2 client; retain only transient `DragSession` state. |
| `RaidSquadDraft` / per-round builder UI state | Presentation replaced by direct field manipulation. Domain schema migration depends on ordered-six decision. |
| `CampCell` / `BattleCell` | Preserve logical coordinates; centralize world mapping. |
| Spawn reward authority | Preserve server-first reward resolution + presentation seed. |
| `SummonInstance` | Preserve identity + `definitionId` + `tier`; add only persistent fields genuinely required by product. |

### 15.1 Canonical coordinate rule
Logical gameplay cells are authoritative. World-space positions are presentation. Every scene must use one canonical mapper per board type. No scattered x/z magic numbers and no DOM projection layer for placement.

---

## 16. Backend / database treatment

### 16.1 Preserve
- `profiles`/authentication basis.
- `summon_instances` ownership and tier concept.
- `camp_placements` 6×6 occupancy.
- `spawn_machine_state` / daily pool concept.
- `economy_actions` idempotency.
- `merge_events` auditability.
- `raid_matches` / `raid_rounds` concept of immutable snapshots, seeds and content versions.
- Server-authoritative claim/mutation transactions.

### 16.2 Do not migrate yet
Do not rewrite raid tables solely because the V2 presentation changes. Backend migration for ordered-six formation / star scoring must wait for explicit product confirmation. Do not rewrite auth or economy infrastructure during the Golden Five-Minute visual slice.

- **OPEN PRODUCT DECISION: RAID STEALING** — The current repository contains “win raid → visit opponent camp → steal one exposed Summon” logic. The new product description did not restate this mechanic. Treat it as legacy behavior that is neither deleted nor expanded until explicitly confirmed.

---

## 17. Incremental layer and storage constraints

- **OPEN PRODUCT DECISION: INCREMENTAL ECONOMY** — The current concept has acquisition, collection, merging and asynchronous raids, but the true away-time/incremental resource loop is not yet locked. Do not invent worker simulation, crafting, hunger, mining or Palworld-style automation.
- **OPEN PRODUCT DECISION: OVERFLOW/STORAGE** — A 36-slot Battle Camp plus F→SSS binary merging can create severe inventory pressure as the roster grows. The exact overflow model (strict 36 only, reserve inventory, or stack/overflow storage) must be decided before production economy balancing. V2 presentation may treat the existing Camp occupants as the raid dock source without inventing unlimited storage.

---

## 18. Responsive and accessibility requirements

- Landscape-first for desktop and mobile.
- Touch targets and drag magnetism designed for fingers, not just mouse precision.
- Do not depend on hover to expose required information.
- Tap is inspection; drag is movement. Long-press is reserved for secondary actions only if later needed.
- Motion-reduction setting must eventually reduce camera shake, hit-stop and large UI motion without removing essential state feedback.
- Color cannot be the only carrier of valid/invalid, tier or status information.
- Text and HUD scale via PlayCanvas screen anchors/layout rather than fixed desktop pixel assumptions.

---

## 19. Performance and rendering budgets

Initial browser target: WebGL2. The game should be architected for later renderer improvements without depending on WebGPU beta behavior for launch-quality interaction.

| Budget / rule | Target |
| :--- | :--- |
| **Frame rate** | 60 fps on representative desktop and modern mid/high mobile landscape; graceful degradation rather than gameplay timing changes. |
| **Combat units** | Design for 12 active Summons (6v6) plus effects; do not build MMO-scale systems. |
| **Simulation** | Fixed deterministic tick separate from render interpolation. |
| **VFX** | Pool frequently spawned effects; cap overlapping particles and lights. |
| **UI** | Native PlayCanvas UI; avoid DOM reflow during gameplay. |
| **Assets** | GLB/glTF; compressed textures and reasonable LOD/animation budgets as real art arrives. |
| **Physics** | Presentation only where possible; deterministic game rules do not depend on renderer physics. |

---

## 20. Golden Five-Minute Experience

Before broad feature implementation, V2 must prove a near-production interaction quality bar across one short loop:

```text
BASE
 ↓
touch Summon
 ↓
inspect Summon
 ↓
open Pachinko
 ↓
pull lever
 ↓
spawn duplicate
 ↓
return to Base
 ↓
drag duplicate onto duplicate
 ↓
merge
 ↓
enter Raid
 ↓
drag Summons onto field
 ↓
2v2 battle
 ↓
round victory
```

Do not expand to 30 finished Summons, full live economy, late tiers, or broad menu coverage until this slice feels materially better than the legacy build.

---

## 21. Antigravity implementation decomposition

The user’s execution environment has a ~1,000,000-token input context ceiling. Do not approach that ceiling. Each implementation task should be independently understandable using this source-of-truth document, the committed repository, and only the relevant folder subset. Recommended working context per task: ~100k–300k tokens; hard stop and split before ~500k. Start a fresh Antigravity task for each row below.

| Task | Scope | Exit objective |
| :--- | :--- | :--- |
| **V2-01** | Runtime foundation + golden Base drag | Create `apps/game`, direct PlayCanvas, native HUD proof, Base camera/lighting, one living placeholder Summon, grab→drag→magnetize→drop, debug tools. No React. |
| **V2-02** | Base visual quality + Summon inspector | Refine Base composition; native inspector; compact Summon identity/stats/ability/progression presentation. No Pachinko yet. |
| **V2-03** | Battle Camp dock + generalized direct manipulation | Build reusable dock/card system, drag from Camp inventory representation, swaps, return-to-dock, touch ergonomics. |
| **V2-04** | Pachinko world + camera focus | Physical machine, camera focus/exit, six-bin presentation, lever interaction, no economy changes yet. |
| **V2-05** | Pachinko reward presentation + existing spawn authority | Integrate current server/tutorial reward resolution, seeded ball presentation, peg audio/VFX, reward transfer into Camp. |
| **V2-06** | Merge interaction and tier reward choreography | Direct compatible drag, merge-ready resonance, merge sequence, stat/tier delta, tier-intensity ladder foundation. |
| **V2-07** | Raid arena + direct 2v2 preparation | Arena presentation, Battle Camp dock → battlefield drag, valid half, swaps/reposition/removal, start-ready state. No full combat polish yet. |
| **V2-08** | Combat presenter foundation | Bridge deterministic combat events to PlayCanvas entity animation; movement, targets, basic attacks, HP, damage, death. |
| **V2-09** | V2 ability grammar + 4-slot Summon contracts | Migrate contracts/content/combat core from Skill1 hard-coding to passive+2 actives+ultimate effect grammar; deterministic tests. |
| **V2-10** | Ability/VFX readability + energy/ultimate presentation | Telegraphs, status VFX, energy, readable damage numbers, camera impulses, audio; exact manual Ultimate UX only after owner lock. |
| **V2-11** | 2→4→6 raid escalation presentation | Reinforcement sequencing, round HUD, replay continuity. Domain changes only after ordered-six rule confirmation. |
| **V2-12** | Synergy UX | Origins/Combat Functions, field-composition feedback, threshold activation animation, compact combat HUD. |
| **V2-13** | Silent onboarding | Affordance/demonstration/microcopy system replacing cue cards; resumable event-driven progression. |
| **V2-14** | Backend integration hardening | Replace tutorial/local gateways with real authoritative calls where appropriate; preserve idempotency/content versions/RLS. |
| **V2-15** | Responsive/mobile landscape + accessibility | Touch stress test, safe areas, scaling, reduced motion, keyboard fallback where useful. |
| **V2-16** | Golden Five-Minute polish gate | End-to-end audio/motion/VFX/camera pass, performance budget, visual regression, usability cleanup. No content expansion until approved. |
| **V2-17** | Content expansion tooling | Only after polish gate: scalable asset manifests, ability content authoring, validation, roster expansion workflow. |
| **V2-18** | Legacy retirement | After V2 replacement meets product gate: route production to `apps/game`; archive/remove gameplay React implementation without losing reusable domain code. |

### 21.1 Prompt discipline for every Antigravity task
1. Start by reading this source-of-truth document plus `AGENTS.md` and the relevant current implementation files.
2. Do not import unresolved decisions from old chat messages.
3. State explicitly which open decisions are out of scope.
4. Do not broaden scope “helpfully”.
5. Visual verification is mandatory for any player-facing task; compile success is not definition-of-done.
6. Commit a completion record under `docs/exec-plans/completed/` describing what changed, tests, screenshots/observations, limitations, and next task.
7. Fresh task begins from committed repository state, not prose assumptions about previous task output.

---

## 22. Quality gates

### 22.1 Micro-interaction gate
For each direct manipulation: if the progression reward were removed, would the interaction itself still feel pleasant? Grab, drag, drop, lever pull, ball impacts, merge, reinforcement and combat hits should each pass this test.

### 22.2 Presentation gate
- No debug geometry visible in normal play.
- No DOM gameplay controls in `apps/game`.
- No blocking onboarding during combat.
- No unexplained mode changes.
- No success toast when animation can communicate success.
- No major action without clear anticipation/commit/result feedback.
- No ability VFX that obscures source/target causality.
- No camera move that sacrifices tactical readability for spectacle.
- No new component-specific motion timing when an existing token fits.

### 22.3 Technical gate
- Deterministic simulation tests pass.
- Content schemas validate.
- Existing authoritative economy invariants remain intact.
- No direct client trust for rewards, merges or ownership transfers.
- No duplicate rule implementation across renderer and domain packages.
- No hidden coupling to anime/franchise names; commercial content remains replaceable.

---

## 23. Explicit open-decision register

These are the only major product items this document intentionally does not lock. Antigravity must not invent them.

| ID | Decision | Default recommendation | Implementation rule until confirmed |
| :--- | :--- | :--- | :--- |
| **OD-01** | Raid formation: separate 2/4/6 setup vs one ordered six-Summon formation | One ordered six-Summon formation; 1–2 / 1–4 / 1–6 participate | Keep V2 presentation flexible; do not migrate authoritative raid schema. |
| **OD-02** | Raid result: best-of-three vs 0–3 star raid | Three stars, one per round | Keep current authority until confirmed. |
| **OD-03** | Raid stealing mechanic | Decide after core raid fun/economy test; it is high-impact and punitive | Preserve legacy code/data; do not foreground or expand. |
| **OD-04** | Manual Ultimate vs fully automatic combat | Manual-or-auto Ultimate; everything else auto | Do not hard-code command UI until confirmed. |
| **OD-05** | Incremental/away-time resource loop | One simple resource linked to collection/base strength; no Palworld worker sim | Do not build idle economy yet. |
| **OD-06** | Battle Camp overflow/storage | Likely limited Camp + carefully designed reserve/overflow rather than hard 36 forever | Use current Camp occupants for V2 slice; do not invent unlimited inventory. |
| **OD-07** | Exact tier power curve | Tune through simulation after ability/raid loop exists | Keep data-driven; no hard-coded presentation assumptions. |

---

## 24. Reference language and boundaries

Primary UI/interaction references supplied for study:
- Dota Underlords UI screenshots and battlefield/placement/hero-description patterns: [gameuidatabase.com/gameData.php?id=550](https://www.gameuidatabase.com/gameData.php?id=550)
- Dota Underlords interface screenshot collection: [interfaceingame.com/games/dota-underlords](https://interfaceingame.com/games/dota-underlords)

Borrow interaction grammar and information hierarchy, not copyrighted artwork, branded assets, exact layouts, or franchise content. Anime character names in current prototype content are placeholders; commercial release requires licensing or original characters.

---

## 25. Immediate next action

**START ONLY AFTER THIS DOCUMENT IS ACCEPTED** — The first implementation task is **V2-01: direct PlayCanvas runtime foundation + Golden Base drag interaction**. Do not begin Pachinko, Raid, merge, combat revamp, or content migration inside V2-01.

V2-01 exists to prove the hardest architecture assumptions early: direct PlayCanvas without React, premium direct manipulation, and a reusable motion/VFX/audio presentation system. If it feels mediocre, iterate V2-01 rather than spreading mediocre interaction patterns across the game.

---

## Appendix A. Current repository areas that motivated the revamp

| Path / system | Observed role | V2 treatment |
| :--- | :--- | :--- |
| `apps/web/src/game/GameCanvas.tsx` | React/PlayCanvas bridge, pointer projection, camera and scene coupling | Reference only; replace with direct GameApp/Input/Camera architecture. |
| `apps/web/src/ui/TutorialOverlay.tsx` | DOM cue cards, focus masks, projected targets | Retire; replace with silent onboarding. |
| `apps/web/src/ui/SpawnMachineOverlay.tsx` | Web overlay with DROP BALL control | Retire; replace with physical machine. |
| `apps/web/src/game/entities/SummonWorldEntity.tsx` | Primitive placeholder presentation | Use only as data/behavior reference; establish new presentation quality bar. |
| `packages/combat-core` | Deterministic 100ms fixed-tick sim, currently Skill1-centric | Preserve principle; evolve ability model. |
| `packages/contracts` | Current Zod schemas including F→SSS, 8×8 battle, 6×6 camp, raid schemas | Migrate deliberately as defined in Section 15. |
| `supabase/migrations` | Authoritative ownership/economy/raid structures | Preserve; migrate only when product decisions require it. |

---

## Appendix B. Definition of “wow” for PSYBLR

“Wow” is not a global particle multiplier. It is the cumulative result of consistent physical feedback, premium timing, readable tactical information, character-first visual hierarchy, sound design, and escalation. The game should make ordinary actions satisfying and reserve true spectacle for progression milestones and decisive battle moments.

A V2 interaction should be rejected when it technically works but feels like a button causing an unrelated state change. It should be accepted when the player can understand cause and effect through motion, sound and spatial behavior with minimal instructional text.

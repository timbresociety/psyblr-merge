# PSYBLR V2 — Task 03: Battle Camp Dock & Generalized Direct Manipulation

## Objective
Implement multi-summon roster support, distinct 3D visual presenters for all 6 starter Summons, the PlayCanvas-native Battle Camp Dock tray, and generalized direct manipulation with position swapping.

---

## Implementation Summary

1. **Multi-Summon Visual Silhouettes (`SummonPresenter`)**:
   - Created distinct 3D silhouette presenters and materials for all 6 starter Summons based on canonical game content:
     - **Goku** (Ascendant Striker): Orange gi, blue belt sash, golden spiky hair, amber base energy ring.
     - **Naruto** (Shinobi Assassin): Orange jumpsuit, blue yoke, metallic forehead protector plate, spiky blond hair, orange base ring.
     - **Luffy** (Pirate Brawler): Red sleeveless vest, blue denim shorts, wide-brim yellow straw hat with red ribbon, ruby base ring.
     - **Eren** (Titan Vanguard): Green Scout Regiment cape, brown leather harness jacket, white breeches, emerald base ring.
     - **L** (Mastermind Strategist): Slouched stance, loose white long-sleeve shirt, blue jeans, shaggy dark hair, sky blue base ring.
     - **Lelouch** (Royal Tactician): Zero command cloak with gold filigree trim and high purple collar, royal violet base ring.
   - Dynamic routing via `SummonPresenter.createVisuals(definitionId, parent)` in `SummonEntity`.

2. **Battle Camp Dock (`BattleCampDock`)**:
   - Native PlayCanvas Screen UI (`HUD` layer, zero React DOM) anchored to bottom-center of screen.
   - Glassmorphism backdrop tray with gold accent trim.
   - Renders compact character cards for all 6 roster summons with summon name, tier badge (`[F]`), and deployment status.
   - Direct click on any card selects/inspects the summon, reframing the camera to focus on it if placed on field.

3. **Generalized Direct Manipulation & Multi-Summon Swapping**:
   - Upgraded `CampDropTargetResolver` to resolve any valid 6x6 camp cell as a target.
   - Implemented cell swapping in `SceneManager.onSummonPlacementCommitted`: dragging a summon onto an occupied cell smoothly swaps both summons' positions with authored landing squashes.
   - Maintained deterministic synchronization between `SceneManager.placements` and `BattleCampDock`.

---

## Files Added & Modified

### New Files
- `apps/game/src/ui/BattleCampDock.ts`
- `apps/game/src/ui/BattleCampDock.test.ts`
- `docs/exec-plans/completed/V2-TASK03.md`

### Modified Files
- `apps/game/src/summons/SummonPresenter.ts`: Added visual silhouettes for Naruto, Luffy, Eren, L, and Lelouch.
- `apps/game/src/summons/SummonEntity.ts`: Updated to call `createVisuals(instance.definitionId, this.root)`.
- `apps/game/src/app/SceneManager.ts`: Initialized 6-summon roster with 4 starting placed summons, added swap resolution.
- `apps/game/src/interaction/CampDropTargetResolver.ts` & `CampDropTargetResolver.test.ts`: Updated to resolve occupied cells for swapping.
- `apps/game/src/interaction/DragController.ts` & `DragController.test.ts`: Passed `fromCell` to `onPlacementCommitted`.
- `apps/game/src/app/InputManager.ts`: Wired `fromCell` into `sceneManager.onSummonPlacementCommitted`.
- `apps/game/src/app/GameApp.ts`: Instantiated and wired `BattleCampDock`.
- `tests/e2e/game-v2.spec.ts`: Added E2E tests for multi-summon camp rendering, dock initialization, tap-to-inspect, and direct drag swap.

---

## Verification & Test Results

1. **Unit Tests**:
   - `npm test`: 69 tests passed across 12 test suites (20 tests in `@psyblr/game`).
2. **Typecheck**:
   - `npm run typecheck`: 0 errors.
3. **Content Validation**:
   - `npm run validate:content`: 100% pass.
4. **Vite Production Build**:
   - `npm run build:game`: Built dist bundle cleanly in 323ms.
5. **Playwright E2E Verification**:
   - `npx playwright test --config=playwright.game.config.ts`:
     - Mobile Landscape: PASSED (12.4s).
     - Desktop Landscape: PASSED (18.6s).
     - Screenshots captured: initial camp & dock, drag swap hover, landed swap state.

---

## Recommended Next Task (Task 04)
**V2 Task 04: Pachinko World + Camera Focus & Pachinko Physics Board**
- Construct the 3D Pachinko machine physical structure and ball drop playfield at the Pachinko World zone.
- Implement camera transition (`focusOnPachinko` and `returnToBaseOverview`).
- Implement 3D physical pinboard bounce simulation with deterministic Pachinko core.

# PSYBLR V2 — Task 02: Base Visual Quality + PlayCanvas Native Summon Inspector

## Objective
Elevate the visual presentation of the 3D Base Camp diorama and deliver the PlayCanvas-native Summon Inspector:
- Refine Base diorama aesthetics with ambient floating crystals/monoliths, enhanced materials, illuminated runic borders, and building socket animations.
- Introduce a clear input distinction between stationary Tap (Inspect Summon) and direct spatial Drag (Reposition / Land).
- Implement camera focus reframing when inspecting a Summon (`focusOnSummon` and `returnToBaseOverview`) maintaining 3D Base visibility.
- Build the native PlayCanvas Screen-space Summon Inspector panel displaying single-summon identity, Origin/Combat Function chips, core stats matrix, 4-slot ability layout, and Underlords-inspired single-identity F→SSS progression rail with next-tier stat deltas.
- Synthesize real-time Web Audio feedback for inspector open/close.

---

## Implementation Summary

1. **Enhanced Base Diorama (`BaseWorld`)**:
   - Added 4 ambient floating runic monolith crystals in the outer void with subtle sine bobbing and continuous yaw rotation.
   - Animated the floating energy orb above the Spawn Machine socket and the floating portal rune in the Raid Gate arch.
   - Enhanced material diffuse/emissive properties and gold/cyan arena borders.

2. **Summon Tap vs Drag Input Distinction (`DragController`, `SummonEntity`)**:
   - Pointer down tracks position and timestamp without lag.
   - Pointer travel $< 0.15$ units within $< 350ms$ is resolved as a stationary Tap, calling `summon.onTapSettle()` and firing `onSummonTapped(summon)`.
   - Pointer travel $\ge 0.15$ units transitions into full Direct Manipulation Drag, smoothly closing any open inspector and tracking the ground plane.
   - Tapping outside on empty ground dismisses the inspector and returns the camera to Base overview.

3. **Camera Director Reframe (`CameraDirector`)**:
   - `focusOnSummon(worldPos)` smoothly transitions position to `[worldPos.x - 1.4, 7.6, worldPos.z + 6.2]`, pitch to `-38°`, and FOV to `38°` using `MotionDirector` with `EASING.CINEMATIC` over `DURATION.FOCUS` (520ms).
   - `returnToBaseOverview()` smoothly eases back to `BASE_CAMERA_PRESET` (`[0, 10.8, 12.5]`, `-42°`, FOV `42°`).

4. **PlayCanvas Native Screen Summon Inspector (`SummonInspector`)**:
   - Built with native PlayCanvas `ScreenComponent` and `ElementComponent` on `HUD` layer with zero React DOM.
   - Glassmorphism backdrop panel (440×640px) on the right ~38% of the screen.
   - Top amber gold accent bar with close button `[✕]`.
   - Header: `GOKU [F]`.
   - Origin & Function Chips: `ASCENDANT • STRIKER • POWER 1.00x`.
   - Summary tagline text.
   - Core Stats Matrix: `HP: 1000  ATK: 120  DEF: 70` | `APS: 1.10  RANGE: 2.5  MOVE: 4.6`.
   - Abilities: 4 distinct slots (Basic Attack: Ki Strike, Skill 1: Ki Burst with 8.0s cooldown, Skill 2: Locked at Tier D, Ultimate: Locked at Tier A).
   - Single-Summon Progression Rail: `[F] - E - D - C - B - A - S - SS - SSS` with dynamic next-tier delta preview (`Next [Tier E]: +150 HP  +18 ATK  +11 DEF`).
   - Smooth slide-in/out animations via `MotionDirector` (`DURATION.QUICK`).
   - Dismissible via close button, tapping outside, pressing `Escape`, or dragging the Summon.

5. **Audio Synthesis (`AudioDirector`)**:
   - Added `playInspectorOpen()`: Harmonic rune chime chord (440 + 660 + 880 Hz).
   - Added `playInspectorClose()`: Soft dismiss whoosh (340 -> 180 Hz).

---

## Files Added & Modified

### New Files
- `apps/game/src/ui/SummonInspector.ts`
- `apps/game/src/ui/SummonInspector.test.ts`
- `docs/exec-plans/completed/V2-TASK02.md`

### Modified Files
- `apps/game/src/world/BaseWorld.ts`: Added floating ambient monoliths, animated building socket props, and enhanced materials.
- `apps/game/src/app/CameraDirector.ts`: Added `focusOnSummon` and `returnToBaseOverview` smooth cinematic tweens.
- `apps/game/src/app/SceneManager.ts`: Wired `baseWorld.update(dt)`.
- `apps/game/src/app/GameApp.ts`: Instantiated `SummonInspector`, wired tap-to-inspect and ground dismiss, and coordinated HUD prompt badge visibility.
- `apps/game/src/interaction/DragController.ts`: Added tap vs drag discrimination, `onSummonTapped`, and `onGroundTapped`.
- `apps/game/src/summons/SummonEntity.ts`: Added `onTapSettle()` method.
- `apps/game/src/presentation/AudioDirector.ts`: Added `playInspectorOpen()` and `playInspectorClose()`.
- `apps/game/src/ui/HUDRoot.ts`: Exported `fontAsset` and added `setBadgeVisible()`.
- `tests/e2e/game-v2.spec.ts`: Added E2E verification of tap-to-inspect, camera reframe, inspector panel data, dismiss actions, and direct manipulation drag.

---

## Verification & Test Results

1. **Unit Tests**:
   - `npm test`: 66 tests passed across 12 test suites (17 tests in `@psyblr/game`).
2. **Typecheck**:
   - `npm run typecheck`: 100% clean across all packages.
3. **Content Validation**:
   - `npm run validate:content`: 100% pass.
4. **Vite Production Build**:
   - `npm run build:game`: Built dist bundle cleanly in 316ms.
5. **Playwright E2E Verification**:
   - `npx playwright test --config=playwright.game.config.ts`:
     - Desktop Landscape (`1440x900`): PASSED (26.5s).
     - Mobile Landscape (`844x390`): PASSED (16.0s).
     - Captured and verified screenshots for initial Base Camp, open Inspector panel, active drag, landed state, and debug overlay.

---

## Recommended Next Task (Task 03)
**V2 Task 03: Battle Camp Dock & Generalized Direct Manipulation**
- Build the PlayCanvas-native bottom Battle Camp Dock representing available Summons.
- Support dragging Summons from Dock into valid Camp cells.
- Integrate the remaining 5 starter summons (Naruto, Luffy, Eren, L, Lelouch) with distinct visual palettes and silhouettes.
- Implement multi-summon occupancy rules, cell-to-cell swapping, and dock recall.

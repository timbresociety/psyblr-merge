# PSYBLR V2 — Task 01: Native PlayCanvas Foundation + Golden Summon Interaction

## Objective
Establish the PSYBLR V2 game runtime foundation in `apps/game` beside legacy `apps/web`. Build a direct PlayCanvas engine application in pure TypeScript with zero React, craft the 3D Base diorama, implement the Golden Summon (Goku) with subtle idle life, and deliver the tactile golden interaction: direct grab, smooth drag with magnetic cell resolution, authored landing feedback with VFX and sound synthesis, and physical elastic return on invalid drop.

---

## Implementation Summary

1. **Standalone Application (`apps/game`)**:
   - Configured Vite + TypeScript + PlayCanvas 2.21.4 engine.
   - Zero React, Zero React DOM, Zero `@playcanvas/react`.
   - Shared domain logic directly with `@psyblr/contracts`, `@psyblr/game-content`, and `@psyblr/game-rules`.
   - Added npm workspace scripts: `dev:game`, `build:game`, `typecheck:game`.

2. **Explicit Layer Architecture**:
   - `WORLD` (0), `WORLD_FX` (1001), `WORLD_UI` (1002), `HUD` (1003), `HUD_FX` (1004), `TRANSITION` (1005), `DEBUG` (1006).

3. **Base Scene Diorama (`BaseWorld`)**:
   - Fixed crafted top-down/isometric camera (`[0, 10.8, 12.5]`, rotation `[-42, 0, 0]`, fov `42`).
   - Central 6x6 Battle Camp stone platform with subtle vertex grid indicators.
   - Illuminati row (Row 0) distinct rune aura band.
   - Building socket platforms for Spawn Machine (right) and Raid Gate (left) matching game content definitions.
   - Directional key light with shadow casting, cool fill light, and ambient bounce illumination.

4. **Golden Summon (`SummonPresenter` & `SummonEntity`)**:
   - Composed silhouette placeholder for Goku (Ascendant Striker): base rune cylinder, orange gi, blue sash and wristbands, skin tones, spiky hair crest, and readable eye visor.
   - Ambient idle life: breathing vertical bobbing + squash scale pulse, soft base-ring pulse, and grounded contact shadow breathing.

5. **Direct Manipulation Golden Interaction (`DragController`, `CampDropTargetResolver`, `InteractionFeedback`)**:
   - Pointer down lifts unit by 0.38y, scales by 1.08x, and brightens base ring within 120ms with warm grab chord.
   - Drag smoothly tracks ground raycast with interpolation.
   - Closest legal Camp cell snaps magnetically and highlights target tile with ghost landing indicator.
   - Releasing over valid cell commits landing: snap to cell, downward drop, authored landing squash settle, expanding shockwave ring, 8 radial spark particles, subtle camera impulse, and impact thud sound.
   - Releasing outside valid cell triggers elastic spring return to origin cell with zero error toasts.
   - Immediate re-grabbing works seamlessly.

6. **Web Audio Sound Synthesis (`AudioDirector`)**:
   - Zero external audio files required. Synthesizes grab chord, cell hover tick, landing punch + chime, and return whoosh using Web Audio API.

7. **Native Screen-Space HUD & Debug (`HUDRoot`, `DebugOverlay`)**:
   - Native PlayCanvas `ScreenComponent` and `ElementComponent` using dynamic `CanvasFont`.
   - Brand title `PSYBLR`, subtitle `BASE CAMP`, version badge `V2 ALPHA 0.1`.
   - Debug overlay toggled via `~` or `D` key showing live FPS, frame ms, hovered Camp cell, and drag state.

---

## Files Added & Modified

### New Files
- `apps/game/package.json`
- `apps/game/tsconfig.json`
- `apps/game/vite.config.ts`
- `apps/game/index.html`
- `apps/game/src/main.ts`
- `apps/game/src/app/GameApp.ts`
- `apps/game/src/app/GameClock.ts`
- `apps/game/src/app/CameraDirector.ts`
- `apps/game/src/app/InputManager.ts`
- `apps/game/src/app/SceneManager.ts`
- `apps/game/src/world/CampCoordinateMapper.ts`
- `apps/game/src/world/BaseWorld.ts`
- `apps/game/src/summons/SummonEntity.ts`
- `apps/game/src/summons/SummonPresenter.ts`
- `apps/game/src/interaction/DragController.ts`
- `apps/game/src/interaction/CampDropTargetResolver.ts`
- `apps/game/src/interaction/InteractionFeedback.ts`
- `apps/game/src/presentation/PresentationTokens.ts`
- `apps/game/src/presentation/PresentationEvents.ts`
- `apps/game/src/presentation/MotionDirector.ts`
- `apps/game/src/presentation/AudioDirector.ts`
- `apps/game/src/presentation/VFXDirector.ts`
- `apps/game/src/ui/HUDRoot.ts`
- `apps/game/src/debug/DebugOverlay.ts`
- `apps/game/src/world/CampCoordinateMapper.test.ts`
- `apps/game/src/interaction/CampDropTargetResolver.test.ts`
- `apps/game/src/interaction/DragController.test.ts`
- `playwright.game.config.ts`
- `tests/e2e/game-v2.spec.ts`
- `docs/v2/ARCHITECTURE.md`
- `docs/exec-plans/completed/V2-TASK01.md`

### Modified Files
- `package.json`: Added `dev:game`, `build:game`, `typecheck:game` workspace scripts while preserving all existing scripts.

---

## Verification & Test Results

1. **Unit Tests**:
   - `npm test`: 64 tests passed across 11 test suites (15 tests in `@psyblr/game`, all existing packages passing).
2. **Typecheck**:
   - `npm run typecheck`: 100% clean across all packages with strict TypeScript.
3. **Content Validation**:
   - `npm run validate:content`: 6 summons, 12 skills, 3 creeps, 29 tutorial steps, spawn total 100%.
4. **Vite Production Build**:
   - `npm run build:game`: Built dist bundle cleanly in 321ms.
5. **Playwright E2E Verification**:
   - `npx playwright test --config=playwright.game.config.ts`:
     - Desktop landscape (`1440x900`): PASSED.
     - Mobile landscape (`844x390`): PASSED.
     - Verified zero browser errors, initial render, direct grab, drag follow, magnetic cell snap, landing squash, invalid drop return, debug overlay toggle, and captured visual screenshots.

---

## Known Limitations
- Real GLB character models and environment art are placeholder primitives.
- Sound effects use procedural Web Audio synthesis (suitable for alpha, to be augmented with authored audio assets in future tasks).
- Single Summon (Goku) in Base Camp (inventory summon picker and multi-summon placement are scheduled for subsequent tasks).

---

## Recommended Next Task (Task 02)
**V2 Task 02: Summon Tray & Inventory Placement Pipeline**
- Build the PlayCanvas-native bottom Summon tray / inventory picker.
- Support dragging Summons directly from the tray into valid Camp cells.
- Integrate remaining starter summons (Naruto, Luffy, Eren, L, Lelouch).
- Implement multi-summon occupancy validation and swapping interactions.

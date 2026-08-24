# PSYBLR V2 — Task 04: Pachinko World + Camera Focus & Physical Pinboard

## Objective
Construct the 3D physical Pachinko machine at the Spawn Machine foundation socket, implement cinematic camera focus/exit transitions, build the 3D pinboard layout with pegs and six reward bins, and provide native screen HUD controls with simulated ball drop physics.

---

## Implementation Summary

1. **3D Physical Pachinko World Structure (`PachinkoWorld`)**:
   - Anchored at `[6.4, 0, 0]` on the Spawn Machine building pad.
   - Built 3D cabinet with an angled backboard (18° backward tilt), gold-illuminated framing walls, and top arch.
   - 9 rows of staggered golden cylindrical pins (59 total physical pegs) with collision radii.
   - 6 distinct bottom reward bins mapped to the 6 curated starter summons (`goku`, `naruto`, `luffy`, `eren`, `l`, `lelouch`) with color-coded emissive floor plates and separator dividers.
   - Mechanical plunger lever entity on the right side with spring-loaded pull/release animation.
   - 3D physical metal ball entity with simulated gravity, pin deflection physics, gentle magnetic bias towards target reward bins, and landing bin flash.

2. **Camera Focus & Transition (`CameraDirector`)**:
   - Defined `PACHINKO_CAMERA_PRESET` at `[6.4, 3.6, 4.4]`, pitch `-22°`, FOV `38°`.
   - `focusOnPachinko()`: smoothly frames the camera directly in front of the Pachinko cabinet with `DURATION.FOCUS` (520ms) using `EASING.CINEMATIC`.
   - `returnToBaseOverview()`: restores the Base Camp overview perspective.
   - Ground tapping the Spawn Machine foundation pad in Base Camp seamlessly triggers `enterPachinko()`.

3. **PlayCanvas Native Screen Pachinko HUD (`PachinkoHUD`)**:
   - Built with native PlayCanvas `ScreenComponent` and `ElementComponent` on `HUD` layer with zero React DOM.
   - Title: `SPAWN MATRIX • PACHINKO` with sub-prompt.
   - `[ BASE CAMP ]` return button in top right (also dismissible via `Escape`).
   - `[ PULL LEVER & DROP ]` gold action button in bottom right triggering plunger draw and ball release.

4. **Procedural Web Audio Coordination (`AudioDirector`)**:
   - Integrated audio cues for plunger anticipation, spring release, peg collisions, and bin landing flashes.

---

## Files Added & Modified

### New Files
- `apps/game/src/world/PachinkoWorld.ts`
- `apps/game/src/world/PachinkoWorld.test.ts`
- `apps/game/src/ui/PachinkoHUD.ts`
- `docs/exec-plans/completed/V2-TASK04.md`

### Modified Files
- `apps/game/src/app/CameraDirector.ts`: Added `PACHINKO_CAMERA_PRESET` and `focusOnPachinko()`.
- `apps/game/src/app/SceneManager.ts`: Added `PachinkoWorld` instance and update lifecycle.
- `apps/game/src/app/GameApp.ts`: Added `enterPachinko()`, `exitPachinko()`, wired `PachinkoHUD`, and linked Spawn Pad ground taps to Pachinko view.
- `tests/e2e/game-v2.spec.ts`: Added E2E verification of 3D Pachinko board opening, pin count, ball drop simulation, and camera return.

---

## Verification & Test Results

1. **Unit Tests**:
   - `npm test`: 71 tests passed across 13 test suites (22 tests in `@psyblr/game`).
2. **Typecheck**:
   - `npm run typecheck`: 0 errors.
3. **Content Validation**:
   - `npm run validate:content`: 100% pass.
4. **Vite Production Build**:
   - `npm run build:game`: Built dist bundle cleanly in 320ms.
5. **Playwright E2E Verification**:
   - `npx playwright test --config=playwright.game.config.ts`:
     - Mobile Landscape: PASSED (6.6s).
     - Desktop Landscape: PASSED (6.3s).
     - Captured and verified screenshots: initial camp & dock, 3D Pachinko board focus, and active ball drop.

---

## Recommended Next Task (Task 05)
**V2 Task 05: Pachinko Reward Presentation + Existing Spawn Authority**
- Connect client Pachinko trigger to server-authoritative spawn resolution with idempotent `client_action_id`.
- Support tutorial/prototype deterministic seeding where the server resolves the reward before the ball animation starts.
- Animate the spawned summon from the Pachinko machine bin into an open cell in the Battle Camp or into the Camp Dock.

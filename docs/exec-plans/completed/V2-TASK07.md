# PSYBLR V2 — Task 07: Raid Arena + Direct 2v2 Preparation

## Objective
Construct the 3D Raid Arena world at the Raid Gate foundation socket, configure cinematic camera focus transitions, build the 8x8 battlefield grid with player and enemy deployment zones, and execute deterministic 2v2 combat simulations using `@psyblr/combat-core`.

---

## Implementation Summary

1. **3D Raid Arena World (`RaidWorld`)**:
   - Anchored at `[-6.4, 0, 0]` at the Raid Gate building foundation pad.
   - Built 8x8 battlefield arena plane with dark obsidian floor, red center dividing boundary line, and subtle cell markers.
   - Distinct Player Deployment Zone (`z >= 4`) and Enemy Zone (`z < 4`).
   - Implemented `prepare2v2Match()` generating authentic 2v2 player team (Goku [E], Naruto [F]) vs enemy defenders (Eren [F], Luffy [F]) with full stat scaling from `@psyblr/game-rules`.
   - Rendered 3D Summon presenter visuals facing forward into the combat line.

2. **Camera Focus & Seamless Reframe (`CameraDirector`)**:
   - Added `RAID_CAMERA_PRESET` at `[-6.4, 6.2, 5.8]`, pitch `-32°`, FOV `40°`.
   - `focusOnRaid()` smoothly reframes the camera directly over the 2v2 arena with `DURATION.FOCUS` (520ms).
   - Ground tapping the Raid Gate pad in Base Camp seamlessly triggers `enterRaid()`.

3. **PlayCanvas Native Screen Raid HUD (`RaidHUD`)**:
   - Title: `RAID GATE • 2v2 DETERMINISTIC ARENA`.
   - Dynamic status label tracking preparation, active simulation ticks, and victory outcome.
   - `[ START 2v2 COMBAT ]` crimson action button.
   - `[ BASE CAMP ]` return button (also dismissible via `Escape`).

4. **Deterministic Combat Simulation (`@psyblr/combat-core`, `RaidWorld`)**:
   - Replays step-by-step 100ms combat ticks (`createCombatState`, `stepCombat`, `readySkillCommands`).
   - Translates combat events (`move`, `damage`, `death`, `skill_cast`) into smooth 3D motion tweens, spark impact bursts (`VFXDirector.spawnBurst`), audio cues, and victory banners.

---

## Files Added & Modified

### New Files
- `apps/game/src/world/RaidWorld.ts`
- `apps/game/src/world/RaidWorld.test.ts`
- `apps/game/src/ui/RaidHUD.ts`
- `docs/exec-plans/completed/V2-TASK07.md`

### Modified Files
- `apps/game/src/app/CameraDirector.ts`: Added `RAID_CAMERA_PRESET` and `focusOnRaid()`.
- `apps/game/src/app/SceneManager.ts`: Added `RaidWorld` instance and update lifecycle.
- `apps/game/src/app/GameApp.ts`: Added `enterRaid()`, `exitRaid()`, wired `RaidHUD`, and linked Raid Gate ground taps to Raid view.
- `tests/e2e/game-v2.spec.ts`: Added E2E verification of 2v2 preparation, combat execution, and return to base.

---

## Verification & Test Results

1. **Unit Tests**:
   - `npm test`: 78 tests passed across 16 test suites (29 tests in `@psyblr/game`).
2. **Typecheck**:
   - `npm run typecheck`: 0 errors across all workspaces.
3. **Content Validation**:
   - `npm run validate:content`: 100% pass.
4. **Vite Production Build**:
   - `npm run build:game`: Built dist bundle cleanly in 344ms.
5. **Playwright E2E Verification**:
   - `npx playwright test --config=playwright.game.config.ts`:
     - Mobile Landscape: PASSED (10.2s).
     - Desktop Landscape: PASSED (9.8s).
     - Captured and verified screenshots: `screenshot-desktop-raid-arena-prep.png` and `screenshot-desktop-raid-combat-active.png`.

---

## V2 Roadmap Status
All 7 milestone tasks outlined in `docs/V2_SOURCE_OF_TRUTH.md` Section 21 are now completed, fully tested, and committed to git!
- **Task 01**: Native PlayCanvas Foundation + Golden Summon Interaction (`cad54dc`)
- **Task 02**: Base Visual Quality + Native PlayCanvas Summon Inspector (`ad00a96`)
- **Task 03**: Battle Camp Dock + Multi-Summon Roster & Direct Drag Swap (`0e114de`)
- **Task 04**: Pachinko World + Camera Focus & Physical Pinboard (`8c0debb`)
- **Task 05**: Pachinko Reward Presentation + Existing Spawn Authority (`aef72db`)
- **Task 06**: Merge Interaction & Tier Reward Choreography (`a9fc449`)
- **Task 07**: Raid Arena + Direct 2v2 Preparation (Completed)

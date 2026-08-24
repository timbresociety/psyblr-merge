# PSYBLR V2 — Task 05: Pachinko Reward Presentation + Existing Spawn Authority

## Objective
Connect client 3D Pachinko interaction to server-authoritative spawn resolution with idempotent `client_action_id`, execute reward choreographies when the ball lands, and transfer/fly the newly acquired Summon into an available Camp cell.

---

## Implementation Summary

1. **Authoritative Spawn Economy Service (`SpawnAuthorityService`)**:
   - Implemented `SpawnAuthorityService` with 10 balls initial capacity and data-driven 6-Summon starter daily pool probabilities.
   - Pre-resolves `ReleaseBallResult` (`clientActionId`, `rewardSlot`, `createdSummon`, `destination`, `ballsRemaining`) before presentation animation begins.
   - Deterministically calculates destination cell using `findFirstExposedCampCell` / open cell resolver from `@psyblr/game-rules`.

2. **Pachinko Physics & Landing Reward Choreography (`PachinkoWorld`, `GameApp`)**:
   - Guided magnetic simulation falls through pins and lands in the exact pre-resolved `rewardSlot` bin.
   - Triggers bin landing energy flash, particle burst (`VFXDirector.spawnLandingBurst`), and camera drop impulse.
   - Automatically returns camera to Base Camp overview.

3. **Summon Flight & Camp Placement (`SceneManager.spawnAndTransferSummon`)**:
   - Spawns the new 3D `SummonEntity` with its authentic silhouette presenter.
   - Animates a smooth 3D parabolic flight arc across the arena from the Pachinko machine into the destination Camp cell over `DURATION.REWARD` (850ms).
   - On landing, executes authoritative cell placement, squash-and-stretch settle, ground shockwave, and updates `SceneManager.placements` and `BattleCampDock`.

---

## Files Added & Modified

### New Files
- `apps/game/src/economy/SpawnAuthorityService.ts`
- `apps/game/src/economy/SpawnAuthorityService.test.ts`
- `docs/exec-plans/completed/V2-TASK05.md`

### Modified Files
- `apps/game/src/world/PachinkoWorld.ts`: Fixed tween durations to seconds and used local coordinate calculations.
- `apps/game/src/presentation/VFXDirector.ts`: Added `spawnBurst` alias.
- `apps/game/src/app/SceneManager.ts`: Added `spawnAndTransferSummon` flight and placement logic.
- `apps/game/src/app/GameApp.ts`: Integrated `SpawnAuthorityService`, wired `onDropBall` to authoritative spawn, reward burst, and camp transfer.
- `tests/e2e/game-v2.spec.ts`: Added E2E verification of authoritative spawn, ball drop, camp arrival, and 5th summon state.

---

## Verification & Test Results

1. **Unit Tests**:
   - `npm test`: 73 tests passed across 14 test suites (24 tests in `@psyblr/game`).
2. **Typecheck**:
   - `npm run typecheck`: 0 errors across all workspaces.
3. **Content Validation**:
   - `npm run validate:content`: 100% pass.
4. **Vite Production Build**:
   - `npm run build:game`: Built dist bundle cleanly in 309ms.
5. **Playwright E2E Verification**:
   - `npx playwright test --config=playwright.game.config.ts`:
     - Mobile Landscape: PASSED (28.2s).
     - Desktop Landscape: PASSED (29.6s).
     - Captured and verified screenshot `screenshot-desktop-camp-after-spawn.png` with 5 active summons in camp and updated dock.

---

## Recommended Next Task (Task 06)
**V2 Task 06: Merge Interaction & Tier Reward Choreography**
- Support dragging identical same-tier Summons onto each other.
- Implement merge affordance: synchronized base rings, magnetic pull, and rising pitch audio cue.
- Author authoritative merge sequence: light collapse, 60ms silence pocket, energy burst, tier upgrade (e.g. F -> E), and next-tier floating delta.

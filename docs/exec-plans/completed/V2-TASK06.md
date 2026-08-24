# PSYBLR V2 — Task 06: Merge Interaction & Tier Reward Choreography

## Objective
Implement direct manipulation summon merge interaction based on canonical single-identity rules (`@psyblr/game-rules`), author the merge visual/audio choreography (anticipation, collapse, 60ms tension pause, explosive upgrade burst), and update progression state and Inspector across tiers F→SSS.

---

## Implementation Summary

1. **Merge Rules & Progression Mechanics (`@psyblr/game-rules`, `SummonEntity`)**:
   - Integrated `canMerge(a, b)` and `nextTier(tier)` from `@psyblr/game-rules`.
   - Verified single summon identity: tier is progression state, not separate character definitions.
   - Upgrading tier (`upgradeTier`) dynamically recalculates stats across F→SSS (9 tiers) and unlocks skills at designated tier thresholds.

2. **Authored Merge Choreography (`SceneManager.executeMerge`)**:
   - **Anticipation**: Target summon squashes down (`0.72x` Y scale) while its base energy ring pulses brightly (`emissiveIntensity: 3.6`).
   - **Collapse**: Consumed summon scales down (`0.2x`) and converges into target summon's center over `DURATION.QUICK` (200ms).
   - **Tension Pocket**: 60ms micro-pause where consumed entity is destroyed and tier mutation is finalized.
   - **Explosive Release**: Target summon springs upward with squash-and-stretch (`1.4x` peak) settling via `EASING.LAND`, accompanied by particle burst (`VFXDirector.spawnBurst`), camera drop impulse, and reward audio chime.

3. **Dock & Inspector Synchronization (`BattleCampDock`, `SummonInspector`)**:
   - Upgraded tier immediately reflected in Battle Camp Dock card badges (`GOKU [E]`).
   - Opening Summon Inspector displays updated Tier `[E]`, updated HP/ATK/DEF stat values, and progression rail indicating current tier node `F - [E] - D - C - B - A - S - SS - SSS` and next-tier upgrade preview.

---

## Files Added & Modified

### New Files
- `apps/game/src/summons/MergeInteraction.test.ts`
- `docs/exec-plans/completed/V2-TASK06.md`

### Modified Files
- `apps/game/src/summons/SummonEntity.ts`: Added `SPAWNING` state, `upgradeTier`, `playMergeAnticipation`, and `playMergeUpgrade`.
- `apps/game/src/app/SceneManager.ts`: Added `executeMerge`, tier mutation, and cleanup of consumed summon instance.
- `apps/game/src/ui/SummonInspector.ts`: Added `activeSummon` reference for inspector state querying.
- `tests/e2e/game-v2.spec.ts`: Added E2E verification of 2nd summon spawn, direct merge, 4-summon post-merge count, `[E]` tier upgrade, and inspector display.

---

## Verification & Test Results

1. **Unit Tests**:
   - `npm test`: 76 tests passed across 15 test suites (27 tests in `@psyblr/game`).
2. **Typecheck**:
   - `npm run typecheck`: 0 errors across all workspaces.
3. **Content Validation**:
   - `npm run validate:content`: 100% pass.
4. **Vite Production Build**:
   - `npm run build:game`: Built dist bundle cleanly in 330ms.
5. **Playwright E2E Verification**:
   - `npx playwright test --config=playwright.game.config.ts`:
     - Mobile Landscape: PASSED (9.3s).
     - Desktop Landscape: PASSED (8.8s).
     - Captured and verified screenshot `screenshot-desktop-inspector-tier-e.png` showing `GOKU [E]` with active progression rail `F - [E] - D - C - B - A - S - SS - SSS`.

---

## Recommended Next Task (Task 07)
**V2 Task 07: Raid Arena + Direct 2v2 Preparation**
- Reframe camera seamlessly to Raid Arena at Raid Gate socket `[-6.4, 0, 0]`.
- Build 8x8 deterministic battlefield grid for 2v2 combat.
- Support direct drag-and-drop deployment from Camp/Dock into Player Deployment Zone (`z >= 4`).
- Integrate deterministic combat simulator (`@psyblr/combat-core`) step-by-step event replay.

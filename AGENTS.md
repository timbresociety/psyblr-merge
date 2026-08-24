# PSYBLR Codex Instructions (V2 Revamp)

Canonical reference: [`docs/V2_SOURCE_OF_TRUTH.md`](file:///Users/deepsheth/Documents/GitHub/psyblr-merge/docs/V2_SOURCE_OF_TRUTH.md)

## Mission
Build the production-shaped V2 alpha of PSYBLR. Placeholder visuals are acceptable; placeholder architecture is not.

## Non-negotiables
1. **Direct PlayCanvas Runtime (`apps/game`)**: Pure TypeScript + PlayCanvas Engine; NO React or `@playcanvas/react` in the gameplay client. UI is native PlayCanvas Screen/Element UI + world-space UI.
2. **Direct Manipulation Only**: Drag-and-drop directly between dock, camp, and battlefield. No persistent `selectedSummon` / placement mode or confirm dialogs for spatial actions.
3. **Server-authoritative Economy**: Never put economy authority in the browser. Spawn rewards, merges, raid results, steals, and progression writes are server-authoritative with idempotent `client_action_id`.
4. **Deterministic Combat Core**: `packages/combat-core` must remain deterministic, pure TypeScript, and independent of PlayCanvas/React.
5. **Data-driven Content**: Static content is versioned under `packages/game-content`; database rows hold player/runtime state.
6. **Silent Onboarding**: No blocking cue cards or DOM focus masks. Onboarding uses Affordance → Demonstration → Microcopy.
7. **Spatial World Continuity**: World is the visual anchor. Opening inspectors, Pachinko, or raid reframes the world camera rather than replacing it with full-page overlays.
8. **Landscape First**: Landscape is the primary gameplay orientation.
9. **Single Summon Identity**: 1 Summon definition across F→SSS (9 tiers); tier is progression state, not 9 separate character definitions.
10. **Test with Each Slice**: Vitest for deterministic logic and Playwright tests for game interaction.

## Engineering boundaries
- `apps/game`: Standalone Vite + Direct PlayCanvas Engine + TypeScript game client.
- `apps/web`: Legacy V1 client (preserved temporarily during V2 slice; no new gameplay feature work).
- `packages/game-rules`: Progression, synergy, coordinate, and merge rules.
- `packages/combat-core`: Deterministic combat simulator + event log.
- `packages/contracts`: Canonical shared schemas and API contracts.
- `packages/game-content`: Static summon/ability/tier definitions.
- `supabase/functions`: Privileged mutations & economy transactions.

## Definition of done for every PR / Task
- Typecheck passes.
- Relevant unit and visual tests pass.
- No new console errors.
- Micro-interactions feel responsive and follow motion tokens (`MICRO`, `QUICK`, `STANDARD`, `FOCUS`, `REWARD`, `HERO`).
- Every persistent mutation survives a retry without duplication.
- Completion record committed under `docs/exec-plans/completed/`.

# PSYBLR Codex Instructions

## Mission
Build the production-shaped alpha of PSYBLR. Placeholder visuals are acceptable; placeholder architecture is not.

## Non-negotiables
1. React owns product UI. PlayCanvas owns realtime 3D world rendering/simulation playback.
2. Never put economy authority in the browser. Spawn rewards, merges, raid results, steals and progression writes are server-authoritative.
3. `packages/combat-core` must remain deterministic, pure TypeScript and independent of React/PlayCanvas.
4. Static content is versioned under `packages/game-content`; database rows hold player/runtime state.
5. Tutorial progression is data-driven. Do not scatter tutorial-step conditionals across components.
6. Every economy mutation requires an idempotency/client_action_id.
7. Every summon uses the same asset contract. Missing art must fall back to procedural placeholders without breaking gameplay.
8. Keep the world visible under overlays whenever possible. Avoid page-navigation UX for inventory/detail/tutorial flows.
9. Landscape is the gameplay orientation for alpha. Portrait shows a rotate-device gate.
10. Add tests with each vertical slice. Do not defer the happy-path Playwright test to the end.

## Engineering boundaries
- `apps/web/src/game`: 3D presentation and world interaction only.
- `apps/web/src/ui`: DOM UI, HUD, menus, tutorial overlays.
- `packages/game-rules`: progression/synergy/merge rules.
- `packages/combat-core`: deterministic combat simulator + event log.
- `packages/contracts`: shared schemas and API contracts.
- `packages/game-content`: static definitions.
- `supabase/functions`: privileged mutations.

## Performance rules
- Do not drive per-frame motion through React state. Use PlayCanvas scripts/engine update loops.
- Avoid barrel imports in hot UI paths.
- Lazy-load heavy secondary menus and art.
- Keep asset manifests small and independently streamable.
- Inventory grids use bust renders; only detail view needs an interactive 3D preview.

## UI rules
- 3D world is the spatial anchor.
- Primary action sits bottom-right on desktop/landscape mobile.
- Summon tray/picker enters from bottom.
- Details enter from right on desktop and as a nearly-full-height sheet on small landscape screens.
- Tutorial focus mask blocks unrelated interactions only when required.
- Use short, actionable tutorial copy; one concept per beat.

## Definition of done for every PR
- Typecheck passes.
- Relevant unit tests pass.
- No new console errors.
- Keyboard/pointer interactions have accessible DOM equivalents where UI is DOM based.
- Loading, empty and error states exist.
- Any persistent mutation survives a retry without duplication.

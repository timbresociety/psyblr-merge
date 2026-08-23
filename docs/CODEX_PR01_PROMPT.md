# Codex Prompt — PR 01

You are implementing PR 01 of PSYBLR.

Read `AGENTS.md`, `docs/PRODUCT_SPEC.md`, `docs/UI_UX_RULES.md`, and `docs/CODEX_BUILD_PLAN.md` before editing.

Goal: make the existing foundation runnable and robust without expanding scope beyond PR 01.

Tasks:
1. Install workspace dependencies and resolve any package/API incompatibilities using current official PlayCanvas React docs. Do not replace PlayCanvas React with React Three Fiber.
2. Make `apps/web` render a full-viewport PlayCanvas scene with an 8x8 tactical board and placeholder summon entities.
3. Maintain React DOM HUD over the canvas. No per-frame React state updates.
4. Implement landscape orientation gate.
5. Keep the debug panel behind backquote and make its displayed values come from the Zustand store rather than hardcoded where practical.
6. Add a small frame/performance sampler to debug mode without triggering React re-render every frame; update displayed aggregate at <=2Hz.
7. Ensure resizing works and no console errors occur.
8. Run content validation, typecheck and tests. Fix issues rather than suppressing types.

Do not add backend integration, drag placement, real combat, GLB assets, animation systems or tutorial logic in this PR.

Acceptance:
- `npm run validate:content` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- shell Playwright test passes.
- Desktop 1280x720 and landscape 844x390 are usable.
- Portrait gets only the orientation gate.
- App can run with no Supabase environment variables.
- No gameplay behavior depends on proprietary art assets.

At completion, summarize changed files, test results, and any official API compatibility adjustments you had to make.

# Codex Build Plan

Execute these as isolated PRs. Do not combine later PRs because an earlier PR feels small.

## PR 01 — Foundation + battlefield shell
Deliver:
- workspace bootstrapped,
- full-viewport PlayCanvas React Application,
- procedural 8x8 horizontal battlefield,
- six placeholder summon colors/names,
- React HUD over canvas,
- landscape orientation gate,
- debug panel toggled by backquote.
Acceptance:
- 60fps target on desktop placeholder scene,
- no React state updates per frame,
- world resizes correctly,
- app loads with no backend configured.

## PR 02 — Summon picker and placement
Deliver:
- bottom summon tray,
- summon cards from game-content,
- click details panel,
- pointer/touch drag-to-cell,
- tap-select/place fallback,
- six-player deployment cap.
Tests:
- placement rules unit tests,
- E2E can place first summon.

## PR 03 — Deterministic combat v creeps
Deliver:
- pure combat simulator,
- six creeps,
- event log,
- PlayCanvas replay adapter,
- manual Skill 1 button and Auto Cast toggle.
Acceptance:
- same seed/snapshot = byte-equivalent outcome/event order.

## PR 04 — Tutorial engine + Campaign onboarding
Deliver:
- data-driven tutorial interpreter,
- focus mask/coach marks,
- event-driven step completion,
- persisted local adapter first; Supabase adapter behind interface.
Tests:
- reload resumes same step,
- unrelated actions are rejected only when step requires it.

## PR 05 — Battle Camp + Illuminati
Deliver:
- 6x6 camp,
- 6x1 protected row,
- fly transition Campaign→Base,
- initial six outside row then tutorial move into row,
- occupancy rules.

## PR 06 — Spawn Machine
Deliver:
- building focus camera,
- pachinko board placeholder,
- tap and long-press drop,
- server-result/replay interface,
- deterministic tutorial outcome script,
- 100/100 meter,
- locked blob targets.
Acceptance:
- tutorial arrives at exactly 36/36,
- no physics result can alter reward.

## PR 07 — Merge + tier progression
Deliver:
- drag identical same-tier onto target,
- merge VFX hook,
- F→E→D→C tutorial chain,
- progression panel with silhouettes and next-tier delta.
Tests:
- invalid definition/tier merge rejected,
- concurrent duplicate merge idempotent once backend is enabled.

## PR 08 — Raid squad builder
Deliver:
- shared SummonPicker modes,
- sequential 2/4/6 field deployment and resolution,
- repetition across resolved rounds,
- per-round uniqueness,
- immutable raid snapshot.

## PR 09 — Raid simulation + replay
Deliver:
- authoritative simulation endpoint,
- W/D/L rounds,
- W/D/W scripted tutorial opponent,
- replay from event log.

## PR 10 — Opponent camp + steal
Deliver:
- read-only opponent camp scene,
- protected-cell visualization,
- eligible target selection,
- transactional claim.

## PR 11 — Defense setup
Deliver:
- 2/4/6 defense formations,
- reuse squad picker,
- persist and validate defense.

## PR 12 — Alpha hardening
Deliver:
- anonymous auth,
- complete Supabase persistence,
- PWA manifest/service worker strategy,
- asset validation,
- performance counters,
- full tutorial Playwright test,
- reconnect/reload/idempotency tests.

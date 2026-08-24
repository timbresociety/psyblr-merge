# Record: PSYBLR V2 Full Client Overhaul

## Status
- **Completed**: 2026-08-24
- **Scope**: Complete rebuild and isolation of Base Camp, Campaign Battles (100-level Story Arcs & Bosses), Plinko Spawn Machine with 1-hour Shields, Dealer NPC (100 balls / 24h), Defense Podium (2, 4, 6 defenders), 3-Round Raid Matches (2v2 $\to$ 4v4 $\to$ 6v6), Opponent Camp Steal mechanic, 9-tier Summon Merging, and 9-phase Guided Onboarding.

## Architecture Implemented
1. **Scene Isolation Pattern**:
   - `BaseWorld`: Centered 6x6 Battle Camp grid with protected Illuminati Row 0 Dais, 3D Dealer Booth, 3D Plinko Machine, 3D Defense Podium, 3D Campaign Gate, and 3D Raid Gate.
   - `CampaignWorld`: Dedicated 8x8 Arena isolated at `[0, 0, -40]` with custom procedural 3D creeps and bosses (`CreepPresenter`), floating health bars, and deterministic combat auto-casting.
   - `RaidWorld`: Dedicated 8x8 Crimson Arena isolated at `[-40, 0, 0]` executing sequential 3 rounds (2v2, 4v4, 6v6).
   - `OpponentCampWorld`: Dedicated 6x6 Camp diorama isolated at `[40, 0, 0]` with a glowing forcefield protecting Illuminati Row 0 and selectable exposed summons for post-raid stealing.
   - `PachinkoWorld`: Plinko gacha cabinet at `[6.4, 0, 0]` with dual side bounce bumpers charging the 1-hour Shield meter and 6 slots with exact `[30, 15, 5, 5, 15, 30]` probability distribution.
2. **Deterministic Auto-Battler**:
   - Pure TypeScript combat simulation via `@psyblr/combat-core`.
   - CampaignController supporting level 1-100+ scaling across 4 Story Arcs (Awakening, Titanfall, Zero Requiem, Super Saiyan Horizon) with Mini-Bosses every 10 levels and Story Bosses every 100 levels.
3. **Server-Authoritative Economy & 24h Generation**:
   - `SpawnAuthorityService` tracks 100 daily Plinko balls from Dealer NPC (24h cooldown), 5-bounce shield generation (1 hour active protection), and idempotent spawn & steal requests.
4. **Native PlayCanvas Element UI**:
   - Zero React in the gameplay runtime (`apps/game`).
   - Native PlayCanvas Element components with dynamic CanvasFont texture scaling, anchor-based responsive positioning, and HUD navigation.

## Verification
- Unit Tests: 35 passing tests in `@psyblr/game` + 50+ passing tests across `@psyblr/combat-core`, `@psyblr/game-rules`, `@psyblr/game-content`, `@psyblr/raid-core`, and `@psyblr/tutorial-core`.
- Typecheck: 0 TypeScript errors across all workspaces.
- E2E / Visual Tests: Playwright tests passing on Desktop Chromium and Mobile Landscape with full visual screenshots.
- Production Build: `npm run build:game` completes cleanly.

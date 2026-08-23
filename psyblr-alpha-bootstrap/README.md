# PSYBLR Alpha Bootstrap

Production-shaped starter for the locked PSYBLR alpha concept.

## Stack
- React 19 + TypeScript + Vite
- PlayCanvas + `@playcanvas/react`
- Zustand for transient client/game UI state
- TanStack Query for server state
- Supabase Postgres/Auth/Edge Functions for authoritative persistence
- Zod for contracts/content validation
- Vitest + Playwright

## First run
```bash
npm install
cp .env.example .env.local
npm run validate:content
npm run dev
```

The web app intentionally renders a procedural placeholder battlefield. Real GLBs can replace placeholder summons through asset manifests without changing combat/content contracts.

## Start here
1. Read `AGENTS.md`.
2. Read `docs/PRODUCT_SPEC.md`.
3. Execute `docs/CODEX_BUILD_PLAN.md` one PR at a time.
4. Apply `supabase/migrations/0001_initial.sql` when wiring persistence.

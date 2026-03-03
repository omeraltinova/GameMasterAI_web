# Repository Guidelines

## Project Structure & Module Organization
This repository’s application code lives in `gamemaster-ai/` (Next.js App Router).

- `gamemaster-ai/app/`: routes, layouts, API handlers (`app/api/**/route.ts`)
- `gamemaster-ai/components/`: UI and feature components (`PascalCase.tsx`)
- `gamemaster-ai/lib/`: shared services (AI, auth, security, API helpers)
- `gamemaster-ai/hooks/`: reusable React hooks (`useX.ts`)
- `gamemaster-ai/prisma/`: schema and migrations
- `gamemaster-ai/__tests__/`: unit/component/API tests
- `gamemaster-ai/e2e/`: Playwright end-to-end scenarios
- `gamemaster-ai/public/`: static assets
- `gamemaster-ai/docs/`: technical docs and OpenAPI

## Build, Test, and Development Commands
Run commands from `gamemaster-ai/`:

- `npm install`: install dependencies
- `npm run dev`: start local dev server
- `npm run build`: create production build
- `npm start`: run production server
- `npm test`: run Vitest suite
- `npm run test:e2e`: run Playwright scenarios
- `npm run lint`: run ESLint (warnings are allowed; errors fail)
- `npx prisma migrate dev && npx prisma generate`: apply DB changes and regenerate Prisma client

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode enabled).
- Follow existing style in touched files (imports, quote style, semicolons, spacing).
- Use alias imports like `@/lib/...` instead of deep relative paths.
- Naming:
  - Components: `PascalCase`
  - Hooks: `useSomething`
  - Route handlers: `route.ts`
  - Tests: `*.test.ts` / `*.test.tsx`

## Testing Guidelines
- Frameworks: Vitest + Testing Library for unit/component/API tests; Playwright for e2e.
- Keep tests close to behavior changes; update or add tests with each fix/feature.
- Prefer deterministic tests with mocks for external APIs/AI calls.
- Before opening PR: run `npm test` and `npm run lint`.

## Commit & Pull Request Guidelines
- Use Conventional Commit style seen in history: `feat:`, `fix:`, `chore:`, `refactor:`.
- Keep commits focused and reviewable.
- PRs should include:
  - concise summary
  - key changed paths
  - migration notes (if `prisma/` changed)
  - test/lint results
  - screenshots/video for UI changes

## Security & Configuration Tips
- Never commit secrets; use `.env` / `.env.local` from `.env.example`.
- Validate auth/RBAC in API routes first, then business logic.
- For AI endpoints, preserve rate-limit/quota checks and usage tracking.

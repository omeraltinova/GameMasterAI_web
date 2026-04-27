# GameMaster AI

GameMaster AI is a 5e SRD-based digital Game Master application powered by AI. It enables solo or group players to experience interactive storytelling with an AI-driven narrator that handles narrative, NPCs, and game mechanics.

> **⚠️ IMPORTANT — Copyright & Licensing Rules**
>
> This project is built around the **5e Systems Reference Document (SRD)**, which is published under the **Creative Commons Attribution 4.0 International License (CC BY 4.0)**.
>
> **The following rules MUST be followed at all times:**
>
> 1. **No copyrighted or trademarked content may be used.** Do not reference, reproduce, or include any content that is NOT part of the 5e SRD. This includes proprietary monster names, spells, classes, subclasses, items, or lore that belong to official sourcebooks beyond the SRD.
> 2. **Do not use trademarked names.** Any trademarked terms belonging to game publishers or other rights holders must NEVER appear in code, UI text, prompts, generated content, or any other part of the application. This includes game system names, setting names, publisher names, and proprietary creature or character names.
> 3. **Always use SRD-equivalent or original terms.** When referencing game mechanics, races, classes, spells, or monsters, only use terms available in the 5e SRD or create original alternatives.
> 4. **AI-generated content must also comply.** All AI prompts and system instructions must explicitly instruct the AI model to avoid generating copyrighted or trademarked content. The prompts should guide the AI to stay within SRD boundaries and use original creative content.
> 5. **No third-party licensed assets.** Do not include images, sounds, fonts, or any media that violates copyright. All assets must be either original, AI-generated, or properly licensed under permissive licenses (MIT, Apache 2.0, CC0, CC BY 4.0, etc.).
> 6. **When in doubt, create original content.** If you're unsure whether something is copyrighted or trademarked, do NOT use it. Create an original alternative instead.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL 18 + Prisma ORM
- **Styling**: TailwindCSS 4 (Neon Arcane theme)
- **UI**: Radix UI + Framer Motion
- **Auth**: NextAuth.js
- **AI**: OpenRouter API
- **State**: Zustand + React Context

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. PostgreSQL Setup

PostgreSQL must be installed and running.

**macOS (Homebrew):**
```bash
brew install postgresql@18
brew services start postgresql@18
createdb gamemaster
```

**Windows:**
1. Download and install [PostgreSQL](https://www.postgresql.org/download/windows/)
2. Initialize the cluster (done automatically during setup)
3. Create the `gamemaster` database:
```bash
psql -U postgres -c "CREATE DATABASE gamemaster;"
```

**Note:** In development, `pg_hba.conf` is configured with `trust` for localhost connections (no password required), so you don’t need to include a password in the connection string.

### 3. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Also create `.env` for Prisma (only `DATABASE_URL` is required):

```bash
cp .env.example .env
```

Fill in required values (API keys, etc.).

### 4. Database Migrations

```bash
npx prisma migrate dev    # Run migrations + generate Prisma Client
npx prisma generate       # Regenerate Prisma Client (if needed)
```

### 5. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

- Contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Docs index: [`docs/README.md`](./docs/README.md)
- Setup guide: [`docs/SETUP_GUIDE.md`](./docs/SETUP_GUIDE.md)
- Prompt architecture: [`docs/AI_PROMPT_LOGIC.md`](./docs/AI_PROMPT_LOGIC.md)
- API definition (OpenAPI): [`docs/OPENAPI.yaml`](./docs/OPENAPI.yaml)

## Commands

```bash
npm run dev           # Development server (localhost:3000)
npm run build         # Production build
npm start             # Production server
npm run lint          # ESLint

npm run test          # Unit tests (Vitest)
npm run test:ui       # Test UI
npm run test:coverage # Coverage report
npm run test:e2e      # E2E tests (Playwright)

npx prisma migrate dev  # Run migrations
npx prisma generate     # Generate Prisma Client
npx prisma studio       # Database GUI
```

## Database

### Migration from SQLite to PostgreSQL

The project originally used SQLite and has been migrated to PostgreSQL:

- `prisma/schema.prisma` now uses `postgresql`
- All migrations were recreated with PostgreSQL-compatible SQL
- Existing data was migrated from SQLite
- `prisma/dev.db` (SQLite file) is no longer used

### Development Connection

```
postgresql://postgres@localhost:5432/gamemaster?schema=public
```

Localhost uses `trust` auth, so a password isn’t required.

---

## Production Deployment Checklist

### Database

- [ ] Provision production PostgreSQL (AWS RDS, Supabase, Neon, etc.)
- [ ] Create a PostgreSQL user with a strong password
- [ ] Enable SSL (`?sslmode=require` in the connection string)
- [ ] Use `scram-sha-256` instead of `trust` in `pg_hba.conf`
- [ ] Configure connection pooling (PgBouncer or Prisma Accelerate)
- [ ] Set up automated backups
- [ ] Move `@prisma/client` from `devDependencies` to `dependencies`

### Security

- [ ] Generate a strong `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- [ ] Set `NEXTAUTH_URL` to the production domain
- [ ] Enforce HTTPS
- [ ] Add rate limiting (API routes)
- [ ] Review CORS configuration

### Environment Variables

- [ ] Ensure all API keys are production keys
- [ ] Set `NODE_ENV=production`
- [ ] Use SSL and a strong password in `DATABASE_URL`:
  ```
  postgresql://USER:STRONG_PASSWORD@HOST:5432/gamemaster?schema=public&sslmode=require
  ```

### Build & Deploy

- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes
- [ ] Tests pass: `npm test`
- [ ] Run production migrations with `npx prisma migrate deploy` (not `dev`)
- [ ] Ensure Prisma Client is generated in production

### Performance

- [x] Image optimization (Next.js Image component)
- [ ] Analyze bundle size
- [ ] Review database indexes
- [ ] Configure CDN

---

## Project Structure

```
app/
├── (public)/      # Landing, about, rules, demo (no auth)
├── (auth)/        # Login, register
├── (protected)/   # Dashboard, characters, campaigns (member+)
└── (admin)/       # Admin panel (admin only)

components/
├── ui/            # Button, Input, Card, Modal, etc.
├── layout/        # Header, Sidebar, Footer
├── auth/          # LoginForm, RegisterForm
├── character/     # CharacterCard
├── campaign/      # CampaignCard
└── game/          # ChatWindow, DiceRoller, MessageInput

prisma/
├── schema.prisma  # Database schema
└── migrations/    # PostgreSQL migration files

types/
└── index.ts       # All TypeScript types
```

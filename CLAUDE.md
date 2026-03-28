# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GameMaster AI is a 5e SRD-based digital game master application powered by AI. It enables players to experience interactive storytelling either solo or in groups, with an AI-driven Game Master handling narrative, NPCs, and game mechanics.

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

## Development Commands

All commands should be run from the `gamemaster-ai/` directory:

```bash
cd gamemaster-ai

# Development
npm run dev          # Start development server at localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint

# Testing
npm run test         # Run unit tests with Vitest
npm run test:ui      # Run Vitest with UI
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run end-to-end tests with Playwright

# Database
npx prisma generate  # Generate Prisma client
npx prisma migrate dev # Run database migrations
npx prisma studio    # Open Prisma Studio (DB GUI)
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4 with custom "Neon Arcane" dark theme
- **UI Components**: Radix UI primitives (Dialog, Dropdown Menu, Tabs, Slot) + custom components
- **Animations**: Framer Motion for page transitions and effects
- **State Management**: Zustand (`store/gameStore.ts`) + React Context (`contexts/`)
- **Icons**: Lucide React
- **Database**: Prisma ORM with SQLite (development) / PostgreSQL (production)
- **Authentication**: NextAuth.js v4
- **AI Integration**: OpenRouter API (via `lib/ai/openrouter.ts`)
- **Image Generation**: AI-powered image generation (`lib/ai/imageGenerator.ts`)
- **Validation**: Zod v4 (`lib/validators/`)
- **Utilities**: clsx, tailwind-merge, date-fns
- **Unit Testing**: Vitest 4 + Testing Library (React, DOM, jest-dom)
- **E2E Testing**: Playwright
- **Security**: Custom security utilities (`lib/security/`)

### Route Groups (App Router)

The app uses Next.js route groups for layout organization:

- `(public)/` — Landing page, about, rules, demo (no auth required)
- `(auth)/` — Login and register pages
- `(protected)/` — Dashboard, characters, campaigns, scenarios, profile (member+ access)
- `(admin)/` — Admin dashboard, user management, scenario management (admin only)

Each route group has its own `layout.tsx` and `template.tsx` for shared layouts and page transitions.

### API Routes (`app/api/`)

The backend is organized into the following API namespaces:

- `auth/` — NextAuth.js authentication
- `login/`, `register/` — Custom auth endpoints
- `campaigns/` — Campaign CRUD and management
- `characters/` — Character CRUD and management
- `sessions/` — Game session management
- `gm/` — AI Game Master endpoints (narrative, combat, NPC interaction)
- `dice/` — Dice rolling system
- `messages/` — In-game messaging
- `maps/` — Map management
- `scenarios/` — Scenario CRUD
- `profile/` — User profile management
- `users/` — User management
- `admin/` — Admin-only endpoints
- `system/` — System health and utilities

### Component Organization

```
components/
├── ui/          # Reusable primitives (Button, Input, Card, Modal, etc.)
├── layout/      # Header, Sidebar, Footer, PageTransition
├── auth/        # LoginForm, RegisterForm
├── character/   # CharacterCard, character creation & management
├── campaign/    # CampaignCard
├── game/        # ChatWindow, DiceRoller, MessageInput, CharacterMini
├── map/         # Map display and interaction components
├── profile/     # User profile components
├── scenario/    # Scenario display components
├── providers/   # App-level context providers
└── system/      # System-level components
```

Components are exported via barrel files (`index.ts`) for cleaner imports.

### AI Module (`lib/ai/`)

The AI system is the core of the Game Master functionality:

- `openrouter.ts` — OpenRouter API client and model management
- `gamemaster.ts` — AI Game Master logic and orchestration
- `prompts.ts` — System prompts and prompt templates (SRD-compliant)
- `context.ts` — Game context building for AI conversations
- `tools.ts` — AI tool definitions (function calling schemas)
- `toolExecutor.ts` — AI tool execution engine
- `imageGenerator.ts` — AI-powered image generation for locations, characters, items
- `logger.ts` — AI interaction logging

### Types

All TypeScript types are centralized in `types/index.ts`:

- User/Auth types (User, UserRole)
- Character types (Character, CharacterStats, CharacterRace, CharacterClass)
- Campaign types (Campaign, CampaignStatus)
- Game types (GameSession, GameState, Message, DiceRoll, Combat, NPC)
- API response types (ApiResponse, PaginatedResponse)
- Form input types

NextAuth type extensions in `types/next-auth.d.ts`.

### Database (Prisma)

- Schema: `prisma/schema.prisma`
- Development DB: SQLite (`prisma/dev.db`)
- Migrations: `prisma/migrations/`
- DB client helper: `lib/db/`

### Styling Conventions

The project uses a custom "Neon Arcane" dark theme with:

- CSS custom properties for colors (defined in `globals.css`)
- Glass-morphism effects with backdrop blur
- Gradient borders and neon glow effects
- Custom scrollbar styling

Key CSS classes:

- `.glass-card` — Glass morphism card effect
- `.btn-primary`, `.btn-secondary` — Button variants
- `.neon-border` — Animated gradient border
- `.input-field` — Form input styling

### Testing

- **Unit tests**: Located in `__tests__/` directory, using Vitest + Testing Library
- **E2E tests**: Located in `e2e/` directory, using Playwright
- **Config**: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`

### Security

- Middleware-based route protection (`middleware.ts`)
- Security utilities in `lib/security/`
- Input validation with Zod schemas (`lib/validators/`)
- Password hashing with bcryptjs

## Key Conventions

1. **SRD-only content** — All game mechanics, monsters, spells, classes, and lore must come exclusively from the 5e SRD or be original creations.
2. **No trademark usage** — Never use trademarked names from any game publisher in code, UI, prompts, or generated content.
3. **Original creative content** — When the SRD doesn't cover something, create original alternatives rather than borrowing from copyrighted sources.
4. **AI prompt compliance** — All AI system prompts must include instructions to avoid copyrighted/trademarked content.
5. **Barrel exports** — Use `index.ts` barrel files for component directories.
6. **Server Components by default** — Use `"use client"` directive only when client-side interactivity is needed.
7. **Zod validation** — Validate all user inputs with Zod schemas before processing.
8. **Prisma for DB** — All database operations go through Prisma client.

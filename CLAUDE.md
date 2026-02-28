# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GameMaster AI is a 5e SRD-based digital game master application powered by AI. It enables players to experience interactive storytelling either solo or in groups, with an AI-driven Game Master handling narrative, NPCs, and game mechanics.

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
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Styling**: TailwindCSS 4 with custom "Neon Arcane" theme
- **UI Components**: Radix UI primitives + custom components
- **Animations**: Framer Motion for page transitions and effects
- **State Management**: React Context (AuthContext)
- **Icons**: Lucide React

### Route Groups (App Router)

The app uses Next.js route groups for layout organization:

- `(public)/` - Landing page, about, rules, demo (no auth required)
- `(auth)/` - Login and register pages
- `(protected)/` - Dashboard, characters, campaigns, scenarios, profile (member+ access)
- `(admin)/` - Admin dashboard, user management, scenario management (admin only)

Each route group has its own `layout.tsx` and `template.tsx` for shared layouts and page transitions.

### Component Organization

```
components/
├── ui/          # Reusable primitives (Button, Input, Card, Modal, etc.)
├── layout/      # Header, Sidebar, Footer, PageTransition
├── auth/        # LoginForm, RegisterForm
├── character/   # CharacterCard
├── campaign/    # CampaignCard
└── game/        # ChatWindow, DiceRoller, MessageInput, CharacterMini
```

Components are exported via barrel files (`index.ts`) for cleaner imports.

### Types

All TypeScript types are centralized in `types/index.ts`:
- User/Auth types (User, UserRole)
- Character types (Character, CharacterStats, CharacterRace, CharacterClass)
- Campaign types (Campaign, CampaignStatus)
- Game types (GameSession, GameState, Message, DiceRoll, Combat, NPC)
- API response types (ApiResponse, PaginatedResponse)
- Form input types

### Styling Conventions

The project uses a custom "Neon Arcane" dark theme with:
- CSS custom properties for colors (defined in `globals.css`)
- Glass-morphism effects with backdrop blur
- Gradient borders and neon glow effects
- Custom scrollbar styling

Key CSS classes:
- `.glass-card` - Glass morphism card effect
- `.btn-primary`, `.btn-secondary` - Button variants
- `.neon-border` - Animated gradient border
- `.input-field` - Form input styling

### Mock Data

Currently using mock data in `lib/mock-data.ts` for development. Planned backend integration with:
- Prisma ORM with SQLite (development) / PostgreSQL (production)
- NextAuth.js for authentication
- OpenRouter API for AI functionality

## Planned Features (from project plan)

The application is designed to support:
- AI Game Master with narrative generation
- 5e SRD character creation and management
- Single and multiplayer campaigns
- Dice rolling system (d4-d100)
- Turn-based combat with initiative tracking
- Inventory management
- Real-time multiplayer via polling (WebSocket planned for future)

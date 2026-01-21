# Site Route Inventory & Audit

Generated from the current repo state. Update findings per page/route during reviews.

## Global Notes
- Fixed: Removed session/user ID logging from `lib/auth/server.ts`.

## Pages
### `/`
- File: `app/(public)/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/about`
- File: `app/(public)/about/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/admin`
- File: `app/(admin)/admin/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/admin/campaigns`
- File: `app/(admin)/admin/campaigns/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/admin/scenarios`
- File: `app/(admin)/admin/scenarios/page.tsx`
- Findings:
  - Fixed: Search filter now guards null creator names before calling `.toLowerCase()`.
  - Fixed: Added `rel="noopener noreferrer"` to the external link.

### `/admin/users`
- File: `app/(admin)/admin/users/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/campaigns`
- File: `app/(protected)/campaigns/page.tsx`
- Findings:
  - Fixed: Campaign description filter now defaults to an empty string to avoid `.includes` on undefined.

### `/campaigns/[id]`
- File: `app/(protected)/campaigns/[id]/page.tsx`
- Findings:
  - Fixed: Scenario filter now defaults missing title/description/genre to empty strings before calling `.includes`.

### `/campaigns/[id]/play`
- File: `app/(protected)/campaigns/[id]/play/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/campaigns/[id]/settings`
- File: `app/(protected)/campaigns/[id]/settings/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/campaigns/join`
- File: `app/(protected)/campaigns/join/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/campaigns/new`
- File: `app/(protected)/campaigns/new/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/characters`
- File: `app/(protected)/characters/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/characters/[id]`
- File: `app/(protected)/characters/[id]/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/characters/[id]/edit`
- File: `app/(protected)/characters/[id]/edit/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/characters/new`
- File: `app/(protected)/characters/new/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/dashboard`
- File: `app/(protected)/dashboard/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/demo`
- File: `app/(public)/demo/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/login`
- File: `app/(auth)/login/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/profile`
- File: `app/(protected)/profile/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/register`
- File: `app/(auth)/register/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/rules`
- File: `app/(public)/rules/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/scenarios`
- File: `app/(protected)/scenarios/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/scenarios/[id]`
- File: `app/(protected)/scenarios/[id]/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/scenarios/[id]/edit`
- File: `app/(protected)/scenarios/[id]/edit/page.tsx`
- Findings:
  - No issues found (reviewed)

### `/scenarios/new`
- File: `app/(protected)/scenarios/new/page.tsx`
- Findings:
  - No issues found (reviewed)

## API Routes (Route Handlers)
### `/api/admin/campaigns`
- File: `app/api/admin/campaigns/route.ts`
- Methods: DELETE, GET
- Findings:
  - No issues found (reviewed)

### `/api/admin/dashboard`
- File: `app/api/admin/dashboard/route.ts`
- Methods: GET
- Findings:
  - No issues found (reviewed)

### `/api/admin/scenarios`
- File: `app/api/admin/scenarios/route.ts`
- Methods: DELETE, GET
- Findings:
  - No issues found (reviewed)

### `/api/admin/users`
- File: `app/api/admin/users/route.ts`
- Methods: DELETE, GET, PATCH
- Findings:
  - No issues found (reviewed)

### `/api/auth/[...nextauth]`
- File: `app/api/auth/[...nextauth]/route.ts`
- Methods: Unknown
- Findings:
  - Fixed: Added basic rate limiting for credential attempts (IP+email, 15 min window).

### `/api/campaigns`
- File: `app/api/campaigns/route.ts`
- Methods: GET, POST
- Findings:
  - Fixed: Invite codes now use cryptographically secure randomness.
  - Fixed: Client hooks now read the `{ campaigns }` and `{ campaign }` response wrappers.

### `/api/campaigns/[id]`
- File: `app/api/campaigns/[id]/route.ts`
- Methods: DELETE, GET, PUT
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/[id]/active-session`
- File: `app/api/campaigns/[id]/active-session/route.ts`
- Methods: GET
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/[id]/complete`
- File: `app/api/campaigns/[id]/complete/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/[id]/invite`
- File: `app/api/campaigns/[id]/invite/route.ts`
- Methods: POST
- Findings:
  - Fixed: Invite codes now use cryptographically secure randomness.

### `/api/campaigns/[id]/join`
- File: `app/api/campaigns/[id]/join/route.ts`
- Methods: DELETE, POST
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/[id]/pause`
- File: `app/api/campaigns/[id]/pause/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/[id]/players/[playerId]`
- File: `app/api/campaigns/[id]/players/[playerId]/route.ts`
- Methods: DELETE
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/[id]/resume`
- File: `app/api/campaigns/[id]/resume/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/[id]/sessions`
- File: `app/api/campaigns/[id]/sessions/route.ts`
- Methods: GET, POST
- Findings:
  - No issues found (reviewed)

### `/api/campaigns/join`
- File: `app/api/campaigns/join/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/characters`
- File: `app/api/characters/route.ts`
- Methods: GET, POST
- Findings:
  - Fixed: Client hooks now read the `{ characters }` and `{ character }` response wrappers.

### `/api/characters/[id]`
- File: `app/api/characters/[id]/route.ts`
- Methods: DELETE, GET, PUT
- Findings:
  - No issues found (reviewed)

### `/api/characters/[id]/inventory`
- File: `app/api/characters/[id]/inventory/route.ts`
- Methods: GET, POST
- Findings:
  - No issues found (reviewed)

### `/api/characters/[id]/inventory/[itemId]`
- File: `app/api/characters/[id]/inventory/[itemId]/route.ts`
- Methods: DELETE, GET, PUT
- Findings:
  - No issues found (reviewed)

### `/api/characters/[id]/inventory/[itemId]/equip`
- File: `app/api/characters/[id]/inventory/[itemId]/equip/route.ts`
- Methods: PUT
- Findings:
  - No issues found (reviewed)

### `/api/dice/roll`
- File: `app/api/dice/roll/route.ts`
- Methods: POST
- Findings:
  - Fixed: `characterId` is validated to belong to the authenticated user and the current session campaign.

### `/api/gm/combat-action`
- File: `app/api/gm/combat-action/route.ts`
- Methods: POST
- Findings:
  - Fixed: Added session membership check before writing combat messages/state.

### `/api/gm/describe-location`
- File: `app/api/gm/describe-location/route.ts`
- Methods: POST
- Findings:
  - Fixed: Added session membership check before writing location description/state.

### `/api/gm/generate-location-image`
- File: `app/api/gm/generate-location-image/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/gm/generate-map`
- File: `app/api/gm/generate-map/route.ts`
- Methods: POST
- Findings:
  - Fixed: Added session membership check before creating maps.

### `/api/gm/generate-scenario`
- File: `app/api/gm/generate-scenario/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/gm/generate-world`
- File: `app/api/gm/generate-world/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/gm/narrate`
- File: `app/api/gm/narrate/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/gm/npc-dialogue`
- File: `app/api/gm/npc-dialogue/route.ts`
- Methods: POST
- Findings:
  - Fixed: Added session membership check before generating NPC dialogue/messages.

### `/api/gm/suggestions`
- File: `app/api/gm/suggestions/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/login`
- File: `app/api/login/route.ts`
- Methods: Unknown
- Findings:
  - Fixed: Route now reuses `/api/auth/[...nextauth]` configuration to keep auth behavior consistent.
  - Fixed: Shared credential rate limiting via auth config.

### `/api/messages/[id]`
- File: `app/api/messages/[id]/route.ts`
- Methods: PATCH, PUT
- Findings:
  - Fixed: Only the message sender or campaign creator can update message location fields.

### `/api/profile`
- File: `app/api/profile/route.ts`
- Methods: DELETE, PATCH
- Findings:
  - No issues found (reviewed)

### `/api/register`
- File: `app/api/register/route.ts`
- Methods: POST
- Findings:
  - Fixed: Added basic rate limiting for account creation (IP, 1 hour window).

### `/api/scenarios`
- File: `app/api/scenarios/route.ts`
- Methods: GET, POST
- Findings:
  - Fixed: Clamped `limit` to a max of 50 to avoid unbounded responses.
  - Fixed: Non-numeric `limit`/`offset` now default to safe values.

### `/api/scenarios/[id]`
- File: `app/api/scenarios/[id]/route.ts`
- Methods: DELETE, GET, PUT
- Findings:
  - No issues found (reviewed)

### `/api/scenarios/mine`
- File: `app/api/scenarios/mine/route.ts`
- Methods: GET
- Findings:
  - No issues found (reviewed)

### `/api/scenarios/official`
- File: `app/api/scenarios/official/route.ts`
- Methods: GET
- Findings:
  - Fixed: Clamped `limit` to a max of 50 to avoid unbounded responses.
  - Fixed: Non-numeric `limit` now defaults to a safe value.

### `/api/sessions/[id]`
- File: `app/api/sessions/[id]/route.ts`
- Methods: GET, PUT
- Findings:
  - No issues found (reviewed)

### `/api/sessions/[id]/dice-history`
- File: `app/api/sessions/[id]/dice-history/route.ts`
- Methods: GET
- Findings:
  - No issues found (reviewed)

### `/api/sessions/[id]/messages`
- File: `app/api/sessions/[id]/messages/route.ts`
- Methods: GET, POST
- Findings:
  - Fixed: Sender type is derived server-side; non-creators cannot spoof `GM`/`SYSTEM`.
  - Fixed: Client sendMessage hook now consumes the `{ message }` response wrapper.

### `/api/sessions/[id]/npcs`
- File: `app/api/sessions/[id]/npcs/route.ts`
- Methods: GET, POST
- Findings:
  - No issues found (reviewed)

### `/api/sessions/[id]/npcs/[npcId]`
- File: `app/api/sessions/[id]/npcs/[npcId]/route.ts`
- Methods: DELETE, GET, PUT
- Findings:
  - No issues found (reviewed)

### `/api/sessions/[id]/reset`
- File: `app/api/sessions/[id]/reset/route.ts`
- Methods: POST
- Findings:
  - No issues found (reviewed)

### `/api/sessions/[id]/state`
- File: `app/api/sessions/[id]/state/route.ts`
- Methods: GET
- Findings:
  - Fixed: Campaign creator is now allowed to poll session state.
  - Fixed: Client hook now reads the `state` payload instead of assuming a bare GameState response.

### `/api/sessions/[id]/updates`
- File: `app/api/sessions/[id]/updates/route.ts`
- Methods: GET
- Findings:
  - Fixed: Campaign creator is now allowed to poll updates.
  - Fixed: Updates sanitize metadata to only expose `gmPrompt` when present.
  - Fixed: Client hook now reads the `updates` payload and refreshes state when it changes.
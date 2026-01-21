# Site Route Inventory

Generated from the current repo state.

## Pages
### `/`
- File: `app/(public)/page.tsx`

### `/about`
- File: `app/(public)/about/page.tsx`

### `/admin`
- File: `app/(admin)/admin/page.tsx`

### `/admin/campaigns`
- File: `app/(admin)/admin/campaigns/page.tsx`

### `/admin/scenarios`
- File: `app/(admin)/admin/scenarios/page.tsx`

### `/admin/users`
- File: `app/(admin)/admin/users/page.tsx`

### `/campaigns`
- File: `app/(protected)/campaigns/page.tsx`

### `/campaigns/[id]`
- File: `app/(protected)/campaigns/[id]/page.tsx`

### `/campaigns/[id]/play`
- File: `app/(protected)/campaigns/[id]/play/page.tsx`

### `/campaigns/[id]/settings`
- File: `app/(protected)/campaigns/[id]/settings/page.tsx`

### `/campaigns/join`
- File: `app/(protected)/campaigns/join/page.tsx`

### `/campaigns/new`
- File: `app/(protected)/campaigns/new/page.tsx`

### `/characters`
- File: `app/(protected)/characters/page.tsx`

### `/characters/[id]`
- File: `app/(protected)/characters/[id]/page.tsx`

### `/characters/[id]/edit`
- File: `app/(protected)/characters/[id]/edit/page.tsx`

### `/characters/new`
- File: `app/(protected)/characters/new/page.tsx`

### `/dashboard`
- File: `app/(protected)/dashboard/page.tsx`

### `/demo`
- File: `app/(public)/demo/page.tsx`

### `/login`
- File: `app/(auth)/login/page.tsx`

### `/profile`
- File: `app/(protected)/profile/page.tsx`

### `/register`
- File: `app/(auth)/register/page.tsx`

### `/rules`
- File: `app/(public)/rules/page.tsx`

### `/scenarios`
- File: `app/(protected)/scenarios/page.tsx`

### `/scenarios/[id]`
- File: `app/(protected)/scenarios/[id]/page.tsx`

### `/scenarios/[id]/edit`
- File: `app/(protected)/scenarios/[id]/edit/page.tsx`

### `/scenarios/new`
- File: `app/(protected)/scenarios/new/page.tsx`

## API Routes (Route Handlers)
### `/api/admin/campaigns`
- File: `app/api/admin/campaigns/route.ts`
- Methods: DELETE, GET

### `/api/admin/dashboard`
- File: `app/api/admin/dashboard/route.ts`
- Methods: GET

### `/api/admin/scenarios`
- File: `app/api/admin/scenarios/route.ts`
- Methods: DELETE, GET

### `/api/admin/users`
- File: `app/api/admin/users/route.ts`
- Methods: DELETE, GET, PATCH

### `/api/auth/[...nextauth]`
- File: `app/api/auth/[...nextauth]/route.ts`
- Methods: Unknown

### `/api/campaigns`
- File: `app/api/campaigns/route.ts`
- Methods: GET, POST

### `/api/campaigns/[id]`
- File: `app/api/campaigns/[id]/route.ts`
- Methods: DELETE, GET, PUT

### `/api/campaigns/[id]/active-session`
- File: `app/api/campaigns/[id]/active-session/route.ts`
- Methods: GET

### `/api/campaigns/[id]/complete`
- File: `app/api/campaigns/[id]/complete/route.ts`
- Methods: POST

### `/api/campaigns/[id]/invite`
- File: `app/api/campaigns/[id]/invite/route.ts`
- Methods: POST

### `/api/campaigns/[id]/join`
- File: `app/api/campaigns/[id]/join/route.ts`
- Methods: DELETE, POST

### `/api/campaigns/[id]/pause`
- File: `app/api/campaigns/[id]/pause/route.ts`
- Methods: POST

### `/api/campaigns/[id]/players/[playerId]`
- File: `app/api/campaigns/[id]/players/[playerId]/route.ts`
- Methods: DELETE

### `/api/campaigns/[id]/resume`
- File: `app/api/campaigns/[id]/resume/route.ts`
- Methods: POST

### `/api/campaigns/[id]/sessions`
- File: `app/api/campaigns/[id]/sessions/route.ts`
- Methods: GET, POST

### `/api/campaigns/join`
- File: `app/api/campaigns/join/route.ts`
- Methods: POST

### `/api/characters`
- File: `app/api/characters/route.ts`
- Methods: GET, POST

### `/api/characters/[id]`
- File: `app/api/characters/[id]/route.ts`
- Methods: DELETE, GET, PUT

### `/api/characters/[id]/inventory`
- File: `app/api/characters/[id]/inventory/route.ts`
- Methods: GET, POST

### `/api/characters/[id]/inventory/[itemId]`
- File: `app/api/characters/[id]/inventory/[itemId]/route.ts`
- Methods: DELETE, GET, PUT

### `/api/characters/[id]/inventory/[itemId]/equip`
- File: `app/api/characters/[id]/inventory/[itemId]/equip/route.ts`
- Methods: PUT

### `/api/dice/roll`
- File: `app/api/dice/roll/route.ts`
- Methods: POST

### `/api/gm/combat-action`
- File: `app/api/gm/combat-action/route.ts`
- Methods: POST

### `/api/gm/describe-location`
- File: `app/api/gm/describe-location/route.ts`
- Methods: POST

### `/api/gm/generate-location-image`
- File: `app/api/gm/generate-location-image/route.ts`
- Methods: POST

### `/api/gm/generate-map`
- File: `app/api/gm/generate-map/route.ts`
- Methods: POST

### `/api/gm/generate-scenario`
- File: `app/api/gm/generate-scenario/route.ts`
- Methods: POST

### `/api/gm/generate-world`
- File: `app/api/gm/generate-world/route.ts`
- Methods: POST

### `/api/gm/narrate`
- File: `app/api/gm/narrate/route.ts`
- Methods: POST

### `/api/gm/npc-dialogue`
- File: `app/api/gm/npc-dialogue/route.ts`
- Methods: POST

### `/api/gm/suggestions`
- File: `app/api/gm/suggestions/route.ts`
- Methods: POST

### `/api/login`
- File: `app/api/login/route.ts`
- Methods: Unknown

### `/api/messages/[id]`
- File: `app/api/messages/[id]/route.ts`
- Methods: PATCH, PUT

### `/api/profile`
- File: `app/api/profile/route.ts`
- Methods: DELETE, PATCH

### `/api/register`
- File: `app/api/register/route.ts`
- Methods: POST

### `/api/scenarios`
- File: `app/api/scenarios/route.ts`
- Methods: GET, POST

### `/api/scenarios/[id]`
- File: `app/api/scenarios/[id]/route.ts`
- Methods: DELETE, GET, PUT

### `/api/scenarios/mine`
- File: `app/api/scenarios/mine/route.ts`
- Methods: GET

### `/api/scenarios/official`
- File: `app/api/scenarios/official/route.ts`
- Methods: GET

### `/api/sessions/[id]`
- File: `app/api/sessions/[id]/route.ts`
- Methods: GET, PUT

### `/api/sessions/[id]/dice-history`
- File: `app/api/sessions/[id]/dice-history/route.ts`
- Methods: GET

### `/api/sessions/[id]/messages`
- File: `app/api/sessions/[id]/messages/route.ts`
- Methods: GET, POST

### `/api/sessions/[id]/npcs`
- File: `app/api/sessions/[id]/npcs/route.ts`
- Methods: GET, POST

### `/api/sessions/[id]/npcs/[npcId]`
- File: `app/api/sessions/[id]/npcs/[npcId]/route.ts`
- Methods: DELETE, GET, PUT

### `/api/sessions/[id]/reset`
- File: `app/api/sessions/[id]/reset/route.ts`
- Methods: POST

### `/api/sessions/[id]/state`
- File: `app/api/sessions/[id]/state/route.ts`
- Methods: GET

### `/api/sessions/[id]/updates`
- File: `app/api/sessions/[id]/updates/route.ts`
- Methods: GET

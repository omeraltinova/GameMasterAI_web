# Site Route Inventory

Generated from the current repo state.

## Pages
### `/`
- File: `app/(public)/page.tsx`

### `/about`
- File: `app/(public)/about/page.tsx`

### `/admin`
- File: `app/(admin)/admin/page.tsx`

### `/admin/active-sessions`
- File: `app/(admin)/admin/active-sessions/page.tsx`

### `/admin/campaigns`
- File: `app/(admin)/admin/campaigns/page.tsx`

### `/admin/characters`
- File: `app/(admin)/admin/characters/page.tsx`

### `/admin/moderation`
- File: `app/(admin)/admin/moderation/page.tsx`

### `/admin/scenarios`
- File: `app/(admin)/admin/scenarios/page.tsx`

### `/admin/settings`
- File: `app/(admin)/admin/settings/page.tsx`

### `/admin/stats`
- File: `app/(admin)/admin/stats/page.tsx`

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

### `/characters/[id]/inventory`
- File: `app/(protected)/characters/[id]/inventory/page.tsx`

### `/characters/new`
- File: `app/(protected)/characters/new/page.tsx`

### `/dashboard`
- File: `app/(protected)/dashboard/page.tsx`

### `/demo`
- File: `app/(public)/demo/page.tsx`

### `/login`
- File: `app/(auth)/login/page.tsx`

### `/players`
- File: `app/(protected)/players/page.tsx`

### `/players/[id]`
- File: `app/(protected)/players/[id]/page.tsx`

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
### `/api/admin/active-sessions`
- File: `app/api/admin/active-sessions/route.ts`
- Methods: GET

### `/api/admin/active-sessions/[id]`
- File: `app/api/admin/active-sessions/[id]/route.ts`
- Methods: PATCH

### `/api/admin/audit`
- File: `app/api/admin/audit/route.ts`
- Methods: GET

### `/api/admin/campaigns`
- File: `app/api/admin/campaigns/route.ts`
- Methods: GET, DELETE

### `/api/admin/characters`
- File: `app/api/admin/characters/route.ts`
- Methods: GET, DELETE

### `/api/admin/collections`
- File: `app/api/admin/collections/route.ts`
- Methods: GET, POST

### `/api/admin/collections/[id]`
- File: `app/api/admin/collections/[id]/route.ts`
- Methods: PATCH, DELETE

### `/api/admin/dashboard`
- File: `app/api/admin/dashboard/route.ts`
- Methods: GET

### `/api/admin/moderation/reports`
- File: `app/api/admin/moderation/reports/route.ts`
- Methods: GET

### `/api/admin/moderation/reports/[id]`
- File: `app/api/admin/moderation/reports/[id]/route.ts`
- Methods: PATCH

### `/api/admin/scenarios`
- File: `app/api/admin/scenarios/route.ts`
- Methods: GET, PATCH, DELETE

### `/api/admin/settings`
- File: `app/api/admin/settings/route.ts`
- Methods: GET, PATCH

### `/api/admin/users`
- File: `app/api/admin/users/route.ts`
- Methods: GET, PATCH, DELETE

### `/api/auth/[...nextauth]`
- File: `app/api/auth/[...nextauth]/route.ts`
- Methods: GET, POST

### `/api/auth/password`
- File: `app/api/auth/password/route.ts`
- Methods: POST

### `/api/campaigns`
- File: `app/api/campaigns/route.ts`
- Methods: GET, POST

### `/api/campaigns/[id]`
- File: `app/api/campaigns/[id]/route.ts`
- Methods: GET, PUT, DELETE

### `/api/campaigns/[id]/active-session`
- File: `app/api/campaigns/[id]/active-session/route.ts`
- Methods: GET, POST

### `/api/campaigns/[id]/complete`
- File: `app/api/campaigns/[id]/complete/route.ts`
- Methods: POST

### `/api/campaigns/[id]/invite`
- File: `app/api/campaigns/[id]/invite/route.ts`
- Methods: POST

### `/api/campaigns/[id]/join`
- File: `app/api/campaigns/[id]/join/route.ts`
- Methods: POST, DELETE

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
- Methods: GET, PUT, DELETE

### `/api/characters/[id]/hp`
- File: `app/api/characters/[id]/hp/route.ts`
- Methods: PUT

### `/api/characters/[id]/inventory`
- File: `app/api/characters/[id]/inventory/route.ts`
- Methods: GET, POST

### `/api/characters/[id]/inventory/[itemId]`
- File: `app/api/characters/[id]/inventory/[itemId]/route.ts`
- Methods: GET, PUT, DELETE

### `/api/characters/[id]/inventory/[itemId]/equip`
- File: `app/api/characters/[id]/inventory/[itemId]/equip/route.ts`
- Methods: PUT

### `/api/characters/[id]/levelup`
- File: `app/api/characters/[id]/levelup/route.ts`
- Methods: PUT

### `/api/combat/[id]`
- File: `app/api/combat/[id]/route.ts`
- Methods: GET

### `/api/combat/[id]/action`
- File: `app/api/combat/[id]/action/route.ts`
- Methods: POST

### `/api/combat/[id]/end`
- File: `app/api/combat/[id]/end/route.ts`
- Methods: POST

### `/api/combat/[id]/next-turn`
- File: `app/api/combat/[id]/next-turn/route.ts`
- Methods: POST

### `/api/dice/roll`
- File: `app/api/dice/roll/route.ts`
- Methods: POST

### `/api/dice/roll-attack`
- File: `app/api/dice/roll-attack/route.ts`
- Methods: POST

### `/api/dice/roll-check`
- File: `app/api/dice/roll-check/route.ts`
- Methods: POST

### `/api/dice/roll-damage`
- File: `app/api/dice/roll-damage/route.ts`
- Methods: POST

### `/api/gm/combat-action`
- File: `app/api/gm/combat-action/route.ts`
- Methods: POST

### `/api/gm/describe-location`
- File: `app/api/gm/describe-location/route.ts`
- Methods: POST

### `/api/gm/generate-character`
- File: `app/api/gm/generate-character/route.ts`
- Methods: POST

### `/api/gm/generate-character-portrait`
- File: `app/api/gm/generate-character-portrait/route.ts`
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
- Methods: GET, POST

### `/api/maps/[mapId]`
- File: `app/api/maps/[mapId]/route.ts`
- Methods: GET, PUT, DELETE

### `/api/messages/[id]`
- File: `app/api/messages/[id]/route.ts`
- Methods: PUT, PATCH

### `/api/profile`
- File: `app/api/profile/route.ts`
- Methods: GET, PATCH, DELETE

### `/api/register`
- File: `app/api/register/route.ts`
- Methods: POST

### `/api/reports`
- File: `app/api/reports/route.ts`
- Methods: POST

### `/api/scenarios`
- File: `app/api/scenarios/route.ts`
- Methods: GET, POST

### `/api/scenarios/[id]`
- File: `app/api/scenarios/[id]/route.ts`
- Methods: GET, PUT, DELETE

### `/api/scenarios/mine`
- File: `app/api/scenarios/mine/route.ts`
- Methods: GET

### `/api/scenarios/official`
- File: `app/api/scenarios/official/route.ts`
- Methods: GET

### `/api/sessions/[id]`
- File: `app/api/sessions/[id]/route.ts`
- Methods: GET, PUT

### `/api/sessions/[id]/combat/start`
- File: `app/api/sessions/[id]/combat/start/route.ts`
- Methods: POST

### `/api/sessions/[id]/dice-history`
- File: `app/api/sessions/[id]/dice-history/route.ts`
- Methods: GET

### `/api/sessions/[id]/events`
- File: `app/api/sessions/[id]/events/route.ts`
- Methods: GET

### `/api/sessions/[id]/maps`
- File: `app/api/sessions/[id]/maps/route.ts`
- Methods: GET, POST

### `/api/sessions/[id]/messages`
- File: `app/api/sessions/[id]/messages/route.ts`
- Methods: GET, POST

### `/api/sessions/[id]/npcs`
- File: `app/api/sessions/[id]/npcs/route.ts`
- Methods: GET, POST

### `/api/sessions/[id]/npcs/[npcId]`
- File: `app/api/sessions/[id]/npcs/[npcId]/route.ts`
- Methods: GET, PUT, DELETE

### `/api/sessions/[id]/reset`
- File: `app/api/sessions/[id]/reset/route.ts`
- Methods: POST

### `/api/sessions/[id]/state`
- File: `app/api/sessions/[id]/state/route.ts`
- Methods: GET

### `/api/sessions/[id]/updates`
- File: `app/api/sessions/[id]/updates/route.ts`
- Methods: GET

### `/api/system/stats`
- File: `app/api/system/stats/route.ts`
- Methods: GET

### `/api/system/status`
- File: `app/api/system/status/route.ts`
- Methods: GET

### `/api/users`
- File: `app/api/users/route.ts`
- Methods: GET

### `/api/users/[id]`
- File: `app/api/users/[id]/route.ts`
- Methods: GET


# IDOR Analysis Results: GameMaster AI

## Executive Summary
- Candidates analyzed: 14 (object-level endpoints with user-supplied IDs, non-admin, non-public)
- Vulnerable: 0
- Likely Vulnerable / Needs Review: 1
- Not Vulnerable: 13

The application has a consistently strong object-authorization posture. Almost every object endpoint either scopes its Prisma query by ownership or performs an explicit `creatorId/player.userId/senderId === userId` check after fetch, *and* re-validates the session against the DB on each request via `getUserId()`.

## Findings

### [NEEDS MANUAL REVIEW] `PATCH` / `PUT /api/messages/[id]` — GM can mutate other players' messages
- **File**: `app/api/messages/[id]/route.ts:81-101`
- **Endpoint**: `PATCH` / `PUT /api/messages/:id`
- **Issue**: Authorization allows the **campaign creator (GM)** OR the message **sender** to update. A GM can therefore edit metadata (`locationImageUrl`, `locationName`) on **any** player's message in their campaign.
- **Mitigations in place**: (1) Only `locationImageUrl` and `locationName` are editable — `content` cannot be changed; (2) `locationImageUrl` is forced through `normalizeImageUrl()` (allowlisted hosts / relative / data-URL only). So the impact is limited to a GM attaching an allowlisted image/location label to a player's message.
- **Concern**: This is plausibly intended (a GM stages the scene), but it is horizontal-ish object access not gated to the owner. If GM-edit-of-player-messages is *not* intended, this is a low-severity IDOR.
- **Remediation**: If GM editing is intended, document it. If not, restrict to `message.senderId === userId` only.
- **Dynamic Test**:
  ```
  # As the GM (campaign creator), patch a message you did not send:
  curl -X PATCH http://localhost:3000/api/messages/<PLAYER_A_MESSAGE_ID> \
    -H "Cookie: next-auth.session-token=<GM_SESSION_COOKIE>" \
    -H "Content-Type: application/json" \
    -d '{"locationName":"Tampered","locationImageUrl":null}'
  # Expect 200 success (confirms GM can edit others' messages). Content field is NOT modifiable.
  ```

### [NOT VULNERABLE] `GET / PUT / DELETE /api/characters/[id]`
- **File**: `app/api/characters/[id]/route.ts:62-67, 133-138, 301-306`
- **Protection**: Every method does `findUnique({where:{id}})` then `if (character.userId !== userId) return 403`. GET, PUT, DELETE all gated.

### [NOT VULNERABLE] `GET / PUT / DELETE /api/campaigns/[id]`
- **File**: `app/api/campaigns/[id]/route.ts:95-104, 164-166, 257-259`
- **Protection**: GET = `creatorId === userId || players.some(p => p.userId === userId)`; PUT/DELETE = creator-only. `inviteCode` only returned to creator AND only if `isMultiplayer`.

### [NOT VULNERABLE] `GET / PUT / DELETE /api/maps/[mapId]`
- **File**: `app/api/maps/[mapId]/route.ts:50-55, 128-131, 210-213`
- **Protection**: GET = creator OR player; PUT/DELETE = creator-only, via `map.session.campaign.creatorId`.

### [NOT VULNERABLE] `GET /api/users/[id]`
- **File**: `app/api/users/[id]/route.ts:148-180`
- **Protection**: Full privacy-aware filtering — `profilePublic` gate returns stub; per-section `showCharacters/showCampaigns/showScenarios/showStats` flags honored; `role` only exposed to self or ADMIN.

### [NOT VULNERABLE] `GET / PUT /api/sessions/[id]` (and sub-resources `messages`, `npcs/[npcId]`, `maps`, `combat/*`, `dice/roll`)
- **Protection**: All route through `getCampaignActorRole` / `hasCampaignAccess` (creator-or-active-player) for reads, GM-only for state mutations. NPC/Inventory sub-resources add a cross-check (`npc.sessionId === sessionId`, `item.characterId === characterId`). `dice/roll` validates `characterId` ownership **and** `campaignId` match.

### [NOT VULNERABLE] `POST /api/gm/*` (narrate, suggestions, npc-dialogue, combat-action, generate-map, etc.)
- **Protection**: Each resolves the session, then `isCreator || isPlayer in campaign.players`; `gm/suggestions` validates a supplied `messageId` belongs to the session (403 otherwise). `give_item` tool target is hard-bound to the **requester's own** character id (derived server-side from `campaign.players`), not a client-supplied id.

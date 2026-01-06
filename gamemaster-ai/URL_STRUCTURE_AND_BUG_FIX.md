# URL Structure and Bug Fix Documentation

## Overview

This document explains the URL routing structure for the GameMaster AI project and documents a critical bug that was fixed regarding session ID handling.

---

## URL Structure

### Play Page URL Format

```
http://localhost:3000/campaigns/{campaignId}/play?sessionId={sessionId}
```

### URL Components

| Component | Example | Description | Source |
|-----------|---------|-------------|--------|
| `campaignId` | `campaign_test_1` | Campaign ID from URL path | `params.id` |
| `sessionId` | `session_test_1` | Session ID from query parameter | `searchParams.get('sessionId')` |

### Example URL

```
http://localhost:3000/campaigns/campaign_test_1/play?sessionId=session_test_1
```

- **Campaign ID**: `campaign_test_1` (from path `/campaigns/[id]/play`)
- **Session ID**: `session_test_1` (from query parameter `?sessionId=...`)

---

## Why Separate IDs?

### Campaign vs Session

A **Campaign** can have multiple **Sessions** over time:

```
Campaign: "Thorin'in Macerası"
├── Session 1: "First Adventure" (2024-01-15)
├── Session 2: "Dragon Fight" (2024-01-22)
├── Session 3: "Treasure Hunt" (2024-01-29)
└── Session 4: "Final Battle" (2024-02-05)
```

### Key Differences

| Aspect | Campaign | Session |
|--------|----------|---------|
| **Purpose** | Long-term story arc | Single game instance |
| **Duration** | Weeks/Months | Hours |
| **Players** | Same group | Same group |
| **State** | Persistent | Reset each session |
| **Data** | Scenario, settings | Current location, NPCs, messages |
| **Relationship** | One-to-Many | Many-to-One |

### Database Schema

```prisma
model Campaign {
  id          String   @id @default(cuid())
  name        String
  // ... other fields
  sessions    GameSession[]
}

model GameSession {
  id          String   @id @default(cuid())
  campaignId  String
  campaign    Campaign @relation(fields: [campaignId], references: [id])
  currentState Json
  aiContext   String?
  messages    Message[]
  npcs        NPC[]
  // ... other fields
}
```

---

## The Bug

### Original (Wrong) Code

```typescript
// Get session ID from query parameter or use campaign ID to fetch active session
const sessionIdParam = searchParams.get('sessionId');
const [sessionId, setSessionId] = useState<string>(sessionIdParam || campaignId);  // ❌ WRONG!
```

### Problem

1. **Line 38**: `useState<string>(sessionIdParam || campaignId)`
   - If `sessionIdParam` is `null`, it defaults to `campaignId`
   - **Campaign ID and session ID are completely different entities!**
   - Using campaign ID as session ID causes "Session bulunamadı" errors

2. **Wrong Logic**:
   ```typescript
   // Only fetch if we're using campaign ID as session ID (no sessionIdParam provided)
   if (!sessionIdParam) {
     fetchActiveSession();
   }
   ```
   - This comment is misleading
   - The logic was backwards

### Example of the Bug

**Scenario**: User navigates to `/campaigns/campaign_test_1/play` without sessionId parameter

**What Happened**:
1. `sessionIdParam = null`
2. `sessionId = campaignId = "campaign_test_1"` ❌
3. API call: `GET /sessions/campaign_test_1`
4. Error: "Session bulunamadı" (Session not found)
5. Because campaign ID is not a valid session ID!

---

## The Fix

### Corrected Code

```typescript
// Get session ID from query parameter (don't default to campaign ID - they're different!)
const sessionIdParam = searchParams.get('sessionId');
const [sessionId, setSessionId] = useState<string | null>(sessionIdParam || null);  // ✅ CORRECT!

// Fetch active session if not provided in query param
useEffect(() => {
  const fetchActiveSession = async () => {
    try {
      const sessions = await get(`/campaigns/${campaignId}/sessions`);
      if (Array.isArray(sessions) && sessions.length > 0) {
        setSessionId(sessions[0].id);  // Use first existing session
      }
    } catch (error) {
      console.error('Session alınamadı:', error);
    }
  };
  
  // Only fetch if sessionIdParam is NOT provided (create/fetch new session)
  if (!sessionIdParam) {
    fetchActiveSession();
  }
}, [campaignId, sessionIdParam]);
```

### Key Changes

1. **Line 38**: `useState<string | null>(sessionIdParam || null)`
   - Defaults to `null`, NOT `campaignId`
   - Type is `string | null` to handle the initial null state

2. **Line 46**: `setSessionId(sessions[0].id)`
   - Uses actual session ID from API response
   - Never uses campaign ID as session ID

3. **Line 53**: `if (!sessionIdParam)`
   - Correct logic: fetch session only when no sessionIdParam provided
   - Creates new session if needed via POST `/campaigns/${campaignId}/sessions`

---

## TypeScript Fix

### Additional Fix for Hooks

```typescript
// API hooks - only call when sessionId is available
const {
  session,
  gameState,
  messages,
  isLoading: isGameLoading,
  error: gameError,
  sendMessage: apiSendMessage,
} = useGame(sessionId || '');  // ✅ Use empty string as fallback

const {
  narrate,
  isLoading: isGMLoading,
  error: gmError,
} = useGM(sessionId || '');  // ✅ Use empty string as fallback

const {
  rollDice,
  isLoading: isDiceLoading,
} = useDice(sessionId || '');  // ✅ Use empty string as fallback
```

### Why This Works

- Hooks expect `string` type, but `sessionId` can be `null`
- Using `sessionId || ''` provides a valid string fallback
- Hooks will handle empty string gracefully (no API calls made)

---

## Flow Diagrams

### Correct Flow (With sessionIdParam)

```
User navigates to: /campaigns/campaign_test_1/play?sessionId=session_test_1
                              ↓
                sessionIdParam = "session_test_1"
                              ↓
                sessionId = "session_test_1"
                              ↓
                useGame("session_test_1") → GET /sessions/session_test_1
                              ↓
                ✅ Session loaded successfully
```

### Correct Flow (Without sessionIdParam)

```
User navigates to: /campaigns/campaign_test_1/play
                              ↓
                sessionIdParam = null
                              ↓
                sessionId = null
                              ↓
                fetchActiveSession() → GET /campaigns/campaign_test_1/sessions
                              ↓
                sessions[0].id = "session_test_1"
                              ↓
                setSessionId("session_test_1")
                              ↓
                useGame("session_test_1") → GET /sessions/session_test_1
                              ↓
                ✅ Session loaded successfully
```

### Wrong Flow (Before Fix)

```
User navigates to: /campaigns/campaign_test_1/play
                              ↓
                sessionIdParam = null
                              ↓
                sessionId = "campaign_test_1" ❌ WRONG!
                              ↓
                useGame("campaign_test_1") → GET /sessions/campaign_test_1
                              ↓
                ❌ Error: Session bulunamadı
```

---

## API Endpoints Used

### Session Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/campaigns/:id/sessions` | GET | List all sessions for a campaign |
| `/api/campaigns/:id/sessions` | POST | Create new session for a campaign |
| `/api/sessions/:id` | GET | Get session details |
| `/api/sessions/:id/state` | GET | Get game state (polling) |
| `/api/sessions/:id/messages` | GET | Get message history |
| `/api/sessions/:id/messages` | POST | Send message |
| `/api/sessions/:id/updates` | GET | Get delta updates (polling) |

### Example API Calls

```typescript
// Get campaign sessions
GET /api/campaigns/campaign_test_1/sessions
Response: [
  { id: "session_test_1", campaignId: "campaign_test_1", ... },
  { id: "session_test_2", campaignId: "campaign_test_1", ... }
]

// Get session details
GET /api/sessions/session_test_1
Response: {
  id: "session_test_1",
  campaignId: "campaign_test_1",
  currentState: { location: "Tavern", ... },
  aiContext: "...",
  messages: [...],
  npcs: [...]
}
```

---

## Best Practices

### 1. Never Use Campaign ID as Session ID

```typescript
// ❌ WRONG
const sessionId = campaignId;

// ✅ CORRECT
const sessionId = await getActiveSessionId(campaignId);
```

### 2. Always Validate Session ID

```typescript
// ✅ Validate before using
if (!sessionId) {
  throw new Error('Session ID is required');
}
```

### 3. Use Proper TypeScript Types

```typescript
// ✅ Use union type for optional values
const [sessionId, setSessionId] = useState<string | null>(null);

// ❌ Don't use non-null assertion without validation
const sessionId = sessionIdParam!;
```

### 4. Handle Loading States

```typescript
// ✅ Show loading while fetching
if (!sessionId && isGameLoading) {
  return <div>Loading session...</div>;
}
```

---

## Testing

### Test Case 1: With sessionIdParam

**URL**: `http://localhost:3000/campaigns/campaign_test_1/play?sessionId=session_test_1`

**Expected Behavior**:
- ✅ Session loaded successfully
- ✅ Game state displayed
- ✅ Messages loaded

### Test Case 2: Without sessionIdParam (Existing Session)

**URL**: `http://localhost:3000/campaigns/campaign_test_1/play`

**Expected Behavior**:
- ✅ Fetches existing sessions
- ✅ Uses first session found
- ✅ Game loads successfully

### Test Case 3: Without sessionIdParam (New Campaign)

**URL**: `http://localhost:3000/campaigns/new_campaign/play`

**Expected Behavior**:
- ✅ Creates new session via POST
- ✅ Game loads with initial state
- ✅ Welcome message displayed

---

## Summary

### The Bug
- **Location**: `gamemaster-ai/app/(protected)/campaigns/[id]/play/page.tsx:38`
- **Issue**: Using campaign ID as default session ID
- **Impact**: "Session bulunamadı" errors when navigating without sessionIdParam

### The Fix
- Changed default from `campaignId` to `null`
- Updated type from `string` to `string | null`
- Fixed logic to fetch/create session only when needed
- Added fallback `''` for hooks to handle null state

### Key Takeaway
**Campaign ID and Session ID are completely different entities. Never use one as the other.**

---

## Related Files

- `gamemaster-ai/app/(protected)/campaigns/[id]/play/page.tsx` - Play page (fixed)
- `gamemaster-ai/app/api/campaigns/[id]/sessions/route.ts` - Session API
- `gamemaster-ai/app/api/sessions/[id]/route.ts` - Session details API
- `gamemaster-ai/hooks/useGame.ts` - Game hooks
- `gamemaster-ai/prisma/schema.prisma` - Database schema

---

*Last Updated: January 3, 2026*

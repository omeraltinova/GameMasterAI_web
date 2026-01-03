# Centralized Session Management - Better Architecture

## Overview

This document proposes a centralized session management approach where the backend handles session logic automatically, eliminating the need for `sessionId` query parameters in URLs.

---

## Current (Complex) Architecture

### URL Structure
```
http://localhost:3000/campaigns/campaign_test_1/play?sessionId=session_test_1
```

### Problems
1. **Complex URL**: Requires query parameter for session ID
2. **Manual Management**: Frontend must track which session is active
3. **State Confusion**: Campaign ID vs Session ID confusion
4. **User Burden**: Users must understand session concept

---

## Proposed (Simple) Architecture

### URL Structure
```
http://localhost:3000/campaigns/campaign_test_1/play
```

### Benefits
1. **Clean URLs**: No query parameters needed
2. **Backend Control**: Server manages session state automatically
3. **User Simplicity**: Users just navigate to campaign
4. **Pause/Resume**: Built-in campaign status management

---

## How It Works

### 1. Campaign Status States

According to the plan (line 283), Campaign has a `status` field:

```prisma
model Campaign {
  status  Enum  // DRAFT, ACTIVE, PAUSED, COMPLETED
}
```

### 2. Session Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              SESSION MANAGEMENT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                             │
│  USER NAVIGATES TO: /campaigns/{campaignId}/play        │
│                        ↓                                  │
│  ┌─────────────────────────────────────────┐                 │
│  │  BACKEND: Find Active Session     │                 │
│  └─────────────────────────────────────────┘                 │
│                        ↓                                  │
│  ┌─────────────────────────────────────────┐                 │
│  │  CASE 1: Active Session Exists  │                 │
│  │  - Campaign status = ACTIVE       │                 │
│  │  - Has active GameSession       │                 │
│  │  → Return existing session      │                 │
│  └─────────────────────────────────────────┘                 │
│                        ↓                                  │
│  ┌─────────────────────────────────────────┐                 │
│  │  CASE 2: No Active Session     │                 │
│  │  - Campaign status = DRAFT/PAUSED │                 │
│  │  - No active GameSession        │                 │
│  │  → Create new session           │                 │
│  │  → Set campaign status = ACTIVE │                 │
│  └─────────────────────────────────────────┘                 │
│                        ↓                                  │
│  ┌─────────────────────────────────────────┐                 │
│  │  CASE 3: Paused Campaign       │                 │
│  │  - Campaign status = PAUSED      │                 │
│  │  - Has saved GameSession       │                 │
│  │  → Resume existing session       │                 │
│  │  → Set campaign status = ACTIVE │                 │
│  └─────────────────────────────────────────┘                 │
│                        ↓                                  │
│  ┌─────────────────────────────────────────┐                 │
│  │  CASE 4: Completed Campaign    │                 │
│  │  - Campaign status = COMPLETED   │                 │
│  │  → Show summary/readonly view   │                 │
│  └─────────────────────────────────────────┘                 │
│                        ↓                                  │
│  RETURN: Session data to frontend                            │
│                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Implementation

### New API Endpoint

**Endpoint**: `GET /api/campaigns/:id/active-session`

**Purpose**: Automatically find or create the active session for a campaign

**Implementation**:

```typescript
// app/api/campaigns/[id]/active-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: campaignId } = await params;

  try {
    // 1. Get campaign with all relations
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: true,
        scenario: true,
        players: {
          include: {
            character: true,
            user: true,
          },
        },
        sessions: {
          where: { /* Find most recent session */ },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Kampanya bulunamadı' },
        { status: 404 }
      );
    }

    // 2. Check access permissions
    const hasAccess = campaign.creatorId === userId ||
                     campaign.players.some((p: any) => p.userId === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bu kampanyaya erişimin yok' },
        { status: 403 }
      );
    }

    // 3. Find or create active session
    let session;
    
    if (campaign.status === 'ACTIVE' && campaign.sessions.length > 0) {
      // CASE 1: Active session exists - return it
      session = campaign.sessions[0];
    } else if (campaign.status === 'PAUSED' && campaign.sessions.length > 0) {
      // CASE 3: Paused campaign - resume session
      session = campaign.sessions[0];
      
      // Update campaign status to ACTIVE
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });
    } else {
      // CASE 2: No active session - create new one
      session = await prisma.gameSession.create({
        data: {
          campaignId,
          currentState: {
            location: campaign.scenario?.startingPrompt ? 
              campaign.scenario.startingPrompt.substring(0, 50) : 'Başlangıç',
            timeOfDay: 'morning',
            weather: 'clear',
            activeNPCs: [],
            activeQuests: [],
            notes: 'Yeni macera başlıyor',
          },
          aiContext: campaign.scenario?.startingPrompt || '',
        },
        include: {
          campaign: {
            include: {
              players: {
                include: {
                  character: true,
                },
              },
            },
          },
          messages: {
            orderBy: { timestamp: 'asc' },
            take: 50, // Last 50 messages
          },
          npcs: true,
        },
      });

      // Update campaign status to ACTIVE
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });
    }

    return NextResponse.json({
      success: true,
      session,
      campaign,
    });
  } catch (error) {
    console.error('Active session alınamadı:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
```

---

## Pause/Resume Functionality

### Pause Campaign

**Endpoint**: `POST /api/campaigns/:id/pause`

**Purpose**: Pause a campaign and save current state

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id: campaignId } = await params;

  try {
    // Verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.creatorId !== userId) {
      return NextResponse.json(
        { error: 'Yetkiniz yok' },
        { status: 403 }
      );
    }

    // Update campaign status to PAUSED
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Kampanya duraklatıldı',
    });
  } catch (error) {
    console.error('Pause hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
```

### Resume Campaign

**Automatic**: When user navigates to `/campaigns/:id/play`, backend automatically resumes by:
1. Finding the most recent session
2. Updating campaign status to `ACTIVE`
3. Returning session data

---

## Frontend Implementation

### Play Page (Simplified)

```typescript
// app/(protected)/campaigns/[id]/play/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useGame, useGM, useDice } from "@/hooks/useGame";
import { get } from "@/lib/api/client";

export default function PlayPage() {
  const params = useParams();
  const campaignId = params.id as string;

  // Fetch active session automatically
  const { data: sessionData, isLoading, error } = useSWR(
    `/campaigns/${campaignId}/active-session`,
    (url) => get(url)
  );

  const session = sessionData?.session;
  const campaign = sessionData?.campaign;

  // Use session ID from backend response
  const sessionId = session?.id;

  // API hooks - only call when sessionId is available
  const {
    gameState,
    messages,
    sendMessage,
  } = useGame(sessionId || '');

  const { narrate } = useGM(sessionId || '');
  const { rollDice } = useDice(sessionId || '');

  if (isLoading) {
    return <div>Oyun yükleniyor...</div>;
  }

  if (error) {
    return <div>Hata: {error.message}</div>;
  }

  if (campaign?.status === 'COMPLETED') {
    return <div>Bu kampanya tamamlandı</div>;
  }

  // ... rest of the UI
}
```

### Pause Button

```typescript
const handlePause = async () => {
  await post(`/campaigns/${campaignId}/pause`);
  router.push(`/campaigns/${campaignId}`);
};
```

---

## Campaign Status Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│              CAMPAIGN STATUS FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                             │
│  CREATED                                                   │
│     ↓                                                       │
│  DRAFT  ← User creates campaign                           │
│     ↓                                                       │
│  ACTIVE  ← User clicks "Play" button                      │
│     ↓                                                       │
│  [Playing...]                                               │
│     ↓                                                       │
│  PAUSED  ← User clicks "Pause" button                       │
│     ↓                                                       │
│  [Paused...]                                                │
│     ↓                                                       │
│  ACTIVE  ← User navigates to /play again (resume)          │
│     ↓                                                       │
│  [Playing...]                                               │
│     ↓                                                       │
│  COMPLETED  ← Campaign finished                              │
│                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### Campaign Model (Existing - No Changes Needed)

```prisma
model Campaign {
  id          String   @id @default(cuid())
  name        String
  description String?
  creatorId   String
  scenarioId  String?
  status      Enum     // DRAFT, ACTIVE, PAUSED, COMPLETED ← Already exists!
  isMultiplayer Boolean
  maxPlayers  Int
  inviteCode  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### GameSession Model (Existing - No Changes Needed)

```prisma
model GameSession {
  id           String   @id @default(cuid())
  campaignId   String
  currentState Json     // Stores game state
  aiContext    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Status |
|-----------|--------|---------|--------|
| `/api/campaigns/:id/active-session` | GET | Auto-find/create active session | **NEW** |
| `/api/campaigns/:id/pause` | POST | Pause campaign | **NEW** |
| `/api/campaigns/:id` | GET | Get campaign details | ✅ Existing |
| `/api/sessions/:id` | GET | Get session details | ✅ Existing |
| `/api/sessions/:id/state` | GET | Get game state | ✅ Existing |
| `/api/sessions/:id/messages` | GET | Get messages | ✅ Existing |
| `/api/sessions/:id/messages` | POST | Send message | ✅ Existing |
| `/api/gm/narrate` | POST | AI narration | ✅ Existing |
| `/api/dice/roll` | POST | Roll dice | ✅ Existing |

---

## Benefits Summary

### For Users
1. **Simple URLs**: `/campaigns/123/play` (no query params)
2. **Automatic Resume**: Just click campaign card to resume
3. **Clear Status**: See if campaign is DRAFT, ACTIVE, PAUSED, or COMPLETED
4. **Easy Pause**: One button to save progress

### For Developers
1. **Simpler Frontend**: No session ID management needed
2. **Backend Control**: Server manages session logic
3. **Less State**: Frontend doesn't track active session
4. **Cleaner Code**: No `sessionId` query parameter handling

### For System
1. **Better Data**: Campaign status reflects real state
2. **Automatic Cleanup**: Can clean up old sessions
3. **Scalable**: Easy to add more status states
4. **Debuggable**: Clear campaign lifecycle

---

## Migration Path

### Phase 1: Backend (1-2 hours)
1. ✅ Create `GET /api/campaigns/:id/active-session` endpoint
2. ✅ Create `POST /api/campaigns/:id/pause` endpoint
3. ✅ Update campaign status logic
4. ✅ Test session creation/resumption

### Phase 2: Frontend (1-2 hours)
1. ✅ Update play page to use `/active-session` endpoint
2. ✅ Remove `sessionId` query parameter logic
3. ✅ Add pause button to UI
4. ✅ Show campaign status in UI

### Phase 3: Cleanup (30 minutes)
1. ✅ Remove old `GET /api/campaigns/:id/sessions` endpoint (if unused)
2. ✅ Update documentation
3. ✅ Test full flow

---

## Example User Flow

### First Time Playing
```
1. User creates campaign → Status: DRAFT
2. User clicks "Play" button
3. Navigate to: /campaigns/123/play
4. Backend: Creates new session, sets status to ACTIVE
5. User plays game...
```

### Pause Campaign
```
1. User clicks "Pause" button
2. Backend: Updates campaign status to PAUSED
3. User navigates away
4. Session state is saved in database
```

### Resume Campaign
```
1. User clicks campaign card
2. Navigate to: /campaigns/123/play
3. Backend: Finds paused session, sets status to ACTIVE
4. User continues from where they left off
```

---

## Comparison: Old vs New

| Aspect | Old (Query Param) | New (Centralized) |
|---------|-------------------|-------------------|
| **URL** | `/campaigns/123/play?sessionId=456` | `/campaigns/123/play` |
| **Session Management** | Frontend tracks session ID | Backend manages automatically |
| **Pause/Resume** | Manual URL manipulation | Automatic via campaign status |
| **Code Complexity** | High (session state) | Low (backend handles it) |
| **User Experience** | Confusing (what's session ID?) | Simple (just play/pause) |
| **Debugging** | Hard (which session is active?) | Easy (check campaign status) |

---

## Conclusion

This centralized session management approach is **much simpler** and **more user-friendly**:

1. **Clean URLs**: No query parameters
2. **Automatic Session Management**: Backend handles everything
3. **Built-in Pause/Resume**: Campaign status controls lifecycle
4. **Better UX**: Users just click play/pause buttons

**Recommendation**: Implement this architecture instead of the query parameter approach.

---

*Last Updated: January 3, 2026*

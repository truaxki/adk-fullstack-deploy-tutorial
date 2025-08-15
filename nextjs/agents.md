## Agents Desktop Testing Page

This document tracks the state, architecture, and next steps for the experimental "AI Desktop" layout used to prototype an AgentLocker-like interface inside the Next.js app.

### Purpose
Recreate a desktop-style UI (1440×1216, background #FCFCFC, flex row) with a left sidebar for sessions/navigation and a main content area for a GPTs directory-style experience. Keep components modular and progressively wire up real data flows.

## Current Implementation

- **Entry page**: `nextjs/src/app/chat/page.tsx`
  - Supports multiple layouts; default is currently `desktop` for development.
  - Debug layout toggles exist for quick comparison.

- **Layout shell**: `nextjs/src/components/chat/DesktopLayout.tsx`
  - Fixed dimensions: width 1440px (min 1140px, max 1440px), height 1216px.
  - `display: flex` row, `items-start`, `bg-[#FCFCFC]`.

- **Left sidebar**: `nextjs/src/components/chat/DesktopSidebar.tsx`
  - Branding, tabs (Research/Chat), navigation list, session history, placeholder Starred section, "New Chat" button.
  - Integrated with real session data via context + server action:
    - Context: `useChatContext()` from `nextjs/src/components/chat/ChatProvider.tsx`.
    - Server action: `fetchActiveSessionsAction(userId)` from `nextjs/src/lib/actions/session-list-actions.ts`.
  - Behavior:
    - Loads sessions for the current `userId` with loading/empty states.
    - Click item → `handleSessionSwitch(sessionId)`; highlights active session.
    - "New Chat" → `handleCreateNewSession(userId)` then refresh.

- **Chat context**: `nextjs/src/components/chat/ChatProvider.tsx`
  - Centralizes state: user/session management (`useSession.ts`), messages (`useMessages.ts`), streaming.
  - Loads message history when `(userId, sessionId)` change via `loadSessionHistoryAction`.

- **Sessions layer**:
  - Actions: `nextjs/src/lib/actions/session-list-actions.ts` (fetch active sessions, enrich with counts/timestamps).
  - ADK utilities: `nextjs/src/lib/session-history.ts` and `nextjs/src/lib/services/session-service.ts` route to backend.

## What’s Missing / Gaps

- Main content area (right side) is placeholder; needs a GPTs directory UI:
  - Header with title/description and search.
  - Category tabs (Top Picks, Writing, Productivity, etc.).
  - Featured (2×2) and Trending (2×2) card grids.
- No user controls visible in the `desktop` layout for setting `userId`.
  - Today, `ChatHeader` has `UserIdInput`, but it is not rendered in `desktop`.
  - Without a `userId`, sessions cannot load. We need a way to set it from the sidebar.
- Starred section is placeholder; no persistence.
- Responsive behavior: fixed 1440×1216 may overflow small screens; consider centering within a scroll container for dev.
- Tests and storybook examples are not added yet.

## How to Run Locally

- Install deps: `make install` (requires `make`; Windows users can run the commands inside the Makefile manually)
  - Backend: `uv run adk api_server app --allow_origins="*"`
  - Frontend: `cd nextjs && npm run dev`

Note: On Windows without `make`, start two terminals for backend and frontend as above.

## Data Flow Overview

1. User sets `userId` (currently via `ChatHeader` in other layouts, or via localStorage key `agent-engine-user-id`).
2. `DesktopSidebar` calls `fetchActiveSessionsAction(userId)` to list sessions.
3. Selecting a session calls `handleSessionSwitch(sessionId)` → context updates → `ChatProvider` loads history via `loadSessionHistoryAction`.
4. "New Chat" calls `handleCreateNewSession(userId)` → sidebar refresh shows the new session.

## Immediate Tasks (to make it functional)

1. Add user controls to `DesktopSidebar`:
   - Minimal `UserIdInput` at the top or a simple input + confirm button that proxies to `handleUserIdChange`/`handleUserIdConfirm`.
2. Auto-refresh session list after creating a session:
   - After `handleCreateNewSession`, re-call `fetchActiveSessionsAction` and auto-select the newly created session.
3. Build main content structure (right panel):
   - Component: `GptsDirectoryHeader` (title, description, search)
   - Component: `GptsCategoryTabs` (Top Picks, Writing, Productivity, etc.)
   - Component: `GptsCardGrid` (grid of cards for Featured/Trending)
   - Reusable `GptCard` with icon, title, subtitle, and badge.
4. Wire search/tabs state locally first; remote data can be added later.
5. Add error toasts for session list errors for better visibility.
6. Polish: keyboard navigation in sidebar, focus rings, aria labels.

## Acceptance Checklist

- Sidebar shows real sessions, highlights current, and can create/select sessions.
- A visible way to set `userId` exists within `desktop` layout.
- Main content renders header, category tabs, and at least one grid (Featured/Trending) with mock cards.
- No TypeScript or linter errors.
- Works with local backend via existing ADK services.

## File Map

- `nextjs/src/app/chat/page.tsx` (entry + layout toggles)
- `nextjs/src/components/chat/DesktopLayout.tsx` (layout shell)
- `nextjs/src/components/chat/DesktopSidebar.tsx` (real sessions, new chat)
- `nextjs/src/components/chat/ChatProvider.tsx` (context + history loading)
- `nextjs/src/lib/actions/session-list-actions.ts` (server action to list sessions)
- `nextjs/src/lib/actions/session-history-actions.ts` (load session messages)
- `nextjs/src/hooks/useSession.ts` (user/session state + actions)
- `nextjs/src/hooks/useMessages.ts` (message state)

## Notes / Tips

- If sessions don’t load, verify `userId` is present. For quick testing, set it in dev tools:
  - `localStorage.setItem("agent-engine-user-id", "test-user")` then refresh.
- The `desktop` layout is currently default for development; switch using the debug control at the top of the page.
- Keep components small and composable; prefer prop-driven state where possible.



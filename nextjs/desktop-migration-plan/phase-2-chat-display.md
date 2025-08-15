# Phase 2: Chat Display
**Risk Level: LOW**  
**Estimated Time: 45-60 minutes**

## Objective
Create a read-only chat display area in the desktop layout that shows messages from the selected session. NO message sending yet - just display.

## ⚠️ IMPORTANT RULES
1. **ONE CHANGE AT A TIME** - No exceptions
2. **READ-ONLY FIRST** - Display messages before adding input
3. **USE EXISTING COMPONENTS** - Don't recreate what already works
4. **TEST AFTER EACH STEP**

## Prerequisites
- [ ] Phase 1 completed successfully
- [ ] User ID selector works in sidebar
- [ ] Sessions load when user ID is set
- [ ] All changes committed

## Step-by-Step Implementation

### Step 2.1: Create Basic Chat Area Container
**Risk: MINIMAL** - New component, no functionality

1. Create new file: `src/components/chat/DesktopChatArea.tsx`
2. Add this basic structure:

```tsx
"use client";

import React from "react";
import { useChatContext } from "@/components/chat/ChatProvider";

export function DesktopChatArea(): React.JSX.Element {
  const { messages, userId, sessionId } = useChatContext();

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Chat
        </h2>
        <p className="text-sm text-gray-500">
          Session: {sessionId ? sessionId.substring(0, 8) : "No session selected"}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center text-gray-500">
          Messages will appear here
        </div>
      </div>

      {/* Input Area - Placeholder */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-center text-gray-400 text-sm">
          Input area (coming in Phase 5)
        </div>
      </div>
    </div>
  );
}
```

3. Save and test:
   - File created successfully
   - No syntax errors
   - Component exports properly

**Commit**: `git commit -m "Phase 2.1: Create basic DesktopChatArea container"`

### Step 2.2: Add Chat Area to Desktop Layout
**Risk: LOW** - Simple replacement

1. Open `src/app/chat/page.tsx`
2. Import the new component at the top:

```tsx
import { DesktopChatArea } from "@/components/chat/DesktopChatArea";
```

3. Find the desktop layout section (around line 130-145)
4. Replace the placeholder div with:

```tsx
{/* Desktop Layout - AI Desktop style */}
{layout === "desktop" && (
  <DesktopLayout>
    <DesktopSidebar 
      onTabChange={(tab) => console.log('Tab changed:', tab)}
      onChatSelect={(chatId) => console.log('Chat selected:', chatId)}
      onNewChat={() => console.log('New chat')}
    />
    <DesktopChatArea />  {/* Changed from placeholder div */}
  </DesktopLayout>
)}
```

5. Test:
   - Navigate to `/chat`
   - Chat area appears on the right
   - Shows "No session selected"
   - Select a session from sidebar
   - Session ID appears in chat header

**Commit**: `git commit -m "Phase 2.2: Replace placeholder with DesktopChatArea"`

### Step 2.3: Display Message Count
**Risk: MINIMAL** - Read-only data display

1. In `DesktopChatArea.tsx`, update the messages area:

```tsx
{/* Messages Area */}
<div className="flex-1 overflow-y-auto p-6">
  {!sessionId ? (
    <div className="text-center text-gray-500">
      Select a session to view messages
    </div>
  ) : messages.length === 0 ? (
    <div className="text-center text-gray-500">
      No messages yet in this session
    </div>
  ) : (
    <div className="text-center text-gray-500">
      {messages.length} message(s) in this session
    </div>
  )}
</div>
```

2. Test:
   - Shows "Select a session" when none selected
   - Shows "No messages yet" for empty sessions
   - Shows message count for sessions with messages

**Commit**: `git commit -m "Phase 2.3: Add message count display"`

### Step 2.4: Import Existing Message Components
**Risk: MINIMAL** - Just imports

1. In `DesktopChatArea.tsx`, add imports:

```tsx
import { MessageList } from "@/components/chat/MessageList";
import { SessionHistory } from "@/components/chat/SessionHistory";
```

2. Save and verify:
   - No import errors
   - Components are found
   - App still runs

**Commit**: `git commit -m "Phase 2.4: Import message display components"`

### Step 2.5: Add Loading State Display
**Risk: LOW** - Using existing component

1. In `DesktopChatArea.tsx`, get loading state from context:

```tsx
const { 
  messages, 
  userId, 
  sessionId,
  isLoadingHistory  // Add this
} = useChatContext();
```

2. Add loading display before messages:

```tsx
{/* Messages Area */}
<div className="flex-1 overflow-y-auto p-6">
  {/* Loading State */}
  <SessionHistory
    isLoadingHistory={isLoadingHistory}
    hasMessages={messages.length > 0}
    sessionId={sessionId}
    userId={userId}
    error={null}
  />

  {/* Message Display */}
  {!isLoadingHistory && (
    <>
      {!sessionId ? (
        <div className="text-center text-gray-500">
          Select a session to view messages
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center text-gray-500">
          No messages yet in this session
        </div>
      ) : (
        <div className="text-center text-gray-500">
          {messages.length} message(s) ready to display
        </div>
      )}
    </>
  )}
</div>
```

3. Test:
   - Select a session
   - "Loading conversation history..." appears briefly
   - Then shows message count or empty state

**Commit**: `git commit -m "Phase 2.5: Add session loading state"`

### Step 2.6: Display Actual Messages
**Risk: MEDIUM** - Using existing component in new context

1. In `DesktopChatArea.tsx`, replace the message count with MessageList:

```tsx
{/* Messages Area */}
<div className="flex-1 overflow-y-auto p-6">
  {/* Loading State */}
  <SessionHistory
    isLoadingHistory={isLoadingHistory}
    hasMessages={messages.length > 0}
    sessionId={sessionId}
    userId={userId}
    error={null}
  />

  {/* Message Display */}
  {!isLoadingHistory && (
    <>
      {!sessionId ? (
        <div className="text-center text-gray-500">
          Select a session to view messages
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center text-gray-500">
          No messages yet in this session
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <MessageList />
        </div>
      )}
    </>
  )}
</div>
```

2. Test:
   - Select a session with messages
   - Messages appear properly formatted
   - Human and AI messages are distinguishable
   - Markdown rendering works
   - Scrolling works

**Commit**: `git commit -m "Phase 2.6: Display messages with MessageList component"`

### Step 2.7: Add Proper Styling
**Risk: LOW** - CSS only

1. Update the container styling in `DesktopChatArea.tsx`:

```tsx
export function DesktopChatArea(): React.JSX.Element {
  const { 
    messages, 
    userId, 
    sessionId,
    isLoadingHistory
  } = useChatContext();

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Chat Session
            </h2>
            <p className="text-sm text-gray-500">
              {sessionId ? `ID: ${sessionId.substring(0, 8)}...` : "No session selected"}
            </p>
          </div>
          {sessionId && (
            <div className="text-sm text-gray-500">
              {messages.length} messages
            </div>
          )}
        </div>
      </div>

      {/* Messages Area with better styling */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6">
          {/* Loading State */}
          <SessionHistory
            isLoadingHistory={isLoadingHistory}
            hasMessages={messages.length > 0}
            sessionId={sessionId}
            userId={userId}
            error={null}
          />

          {/* Message Display */}
          {!isLoadingHistory && (
            <>
              {!sessionId ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Select a session to view messages</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500">No messages yet in this session</p>
                    <p className="text-sm text-gray-400 mt-2">Send a message to get started</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <MessageList />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input Area - Placeholder */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-100 rounded-lg p-3 text-center text-gray-500 text-sm">
            Message input will be added in Phase 5
          </div>
        </div>
      </div>
    </div>
  );
}
```

2. Test:
   - Better visual hierarchy
   - Proper spacing and alignment
   - Professional appearance
   - Responsive to content

**Commit**: `git commit -m "Phase 2.7: Improve chat area styling"`

## Success Criteria Checklist
- [ ] Chat area appears in desktop layout
- [ ] Shows session ID when selected
- [ ] Displays "Select a session" when none selected
- [ ] Shows loading state when switching sessions
- [ ] Displays messages properly formatted
- [ ] Human and AI messages are distinct
- [ ] Markdown renders correctly
- [ ] Scrolling works for long conversations
- [ ] No console errors
- [ ] Original functionality unchanged

## Troubleshooting

### Messages don't appear
1. Check if `isLoadingHistory` is stuck on true
2. Verify session has messages in the database
3. Check console for errors
4. Verify MessageList component imports correctly

### Styling looks wrong
1. Check for conflicting CSS classes
2. Verify Tailwind classes are valid
3. Check parent container constraints
4. Use browser DevTools to inspect

### Session doesn't load
1. Verify session ID is being passed
2. Check ChatProvider is loading history
3. Monitor Network tab for API calls
4. Check console for errors

## Next Phase
Only proceed to Phase 3 after ALL success criteria are met and changes are committed.

## Rollback Procedure
```bash
# Revert last change
git reset --hard HEAD~1

# Or revert entire phase
git reset --hard [last-commit-of-phase-1]
```

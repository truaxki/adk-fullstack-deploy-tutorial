# Phase 5: Chat Features
**Risk Level: MEDIUM**  
**Estimated Time: 45-60 minutes**

## Objective
Add message sending capability and streaming responses to complete the chat functionality in the desktop layout.

## ⚠️ IMPORTANT RULES
1. **ONE CHANGE AT A TIME** - Critical for streaming features
2. **USE EXISTING COMPONENTS** - ChatInput already works
3. **TEST STREAMING CAREFULLY** - Watch for memory leaks
4. **PRESERVE EXISTING FUNCTIONALITY** - Don't break what works

## Prerequisites
- [ ] Phase 4 completed successfully
- [ ] Sessions can be created and selected
- [ ] Messages display properly
- [ ] All changes committed

## Step-by-Step Implementation

### Step 5.1: Import ChatInput Component
**Risk: LOW** - Just importing

1. In `DesktopChatArea.tsx`, add import:

```tsx
import { ChatInput } from "@/components/chat/ChatInput";
```

2. Test:
   - No import errors
   - Component found
   - App still runs

**Commit**: `git commit -m "Phase 5.1: Import ChatInput component"`

### Step 5.2: Replace Placeholder with ChatInput
**Risk: MEDIUM** - Integrating existing component

1. In `DesktopChatArea.tsx`, replace the placeholder input area:

```tsx
{/* Input Area - Real Implementation */}
<div className="bg-white border-t border-gray-200">
  <ChatInput />
</div>
```

2. Remove the placeholder div completely
3. Test:
   - Input area appears
   - Can type in the input
   - Send button visible
   - Enter key responds

**Commit**: `git commit -m "Phase 5.2: Replace placeholder with ChatInput"`

### Step 5.3: Test Basic Message Sending
**Risk: MEDIUM** - Testing core functionality

1. Test sending a message:
   - Set user ID
   - Select/create a session
   - Type a message
   - Click send or press Enter

2. Verify:
   - [ ] Message appears in chat
   - [ ] Input clears after sending
   - [ ] Message has correct type (human)
   - [ ] Timestamp is correct
   - [ ] No console errors

3. If not working, check:
   - Is session ID set?
   - Is user ID set?
   - Check Network tab for API calls
   - Check console for errors

**No commit - testing only**

### Step 5.4: Add Activity Timeline Support
**Risk: LOW** - Importing components

1. Import timeline components:

```tsx
import { ActivityTimeline } from "@/components/ActivityTimeline";
```

2. Get messageEvents from context:

```tsx
const { 
  messages, 
  userId, 
  sessionId,
  isLoadingHistory,
  messageEvents,  // Already added in Phase 3
  isLoading      // Add this for streaming state
} = useChatContext();
```

3. Test:
   - No import errors
   - Context provides the data

**Commit**: `git commit -m "Phase 5.4: Import activity timeline components"`

### Step 5.5: Display AI Response with Timeline
**Risk: MEDIUM** - Modifying message display

1. We need to check if MessageList already handles this
2. Send a test message and see if AI responds
3. If AI response appears but no timeline:
   - Check if MessageList component includes ActivityTimeline
   - May need to verify messageEvents are populated

4. If MessageList doesn't show timeline, we may need to check MessageItem component

**Test first, only modify if needed**

### Step 5.6: Add Streaming Indicator
**Risk: LOW** - UI enhancement

1. Show loading state during streaming:

```tsx
{/* Messages Area */}
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
          // No session state
          <div className="flex items-center justify-center h-full">
            {/* ... existing empty state ... */}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              // Empty session state
              <div className="flex items-center justify-center h-full">
                {/* ... existing empty state ... */}
              </div>
            ) : (
              <>
                <MessageList />
                {/* Streaming indicator */}
                {isLoading && (
                  <div className="mt-4 flex items-center gap-2 text-gray-500">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                    <span className="text-sm ml-2">AI is thinking...</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </>
    )}
  </div>
</div>
```

2. Test:
   - Send a message
   - "AI is thinking..." appears
   - Disappears when response completes

**Commit**: `git commit -m "Phase 5.6: Add streaming indicator"`

### Step 5.7: Add Auto-Scroll on New Messages
**Risk: LOW** - UI enhancement

1. Add scroll behavior:

```tsx
import React, { useEffect, useRef } from "react";

// Inside component:
const scrollEndRef = useRef<HTMLDivElement>(null);

// Auto-scroll effect
useEffect(() => {
  scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

// Add at the end of messages area:
{/* After MessageList */}
<div ref={scrollEndRef} />
```

2. Full implementation:

```tsx
{/* In the message display area, after MessageList */}
<>
  <MessageList />
  {isLoading && (
    <div className="mt-4 flex items-center gap-2 text-gray-500">
      {/* ... streaming indicator ... */}
    </div>
  )}
  <div ref={scrollEndRef} />
</>
```

3. Test:
   - Send multiple messages
   - Chat scrolls to bottom automatically
   - Smooth scrolling animation

**Commit**: `git commit -m "Phase 5.7: Add auto-scroll for new messages"`

### Step 5.8: Handle Send Errors
**Risk: LOW** - Error handling

1. Check if ChatInput already handles errors
2. Send a message with backend disconnected
3. Verify error is shown to user
4. If not, may need to add error toast

**Test first, only add if needed**

### Step 5.9: Test Full Chat Flow
**Risk: NONE** - Testing only

Complete end-to-end test:

1. **Setup**:
   - Set user ID "test-user"
   - Create new chat

2. **Single Message**:
   - Send "Hello"
   - Verify human message appears
   - Verify AI responds
   - Check timeline shows events

3. **Conversation**:
   - Send follow-up question
   - Verify conversation flows naturally
   - Check all messages display correctly

4. **Session Switch**:
   - Create another session
   - Send messages
   - Switch between sessions
   - Verify history maintains

5. **Edge Cases**:
   - Send empty message (should not send)
   - Send very long message
   - Send while AI is responding
   - Rapid message sending

Document any issues found.

### Step 5.10: Add Final Polish
**Risk: LOW** - UI improvements

1. Improve input area styling if needed:

```tsx
{/* Input Area with better styling */}
<div className="bg-white border-t border-gray-200 shadow-lg">
  <div className="max-w-4xl mx-auto">
    <ChatInput />
  </div>
</div>
```

2. Add keyboard shortcuts hint:

```tsx
{messages.length === 0 && (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="text-gray-400 mb-2">
        {/* ... icon ... */}
      </div>
      <p className="text-gray-500">Start a new conversation</p>
      <p className="text-sm text-gray-400 mt-2">
        Type a message below or press Enter to send
      </p>
    </div>
  </div>
)}
```

**Commit**: `git commit -m "Phase 5.10: Polish chat interface"`

## Success Criteria Checklist
- [ ] Can type messages in input
- [ ] Messages send on Enter or button click
- [ ] Human messages appear immediately
- [ ] AI responds with streaming
- [ ] Activity timeline shows for AI
- [ ] Chat auto-scrolls on new messages
- [ ] Loading indicator during streaming
- [ ] Input clears after sending
- [ ] Error handling works
- [ ] Full conversation flow works
- [ ] Session switching preserves history
- [ ] No console errors
- [ ] No memory leaks

## Troubleshooting

### Messages don't send
1. Check if session ID is set
2. Verify user ID is set
3. Check Network tab for API calls
4. Look for console errors
5. Verify WebSocket connection

### AI doesn't respond
1. Check backend is running
2. Verify WebSocket connects
3. Check StreamingManager initialization
4. Look for errors in Network tab

### Timeline doesn't show
1. Verify messageEvents are populated
2. Check if MessageItem includes ActivityTimeline
3. Verify events are being tracked
4. Check console for component errors

### Auto-scroll not working
1. Verify ref is attached
2. Check if scrollIntoView is called
3. Test with manual scroll trigger
4. Check parent container overflow

### Memory leaks
1. Check React DevTools Profiler
2. Monitor memory in Chrome DevTools
3. Verify WebSocket cleanup
4. Check for infinite loops

## Next Phase
Only proceed to Phase 6 after ALL success criteria are met and changes are committed.

## Rollback Procedure
```bash
# Revert last change
git reset --hard HEAD~1

# Or revert entire phase
git reset --hard [last-commit-of-phase-4]
```

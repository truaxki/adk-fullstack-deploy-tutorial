# Phase 3: Session History Loading
**Risk Level: MEDIUM**  
**Estimated Time: 30-45 minutes**

## Objective
Ensure that selecting a session from the sidebar properly loads and displays its chat history. Fix any issues with session switching and history persistence.

## ⚠️ IMPORTANT RULES
1. **ONE CHANGE AT A TIME** - Critical for debugging
2. **TEST EXISTING FUNCTIONALITY FIRST** - Understand current behavior
3. **DON'T MODIFY CORE HOOKS** - Work with existing state management
4. **VERIFY EACH FIX** - Ensure no regressions

## Prerequisites
- [ ] Phase 2 completed successfully
- [ ] Chat area displays messages when available
- [ ] Session selector in sidebar works
- [ ] All changes committed

## Current State Analysis
Before making changes, test and document current behavior:

### Test 3.0: Document Current Behavior
1. Set a user ID
2. Select a session from sidebar
3. Document what happens:
   - [ ] Does session ID update in chat header?
   - [ ] Does loading state appear?
   - [ ] Do messages load?
   - [ ] Any console errors?
4. Switch to another session
5. Document:
   - [ ] Do previous messages clear?
   - [ ] Does new session load?
   - [ ] Any delays or issues?

**No commit needed - just documentation**

## Step-by-Step Implementation

### Step 3.1: Verify Session Selection Handler
**Risk: LOW** - Inspection only

1. Open `DesktopSidebar.tsx`
2. Find the `handleChatSelect` function
3. Verify it calls `handleSessionSwitch(chatId)`
4. Add console log for debugging:

```tsx
const handleChatSelect = (chatId: string) => {
  console.log('[DesktopSidebar] Selecting session:', chatId);
  handleSessionSwitch(chatId);
  onChatSelect?.(chatId);
};
```

5. Test:
   - Select a session
   - Check console for log message
   - Verify session ID is correct

**Commit**: `git commit -m "Phase 3.1: Add session selection logging"`

### Step 3.2: Verify Context Updates
**Risk: LOW** - Logging only

1. In `DesktopChatArea.tsx`, add debugging:

```tsx
// Add useEffect to monitor changes
import React, { useEffect } from "react";

// Inside component, after context destructuring:
useEffect(() => {
  console.log('[DesktopChatArea] Session changed:', sessionId);
  console.log('[DesktopChatArea] Messages count:', messages.length);
  console.log('[DesktopChatArea] Loading history:', isLoadingHistory);
}, [sessionId, messages.length, isLoadingHistory]);
```

2. Test:
   - Select different sessions
   - Watch console logs
   - Verify state updates properly

**Commit**: `git commit -m "Phase 3.2: Add chat area state monitoring"`

### Step 3.3: Fix Session History Loading Display
**Risk: LOW** - UI fix only

1. The `SessionHistory` component might not be showing. Check if we need to adjust the condition:

```tsx
{/* Messages Area */}
<div className="flex-1 overflow-y-auto">
  <div className="min-h-full p-6">
    {/* Always render SessionHistory, let it handle its own visibility */}
    <SessionHistory
      isLoadingHistory={isLoadingHistory}
      hasMessages={messages.length > 0}
      sessionId={sessionId}
      userId={userId}
      error={null}
    />

    {/* Only show content when not loading */}
    {!isLoadingHistory && (
      // ... rest of the content
    )}
  </div>
</div>
```

2. Test:
   - Select a session
   - Verify loading indicator appears
   - Verify it disappears when loaded

**Commit**: `git commit -m "Phase 3.3: Fix session history loading display"`

### Step 3.4: Ensure Messages Clear on Session Switch
**Risk: MEDIUM** - Checking state management

1. In `ChatProvider.tsx`, find the useEffect that loads session history
2. Verify it clears messages before loading:

```tsx
// This should already exist around line 160-180
// Just verify it's there, don't modify
setMessages([]);
setMessageEvents(new Map());
updateWebsiteCount(0);
```

3. If messages aren't clearing:
   - Check if the useEffect dependencies are correct
   - Verify the effect runs on sessionId change
   - Add logging to confirm execution

4. Test:
   - Switch between sessions with different messages
   - Verify old messages clear before new ones load

**Commit**: `git commit -m "Phase 3.4: Verify message clearing on session switch"`

### Step 3.5: Handle Empty Sessions
**Risk: LOW** - UI improvement

1. In `DesktopChatArea.tsx`, improve empty state handling:

```tsx
{!isLoadingHistory && (
  <>
    {!sessionId ? (
      // No session selected state
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-gray-500">Select a session from the sidebar</p>
          <p className="text-sm text-gray-400 mt-2">Or create a new chat to get started</p>
        </div>
      </div>
    ) : messages.length === 0 ? (
      // Empty session state
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <p className="text-gray-500">Start a new conversation</p>
          <p className="text-sm text-gray-400 mt-2">Type a message below to begin</p>
        </div>
      </div>
    ) : (
      // Messages exist
      <div className="max-w-4xl mx-auto">
        <MessageList />
      </div>
    )}
  </>
)}
```

2. Test all states:
   - No session selected
   - Empty session
   - Session with messages

**Commit**: `git commit -m "Phase 3.5: Improve empty state handling"`

### Step 3.6: Add Session Metadata Display
**Risk: LOW** - Additional info only

1. Get more context data:

```tsx
const { 
  messages, 
  userId, 
  sessionId,
  isLoadingHistory,
  messageEvents  // Add this
} = useChatContext();
```

2. Enhance the header with metadata:

```tsx
{/* Header */}
<div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        Chat Session
      </h2>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        {sessionId && (
          <>
            <span>Session: {sessionId.substring(0, 8)}...</span>
            <span>•</span>
            <span>User: {userId || 'Not set'}</span>
          </>
        )}
      </div>
    </div>
    {sessionId && (
      <div className="text-right">
        <div className="text-sm font-medium text-gray-700">
          {messages.length} messages
        </div>
        {messageEvents.size > 0 && (
          <div className="text-xs text-gray-500">
            {messageEvents.size} events tracked
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

3. Test:
   - Session info displays correctly
   - Message count is accurate
   - Event count shows when applicable

**Commit**: `git commit -m "Phase 3.6: Add session metadata to header"`

### Step 3.7: Test Multiple Session Switches
**Risk: NONE** - Testing only

1. Create test scenario:
   - Set user ID
   - Create/select session A
   - Add messages (will do in Phase 5)
   - Create/select session B
   - Switch back to session A
   - Switch to session B again

2. Verify for each switch:
   - [ ] Loading state appears
   - [ ] Previous messages clear
   - [ ] New messages load
   - [ ] No duplicate messages
   - [ ] No console errors
   - [ ] UI updates smoothly

3. Remove debug console.logs added earlier:
   - Remove from `DesktopSidebar.tsx`
   - Remove from `DesktopChatArea.tsx`

**Commit**: `git commit -m "Phase 3.7: Remove debug logging after testing"`

## Success Criteria Checklist
- [ ] Selecting session loads its history
- [ ] Loading indicator appears during load
- [ ] Messages clear when switching sessions
- [ ] Empty sessions show appropriate message
- [ ] Session metadata displays in header
- [ ] Multiple session switches work smoothly
- [ ] No duplicate messages appear
- [ ] No console errors
- [ ] No memory leaks (check DevTools)

## Troubleshooting

### Messages don't load
1. Check Network tab for API calls
2. Verify `loadSessionHistoryAction` is called
3. Check backend is returning data
4. Look for errors in console

### Loading state stuck
1. Check if `isLoadingHistory` ever becomes false
2. Verify try/finally block in ChatProvider
3. Check for errors breaking the flow

### Duplicate messages appear
1. Check if messages are being appended instead of replaced
2. Verify `setMessages([])` is called before loading
3. Check for multiple effect triggers

### Session doesn't update
1. Verify `handleSessionSwitch` is called
2. Check if sessionId updates in context
3. Verify useEffect dependencies

## Next Phase
Only proceed to Phase 4 after ALL success criteria are met and changes are committed.

## Rollback Procedure
```bash
# Revert last change
git reset --hard HEAD~1

# Or revert entire phase
git reset --hard [last-commit-of-phase-2]
```

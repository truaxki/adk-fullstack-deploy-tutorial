# Phase 1: User Configuration
**Risk Level: LOW**  
**Estimated Time: 30-45 minutes**

## Objective
Add user ID management to the Desktop Sidebar without modifying any existing state management or breaking current functionality.

## ⚠️ IMPORTANT RULES
1. **ONE CHANGE AT A TIME** - Each step must be completed and tested individually
2. **DO NOT MODIFY** existing hooks or providers
3. **READ-ONLY FIRST** - Display user ID before adding edit functionality
4. **TEST AFTER EACH STEP** - Verify nothing breaks

## Prerequisites
- [ ] Desktop layout loads at `/chat` route
- [ ] Sidebar displays session list (even if empty)
- [ ] Original chat at `/` still works
- [ ] Git branch created and initial commit made

## Step-by-Step Implementation

### Step 1.1: Display Current User ID (READ-ONLY)
**Risk: MINIMAL** - Only reading existing state

1. Open `DesktopSidebar.tsx`
2. Locate the line where `userId` is extracted from `useChatContext()`
3. Add a read-only display of the current user ID:

```tsx
// After the Branding Section, before Tabs Section
{/* User ID Display - Step 1.1 */}
<div className="px-4 py-2 border-b border-gray-200">
  <div className="text-xs text-gray-500">
    Current User: {userId || "Not set"}
  </div>
</div>
```

4. Save the file
5. Test:
   - Navigate to `/chat`
   - Verify "Current User: Not set" appears
   - Check console for any errors
   - Verify sidebar still renders correctly

**Commit**: `git commit -m "Phase 1.1: Add read-only user ID display to sidebar"`

### Step 1.2: Create Compact User ID Input Component
**Risk: LOW** - New component, no integration yet

1. Create new file: `src/components/chat/DesktopUserSelector.tsx`
2. Copy this EXACT code (do not modify):

```tsx
"use client";

import React, { useState } from "react";
import { User, Edit2, Check, X } from "lucide-react";

interface DesktopUserSelectorProps {
  currentUserId: string;
  onUserIdChange: (userId: string) => void;
  onUserIdConfirm: (userId: string) => void;
  className?: string;
}

export function DesktopUserSelector({
  currentUserId,
  onUserIdChange,
  onUserIdConfirm,
  className = "",
}: DesktopUserSelectorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUserId, setTempUserId] = useState(currentUserId);

  const handleEdit = () => {
    setTempUserId(currentUserId);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempUserId(currentUserId);
    setIsEditing(false);
  };

  const handleConfirm = () => {
    if (tempUserId.trim()) {
      onUserIdChange(tempUserId);
      onUserIdConfirm(tempUserId);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className={`px-4 py-3 border-b border-gray-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500">User ID</div>
              <div className="text-sm font-medium text-gray-900">
                {currentUserId || "Not set"}
              </div>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Edit User ID"
          >
            <Edit2 className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-3 border-b border-gray-200 ${className}`}>
      <div className="space-y-2">
        <div className="text-xs text-gray-500">Set User ID</div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tempUserId}
            onChange={(e) => setTempUserId(e.target.value)}
            placeholder="Enter user ID"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={handleConfirm}
            disabled={!tempUserId.trim()}
            className="p-1 rounded hover:bg-green-100 disabled:opacity-50"
            title="Confirm"
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-red-100"
            title="Cancel"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

3. Save the file
4. Test:
   - Verify the file is created
   - Run `npm run dev` to check for syntax errors
   - Component is created but not used yet - this is expected

**Commit**: `git commit -m "Phase 1.2: Create DesktopUserSelector component"`

### Step 1.3: Import Component (No Integration)
**Risk: MINIMAL** - Just adding import

1. Open `DesktopSidebar.tsx`
2. Add import at the top:

```tsx
import { DesktopUserSelector } from "@/components/chat/DesktopUserSelector";
```

3. Save and test:
   - Verify no import errors
   - Desktop layout still loads
   - No console errors

**Commit**: `git commit -m "Phase 1.3: Import DesktopUserSelector in sidebar"`

### Step 1.4: Replace Read-Only Display with Component
**Risk: LOW** - Connecting to existing handlers

1. In `DesktopSidebar.tsx`, find the read-only display added in Step 1.1
2. Replace it with:

```tsx
{/* User ID Management - Step 1.4 */}
<DesktopUserSelector
  currentUserId={userId}
  onUserIdChange={handleUserIdChange}
  onUserIdConfirm={handleUserIdConfirm}
/>
```

3. Remove the temporary read-only display from Step 1.1
4. Add the missing handlers from context:

```tsx
// Add these to the context destructuring
const {
  userId,
  sessionId,
  handleSessionSwitch,
  handleCreateNewSession,
  handleUserIdChange,    // Add this
  handleUserIdConfirm,    // Add this
} = useChatContext();
```

5. Save and test:
   - User selector appears in sidebar
   - Click edit button - input appears
   - Enter a user ID and confirm
   - Verify sessions load for that user
   - Cancel button works

**Commit**: `git commit -m "Phase 1.4: Integrate DesktopUserSelector with context"`

### Step 1.5: Test Session Loading After User Change
**Risk: NONE** - Testing only

1. Set a user ID in the selector
2. Verify:
   - [ ] Sessions load in the sidebar
   - [ ] "Loading sessions..." appears briefly
   - [ ] Session count is correct
   - [ ] No console errors
3. Change to a different user ID
4. Verify:
   - [ ] Previous sessions clear
   - [ ] New sessions load
   - [ ] UI updates correctly

**Commit**: `git commit -m "Phase 1.5: Verify user ID change triggers session refresh"`

### Step 1.6: Add Local Storage Persistence
**Risk: LOW** - Enhancement only

1. In `DesktopUserSelector.tsx`, add after imports:

```tsx
// Load initial user ID from localStorage
const getInitialUserId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('desktop-user-id') || '';
  }
  return '';
};
```

2. Update the component to save on confirm:

```tsx
const handleConfirm = () => {
  if (tempUserId.trim()) {
    // Save to localStorage
    localStorage.setItem('desktop-user-id', tempUserId);
    
    onUserIdChange(tempUserId);
    onUserIdConfirm(tempUserId);
    setIsEditing(false);
  }
};
```

3. Test:
   - Set a user ID
   - Refresh the page
   - Verify user ID persists
   - Verify sessions auto-load

**Commit**: `git commit -m "Phase 1.6: Add localStorage persistence for user ID"`

## Success Criteria Checklist
- [ ] User ID selector appears in sidebar
- [ ] Can view current user ID
- [ ] Can edit user ID
- [ ] Edit/Cancel buttons work correctly  
- [ ] Setting user ID loads sessions
- [ ] Changing user ID refreshes session list
- [ ] User ID persists on page refresh
- [ ] No console errors
- [ ] Original chat at `/` still works
- [ ] No TypeScript errors

## Troubleshooting

### Sessions don't load after setting user ID
1. Check console for errors
2. Verify backend is running
3. Check Network tab for API calls
4. Try a known working user ID like "test-user"

### Component doesn't appear
1. Verify import path is correct
2. Check for typos in component name
3. Ensure component is exported

### Edit mode doesn't work
1. Check onClick handlers are attached
2. Verify state updates in React DevTools
3. Check for event propagation issues

## Next Phase
Only proceed to Phase 2 after ALL success criteria are met and changes are committed.

## Rollback Procedure
If any step fails:
```bash
# Revert last change
git reset --hard HEAD~1

# Or revert to start of phase
git reset --hard [commit-hash-before-phase-1]
```

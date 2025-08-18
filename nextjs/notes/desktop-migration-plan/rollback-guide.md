# Emergency Rollback Guide

## When to Use This Guide
Use this guide if:
- Critical functionality is broken
- Multiple cascading errors occur
- Performance severely degraded
- Data corruption suspected
- Cannot identify root cause

## ⚠️ IMPORTANT: Before Rolling Back
1. **Document the issue** in debugging-log.md
2. **Save any error logs** for analysis
3. **Note the last working commit**
4. **Inform team members** if applicable

---

## Quick Rollback Commands

### Rollback Last Change
```bash
# Undo the last commit but keep changes in working directory
git reset --soft HEAD~1

# Undo the last commit and discard changes
git reset --hard HEAD~1
```

### Rollback to Specific Phase
```bash
# View commit history to find phase markers
git log --oneline | grep "Phase"

# Rollback to end of specific phase
git reset --hard [commit-hash]
```

### Emergency Full Rollback
```bash
# Return to migration starting point
git reset --hard origin/main

# Or if you tagged the start
git reset --hard migration-start
```

---

## Phase-by-Phase Rollback

### Rollback Phase 6 (Polish)
**Impact**: Minimal - Only cosmetic changes lost
```bash
# Find last commit of Phase 5
git log --oneline | grep "Phase 5" | head -1

# Reset to that commit
git reset --hard [commit-hash]
```

### Rollback Phase 5 (Chat Features)
**Impact**: Moderate - Lose message sending capability
```bash
# Find last commit of Phase 4
git log --oneline | grep "Phase 4" | head -1

# Reset to that commit
git reset --hard [commit-hash]

# Restore placeholder input
# In DesktopChatArea.tsx, replace ChatInput with:
<div className="bg-gray-100 rounded-lg p-3 text-center text-gray-500 text-sm">
  Message input will be added in Phase 5
</div>
```

### Rollback Phase 4 (Session Creation)
**Impact**: Moderate - Lose session creation
```bash
# Find last commit of Phase 3
git log --oneline | grep "Phase 3" | head -1

# Reset to that commit
git reset --hard [commit-hash]

# Disable New Chat button
# In DesktopSidebar.tsx, add to button:
disabled={true}
title="Coming soon"
```

### Rollback Phase 3 (Session History)
**Impact**: Major - Lose history loading
```bash
# Find last commit of Phase 2
git log --oneline | grep "Phase 2" | head -1

# Reset to that commit
git reset --hard [commit-hash]
```

### Rollback Phase 2 (Chat Display)
**Impact**: Major - Lose chat display area
```bash
# Find last commit of Phase 1
git log --oneline | grep "Phase 1" | head -1

# Reset to that commit
git reset --hard [commit-hash]

# Restore placeholder in chat/page.tsx:
<div className="flex-1 flex flex-col">
  <div className="text-center py-8">
    <h1 className="text-2xl font-bold text-gray-800">Main Content Area</h1>
    <p className="text-gray-600 mt-2">GPTs Directory will go here</p>
  </div>
</div>
```

### Rollback Phase 1 (User Config)
**Impact**: Critical - Lose all migration progress
```bash
# Return to start of migration
git log --oneline | grep "Migration starting point"

# Reset to that commit
git reset --hard [commit-hash]

# Or just start fresh
git checkout main
git branch -D desktop-migration
```

---

## File-Level Rollback

### Restore Single File
```bash
# Restore file from previous commit
git checkout HEAD~1 -- path/to/file.tsx

# Restore file from specific commit
git checkout [commit-hash] -- path/to/file.tsx

# Restore file from main branch
git checkout main -- path/to/file.tsx
```

### Restore Multiple Files
```bash
# Restore entire directory
git checkout HEAD~1 -- src/components/chat/

# Restore specific pattern
git checkout HEAD~1 -- src/components/chat/Desktop*.tsx
```

---

## Manual Restoration

### From Backup Files
If you created backups as suggested:
```bash
# Restore from backup
cp -r src/components/chat-backup/* src/components/chat/
cp -r src/app/chat-backup/* src/app/chat/
```

### From Working Route
The original chat at `/` should still work:
```bash
# Copy working implementation
cp src/app/page.tsx src/app/chat/page-working.tsx
# Then manually extract needed parts
```

---

## State Cleanup

### Clear localStorage
```javascript
// Run in browser console
localStorage.removeItem('desktop-user-id');
localStorage.removeItem('desktop-active-tab');
localStorage.removeItem('agent-engine-user-id');
localStorage.clear(); // Nuclear option
```

### Reset Session State
```javascript
// Run in browser console
sessionStorage.clear();
```

### Clear React State
```bash
# Full page refresh
window.location.reload(true);
```

---

## Verification After Rollback

### Quick Checks
1. [ ] Original `/` route still works
2. [ ] Can access `/chat` without errors
3. [ ] No console errors on page load
4. [ ] Backend connection established

### Functional Checks
1. [ ] Can set user ID (if Phase 1 kept)
2. [ ] Can see sessions (if Phase 1 kept)
3. [ ] Can view messages (if Phase 2 kept)
4. [ ] Can switch sessions (if Phase 3 kept)
5. [ ] Can create sessions (if Phase 4 kept)
6. [ ] Can send messages (if Phase 5 kept)

---

## Recovery Strategies

### Partial Rollback
Keep working phases, only rollback broken ones:
```bash
# Cherry-pick working commits
git cherry-pick [commit-hash]
```

### Selective Fix
Instead of full rollback, fix specific issues:
```bash
# Create fix branch
git checkout -b hotfix-[issue]

# Fix the specific problem
# Test thoroughly
# Merge back
```

### Progressive Recovery
Start fresh but reuse working code:
```bash
# Create new branch
git checkout -b desktop-migration-v2

# Copy working components manually
# Test each addition
```

---

## Prevention for Next Time

1. **Smaller Commits**: One change per commit
2. **Feature Flags**: Toggle features on/off
3. **Better Testing**: Test after each change
4. **Backup Strategy**: Regular backups
5. **Documentation**: Document all changes
6. **Code Review**: Have someone review
7. **Staging Environment**: Test there first

---

## Getting Help

If rollback doesn't solve the problem:

1. **Check Logs**
   - Browser console
   - Network tab
   - Backend logs
   - Build output

2. **Compare with Working Version**
   - Diff the files
   - Check for missing imports
   - Verify prop types
   - Check state management

3. **Isolate the Problem**
   - Comment out sections
   - Add console.logs
   - Use React DevTools
   - Check git blame

4. **Ask for Help**
   - Provide error messages
   - Share relevant code
   - Describe what changed
   - Include reproduction steps

---

## Nuclear Option

If all else fails:
```bash
# Save your work elsewhere
cp -r . ../backup-migration

# Start completely fresh
git checkout main
git pull origin main
git checkout -b desktop-migration-attempt-2

# Apply lessons learned
# Start with Phase 1 again
```

Remember: Every failure is a learning opportunity. Document what went wrong to prevent future issues.

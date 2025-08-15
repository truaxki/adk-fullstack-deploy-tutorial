# Desktop Layout Migration Plan

## 🎯 Project Goal
Port the working chat UI functionality from the original layout to the new desktop layout with sidebar, ensuring full session management and chat capabilities.

## ⚠️ CRITICAL INSTRUCTIONS

### Development Rules
1. **MAKE ONLY ONE CHANGE AT A TIME** - This is non-negotiable
2. **ALWAYS START WITH THE LOWEST RISK CHANGES** - Begin with read-only operations before modifying state
3. **TEST EACH CHANGE BEFORE PROCEEDING** - Verify functionality after every single modification
4. **DO NOT COMBINE STEPS** - Even if changes seem related, implement them separately
5. **COMMIT AFTER EACH SUCCESSFUL CHANGE** - Create a clear history for debugging

### Debugging Protocol
- If something breaks, revert immediately to the last working state
- Debug one issue at a time
- Document any errors encountered in `debugging-log.md`
- Never make assumptions about what "should" work - test everything

## 📁 Project Structure
```
desktop-migration-plan/
├── README.md                    # This file - main instructions
├── phase-1-user-config.md       # Phase 1 detailed steps
├── phase-2-chat-display.md      # Phase 2 detailed steps  
├── phase-3-session-history.md   # Phase 3 detailed steps
├── phase-4-session-creation.md  # Phase 4 detailed steps
├── phase-5-chat-features.md     # Phase 5 detailed steps
├── phase-6-polish.md            # Phase 6 detailed steps
├── debugging-log.md             # Track issues and solutions
├── testing-checklist.md         # Comprehensive testing guide
└── rollback-guide.md            # Emergency rollback procedures
```

## 🚀 Quick Start

### Prerequisites Check
1. Verify the original chat UI works at `/` route
2. Verify the desktop layout loads at `/chat` route
3. Ensure backend is running and healthy
4. Create a git branch: `git checkout -b desktop-migration`

### Migration Order (STRICT)
Follow this exact sequence. Do not skip ahead or combine phases.

1. **Read all documentation first** - Understand the full scope
2. **Create safety backup** - Copy working files to a backup folder
3. **Start with Phase 1** - User configuration (lowest risk)
4. **Complete testing checklist** for Phase 1
5. **Commit changes** with descriptive message
6. **Proceed to next phase** only after full success

## 📊 Current State Analysis

### Working Components (DO NOT MODIFY)
- `ChatProvider.tsx` - Central state management
- `useSession.ts` - User/session hooks
- `useMessages.ts` - Message state hooks
- `StreamingManager.tsx` - WebSocket handling
- Server actions in `/lib/actions/`

### Components Needing Integration
- `DesktopSidebar.tsx` - Needs user ID management
- `DesktopLayout.tsx` - Needs chat area instead of placeholder
- Chat display area - Needs to be created

### Risk Assessment
- **Low Risk**: Adding UI components without state changes
- **Medium Risk**: Connecting existing state to new UI
- **High Risk**: Modifying state management or server actions

## 🔄 Migration Phases Overview

### Phase 1: User Configuration (LOW RISK)
Add user ID management to sidebar without breaking existing functionality

### Phase 2: Chat Display (LOW RISK)
Create read-only chat display area connected to existing state

### Phase 3: Session History (MEDIUM RISK)
Connect session selection to history loading

### Phase 4: Session Creation (MEDIUM RISK)
Implement new session creation and auto-selection

### Phase 5: Chat Features (MEDIUM RISK)
Add message sending and streaming capabilities

### Phase 6: Polish (LOW RISK)
UI improvements and optional features

## 🛡️ Safety Measures

### Before Starting
```bash
# Create backup
cp -r src/components/chat src/components/chat-backup
cp -r src/app/chat src/app/chat-backup

# Create feature branch
git checkout -b desktop-migration
git add .
git commit -m "Migration starting point"
```

### After Each Change
```bash
# Test the change
npm run dev
# Verify functionality
# If successful:
git add .
git commit -m "Phase X.Y: [specific change description]"
```

### If Something Breaks
```bash
# Immediate rollback
git reset --hard HEAD~1
# Or restore from backup
cp -r src/components/chat-backup/* src/components/chat/
```

## 📋 Success Criteria
Each phase has specific success criteria listed in its documentation. Do not proceed to the next phase until ALL criteria are met.

## 🚨 Emergency Contacts
- Original working code: `/src/app/page.tsx`
- Backup location: `/src/components/chat-backup/`
- Last known good commit: Check `git log`

## 📝 Notes
- The desktop layout is currently the default in `/chat/page.tsx`
- Debug panel can be toggled with the button in top-right
- Use browser DevTools to monitor network requests and console logs
- Keep the original `/` route untouched as a reference

---

**Remember: ONE CHANGE AT A TIME. This is the key to successful migration.**

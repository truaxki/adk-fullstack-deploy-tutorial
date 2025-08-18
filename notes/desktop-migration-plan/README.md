# Desktop Layout Migration Plan with Supabase OAuth

## 🎯 Project Goal
Port the working chat UI functionality from the original layout to the new desktop layout with sidebar, using Supabase OAuth for authentication and session management.

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
├── README.md                       # This file - main instructions
├── phase-1-auth-integration.md     # Phase 1: Supabase OAuth integration (NEW)
├── phase-2-chat-display.md         # Phase 2: Chat display with auth
├── phase-3-session-history.md      # Phase 3: Session history loading
├── phase-4-session-creation.md     # Phase 4: Session creation
├── phase-5-chat-features.md        # Phase 5: Message sending
├── phase-6-polish.md              # Phase 6: UI improvements
├── debugging-log.md               # Track issues and solutions
├── testing-checklist.md           # Comprehensive testing guide
└── rollback-guide.md              # Emergency rollback procedures
```

## 🔐 Authentication Approach (UPDATED)

### Using Supabase OAuth
Instead of simple user IDs, we're implementing full authentication with:
- **OAuth Providers**: Google, GitHub, and more
- **Email/Password**: Traditional authentication
- **Session Management**: Automatic refresh and persistence
- **User Profiles**: Real user accounts with emails
- **Security**: Protected routes and secure sessions

### Benefits Over Simple User IDs
- Production-ready authentication
- Better security and data isolation
- User profiles and preferences
- Password reset functionality
- Email verification
- OAuth social login

## 🚀 Quick Start

### Prerequisites Check
1. **Supabase Setup**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **OAuth Configuration**:
   - Google OAuth configured in Supabase
   - GitHub OAuth configured in Supabase
   - Redirect URLs set to `http://localhost:3000/**`

3. **Verify Backend**:
   - ADK backend is running
   - Can connect to Supabase

### Migration Order (UPDATED)
Follow this exact sequence. Do not skip ahead or combine phases.

1. **Phase 1**: Authentication Integration (MEDIUM RISK)
   - Set up Supabase clients
   - Create auth page
   - Implement OAuth flow
   - Integrate with sidebar

2. **Phase 2**: Chat Display (LOW RISK)
   - Create read-only chat display
   - Connect to authenticated user

3. **Phase 3**: Session History (MEDIUM RISK)
   - Load sessions for authenticated user
   - Connect selection to loading

4. **Phase 4**: Session Creation (MEDIUM RISK)
   - Create sessions for authenticated user
   - Auto-select new sessions

5. **Phase 5**: Chat Features (MEDIUM RISK)
   - Message sending with auth context
   - Streaming responses

6. **Phase 6**: Polish (LOW RISK)
   - UI improvements
   - Optional enhancements

## 📊 Current State Analysis

### Existing OAuth Implementation (from AgentLocker)
- `src/app/auth/page.tsx` - Complete auth page with OAuth
- `src/app/auth/callback/route.ts` - OAuth callback handler
- `src/lib/supabase/` - Supabase client configurations
- Middleware for session management

### Components Needing Integration
- `DesktopSidebar.tsx` - Replace user ID with auth user
- `ChatProvider.tsx` - Use authenticated user context
- `DesktopLayout.tsx` - Add auth protection
- Chat components - Connect to auth user

### Risk Assessment (Updated)
- **Low Risk**: UI components, read-only displays
- **Medium Risk**: Auth integration, state management
- **High Risk**: Breaking existing chat functionality

## 🔄 Migration Phases Overview

### Phase 1: Authentication Integration (NEW PRIORITY)
Implement Supabase OAuth for secure user authentication

### Phase 2: Chat Display
Create read-only chat display for authenticated users

### Phase 3: Session History
Connect session selection to authenticated user's history

### Phase 4: Session Creation
Implement new session creation for authenticated users

### Phase 5: Chat Features
Add message sending with proper user context

### Phase 6: Polish
UI improvements and optional features

## 🛡️ Safety Measures

### Before Starting
```bash
# Create backup
cp -r src/components/chat src/components/chat-backup
cp -r src/app/chat src/app/chat-backup

# Create feature branch
git checkout -b desktop-migration-oauth
git add .
git commit -m "Migration starting point with OAuth"
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

### Key Success Metrics
- [ ] OAuth authentication works
- [ ] Users can sign in/sign up
- [ ] Sessions are tied to authenticated users
- [ ] Chat functionality preserved
- [ ] No console errors
- [ ] Protected routes working

## 🚨 Emergency Contacts
- Original working code: `/src/app/page.tsx`
- Auth reference: AgentLocker codebase
- Backup location: `/src/components/chat-backup/`
- Last known good commit: Check `git log`

## 📝 Notes
- The desktop layout is currently the default in `/chat/page.tsx`
- Auth page is at `/auth`
- OAuth callback is at `/auth/callback`
- Debug panel can be toggled with the button in top-right
- Use browser DevTools to monitor network requests and console logs

## 🔑 Environment Variables Required
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL (Optional - auto-detected)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ADK Backend (Required)
# Configure as per ADK documentation
```

---

**Remember: ONE CHANGE AT A TIME. This is the key to successful migration.**
**Start with Phase 1: Authentication Integration**

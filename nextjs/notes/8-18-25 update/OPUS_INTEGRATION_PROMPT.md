# Opus Context Prompt: Supabase Schema Integration Implementation
*Generated: 2025-01-18*

## 🎯 **Mission Overview**

You need to integrate the newly created Supabase database schema with the existing ADK Fullstack chat application to enable persistent session management across OAuth logins. The schema has been created in Supabase, and now you need to modify the application code to utilize this persistent layer.

## 📋 **Context: What Has Been Done**

### ✅ **Completed**
1. **Supabase Schema Created**: `chat_sessions` and `user_state` tables added to bridge Supabase auth with ADK backend sessions
2. **Authentication Working**: OAuth (Google/GitHub) and email authentication fully functional
3. **Current Architecture**: Dual-system approach (Supabase for auth, ADK backend for chat logic)

### ❌ **The Problem to Solve**
**OAuth Session Metadata Disconnection**: When users sign in with different OAuth accounts, their session metadata is not connected because there's no bridge between Supabase users and ADK backend sessions.

## 📍 **Key Files to Examine and Modify**

### **Primary Integration Points**

#### 1. **Session Creation Service**
```
📁 File: src/lib/services/session-service.ts
🎯 Current: Creates ADK sessions only
🛠️ Needed: Modify to create records in both ADK backend AND Supabase chat_sessions table
```

#### 2. **Session Management Hook**
```
📁 File: src/hooks/useSession.ts
🎯 Current: Manages session state with ADK backend only
🛠️ Needed: Integrate Supabase chat_sessions for persistent session history
```

#### 3. **Session History Loading**
```
📁 File: src/lib/actions/session-history-actions.ts
🎯 Current: Loads from ADK backend only
🛠️ Needed: Check Supabase first for cached sessions, fallback to ADK
```

#### 4. **Chat Provider Context**
```
📁 File: src/components/chat/ChatProvider.tsx
🎯 Current: Uses Supabase auth but no session persistence
🛠️ Needed: Connect user authentication to persistent session storage
```

#### 5. **Session UI Components**
```
📁 File: src/components/chat/SessionSelector.tsx
📁 File: src/components/chat/DesktopSidebar.tsx
🎯 Current: Shows sessions from ADK backend only
🛠️ Needed: Load and display sessions from Supabase bridge table
```

### **New Files to Create**

#### 1. **Supabase Database Service**
```
📁 Create: src/lib/services/supabase-session-service.ts
🎯 Purpose: Handle Supabase chat_sessions and user_state operations
🛠️ Functions: createChatSession, loadUserSessions, updateSessionActivity
```

#### 2. **User Preferences Hook**
```
📁 Create: src/hooks/useUserPreferences.ts
🎯 Purpose: Manage user preferences stored in Supabase user_state table
🛠️ Functions: loadPreferences, updatePreferences, syncPreferences
```

#### 3. **Session Synchronization Utility**
```
📁 Create: src/lib/utils/session-sync.ts
🎯 Purpose: Sync between ADK backend sessions and Supabase records
🛠️ Functions: syncSessionMetadata, linkAdkSession, updateLastActivity
```

## 🗺️ **Database Schema Context**

### **New Supabase Tables Created**
```sql
-- Bridge table: Supabase users ↔ ADK sessions
chat_sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  adk_session_id text UNIQUE, -- Links to ADK backend
  session_title text,
  session_metadata jsonb,
  last_message_at timestamptz,
  message_count integer,
  created_at timestamptz,
  updated_at timestamptz
)

-- User application state and preferences
user_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  current_session_id uuid, -- References chat_sessions.id
  ui_preferences jsonb,
  chat_preferences jsonb,
  last_active timestamptz,
  updated_at timestamptz
)
```

## 🎯 **Specific Implementation Requirements**

### **1. Enhanced Session Creation Flow**
```typescript
// BEFORE (current)
const adkSession = await createSessionWithService(userId);
return adkSession;

// AFTER (needed)
const adkSession = await createSessionWithService(userId);
const supabaseRecord = await createSupabaseSessionRecord(userId, adkSession.sessionId);
return { ...adkSession, supabaseSessionId: supabaseRecord.id };
```

### **2. Session Loading with Persistence**
```typescript
// BEFORE (current)
const sessions = await loadFromAdkBackend(userId);

// AFTER (needed)
const cachedSessions = await loadFromSupabase(userId);
if (cachedSessions.length > 0) {
  return cachedSessions.map(s => ({ ...s, source: 'cache' }));
}
return await loadFromAdkBackend(userId);
```

### **3. User State Management**
```typescript
// NEW functionality needed
const userPreferences = await loadUserState(userId);
const updatedPreferences = await updateUserPreferences(userId, newPrefs);
const currentSession = await getCurrentSession(userId);
```

## 🔧 **Integration Patterns to Follow**

### **Star Schema Pattern (Maintain Consistency)**
- All new tables link directly to `auth.users.id`
- No complex inter-table relationships
- Each user owns their data completely
- Simple RLS policies: `auth.uid() = user_id`

### **Dual System Architecture (Preserve Existing)**
- **Supabase**: User authentication + session metadata + preferences
- **ADK Backend**: AI chat logic + message processing + streaming
- **Bridge Layer**: Connect the two systems via `adk_session_id`

### **Error Handling Strategy**
```typescript
try {
  // Create ADK session (primary)
  const adkResult = await createAdkSession(userId);
  
  // Create Supabase record (enhancement)
  await createSupabaseRecord(userId, adkResult.sessionId);
  
  return adkResult;
} catch (error) {
  // Graceful degradation - ADK session works even if Supabase fails
  console.warn('Supabase sync failed, continuing with ADK session:', error);
  return adkResult;
}
```

## 📊 **Expected Outcomes**

### **After Implementation**
1. **OAuth Session Persistence**: Users can sign out/in and see their previous sessions
2. **Cross-Account Isolation**: Each OAuth account has separate session history
3. **Enhanced Performance**: Frequently accessed sessions cached in Supabase
4. **User Preferences**: UI/chat preferences persist across sessions
5. **Backward Compatibility**: Existing ADK backend functionality unchanged

### **User Experience Improvements**
- Session history persists across OAuth logins
- User preferences remembered (theme, sidebar state, etc.)
- Faster session loading (cached in Supabase)
- Better session organization and management

## 🚨 **Critical Implementation Notes**

### **Preserve Existing Functionality**
- **ADK backend remains primary** for chat logic and message processing
- **Existing session creation must continue working** even if Supabase integration fails
- **No breaking changes** to current authentication flow

### **Performance Considerations**
- **Cache frequently accessed data** in Supabase for fast loading
- **Use parallel requests** where possible (load from both systems simultaneously)
- **Implement graceful fallbacks** if one system is unavailable

### **Security Requirements**
- **Row Level Security (RLS)** enabled on all new tables
- **Users can only access their own data**: `auth.uid() = user_id`
- **No sensitive data** stored in client-accessible fields

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] Users can sign in with different OAuth accounts and see appropriate session history
- [ ] New sessions are created in both ADK backend and Supabase
- [ ] Session metadata persists across login sessions
- [ ] User preferences are saved and restored
- [ ] Existing chat functionality remains unchanged

### **Performance Requirements**
- [ ] Session loading is faster than current implementation
- [ ] No additional latency for message sending
- [ ] Graceful degradation if Supabase is unavailable

### **Code Quality Requirements**
- [ ] TypeScript interfaces for all new data structures
- [ ] Comprehensive error handling with fallbacks
- [ ] Consistent with existing code patterns and architecture
- [ ] Proper logging for debugging and monitoring

## 📍 **File Modification Checklist**

### **High Priority (Core Integration)**
- [ ] `src/lib/services/session-service.ts` - Add Supabase bridge creation
- [ ] `src/hooks/useSession.ts` - Integrate persistent session loading
- [ ] `src/components/chat/ChatProvider.tsx` - Connect auth to persistence
- [ ] `src/lib/actions/session-history-actions.ts` - Add Supabase fallback

### **Medium Priority (Enhanced Features)**
- [ ] Create `src/lib/services/supabase-session-service.ts`
- [ ] Create `src/hooks/useUserPreferences.ts`
- [ ] `src/components/chat/SessionSelector.tsx` - Load from Supabase
- [ ] `src/components/chat/DesktopSidebar.tsx` - Show persistent sessions

### **Low Priority (Polish)**
- [ ] Create `src/lib/utils/session-sync.ts`
- [ ] Add user preferences UI components
- [ ] Implement session sharing features (future)
- [ ] Add analytics and usage tracking (future)

---

**Goal**: Transform the current stateless OAuth authentication into a fully persistent session management system while preserving all existing functionality and maintaining the sophisticated dual-system architecture.
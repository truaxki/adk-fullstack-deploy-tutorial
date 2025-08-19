# Current Supabase Database Schema

*Saved: August 18, 2025*

**WARNING: This schema is for context only and is not meant to be run.**
**Table order and constraints may not be valid for execution.**

## Tables Structure

### public.auth_audit_log
```sql
CREATE TABLE public.auth_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT auth_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

### public.chat_sessions (CRITICAL - Session Persistence Table)
```sql
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL,
  user_id uuid,
  adk_session_id text UNIQUE,
  session_metadata jsonb,
  session_title text,
  last_message_at timestamp with time zone,
  message_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

### public.profiles
```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  website text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

### public.user_roles  
```sql
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

### public.user_state
```sql
CREATE TABLE public.user_state (
  user_id uuid NOT NULL,
  current_session_id uuid,
  ui_preferences jsonb,
  chat_preferences jsonb DEFAULT '{}'::jsonb,
  last_active timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_state_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

## Key Observations

### Schema Issues Identified:
1. **Missing DEFAULT for chat_sessions.id** - No `gen_random_uuid()` default
2. **Missing Indexes** - Performance indexes not shown in this export
3. **No RLS Policies Shown** - Row Level Security policies not included
4. **Missing current_session_id FK** - user_state.current_session_id should reference chat_sessions.id

### Critical for Session Persistence:
- `chat_sessions` table exists ✅
- Foreign key to `auth.users` exists ✅  
- `adk_session_id` unique constraint exists ✅
- Missing `gen_random_uuid()` default for `id` field ❌
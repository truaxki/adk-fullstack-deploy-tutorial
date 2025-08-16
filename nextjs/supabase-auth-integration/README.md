# Supabase Auth Integration Fix Plan

## Current Issues Analysis

### 1. Authentication Flow Problems
- **No middleware protection**: The middleware only refreshes sessions but doesn't protect routes
- **No redirect logic**: Unauthenticated users can access protected pages
- **Homepage directly loads chat**: The root page (`/`) loads the chat interface without auth checks
- **Persistent token bug**: Auth tokens persist in browser storage causing login issues
- **No logout functionality**: Missing logout button/component

### 2. Route Structure Issues
- **Duplicate chat interfaces**: Both `/` and `/chat` pages load the chat
- **No clear entry point**: App doesn't define which page users see first
- **Missing auth checks**: Components don't verify authentication state

## Implementation Plan

### Phase 1: Fix Middleware & Route Protection

#### 1.1 Update Middleware (`src/middleware.ts`)
```typescript
// Enhanced middleware with route protection
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth', '/auth/callback', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect logic
  if (!user && !isPublicRoute) {
    // User is not authenticated and trying to access protected route
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (user && request.nextUrl.pathname === '/auth') {
    // User is authenticated but on auth page, redirect to chat
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Phase 2: Fix Route Structure

#### 2.1 Update Root Page (`src/app/page.tsx`)
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat')
  } else {
    redirect('/auth')
  }
}
```

#### 2.2 Protect Chat Page (`src/app/chat/page.tsx`)
Add server-side auth check at the top of the chat page:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Rest of the chat page component...
}
```

### Phase 3: Add Logout Functionality

#### 3.1 Create Logout Button Component (`src/components/auth/LogoutButton.tsx`)
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Clear all auth data
      await supabase.auth.signOut()
      
      // Clear any localStorage items
      localStorage.clear()
      
      // Clear session storage
      sessionStorage.clear()
      
      // Force reload to clear any cached state
      router.push('/auth')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-500 
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
```

#### 3.2 Create User Menu Component (`src/components/auth/UserMenu.tsx`)
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from './LogoutButton'
import type { User } from '@supabase/supabase-js'

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.email?.[0].toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium">{user.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            {user.email}
          </div>
          <div className="py-1">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  )
}
```

### Phase 4: Fix Token Persistence Issues

#### 4.1 Create Auth Reset Utility (`src/lib/auth/reset.ts`)
```typescript
import { createClient } from '@/lib/supabase/client'

export async function clearAuthTokens() {
  const supabase = createClient()
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Clear all storage
  if (typeof window !== 'undefined') {
    // Clear localStorage items related to Supabase
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    // Clear cookies (client-side accessible ones)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
  }
}
```

#### 4.2 Add Debug Token Clear Button (`src/components/auth/ClearTokensButton.tsx`)
```typescript
'use client'

import { clearAuthTokens } from '@/lib/auth/reset'
import { useRouter } from 'next/navigation'

export function ClearTokensButton() {
  const router = useRouter()

  const handleClear = async () => {
    await clearAuthTokens()
    router.push('/auth')
    router.refresh()
  }

  return (
    <button
      onClick={handleClear}
      className="text-xs text-gray-500 hover:text-gray-700 underline"
    >
      Clear all auth tokens (Debug)
    </button>
  )
}
```

### Phase 5: Integrate with Chat Application

#### 5.1 Update ChatProvider Integration
Modify `src/components/chat/ChatProvider.tsx` to use Supabase user:
```typescript
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

// Add to ChatProvider
const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
const supabase = createClient()

useEffect(() => {
  // Get initial user
  supabase.auth.getUser().then(({ data: { user } }) => {
    setSupabaseUser(user)
    if (user) {
      // Use Supabase user ID instead of custom user ID
      handleUserIdConfirm(user.id)
    }
  })

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSupabaseUser(session?.user ?? null)
    if (session?.user) {
      handleUserIdConfirm(session.user.id)
    }
  })

  return () => subscription.unsubscribe()
}, [supabase])
```

#### 5.2 Add User Menu to Chat Header
Update `src/components/chat/ChatHeader.tsx`:
```typescript
import { UserMenu } from '@/components/auth/UserMenu'

export function ChatHeader() {
  return (
    <header className="border-b px-4 py-3 flex justify-between items-center">
      <h1 className="text-xl font-semibold">Chat</h1>
      <UserMenu />
    </header>
  )
}
```

### Phase 6: Testing Checklist

#### 6.1 Authentication Flow Tests
- [ ] Unauthenticated users redirected to `/auth`
- [ ] Authenticated users can access `/chat`
- [ ] Login redirects to `/chat` after success
- [ ] Logout clears all tokens and redirects to `/auth`
- [ ] OAuth login works (Google/GitHub)
- [ ] Password reset flow works

#### 6.2 Token Management Tests
- [ ] Tokens properly cleared on logout
- [ ] No persistent token issues after logout
- [ ] Session refresh works correctly
- [ ] Token expiry handled gracefully

#### 6.3 Route Protection Tests
- [ ] Direct URL access to `/chat` requires auth
- [ ] API routes protected appropriately
- [ ] Middleware catches all protected routes

### Phase 7: Environment Variables Required

Create/update `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL for OAuth callbacks
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Existing ADK configuration
ADK_APP_NAME=app
# ... other existing env vars
```

### Phase 8: Database Schema (Supabase)

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Create trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create sessions table for chat sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for chat_sessions
CREATE POLICY "Users can manage own sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('human', 'ai', 'system')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy for messages
CREATE POLICY "Users can manage own messages" ON public.messages
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_messages_session_id ON public.messages(session_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
```

## Implementation Order

1. **Fix Middleware** - Implement route protection
2. **Update Routes** - Fix homepage and chat page
3. **Add Logout** - Implement logout button and user menu
4. **Fix Token Issues** - Add token clearing utilities
5. **Test Auth Flow** - Verify all auth scenarios work
6. **Integrate with Chat** - Connect Supabase user to chat system
7. **Database Setup** - Create tables and RLS policies

## Troubleshooting Guide

### Common Issues and Solutions

1. **"Invalid Refresh Token" Error**
   - Clear all browser storage
   - Sign out and sign in again
   - Check Supabase dashboard for valid sessions

2. **Redirect Loop**
   - Verify middleware logic
   - Check for conflicting redirects in components
   - Ensure proper cookie handling

3. **OAuth Not Working**
   - Verify redirect URLs in Supabase dashboard
   - Check NEXT_PUBLIC_SITE_URL environment variable
   - Ensure OAuth providers are configured in Supabase

4. **Session Not Persisting**
   - Check cookie settings in Supabase client
   - Verify middleware is updating session
   - Ensure cookies are not blocked by browser

## Success Criteria

- [ ] Users must authenticate before accessing chat
- [ ] Login/logout flow works smoothly
- [ ] No persistent token issues
- [ ] OAuth providers work correctly
- [ ] Sessions persist across page refreshes
- [ ] User information displayed in UI
- [ ] Chat integrates with Supabase user ID

# Phase 1: Authentication Integration (REVISED)
**Risk Level: LOW-MEDIUM**  
**Estimated Time: 45-60 minutes**

## Objective
Replace the simple user ID management with Supabase OAuth authentication, providing real user accounts with secure sign-in/sign-up functionality.

## ⚠️ IMPORTANT RULES
1. **ONE CHANGE AT A TIME** - Test auth separately before integrating
2. **USE EXISTING AUTH SYSTEM** - Leverage the OAuth setup from AgentLocker
3. **TEST AUTH FLOW FIRST** - Ensure login works before modifying chat
4. **PRESERVE CHAT FUNCTIONALITY** - Don't break existing features

## Prerequisites
- [ ] Supabase project configured with OAuth providers
- [ ] Environment variables set (.env.local)
- [ ] Desktop layout loads at `/chat` route
- [ ] Original auth implementation reference available

## Step-by-Step Implementation

### Step 1.1: Copy Supabase Configuration Files
**Risk: MINIMAL** - Just copying files

1. Copy these files from the AgentLocker project:

```bash
# Create directories
mkdir -p src/lib/supabase
mkdir -p src/lib/auth

# Files to copy:
# src/lib/supabase/client.ts
# src/lib/supabase/server.ts
# src/lib/supabase/middleware.ts
# src/lib/auth/types.ts
```

2. Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

3. Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Component - can be ignored with middleware
          }
        },
      },
    }
  )
}
```

**Commit**: `git commit -m "Phase 1.1: Add Supabase client configuration"`

### Step 1.2: Set Up Environment Variables
**Risk: MINIMAL** - Configuration only

1. Create/update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

2. Test connection:
   - Run `npm run dev`
   - Check for no import errors
   - Console should be clean

**Commit**: `git commit -m "Phase 1.2: Configure environment variables"`

### Step 1.3: Add Middleware for Session Management
**Risk: LOW** - New file, doesn't affect existing code

1. Create `src/middleware.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Commit**: `git commit -m "Phase 1.3: Add middleware for session management"`

### Step 1.4: Test Auth Page
**Risk: LOW** - Testing new route

1. Navigate to `http://localhost:3000/auth`
2. Verify:
   - [ ] Page loads without errors
   - [ ] OAuth buttons appear
   - [ ] Can switch between signin/signup/reset modes
   - [ ] No console errors

**Commit**: `git commit -m "Phase 1.4: Verify auth page functionality"`

### Step 1.5: Test OAuth Sign In
**Risk: MEDIUM** - External service integration

1. Click "Sign in with Google" or "Sign in with GitHub"
2. Verify:
   - [ ] Redirects to OAuth provider
   - [ ] Can authorize the app
   - [ ] Returns to callback URL
   - [ ] Redirects to `/chat` after success

3. If errors occur:
   - Check Supabase dashboard for OAuth configuration
   - Verify redirect URLs include `http://localhost:3000/**`
   - Check browser network tab for failed requests

**Commit**: `git commit -m "Phase 1.5: Verify OAuth authentication flow"`

### Step 1.6: Modify DesktopSidebar for Authenticated User
**Risk: MEDIUM** - Modifying existing component

1. Update `DesktopSidebar.tsx` imports:

```typescript
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
```

2. Replace user ID management with Supabase user:

```typescript
export function DesktopSidebar({ ... }: DesktopSidebarProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  
  const supabase = createClient()
  
  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    getUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    
    return () => subscription.unsubscribe()
  }, [supabase])
  
  // Fetch sessions for authenticated user
  useEffect(() => {
    if (user) {
      fetchSessions(user.id)
    } else {
      setSessions([])
    }
  }, [user])
```

3. Add user display in sidebar:

```typescript
{/* User Section - After Branding, Before Tabs */}
{user ? (
  <div className="px-4 py-3 border-b border-gray-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-500" />
        <div>
          <div className="text-xs text-gray-500">Signed in as</div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {user.email}
          </div>
        </div>
      </div>
      <button
        onClick={async () => {
          await supabase.auth.signOut()
          router.push('/auth')
        }}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  </div>
) : (
  <div className="px-4 py-3 border-b border-gray-200">
    <button
      onClick={() => router.push('/auth')}
      className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
    >
      Sign in to continue
    </button>
  </div>
)}
```

**Commit**: `git commit -m "Phase 1.6: Integrate auth with DesktopSidebar"`

### Step 1.7: Update ChatProvider for Authenticated User
**Risk: MEDIUM** - Core state management

1. Update `ChatProvider.tsx` to use Supabase user:

```typescript
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

// In ChatProvider component:
const [user, setUser] = useState<User | null>(null)
const supabase = createClient()

// Replace userId with user
useEffect(() => {
  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }
  
  getUser()
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null)
    }
  )
  
  return () => subscription.unsubscribe()
}, [supabase])

// Update context value to use user.id instead of userId
```

**Commit**: `git commit -m "Phase 1.7: Update ChatProvider for Supabase auth"`

### Step 1.8: Protect Chat Route
**Risk: LOW** - Adding protection

1. Add auth check to `/chat/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// At the top of ChatPage component:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/auth')
}
```

2. Test:
   - Sign out and try to access `/chat`
   - Should redirect to `/auth`
   - Sign in and verify access to `/chat`

**Commit**: `git commit -m "Phase 1.8: Add route protection to chat"`

### Step 1.9: Test Full Integration
**Risk: NONE** - Testing only

1. Complete flow test:
   - [ ] Sign out completely
   - [ ] Navigate to `/auth`
   - [ ] Sign in with OAuth
   - [ ] Redirected to `/chat`
   - [ ] User email shows in sidebar
   - [ ] Sessions load for authenticated user
   - [ ] Can create new chat
   - [ ] Sign out button works
   - [ ] Redirected back to `/auth`

2. Test persistence:
   - [ ] Refresh page while signed in
   - [ ] Session persists
   - [ ] User remains authenticated

**Commit**: `git commit -m "Phase 1.9: Complete auth integration testing"`

## Success Criteria Checklist
- [ ] Auth page loads and works
- [ ] OAuth sign in functional
- [ ] User authentication persists
- [ ] Sessions tied to authenticated user
- [ ] Sign out works properly
- [ ] Routes are protected
- [ ] No console errors
- [ ] Original chat functionality preserved

## Troubleshooting

### OAuth not working
1. Check Supabase dashboard OAuth settings
2. Verify redirect URLs configured
3. Check environment variables
4. Look for errors in browser console

### Sessions not loading
1. Verify user is authenticated
2. Check if user.id is being passed correctly
3. Look at Network tab for API calls
4. Check backend expects user ID format

### Sign out not working
1. Check supabase.auth.signOut() is called
2. Verify redirect happens after signout
3. Clear cookies manually if needed

## Benefits of This Approach
- Real user accounts with secure authentication
- OAuth support (Google, GitHub, etc.)
- Password reset functionality
- Email verification
- Session management handled by Supabase
- Better security than simple user IDs
- Scalable for production use

## Next Phase
After successful auth integration, proceed to Phase 2 (Chat Display) with authenticated users instead of simple user IDs.

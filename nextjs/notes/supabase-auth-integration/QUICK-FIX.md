# Quick Fix Guide - Immediate Steps

## Step 1: Fix the Middleware (5 minutes)

Replace `src/middleware.ts` with:

```typescript
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
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  const publicRoutes = ['/auth', '/auth/callback', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Handle root redirect
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/chat' : '/auth', request.url)
    )
  }

  // Protect routes
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Redirect logged-in users away from auth
  if (user && request.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

## Step 2: Fix Root Page (2 minutes)

Replace `src/app/page.tsx` with:

```typescript
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Middleware handles the redirect, but just in case:
  redirect('/chat')
}
```

## Step 3: Add Logout Button (5 minutes)

Create `src/components/auth/LogoutButton.tsx`:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    router.push('/auth')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Sign Out
    </button>
  )
}
```

## Step 4: Add to Chat Page (2 minutes)

At the top of `src/app/chat/page.tsx`, add:

```typescript
import { LogoutButton } from '@/components/auth/LogoutButton'

// Then in your JSX, add the button somewhere visible:
<div className="fixed top-4 right-20 z-50">
  <LogoutButton />
</div>
```

## Step 5: Add Token Clear Helper (3 minutes)

Add to bottom of `src/app/auth/page.tsx` auth form:

```typescript
// At the bottom of the form component, after the submit button:
<div className="mt-6 text-center">
  <button
    type="button"
    onClick={() => {
      localStorage.clear()
      sessionStorage.clear()
      window.location.reload()
    }}
    className="text-xs text-gray-500 hover:text-gray-700 underline"
  >
    Having login issues? Click here to clear cached tokens
  </button>
</div>
```

## Step 6: Test Your Fixes

1. **Clear your browser data** (or use incognito)
2. **Go to** `http://localhost:3000`
3. **You should be redirected to** `/auth`
4. **Login** → Should go to `/chat`
5. **Click logout** → Should return to `/auth`
6. **Try to access** `/chat` directly → Should redirect to `/auth`

## Common Issues & Quick Fixes

### "Already logged in but can't access"
```javascript
// Run in browser console:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### "Redirect loop"
- Check your `.env.local` has correct Supabase URLs
- Restart Next.js dev server: `npm run dev`

### "OAuth not working"
- Check Supabase dashboard → Authentication → URL Configuration
- Add `http://localhost:3000/auth/callback` to redirect URLs

## That's It! 🎉

These minimal changes should fix your auth flow. The key fixes are:
1. ✅ Middleware now protects routes
2. ✅ Root page redirects properly  
3. ✅ Logout button clears session
4. ✅ Token clear helper for stuck sessions

Total time: ~15 minutes

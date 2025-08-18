# Fixed Middleware Implementation

This is the corrected middleware that properly protects routes and handles authentication.

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
          request.cookies.set({
            name,
            value,
            ...options
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user }, error } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth', '/auth/callback', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Handle root path
  if (request.nextUrl.pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/chat', request.url))
    } else {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  // Protect routes
  if (!user && !isPublicRoute) {
    // User is not authenticated and trying to access protected route
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth page
  if (user && request.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Key Changes Made:

1. **Proper cookie handling**: Fixed the cookie get/set/remove methods
2. **Root path redirect**: Added logic to handle `/` path
3. **Protected routes**: All routes except public ones require authentication
4. **Redirect tracking**: Saves intended destination for post-login redirect
5. **Error handling**: Properly handles auth errors

## Testing the Middleware:

1. **Test unauthenticated access**:
   - Visit `/` → Should redirect to `/auth`
   - Visit `/chat` → Should redirect to `/auth?redirectTo=/chat`

2. **Test authenticated access**:
   - Login → Should redirect to `/chat`
   - Visit `/auth` while logged in → Should redirect to `/chat`

3. **Test logout**:
   - Logout → Should clear session
   - Try to visit `/chat` → Should redirect to `/auth`

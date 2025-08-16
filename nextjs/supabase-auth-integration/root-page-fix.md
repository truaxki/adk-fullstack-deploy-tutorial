# Fixed Root Page Implementation

Replace the content of `src/app/page.tsx` with this:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  // Check authentication on the server
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect based on auth status
  if (user) {
    // User is authenticated, go to chat
    redirect('/chat')
  } else {
    // User is not authenticated, go to auth page
    redirect('/auth')
  }
}
```

## Alternative Implementation with Loading State

If you want to show a loading state while checking auth:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  
  // This will be executed on the server before rendering
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Handle any errors gracefully
  if (error) {
    console.error('Auth check error:', error)
    redirect('/auth')
  }

  // Redirect based on auth status
  if (user) {
    redirect('/chat')
  } else {
    redirect('/auth')
  }
  
  // This will never be reached due to redirects
  return null
}
```

## Client-Side Alternative (Not Recommended)

If you need client-side routing for some reason:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        router.push('/chat')
      } else {
        router.push('/auth')
      }
    }

    checkAuth()
  }, [router, supabase])

  // Show loading state while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
```

## Why Server-Side is Better

1. **Security**: Auth check happens on server before sending any HTML
2. **Performance**: No flash of loading state
3. **SEO**: Search engines get proper redirects
4. **No JavaScript Required**: Works even if JS is disabled

## Testing

1. **Not logged in**: Visit `/` → Should redirect to `/auth`
2. **Logged in**: Visit `/` → Should redirect to `/chat`
3. **Direct access**: Both `/chat` and `/` should respect auth state

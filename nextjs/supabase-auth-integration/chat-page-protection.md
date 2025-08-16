# Protected Chat Page Implementation

Update `src/app/chat/page.tsx` to properly check authentication:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { ChatProvider } from '@/components/chat/ChatProvider'
import { DesktopLayout } from '@/components/chat/DesktopLayout'
import { DesktopSidebar } from '@/components/chat/DesktopSidebar'
import { UserMenu } from '@/components/auth/UserMenu'

export default async function ChatPage() {
  // Server-side auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth')
  }

  // Render the chat interface for authenticated users
  return (
    <ChatPageContent userId={user.id} userEmail={user.email} />
  )
}

// Separate client component for the chat interface
function ChatPageContent({ 
  userId, 
  userEmail 
}: { 
  userId: string
  userEmail?: string 
}) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Suspense fallback={<LoadingState />}>
        <ChatProvider>
          <DesktopLayout>
            {/* Add User Menu to the header */}
            <div className="absolute top-4 right-4 z-50">
              <UserMenu />
            </div>
            
            <DesktopSidebar 
              onTabChange={(tab) => console.log('Tab changed:', tab)}
              onChatSelect={(chatId) => console.log('Chat selected:', chatId)}
              onNewChat={() => console.log('New chat')}
            />
            
            <div className="flex-1 flex flex-col">
              <div className="text-center py-8">
                <h1 className="text-2xl font-bold text-gray-800">
                  Welcome back!
                </h1>
                <p className="text-gray-600 mt-2">
                  Logged in as: {userEmail}
                </p>
              </div>
            </div>
          </DesktopLayout>
        </ChatProvider>
      </Suspense>
    </div>
  )
}

// Loading component
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    </div>
  )
}
```

## Alternative: With User Context Provider

If you need user data throughout the app:

```typescript
// src/contexts/UserContext.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface UserContextType {
  user: User | null
  loading: boolean
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
})

export function UserProvider({ 
  children,
  initialUser 
}: { 
  children: React.ReactNode
  initialUser: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
```

Then wrap your chat page:

```typescript
// In chat/page.tsx
import { UserProvider } from '@/contexts/UserContext'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return (
    <UserProvider initialUser={user}>
      <ChatPageContent />
    </UserProvider>
  )
}
```

## Integration with ChatProvider

Update `ChatProvider` to use Supabase user:

```typescript
// In src/components/chat/ChatProvider.tsx
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Inside ChatProvider component:
useEffect(() => {
  const initializeUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Use Supabase user ID as the chat user ID
      handleUserIdConfirm(user.id)
    }
  }

  initializeUser()
}, [])
```

## Testing Checklist

- [ ] Direct access to `/chat` redirects to `/auth` when not logged in
- [ ] After login, user sees chat interface
- [ ] User email/info displayed correctly
- [ ] Logout button works and redirects to `/auth`
- [ ] Session persists across page refreshes

# Logout Button Component

Save this as `src/components/auth/LogoutButton.tsx`

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
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        return
      }

      // Clear any app-specific localStorage items
      if (typeof window !== 'undefined') {
        // Clear agent-engine-user-id specifically
        localStorage.removeItem('agent-engine-user-id')
        
        // Clear any Supabase-related items
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.includes('supabase')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Clear session storage
        sessionStorage.clear()
      }
      
      // Navigate to auth page
      router.push('/auth')
      // Force a hard refresh to clear any cached state
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
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md
                 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors duration-200"
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Signing out...
        </span>
      ) : (
        'Sign out'
      )}
    </button>
  )
}
```

# User Menu Component

Save this as `src/components/auth/UserMenu.tsx`

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from './LogoutButton'
import type { User } from '@supabase/supabase-js'

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const userInitial = user.email?.[0].toUpperCase() || 'U'
  const userName = user.user_metadata?.full_name || user.email || 'User'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 
                   transition-colors duration-200 focus:outline-none focus:ring-2 
                   focus:ring-blue-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 
                        rounded-full flex items-center justify-center shadow-sm">
          <span className="text-white text-sm font-semibold">
            {userInitial}
          </span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg 
                        py-2 z-50 border border-gray-200 animate-in fade-in slide-in-from-top-5">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500 mt-1">{user.email}</p>
          </div>
          
          <div className="py-2">
            <button
              onClick={() => {/* Add profile navigation */}}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 
                         hover:bg-gray-100 transition-colors duration-150"
            >
              Profile Settings
            </button>
            <button
              onClick={() => {/* Add preferences navigation */}}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 
                         hover:bg-gray-100 transition-colors duration-150"
            >
              Preferences
            </button>
          </div>
          
          <div className="border-t border-gray-200 pt-2">
            <div className="px-4 py-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

# Clear Tokens Debug Component

Save this as `src/components/auth/ClearTokensButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function ClearTokensButton() {
  const [isClearing, setIsClearing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleClearTokens = async () => {
    setIsClearing(true)
    
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear all localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear all cookies accessible from JavaScript
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
      }
      
      // Force navigation to auth page
      router.push('/auth')
      // Hard refresh to clear any in-memory state
      window.location.href = '/auth'
      
    } catch (error) {
      console.error('Error clearing tokens:', error)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <button
      onClick={handleClearTokens}
      disabled={isClearing}
      className="text-xs text-red-600 hover:text-red-700 underline 
                 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Use this if you're having authentication issues"
    >
      {isClearing ? 'Clearing...' : 'Clear All Auth Tokens (Debug)'}
    </button>
  )
}
```

## Integration Instructions

1. **Add to Auth Page** - Add the clear tokens button at the bottom of the auth form:
```typescript
// In src/app/auth/page.tsx, add at the bottom of the form
import { ClearTokensButton } from '@/components/auth/ClearTokensButton'

// Inside the form component, after the submit button:
<div className="mt-4 text-center">
  <ClearTokensButton />
</div>
```

2. **Add User Menu to Chat** - Update your chat header or layout:
```typescript
// In your chat layout or header component
import { UserMenu } from '@/components/auth/UserMenu'

// In the header JSX:
<header className="flex justify-between items-center p-4 border-b">
  <h1>Chat Application</h1>
  <UserMenu />
</header>
```

3. **Test the Components**:
   - User menu should show user email and avatar
   - Logout should clear all tokens and redirect
   - Clear tokens button should force complete auth reset

import { createClient } from '@/lib/supabase/client'

export async function clearAuthTokens() {
  // Clear all storage first to handle corrupted tokens
  if (typeof window !== 'undefined') {
    // Clear localStorage items related to Supabase/auth
    const keysToRemove: string[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.warn(`Failed to remove localStorage key: ${key}`, e)
        }
      })
    } catch (e) {
      // If localStorage is corrupted, clear everything
      console.warn('localStorage corrupted, clearing all:', e)
      try {
        localStorage.clear()
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError)
      }
    }
    
    // Clear sessionStorage
    try {
      sessionStorage.clear()
    } catch (e) {
      console.warn('Failed to clear sessionStorage:', e)
    }
    
    // Clear cookies (client-side accessible ones)
    try {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
    } catch (e) {
      console.warn('Failed to clear cookies:', e)
    }
  }

  // Try to sign out from Supabase after clearing storage
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch (e) {
    console.warn('Supabase signOut failed (expected if tokens were corrupted):', e)
    // This is expected if tokens were corrupted - we've already cleared storage above
  }
}
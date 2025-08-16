'use client'

import { useEffect } from 'react'
import { clearAuthTokens } from '@/lib/auth/reset'

export function AuthErrorHandler() {
  useEffect(() => {
    // Listen for unhandled errors that might be auth-related
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message
      const errorString = String(error)
      
      // Check if it's a Supabase auth token error
      if (errorString.includes('Cannot create property') && 
          errorString.includes('user') && 
          errorString.includes('access_token')) {
        console.warn('Detected corrupted Supabase tokens, clearing...')
        clearAuthTokens().then(() => {
          // Reload the page to start fresh
          window.location.reload()
        }).catch(clearError => {
          console.error('Failed to clear corrupted tokens:', clearError)
        })
      }
    }

    // Listen for unhandled promise rejections too
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const errorString = String(error)
      
      if (errorString.includes('Cannot create property') && 
          errorString.includes('user') && 
          errorString.includes('access_token')) {
        console.warn('Detected corrupted Supabase tokens in promise, clearing...')
        clearAuthTokens().then(() => {
          window.location.reload()
        }).catch(clearError => {
          console.error('Failed to clear corrupted tokens:', clearError)
        })
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null // This component doesn't render anything
}
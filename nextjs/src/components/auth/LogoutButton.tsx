'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { clearAuthTokens } from '@/lib/auth/reset'

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Use comprehensive token clearing
      await clearAuthTokens()
      
      // Force reload to clear any cached state and redirect
      window.location.href = '/auth'
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback - still try to redirect even if clearing fails
      router.push('/auth')
      router.refresh()
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
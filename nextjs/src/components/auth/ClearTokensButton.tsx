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
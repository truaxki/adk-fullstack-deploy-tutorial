import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Get the site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  `${requestUrl.protocol}//${requestUrl.host}`

  // Handle OAuth errors (e.g., user cancelled)
  if (error) {
    return NextResponse.redirect(
      `${siteUrl}/auth?error=${encodeURIComponent(error_description || 'Authentication failed')}`
    )
  }

  if (code) {
    try {
      const supabase = await createClient()
      
      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        return NextResponse.redirect(
          `${siteUrl}/auth?error=${encodeURIComponent(exchangeError.message || 'Failed to sign in')}`
        )
      }
      
      // Validate session was actually created
      if (!data?.session) {
        return NextResponse.redirect(
          `${siteUrl}/auth?error=${encodeURIComponent('Session creation failed')}`
        )
      }
      
      // Success - redirect to the chat or requested page
      return NextResponse.redirect(`${siteUrl}${next}`)
      
    } catch (err) {
      console.error('OAuth callback error:', err)
      return NextResponse.redirect(
        `${siteUrl}/auth?error=${encodeURIComponent('An unexpected error occurred')}`
      )
    }
  }

  // No authorization code received
  return NextResponse.redirect(`${siteUrl}/auth?error=No authorization code received`)
}

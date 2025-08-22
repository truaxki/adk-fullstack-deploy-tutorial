'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'signin' | 'signup' | 'reset'

// Asset imports
const logoImg = "/AgentLocker-.png"
const clusterGif = "/cluster-14-rotation.gif"

function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check for message in URL parameters
    const urlMessage = searchParams.get('message')
    const urlError = searchParams.get('error')
    
    if (urlMessage) {
      setMessage({ type: 'success', text: urlMessage })
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/auth')
      }
    } else if (urlError) {
      setMessage({ type: 'error', text: urlError })
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/auth')
      }
    }
  }, [searchParams])

  // Check if user is already authenticated
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.push('/chat')
        }
      } catch (error) {
        console.warn('Auth check failed, likely due to corrupted tokens:', error)
        // If auth check fails, user can still use the auth form
        // The clearAuthTokens function will handle cleanup if needed
      }
    }
    checkUser()
  }, [supabase, router])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else {
          router.push('/chat')
        }
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else if (data?.user && !data.session) {
          setMessage({ 
            type: 'success', 
            text: 'Check your email to confirm your account'
          })
          setEmail('')
          setPassword('')
          setFullName('')
        } else if (data?.session) {
          router.push('/chat')
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })
        
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Check your email for the password reset link' 
          })
          setEmail('')
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true)
    setMessage(null)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to initiate OAuth sign in' })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background seaborn-grid">
      {/* Left Panel - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-card lg:max-w-[50%] relative border-r border-border">
        <div className="w-full max-w-lg flex flex-col items-center space-y-8 flex-1 justify-center">
          {/* Logo - Wider Container */}
          <div className="w-full flex justify-center">
            <img 
              src={logoImg}
              alt="AgentLocker"
              className="h-32 w-auto object-contain"
            />
          </div>

          {/* Form Container */}
          <div className="w-full max-w-md space-y-8">

          {/* OAuth Section */}
          {mode !== 'reset' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 font-semibold uppercase tracking-wider">Continue with</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <g transform="translate(3 2)">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.582c1.321 0 2.508.454 3.442 1.346l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.582 9 3.582z"/>
                    </g>
                  </svg>
                  <span className="text-gray-700 font-medium">Google</span>
                </button>

                <button
                  onClick={() => handleOAuthSignIn('github')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-800 hover:bg-gray-50 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <svg className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="text-gray-700 font-medium">GitHub</span>
                </button>
              </div>
            </div>
          )}

          {/* Divider with OR */}
          {mode !== 'reset' && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-gray-500 font-semibold uppercase tracking-wider">Or</span>
              </div>
            </div>
          )}

          {/* Email Form */}
          <div className="space-y-4">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-12 px-4 border border-input rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-tab10-blue focus:border-transparent hover:border-tab10-blue/30 transition-all duration-200 placeholder:text-muted-foreground placeholder:font-normal text-foreground font-medium"
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 transition-all duration-200 placeholder:text-gray-400 placeholder:font-normal text-gray-900 font-medium"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 px-4 border border-input rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-tab10-blue focus:border-transparent hover:border-tab10-blue/30 transition-all duration-200 placeholder:text-muted-foreground placeholder:font-normal text-foreground font-medium"
                  />
                </div>
              )}

              {message && (
                <div className={`rounded-lg p-4 text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-tab10-blue text-white font-semibold rounded-lg hover:bg-tab10-blue/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  mode === 'signin' ? 'Sign In' :
                  mode === 'signup' ? 'Create Account' :
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>

          </div>
        </div>
        
        {/* Footer - Fixed at bottom */}
        <div className="w-full max-w-lg mt-8">
          <div className="border-t border-gray-100 pt-6">
            <div className="space-y-4">
              {/* Forgot Password Link for Sign In */}
              {mode === 'signin' && (
                <div className="text-center">
                  <button
                    onClick={() => setMode('reset')}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              
              {/* Back to Sign In for Reset */}
              {mode === 'reset' && (
                <div className="text-center text-sm">
                  <span className="text-gray-600">
                    Remember your password?{' '}
                    <button
                      onClick={() => setMode('signin')}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                      Back to sign in
                    </button>
                  </span>
                </div>
              )}

              {/* Terms and Privacy - Clean footer bar */}
              <div className="text-center py-4 bg-gray-50 -mx-8 px-8 rounded-t-2xl">
                <p className="text-xs text-gray-400">
                  By continuing, you agree to our{' '}
                  <a href="#" className="underline hover:text-gray-600 transition-colors">Terms</a>
                  {' '}and{' '}
                  <a href="#" className="underline hover:text-gray-600 transition-colors">Privacy Policy</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Animated Visualization (Desktop Only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="relative w-full max-w-2xl flex flex-col items-center z-10">
          {/* White Container with shadow and hover effect */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl">
            <img 
              src={clusterGif} 
              alt="Embedding cluster visualization"
              className="w-full h-auto rounded-2xl"
            />
          </div>
          
          {/* Caption - Outside the box with better styling */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-gray-800 font-semibold text-lg">
              Research Cluster Available - Q2 2025
            </p>
            <p className="text-sm text-gray-600">
              Early Access • v0.2 • Last updated Aug 20
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}

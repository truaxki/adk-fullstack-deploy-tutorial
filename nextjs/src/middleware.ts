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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				set(name: string, value: string, options: any) {
					request.cookies.set({ name, value, ...options })
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					})
					response.cookies.set({ name, value, ...options })
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				remove(name: string, options: any) {
					request.cookies.set({ name, value: '', ...options })
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					})
					response.cookies.set({ name, value: '', ...options })
				},
			},
		}
	)

	const { data: { user } } = await supabase.auth.getUser()

	// Define public routes that don't require authentication
	const publicRoutes = ['/auth', '/auth/callback', '/auth/reset-password']
	const isPublicRoute = publicRoutes.some(route => 
		request.nextUrl.pathname.startsWith(route)
	)

	// Redirect logic
	if (!user && !isPublicRoute) {
		// User is not authenticated and trying to access protected route
		return NextResponse.redirect(new URL('/auth', request.url))
	}

	if (user && request.nextUrl.pathname === '/auth') {
		// User is authenticated but on auth page, redirect to chat
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
		 * - public folder
		 * - public files with extensions (.svg, .png, .jpg, etc.)
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
}



import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'

// GitHub OAuth scopes needed
const SCOPES = ['read:user', 'user:email', 'repo'].join(' ')

// GET: Start GitHub OAuth flow
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const returnUrl = searchParams.get('returnUrl') || '/dashboard-group/neural-map'

  // Check if user is logged in
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.redirect(
      `${origin}/auth-group/login?error=not_authenticated&returnUrl=${encodeURIComponent(returnUrl)}`
    )
  }

  // Build GitHub OAuth URL
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${origin}/auth/github/callback`,
    scope: SCOPES,
    state: returnUrl, // Pass return URL through state
  })

  const githubAuthUrl = `${GITHUB_OAUTH_URL}?${params.toString()}`

  return NextResponse.redirect(githubAuthUrl)
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('[GitHub OAuth] Error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/dashboard-group/settings?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard-group/settings?error=no_code`)
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('[GitHub OAuth] Token error:', tokenData)
      return NextResponse.redirect(
        `${origin}/dashboard-group/settings?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`
      )
    }

    const accessToken = tokenData.access_token
    const scope = tokenData.scope

    // 2. Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub user')
    }

    const githubUser = await userResponse.json()

    // 3. Get current Supabase user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(`${origin}/auth-group/login?error=not_authenticated`)
    }

    // 4. Save GitHub connection to database
    // Use admin client for service role access
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: upsertError } = await adminClient
      .from('user_github_connections')
      .upsert({
        user_id: user.id,
        github_user_id: String(githubUser.id),
        github_username: githubUser.login,
        github_email: githubUser.email,
        github_avatar_url: githubUser.avatar_url,
        access_token: accessToken, // TODO: Encrypt in production
        scopes: scope ? scope.split(',') : [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('[GitHub OAuth] Database error:', upsertError)
      return NextResponse.redirect(
        `${origin}/dashboard-group/settings?error=${encodeURIComponent('Failed to save connection')}`
      )
    }

    console.log('[GitHub OAuth] Successfully connected:', githubUser.login)

    // 5. Redirect back to settings with success
    const returnTo = state || '/dashboard-group/settings'
    return NextResponse.redirect(`${origin}${returnTo}?github=connected`)

  } catch (err: any) {
    console.error('[GitHub OAuth] Error:', err)
    return NextResponse.redirect(
      `${origin}/dashboard-group/settings?error=${encodeURIComponent(err.message || 'Unknown error')}`
    )
  }
}

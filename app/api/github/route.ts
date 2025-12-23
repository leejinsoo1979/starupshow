import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET: Get current user's GitHub connection info
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get GitHub connection
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: connection, error } = await adminClient
      .from('user_github_connections')
      .select('id, github_username, github_email, github_avatar_url, scopes, created_at, updated_at')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[GitHub API] Error fetching connection:', error)
      return NextResponse.json(
        { error: 'Failed to fetch connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      connected: !!connection,
      connection: connection || null,
    })

  } catch (err: any) {
    console.error('[GitHub API] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE: Disconnect GitHub account
export async function DELETE() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete GitHub connection
    const { error } = await adminClient
      .from('user_github_connections')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('[GitHub API] Error deleting connection:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    // Also clear GitHub fields from user's projects
    await adminClient
      .from('projects')
      .update({
        github_owner: null,
        github_repo: null,
        github_clone_url: null,
        github_connected_at: null,
      })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[GitHub API] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

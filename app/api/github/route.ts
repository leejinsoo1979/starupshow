import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET: Get current user's GitHub connection info
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get GitHub connection from user_app_connections
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: connection, error } = await adminClient
      .from('user_app_connections')
      .select('id, account_info, permissions, access_token, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('provider_id', 'github')
      .eq('status', 'connected')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[GitHub API] Error fetching connection:', error)
      return NextResponse.json(
        { error: 'Failed to fetch connection' },
        { status: 500 }
      )
    }

    // Transform to expected format
    const transformedConnection = connection ? {
      id: connection.id,
      github_username: connection.account_info?.login || connection.account_info?.username,
      github_email: connection.account_info?.email,
      github_avatar_url: connection.account_info?.avatar_url,
      scopes: connection.permissions,
      created_at: connection.created_at,
      updated_at: connection.updated_at,
    } : null

    return NextResponse.json({
      connected: !!connection,
      connection: transformedConnection,
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
    const supabase = await createClient()
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

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET: 내 워크스페이스 레포 조회
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: repo, error } = await adminClient
      .from('workspace_repos')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', 'workspace')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Workspace Repo] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    return NextResponse.json({ repo: repo || null })
  } catch (err: any) {
    console.error('[Workspace Repo] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: 워크스페이스 레포 생성/연결
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { github_owner, github_repo, github_clone_url, local_path } = body

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Upsert workspace repo
    const { data: repo, error } = await adminClient
      .from('workspace_repos')
      .upsert({
        user_id: user.id,
        name: 'workspace',
        github_owner,
        github_repo,
        github_clone_url,
        local_path,
        is_connected: !!github_clone_url,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,name'
      })
      .select()
      .single()

    if (error) {
      console.error('[Workspace Repo] Create error:', error)
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }

    return NextResponse.json({ repo })
  } catch (err: any) {
    console.error('[Workspace Repo] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

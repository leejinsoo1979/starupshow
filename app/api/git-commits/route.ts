import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET: 통합 커밋 로그 조회 (대시보드용)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const projectId = searchParams.get('project_id')
    const search = searchParams.get('search')

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = adminClient
      .from('git_commits')
      .select(`
        *,
        project:projects(id, name, project_type, color)
      `)
      .eq('user_id', user.id)
      .order('committed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (search) {
      query = query.ilike('commit_message', `%${search}%`)
    }

    const { data: commits, error } = await query

    if (error) {
      console.error('[Git Commits] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    return NextResponse.json({ commits: commits || [] })
  } catch (err: any) {
    console.error('[Git Commits] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: 커밋 기록 저장 (Git 작업 후 호출)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const {
      project_id,
      workspace_repo_id,
      commit_hash,
      commit_message,
      author_name,
      author_email,
      files_changed,
      insertions,
      deletions,
      branch,
      committed_at
    } = body

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: commit, error } = await adminClient
      .from('git_commits')
      .insert({
        user_id: user.id,
        project_id,
        workspace_repo_id,
        commit_hash,
        commit_message,
        author_name,
        author_email,
        files_changed: files_changed || 0,
        insertions: insertions || 0,
        deletions: deletions || 0,
        branch: branch || 'main',
        committed_at: committed_at || new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[Git Commits] Insert error:', error)
      return NextResponse.json({ error: 'Failed to save commit' }, { status: 500 })
    }

    return NextResponse.json({ commit })
  } catch (err: any) {
    console.error('[Git Commits] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

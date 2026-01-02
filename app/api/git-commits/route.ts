export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: 통합 커밋 로그 조회 (대시보드용)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const projectId = searchParams.get('project_id')
    const search = searchParams.get('search')

    const adminClient = createAdminClient()

    let query = adminClient
      .from('git_commits' as any)
      .select(`
        *,
        project:projects(id, name, project_type, color)
      `)
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
    const body = await request.json()
    const {
      project_id,
      user_id,
      commit_hash,
      commit_message,
      author_name,
      files_changed,
      insertions,
      deletions,
      branch,
      committed_at
    } = body

    const adminClient = createAdminClient()

    const { data: commit, error } = await adminClient
      .from('git_commits' as any)
      .insert({
        user_id: user_id || '00000000-0000-0000-0000-000000000001',
        project_id,
        commit_hash,
        commit_message,
        author_name,
        files_changed: files_changed || 0,
        insertions: insertions || 0,
        deletions: deletions || 0,
        branch: branch || 'main',
        committed_at: committed_at || new Date().toISOString()
      } as any)
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

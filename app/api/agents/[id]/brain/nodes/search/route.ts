export const dynamic = 'force-dynamic'

/**
 * Brain Map - Node Search API (자동완성 검색)
 * GET /api/agents/:agentId/brain/nodes/search?q=검색어
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDevMode, DEV_USER } from '@/lib/dev-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('q')?.toLowerCase() || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 1) {
      return NextResponse.json({ nodes: [] })
    }

    const supabase = await createClient()
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const results: Array<{
      id: string
      title: string
      type: string
      source: string
    }> = []

    // 1. agent_work_logs 검색
    const { data: workLogs } = await supabase
      .from('agent_work_logs')
      .select('id, title, log_type, summary')
      .eq('agent_id', agentId)
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (workLogs) {
      workLogs.forEach((log: any) => {
        results.push({
          id: log.id,
          title: log.title || log.summary?.substring(0, 50) || `${log.log_type} 로그`,
          type: log.log_type,
          source: 'work_logs'
        })
      })
    }

    // 2. agent_knowledge 검색
    const { data: knowledge } = await supabase
      .from('agent_knowledge')
      .select('id, subject, knowledge_type, content')
      .eq('agent_id', agentId)
      .or(`subject.ilike.%${query}%,content.ilike.%${query}%`)
      .order('use_count', { ascending: false })
      .limit(limit)

    if (knowledge) {
      knowledge.forEach((k: any) => {
        results.push({
          id: k.id,
          title: k.subject || k.content?.substring(0, 50),
          type: k.knowledge_type,
          source: 'knowledge'
        })
      })
    }

    // 3. agent_commits 검색
    const { data: commits } = await supabase
      .from('agent_commits')
      .select('id, title, summary, commit_type')
      .eq('agent_id', agentId)
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('period_end', { ascending: false })
      .limit(limit)

    if (commits) {
      commits.forEach((c: any) => {
        results.push({
          id: c.id,
          title: c.title || c.summary?.substring(0, 50),
          type: c.commit_type,
          source: 'commits'
        })
      })
    }

    // 결과 정렬 (제목이 검색어로 시작하는 것 우선)
    results.sort((a, b) => {
      const aStarts = a.title?.toLowerCase().startsWith(query) ? 0 : 1
      const bStarts = b.title?.toLowerCase().startsWith(query) ? 0 : 1
      return aStarts - bStarts
    })

    return NextResponse.json({
      nodes: results.slice(0, limit),
      total: results.length
    })
  } catch (error) {
    console.error('[Brain Node Search API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '노드 검색 실패' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * 능동적 제안 목록 조회
 * GET /api/proactive/suggestions
 *
 * Query params:
 * - agentId: 특정 에이전트 필터
 * - userId: 특정 사용자 필터
 * - status: 상태 필터 (pending, delivered, accepted, dismissed, expired, executed)
 * - limit: 조회 개수 (기본 20)
 * - offset: 페이지네이션 오프셋
 */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)

  const agentId = searchParams.get('agentId')
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    let query = supabase
      .from('proactive_suggestions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (agentId) query = query.eq('agent_id', agentId)
    if (userId) query = query.eq('user_id', userId)
    if (status) query = query.eq('status', status)

    const { data, count, error } = await query

    if (error) throw error

    // snake_case → camelCase 변환
    const suggestions = (data || []).map((s) => ({
      id: s.id,
      agentId: s.agent_id,
      userId: s.user_id,
      suggestionType: s.suggestion_type,
      title: s.title,
      titleKr: s.title_kr,
      message: s.message,
      messageKr: s.message_kr,
      context: s.context,
      sourcePatternId: s.source_pattern_id,
      sourceMemoryIds: s.source_memory_ids,
      sourceLearningIds: s.source_learning_ids,
      priority: s.priority,
      scheduledAt: s.scheduled_at,
      expiresAt: s.expires_at,
      status: s.status,
      confidenceScore: s.confidence_score,
      suggestedAction: s.suggested_action,
      actionResult: s.action_result,
      metadata: s.metadata,
      createdAt: s.created_at,
      deliveredAt: s.delivered_at,
      respondedAt: s.responded_at,
    }))

    return NextResponse.json({
      suggestions,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('[Suggestions API] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}

/**
 * 새 제안 생성 (내부용)
 * POST /api/proactive/suggestions
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const {
      agentId,
      userId,
      suggestionType,
      title,
      titleKr,
      message,
      messageKr,
      priority = 'medium',
      confidenceScore = 50,
      suggestedAction,
      expiresAt,
      context,
    } = body

    if (!agentId || !suggestionType || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, suggestionType, title, message' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('proactive_suggestions')
      .insert({
        agent_id: agentId,
        user_id: userId,
        suggestion_type: suggestionType,
        title,
        title_kr: titleKr || title,
        message,
        message_kr: messageKr || message,
        priority,
        confidence_score: confidenceScore,
        suggested_action: suggestedAction,
        expires_at: expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        context: context || {},
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      suggestion: data,
    })
  } catch (error) {
    console.error('[Suggestions API] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to create suggestion' },
      { status: 500 }
    )
  }
}

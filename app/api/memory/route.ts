/**
 * Memory API - 메모리 CRUD 엔드포인트
 *
 * GET: 최근 메모리 조회 또는 필터링된 메모리 조회
 * POST: 새 메모리 추가 (불변 - Append-Only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import {
  createImmutableMemoryService,
  createMemoryEmbeddingService,
  createMemoryAnalysisService,
} from '@/lib/memory'
import { CreateMemoryInput, MemoryEventType, MemoryRole } from '@/types/memory'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const eventType = searchParams.get('event_type') as MemoryEventType | null
    const agent = searchParams.get('agent')
    const ownerAgentId = searchParams.get('owner_agent_id')  // 에이전트별 독립 메모리 필터
    const sessionId = searchParams.get('session_id')
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const natural = searchParams.get('natural') // 자연어 시간 표현

    // Dev mode에서는 adminClient 직접 사용 (RLS 우회)
    const useAdmin = isDevMode()
    const db = useAdmin ? (adminClient as any) : supabase

    let memories

    // 에이전트별 독립 메모리 조회 (owner_agent_id로 필터링)
    if (ownerAgentId) {
      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('owner_agent_id', ownerAgentId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      memories = data || []
    }
    // 세션 ID로 조회
    else if (sessionId) {
      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })

      if (error) throw error
      memories = data || []
    }
    // 자연어 시간 표현으로 조회
    else if (natural) {
      // 자연어 시간 파싱
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let start: Date, end: Date

      const patterns: Record<string, () => { start: Date; end: Date }> = {
        '오늘': () => ({
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        }),
        '어제': () => ({
          start: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          end: today,
        }),
        '이번주': () => {
          const dayOfWeek = now.getDay()
          const weekStart = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
          return { start: weekStart, end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) }
        },
        '지난주': () => {
          const dayOfWeek = now.getDay()
          const thisWeekStart = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
          return { start: new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000), end: thisWeekStart }
        },
        '이번달': () => ({
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        }),
        '지난달': () => ({
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 1),
        }),
      }

      const handler = patterns[natural]
      if (handler) {
        const range = handler()
        start = range.start
        end = range.end
      } else {
        // 기본: 최근 7일
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }

      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', start.toISOString())
        .lt('timestamp', end.toISOString())
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      memories = data || []
    }
    // 특정 날짜로 조회
    else if (date) {
      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      memories = data || []
    }
    // 날짜 범위로 조회
    else if (startDate && endDate) {
      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      memories = data || []
    }
    // 이벤트 타입으로 필터링
    else if (eventType) {
      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_type', eventType)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      memories = data || []
    }
    // 에이전트로 필터링 (source_agent)
    else if (agent) {
      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('source_agent', agent)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      memories = data || []
    }
    // 기본: 최근 메모리
    else {
      const { data, error } = await db
        .from('immutable_memory')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error
      memories = data || []
    }

    return NextResponse.json({
      success: true,
      data: memories,
      count: memories.length,
    })
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      raw_content,
      event_type,
      role,
      source_agent,
      source_model,
      session_id,
      parent_id,
      context,
      timestamp,
      auto_embed = true,
      auto_analyze = false,
    } = body as CreateMemoryInput & {
      auto_embed?: boolean
      auto_analyze?: boolean
    }

    // 필수 필드 검증
    if (!raw_content || !event_type || !role) {
      return NextResponse.json(
        { error: 'raw_content, event_type, role 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const memoryService = createImmutableMemoryService(supabase, user.id)

    // 메모리 저장 (불변)
    const memory = await memoryService.append({
      raw_content,
      event_type,
      role,
      source_agent,
      source_model,
      session_id,
      parent_id,
      context,
      timestamp,
    })

    // 자동 임베딩 생성
    if (auto_embed) {
      try {
        const embeddingService = createMemoryEmbeddingService(supabase, user.id)
        await embeddingService.createEmbeddingForMemory(memory)
      } catch (embError) {
        console.error('Auto embedding failed:', embError)
        // 임베딩 실패해도 메모리 저장은 성공으로 처리
      }
    }

    // 자동 분석 생성
    if (auto_analyze) {
      try {
        const analysisService = createMemoryAnalysisService(supabase, user.id)
        await analysisService.analyzeMemory(memory)
      } catch (anaError) {
        console.error('Auto analysis failed:', anaError)
        // 분석 실패해도 메모리 저장은 성공으로 처리
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: memory,
        message: '메모리가 영구적으로 저장되었습니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Memory POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

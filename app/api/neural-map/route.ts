// @ts-nocheck
/**
 * Neural Map API - Main Routes
 * GET: 사용자의 모든 뉴럴맵 조회
 * POST: 새 뉴럴맵 생성
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// DEV 모드 설정
const DEV_MODE = process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true'
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

// GET /api/neural-map - 사용자의 뉴럴맵 목록 조회
// ?project_id=xxx 로 특정 프로젝트의 맵만 조회 가능
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    let userId: string
    if (DEV_MODE) {
      userId = DEV_USER_ID
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    // 🔥 project_id 쿼리 파라미터 확인
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')

    // 🔥 project_id 컬럼이 없을 수 있으므로 먼저 project_id로 시도하고 실패하면 전체 조회
    let data: any[] | null = null
    let error: any = null

    if (projectId) {
      // project_id로 필터링 시도
      const result = await adminSupabase
        .from('neural_maps')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (result.error?.message?.includes('project_id')) {
        // project_id 컬럼이 없으면 전체 조회 (기존 맵 반환해서 재사용)
        console.log('[NeuralMap] project_id column not found, returning most recent map')
        let fallbackQuery = adminSupabase
          .from('neural_maps')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)

        // DEV 모드가 아니면 user_id 필터 추가
        if (!DEV_MODE) {
          fallbackQuery = fallbackQuery.eq('user_id', userId)
        }

        const fallbackResult = await fallbackQuery
        data = fallbackResult.data
        error = fallbackResult.error
      } else {
        data = result.data
        error = result.error
      }
    } else {
      // project_id 없으면 전체 조회
      const result = await adminSupabase
        .from('neural_maps')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Failed to fetch neural maps:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Neural map GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/neural-map - 새 뉴럴맵 생성
// 프로젝트명이 있으면 프로젝트 루트 노드 생성, 없으면 빈 맵 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    let userId: string
    if (DEV_MODE) {
      userId = DEV_USER_ID
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    const body = await request.json()
    const { title, agentId, project_id } = body

    // title(프로젝트명)이 없으면 에러
    if (!title) {
      return NextResponse.json({ error: 'title (프로젝트명) is required' }, { status: 400 })
    }

    // 1. 뉴럴맵 생성
    const insertData: any = {
      user_id: userId,
      agent_id: agentId || null,
      title,
      theme_id: 'cosmic-dark',
      view_state: {
        activeTab: 'radial',
        expandedNodeIds: [],
        pinnedNodeIds: [],
        selectedNodeIds: [],
        cameraPosition: { x: 0, y: 50, z: 200 },
        cameraTarget: { x: 0, y: 0, z: 0 },
      },
    }

    if (project_id) {
      insertData.project_id = project_id
    }

    let result = await adminSupabase
      .from('neural_maps')
      .insert(insertData)
      .select()
      .single()

    if (result.error?.message?.includes('project_id')) {
      delete insertData.project_id
      result = await adminSupabase
        .from('neural_maps')
        .insert(insertData)
        .select()
        .single()
    }

    const neuralMap = result.data
    if (result.error || !neuralMap) {
      console.error('Failed to create neural map:', result.error)
      return NextResponse.json({ error: result.error?.message }, { status: 500 })
    }

    // 2. 프로젝트 루트 노드 생성 (프로젝트명으로)
    const { data: rootNode, error: nodeError } = await adminSupabase
      .from('neural_nodes')
      .insert({
        map_id: neuralMap.id,
        type: 'project',
        title: title,  // 프로젝트명 사용
        summary: null,
        importance: 10,
        expanded: true,
        pinned: true,
        position: { x: 0, y: 0, z: 0 },
      })
      .select()
      .single()

    if (nodeError) {
      console.error('Failed to create root node:', nodeError)
      await adminSupabase.from('neural_maps').delete().eq('id', neuralMap.id)
      return NextResponse.json({ error: nodeError.message }, { status: 500 })
    }

    // 3. root_node_id 업데이트
    await adminSupabase
      .from('neural_maps')
      .update({ root_node_id: rootNode.id })
      .eq('id', neuralMap.id)

    return NextResponse.json({
      ...neuralMap,
      root_node_id: rootNode.id,
    }, { status: 201 })
  } catch (err) {
    console.error('Neural map POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import type { CreateProjectInput } from '@/types/database'

// GET: List all projects for current user's teams
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 개발 모드: DEV_USER 사용
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')
    const status = searchParams.get('status')

    // 프로젝트 조회 (팀 멤버인 프로젝트만)
    let query = adminClient
      .from('projects')
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email, avatar_url),
        project_members(
          id,
          user_id,
          role,
          joined_at,
          user:users(id, name, email, avatar_url)
        ),
        project_agents(
          id,
          agent_id,
          role,
          is_active,
          assigned_at,
          agent:deployed_agents(id, name, avatar_url, status)
        )
      `)
      .order('created_at', { ascending: false })

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Projects fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

// PATCH: Bulk update projects
export async function PATCH(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()

    // 모든 프로젝트의 project_type 업데이트
    if (body.updateAllToCode) {
      const { data, error } = await (adminClient as any)
        .from('projects')
        .update({ project_type: 'code' })
        .is('project_type', null)
        .select('id')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // project_type이 null이 아닌 경우에도 'code'가 아닌 것들 업데이트
      const { data: data2 } = await (adminClient as any)
        .from('projects')
        .update({ project_type: 'code' })
        .neq('project_type', 'document')
        .neq('project_type', 'design')
        .neq('project_type', 'work')
        .select('id')

      return NextResponse.json({
        updated: (data?.length || 0) + (data2?.length || 0),
        message: '모든 프로젝트가 개발 카테고리로 업데이트되었습니다'
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Projects PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

// POST: Create new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 개발 모드: DEV_USER 사용
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body: CreateProjectInput = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: '프로젝트 이름이 필요합니다' },
        { status: 400 }
      )
    }

    // 프로젝트 생성
    const { data: project, error } = await (adminClient as any)
      .from('projects')
      .insert({
        team_id: body.team_id || null,
        name: body.name,
        description: body.description || null,
        status: body.status || 'planning',
        priority: body.priority || 'medium',
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        deadline: body.deadline || null,
        budget: body.budget || null,
        tags: body.tags || [],
        color: body.color || '#8B5CF6',
        owner_id: user.id,
        progress: 0,
        // 로컬 폴더 불러오기 지원
        folder_path: (body as any).folder_path || null,
        // 하이브리드 Git 시스템
        project_type: (body as any).project_type || 'code',
        git_mode: (body as any).git_mode || 'local_only',
        // 카테고리 지원
        category_id: (body as any).category_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Project create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 프로젝트 생성자를 리드로 자동 추가
    await (adminClient as any).from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
      role: 'lead',
    })

    // 🆕 자동 워크스페이스 폴더 생성 (Supabase Storage)
    // 폴더 생성을 위해 placeholder 파일 업로드
    const workspacePath = `projects/${project.id}/.workspace`
    const workspaceContent = JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    })

    try {
      await adminClient.storage
        .from('neural-files')
        .upload(workspacePath, workspaceContent, {
          contentType: 'application/json',
          upsert: true,
        })
      console.log(`[Project] Created workspace folder for project ${project.id}`)
    } catch (storageError) {
      // Storage 오류는 무시 (프로젝트 생성은 성공)
      console.warn('Workspace folder creation warning:', storageError)
    }

    // 🆕 Neural Map 생성 (프로젝트 루트 노드 포함)
    let neuralMapId: string | null = null
    try {
      // 1. Neural Map 생성
      const mapInsertData: any = {
        user_id: user.id,
        title: project.name,
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

      // project_id 컬럼이 있으면 추가
      let mapResult = await (adminClient as any)
        .from('neural_maps')
        .insert({ ...mapInsertData, project_id: project.id })
        .select()
        .single()

      // project_id 컬럼이 없으면 없이 재시도
      if (mapResult.error?.message?.includes('project_id')) {
        mapResult = await (adminClient as any)
          .from('neural_maps')
          .insert(mapInsertData)
          .select()
          .single()
      }

      if (mapResult.data) {
        const neuralMap = mapResult.data
        neuralMapId = neuralMap.id

        // 2. 프로젝트 루트 노드 생성
        const { data: rootNode } = await (adminClient as any)
          .from('neural_nodes')
          .insert({
            map_id: neuralMap.id,
            type: 'project',
            title: project.name,
            summary: project.description || null,
            importance: 10,
            expanded: true,
            pinned: true,
            position: { x: 0, y: 0, z: 0 },
          })
          .select()
          .single()

        // 3. root_node_id 업데이트
        if (rootNode) {
          await (adminClient as any)
            .from('neural_maps')
            .update({ root_node_id: rootNode.id })
            .eq('id', neuralMap.id)
        }

        console.log(`[Project] Created Neural Map ${neuralMap.id} for project ${project.id}`)
      }
    } catch (mapError) {
      console.warn('[Project] Neural Map creation warning:', mapError)
      // Neural Map 생성 실패해도 프로젝트 생성은 성공
    }

    return NextResponse.json({ ...project, neural_map_id: neuralMapId }, { status: 201 })
  } catch (error) {
    console.error('Project create API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

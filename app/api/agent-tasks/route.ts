import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { executeAgentWithTools } from '@/lib/agent/executor'
import { saveTaskMemory } from '@/lib/memory/memory-service'
import type { DeployedAgent, AgentTask } from '@/types/database'

// GET: List agent tasks
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
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')

    // Get all agents owned by user
    const { data: userAgents } = await (supabase as any)
      .from('deployed_agents')
      .select('id')
      .eq('owner_id', user.id)

    if (!userAgents || userAgents.length === 0) {
      return NextResponse.json([])
    }

    const agentIds = userAgents.map((a: any) => a.id)

    let query = (supabase as any)
      .from('agent_tasks')
      .select(`
        *,
        assignee:deployed_agents!assignee_agent_id(id, name, avatar_url),
        assigner_agent:deployed_agents!assigner_agent_id(id, name, avatar_url)
      `)
      .in('assignee_agent_id', agentIds)
      .order('created_at', { ascending: false })

    if (agentId) {
      query = query.eq('assignee_agent_id', agentId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('업무 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('업무 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

// POST: Assign a task to an agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      instructions,
      assignee_agent_id,
      assigner_agent_id,
      conversation_id,
      startup_id,
      auto_execute = true,
    } = body

    if (!title || !instructions || !assignee_agent_id) {
      return NextResponse.json(
        { error: 'title, instructions, assignee_agent_id가 필요합니다' },
        { status: 400 }
      )
    }

    // Verify assignee agent exists
    const dbClient = isDevMode() ? adminClient : supabase
    let agentQuery = (dbClient as any)
      .from('deployed_agents')
      .select('*')
      .eq('id', assignee_agent_id)

    if (!isDevMode()) {
      agentQuery = agentQuery.eq('owner_id', user.id)
    }

    const { data: assigneeAgent } = await agentQuery.single()

    if (!assigneeAgent) {
      return NextResponse.json(
        { error: '에이전트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // If assigner is an agent, verify it exists
    let assignerAgent: DeployedAgent | null = null
    if (assigner_agent_id) {
      let assignerQuery = (dbClient as any)
        .from('deployed_agents')
        .select('*')
        .eq('id', assigner_agent_id)

      if (!isDevMode()) {
        assignerQuery = assignerQuery.eq('owner_id', user.id)
      }

      const { data } = await assignerQuery.single()
      assignerAgent = data
    }

    // Create the task
    const taskData = {
      title,
      description: description || null,
      instructions,
      assigner_type: assigner_agent_id ? 'AGENT' : 'USER',
      assigner_user_id: assigner_agent_id ? null : user.id,
      assigner_agent_id: assigner_agent_id || null,
      assignee_agent_id,
      status: 'PENDING',
      conversation_id: conversation_id || null,
      startup_id: startup_id || null,
    }

    const { data: task, error: taskError } = await (dbClient as any)
      .from('agent_tasks')
      .insert(taskData)
      .select()
      .single()

    if (taskError) {
      console.error('업무 생성 오류:', taskError)
      return NextResponse.json({ error: taskError.message }, { status: 500 })
    }

    // 장기 메모리에 태스크 생성 저장 (비동기)
    saveTaskMemory({
      userId: user.id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      status: 'PENDING',
      agentId: assignee_agent_id,
      agentName: assigneeAgent.name,
      projectId: startup_id,
      isCompleted: false,
    }).catch((err) => console.error('[Memory] Failed to save task creation:', err))

    // Auto-execute if requested
    if (auto_execute) {
      // Update status to IN_PROGRESS
      await (dbClient as any)
        .from('agent_tasks')
        .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
        .eq('id', task.id)

      // Execute the task with RAG, tools, and API connections
      const result = await executeAgentWithTools(
        assigneeAgent as DeployedAgent,
        task as AgentTask
      )

      // Update task with result and return updated data in one query
      const { data: updatedTask, error: updateError } = await (dbClient as any)
        .from('agent_tasks')
        .update({
          status: result.success ? 'COMPLETED' : 'FAILED',
          result: result.output,
          error: result.error || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .select('*')
        .single()

      if (updateError) {
        console.error('Task update error:', updateError)
      }

      // 장기 메모리에 태스크 완료/실패 저장 (비동기)
      saveTaskMemory({
        userId: user.id,
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: result.success ? 'COMPLETED' : 'FAILED',
        agentId: assignee_agent_id,
        agentName: assigneeAgent.name,
        projectId: startup_id,
        result: result.output,
        error: result.error,
        isCompleted: true,
      }).catch((err) => console.error('[Memory] Failed to save task completion:', err))

      // If there's a conversation, add the result as a message
      if (conversation_id) {
        const taskMessage = {
          conversation_id,
          sender_type: 'AGENT',
          sender_user_id: null,
          sender_agent_id: assignee_agent_id,
          receiver_type: assigner_agent_id ? 'AGENT' : 'USER',
          receiver_user_id: assigner_agent_id ? null : user.id,
          receiver_agent_id: assigner_agent_id || null,
          message_type: assigner_agent_id ? 'AGENT_TO_AGENT' : 'AGENT_TO_USER',
          content: `[작업 완료: ${title}]\n\n${result.output}`,
          metadata: { task_id: task.id, task_result: result.success },
          task_id: task.id,
        }

        await (dbClient as any).from('agent_messages').insert(taskMessage)
      }

      return NextResponse.json(updatedTask, { status: 201 })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('업무 할당 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

// Note: executeAgentTask was replaced with executeAgentWithTools from @/lib/agent/executor
// which supports RAG knowledge base, MCP tools, and API connections

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { predictRisk } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startupId } = body

    if (!startupId) {
      return NextResponse.json({ error: 'Startup ID required' }, { status: 400 })
    }

    // 스타트업 조회
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .single()

    if (startupError || !startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
    }

    // 태스크 통계 조회
    interface TaskRow {
      status: string
      due_date: string | null
    }
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, due_date')
      .eq('startup_id', startupId) as { data: TaskRow[] | null }

    const now = new Date()
    const taskStats = {
      totalTasks: tasks?.length || 0,
      completedTasks: tasks?.filter(t => t.status === 'DONE').length || 0,
      delayedTasks: tasks?.filter(t =>
        t.due_date && new Date(t.due_date) < now && t.status !== 'DONE'
      ).length || 0,
      blockedTasks: tasks?.filter(t => t.status === 'BLOCKED').length || 0,
    }

    // AI 리스크 예측
    const result = await predictRisk(startup, taskStats)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      prediction: result.data,
      taskStats
    })
  } catch (error) {
    console.error('AI risk prediction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

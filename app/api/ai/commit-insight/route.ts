export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateCommitInsight } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // 완료된 태스크(커밋) 조회
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('status', 'DONE')
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Completed task not found' }, { status: 404 })
    }

    // AI 인사이트 생성
    const result = await generateCommitInsight(task)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // 인사이트 저장
    await (supabase.from('tasks') as any)
      .update({
        ai_summary: result.data?.summary,
        impact_score: result.data?.productivityScore,
      })
      .eq('id', taskId)

    return NextResponse.json({
      success: true,
      insight: result.data
    })
  } catch (error) {
    console.error('AI commit insight error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { analyzeTask } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // 태스크 조회
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // AI 분석 실행
    const result = await analyzeTask(task)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // AI 분석 결과 저장
    await (supabase.from('tasks') as any)
      .update({
        ai_summary: result.data?.summary,
        impact_score: result.data?.complexityScore,
      })
      .eq('id', taskId)

    return NextResponse.json({
      success: true,
      analysis: result.data
    })
  } catch (error) {
    console.error('AI analyze task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

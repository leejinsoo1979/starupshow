import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateWeeklyReport } from '@/lib/ai/services'

// GET - 리포트 목록 조회
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startup_id = searchParams.get('startup_id')
  const type = searchParams.get('type') // weekly, monthly
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!startup_id) {
    return NextResponse.json({ error: 'startup_id required' }, { status: 400 })
  }

  // 사용자가 해당 스타트업에 접근 권한이 있는지 확인
  const { data: membership } = await (supabase
    .from('team_members')
    .select('id')
    .eq('startup_id', startup_id)
    .eq('user_id', user.id)
    .single() as any)

  const { data: ownership } = await (supabase
    .from('startups')
    .select('id')
    .eq('id', startup_id)
    .eq('founder_id', user.id)
    .single() as any)

  if (!membership && !ownership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  let query = supabase
    .from('reports')
    .select('*')
    .eq('startup_id', startup_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST - 새 리포트 생성
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { startup_id, type, period_start, period_end } = body

  if (!startup_id || !type) {
    return NextResponse.json({ error: 'startup_id and type required' }, { status: 400 })
  }

  // 권한 확인
  const { data: ownership } = await (supabase
    .from('startups')
    .select('id, name')
    .eq('id', startup_id)
    .eq('founder_id', user.id)
    .single() as any)

  if (!ownership) {
    return NextResponse.json({ error: 'Only founder can generate reports' }, { status: 403 })
  }

  // 해당 기간의 데이터 수집
  const startDate = period_start || getDefaultStartDate(type)
  const endDate = period_end || new Date().toISOString().split('T')[0]

  // 태스크 데이터
  const { data: tasks } = await (supabase
    .from('tasks')
    .select('*')
    .eq('startup_id', startup_id)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59') as any)

  // KPI 데이터
  const { data: kpis } = await (supabase
    .from('kpi_metrics')
    .select('*')
    .eq('startup_id', startup_id)
    .gte('period_start', startDate)
    .lte('period_end', endDate) as any)

  // 팀원 데이터
  const { data: teamMembers } = await (supabase
    .from('team_members')
    .select('*, user:users(name, email)')
    .eq('startup_id', startup_id) as any)

  // 통계 계산
  const stats = calculateStats(tasks || [], kpis || [], teamMembers || [])

  // AI 리포트 생성
  let aiSummary = ''
  try {
    // generateWeeklyReport(startDate, endDate, completedTasks, kpiChanges, milestones)
    const completedTasksSummary = (tasks || [])
      .filter((t: any) => t.status === 'DONE')
      .map((t: any) => t.title)
      .join(', ') || '없음'

    const kpiChangesSummary = (kpis || [])
      .map((k: any) => `${k.metric_type}: ${k.metric_value}${k.metric_unit}`)
      .join(', ') || '없음'

    const result = await generateWeeklyReport(
      startDate,
      endDate,
      completedTasksSummary,
      kpiChangesSummary,
      ownership.name
    )

    if (result.success && result.data) {
      aiSummary = `## 하이라이트\n${result.data.highlights.join('\n')}\n\n## KPI 요약\n${result.data.kpiSummary}\n\n## 다음 주 계획\n${result.data.nextWeekPlan.join('\n')}\n\n## 투자자 어필 포인트\n${result.data.investorAppeal}`
    } else {
      aiSummary = generateFallbackSummary(stats)
    }
  } catch (error) {
    console.error('AI report generation failed:', error)
    aiSummary = generateFallbackSummary(stats)
  }

  // 리포트 저장
  const reportData = {
    startup_id,
    type,
    period_start: startDate,
    period_end: endDate,
    title: `${type === 'weekly' ? '주간' : '월간'} 리포트 (${startDate} ~ ${endDate})`,
    summary: aiSummary,
    stats: stats,
    created_by: user.id
  }

  const { data: report, error } = await ((supabase.from('reports') as any)
    .insert(reportData)
    .select()
    .single())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(report, { status: 201 })
}

// 기본 시작일 계산
function getDefaultStartDate(type: string): string {
  const now = new Date()
  if (type === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return weekAgo.toISOString().split('T')[0]
  } else {
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    return monthAgo.toISOString().split('T')[0]
  }
}

// 통계 계산
function calculateStats(tasks: any[], kpis: any[], teamMembers: any[]) {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'DONE').length
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const todoTasks = tasks.filter(t => t.status === 'TODO').length

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // 우선순위별 태스크
  const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date() && t.status !== 'DONE'
  }).length

  // 팀원별 생산성
  const memberProductivity = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.author_id === member.user_id)
    const memberCompleted = memberTasks.filter(t => t.status === 'DONE').length
    return {
      name: member.user?.name || 'Unknown',
      total: memberTasks.length,
      completed: memberCompleted,
      rate: memberTasks.length > 0 ? Math.round((memberCompleted / memberTasks.length) * 100) : 0
    }
  })

  // KPI 하이라이트
  const kpiHighlights = kpis.slice(0, 5).map(kpi => ({
    type: kpi.metric_type,
    value: kpi.metric_value,
    unit: kpi.metric_unit
  }))

  return {
    taskStats: {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      todo: todoTasks,
      completionRate,
      highPriority: highPriorityTasks,
      overdue: overdueTasks
    },
    kpiHighlights,
    teamActivity: {
      totalMembers: teamMembers.length,
      memberProductivity
    }
  }
}

// AI 실패 시 대체 요약
function generateFallbackSummary(stats: any): string {
  const { taskStats, teamActivity } = stats
  return `
## 요약

### 태스크 현황
- 전체 태스크: ${taskStats.total}개
- 완료: ${taskStats.completed}개 (${taskStats.completionRate}%)
- 진행 중: ${taskStats.inProgress}개
- 대기: ${taskStats.todo}개
- 지연: ${taskStats.overdue}개

### 팀 활동
- 팀원 수: ${teamActivity.totalMembers}명
- 평균 완료율: ${Math.round(teamActivity.memberProductivity.reduce((sum: number, m: any) => sum + m.rate, 0) / (teamActivity.memberProductivity.length || 1))}%

### 권장 사항
1. 지연된 태스크 우선 처리
2. 높은 우선순위 태스크 집중
3. 팀 협업 강화
`.trim()
}

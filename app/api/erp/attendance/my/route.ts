import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET /api/erp/attendance/my - 내 출퇴근 기록
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!employee_id) {
      return apiError('직원 ID가 필요합니다.', 400)
    }

    // 오늘 출퇴근 기록
    const { data: todayRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', employee_id)
      .eq('work_date', date)
      .single()

    // 이번 주 기록 (월요일부터)
    const today = new Date(date)
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const mondayStr = monday.toISOString().split('T')[0]

    const { data: weekRecords } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', employee_id)
      .gte('work_date', mondayStr)
      .lte('work_date', date)
      .order('work_date', { ascending: true })

    // 이번 달 요약
    const firstDayOfMonth = `${date.slice(0, 7)}-01`
    const { data: monthRecords } = await supabase
      .from('attendance_records')
      .select('work_minutes, overtime_minutes, status')
      .eq('company_id', companyId)
      .eq('employee_id', employee_id)
      .gte('work_date', firstDayOfMonth)
      .lte('work_date', date)

    const monthStats = {
      totalWorkDays: monthRecords?.filter(r => r.work_minutes > 0).length || 0,
      totalWorkMinutes: monthRecords?.reduce((sum, r) => sum + (r.work_minutes || 0), 0) || 0,
      totalOvertimeMinutes: monthRecords?.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0) || 0,
      lateCount: monthRecords?.filter(r => r.status === 'late').length || 0,
      earlyLeaveCount: monthRecords?.filter(r => r.status === 'early_leave').length || 0,
    }

    return apiResponse({
      today: todayRecord,
      week: weekRecords || [],
      monthStats,
    })
  } catch (error) {
    console.error('My attendance error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

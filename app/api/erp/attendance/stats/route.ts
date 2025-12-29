import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET /api/erp/attendance/stats - 출퇴근 통계
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // 전체 직원 수
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active')

    // 오늘 출퇴근 기록
    const { data: records } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('work_date', date)

    const stats = {
      total: totalEmployees || 0,
      present: 0,
      late: 0,
      early_leave: 0,
      absent: 0,
      vacation: 0,
      holiday: 0,
    }

    if (records) {
      records.forEach(record => {
        if (record.status === 'normal') {
          stats.present++
        } else if (record.status === 'late') {
          stats.late++
          stats.present++
        } else if (record.status === 'early_leave') {
          stats.early_leave++
          stats.present++
        } else if (record.status === 'absent') {
          stats.absent++
        } else if (record.status === 'vacation') {
          stats.vacation++
        } else if (record.status === 'holiday') {
          stats.holiday++
        }
      })
    }

    // 출근하지 않은 직원 수 (휴가/휴일/결근 제외한 미출근)
    const checkedIn = records?.filter(r => r.check_in).length || 0
    stats.absent = Math.max(0, stats.total - checkedIn - stats.vacation - stats.holiday)

    return apiResponse(stats)
  } catch (error) {
    console.error('Attendance stats error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

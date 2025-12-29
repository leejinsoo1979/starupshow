import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, dateRangeFilter } from '@/lib/erp/api-utils'

// GET: 근태 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, sort_by, sort_order } = parsePaginationParams(searchParams)
    const employeeId = searchParams.get('employee_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        employee:employees!attendance_records_employee_id_fkey(
          id, name, employee_number, profile_image_url,
          department:departments(id, name),
          position:positions!employees_position_id_fkey(id, name)
        )
      `, { count: 'exact' })
      .eq('company_id', companyId)

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = dateRangeFilter(query, 'work_date', startDate || undefined, endDate || undefined)

    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Attendance] GET error:', error)
      return apiError('근태 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Attendance] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 출퇴근 기록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const { employee_id, type, location } = body // type: 'check_in' | 'check_out'

    if (!employee_id) {
      return apiError('직원 ID는 필수입니다.')
    }

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // 오늘 출근 기록 확인
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', employee_id)
      .eq('work_date', today)
      .single()

    if (type === 'check_in') {
      if (existing) {
        return apiError('이미 출근 기록이 있습니다.')
      }

      // 지각 여부 판단 (9시 기준)
      const checkInHour = new Date().getHours()
      const status = checkInHour >= 9 ? 'late' : 'normal'

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          company_id: companyId,
          employee_id,
          work_date: today,
          check_in: now,
          check_in_location: location,
          status,
          work_minutes: 0,
          overtime_minutes: 0,
        })
        .select()
        .single()

      if (error) {
        console.error('[ERP Attendance] check_in error:', error)
        return apiError('출근 기록에 실패했습니다.', 500)
      }

      return apiResponse(data, 201)
    } else if (type === 'check_out') {
      if (!existing) {
        return apiError('출근 기록이 없습니다.')
      }

      if (existing.check_out) {
        return apiError('이미 퇴근 기록이 있습니다.')
      }

      // 근무시간 계산 (분 단위)
      const checkIn = new Date(existing.check_in)
      const checkOut = new Date()
      const workMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)

      // 연장 근무 계산 (8시간 = 480분 초과)
      let overtimeMinutes = 0
      if (workMinutes > 480) {
        overtimeMinutes = workMinutes - 480
      }

      // 조퇴 여부 (18시 이전 퇴근)
      const checkOutHour = checkOut.getHours()
      let status = existing.status
      if (checkOutHour < 18 && status === 'normal') {
        status = 'early_leave'
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          check_out: now,
          check_out_location: location,
          work_minutes: workMinutes,
          overtime_minutes: overtimeMinutes,
          status,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('[ERP Attendance] check_out error:', error)
        return apiError('퇴근 기록에 실패했습니다.', 500)
      }

      return apiResponse(data)
    }

    return apiError('유효하지 않은 요청입니다.')
  } catch (error) {
    console.error('[ERP Attendance] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

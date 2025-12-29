import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams } from '@/lib/erp/api-utils'

// GET: 휴가 신청 목록 조회
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
    const status = searchParams.get('status')

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(id, name, employee_number),
        leave_type:leave_types(id, name, is_paid)
      `, { count: 'exact' })
      .eq('company_id', companyId)

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Leaves] GET error:', error)
      return apiError('휴가 신청 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Leaves] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 휴가 신청
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const { employee_id, leave_type_id, start_date, end_date, reason } = body

    if (!employee_id || !start_date || !end_date) {
      return apiError('필수 정보가 누락되었습니다.')
    }

    // 휴가 일수 계산 (단순 계산, 주말 제외 로직 추가 가능)
    const start = new Date(start_date)
    const end = new Date(end_date)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 연차 잔여 확인
    if (leave_type_id) {
      const { data: leaveType } = await supabase
        .from('leave_types')
        .select('is_annual_leave')
        .eq('id', leave_type_id)
        .single()

      if (leaveType?.is_annual_leave) {
        const year = new Date().getFullYear()
        const { data: balance } = await supabase
          .from('leave_balances')
          .select('annual_leave_remaining')
          .eq('employee_id', employee_id)
          .eq('year', year)
          .single()

        if (!balance || balance.annual_leave_remaining < days) {
          return apiError('연차 잔여일수가 부족합니다.')
        }
      }
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        company_id: companyId,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        days,
        reason,
        status: 'pending',
      })
      .select(`
        *,
        employee:employees(id, name),
        leave_type:leave_types(id, name, color)
      `)
      .single()

    if (error) {
      console.error('[ERP Leaves] POST error:', error)
      return apiError('휴가 신청에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Leaves] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

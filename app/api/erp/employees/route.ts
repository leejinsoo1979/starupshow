import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, parseSearchParams } from '@/lib/erp/api-utils'
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '@/lib/erp/types'

// GET: 직원 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, sort_by, sort_order } = parsePaginationParams(searchParams)
    const { search, filters } = parseSearchParams(searchParams, ['department_id', 'position_id', 'status', 'hire_type'])

    let query = supabase
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(id, name),
        position:positions!employees_position_id_fkey(id, name),
        location:business_locations!employees_location_id_fkey(id, name)
      `, { count: 'exact' })
      .eq('company_id', companyId)

    // 검색
    if (search) {
      query = query.or(`name.ilike.%${search}%,employee_number.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // 필터
    if (filters.department_id) {
      query = query.eq('department_id', filters.department_id)
    }
    if (filters.position_id) {
      query = query.eq('position_id', filters.position_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.hire_type) {
      query = query.eq('hire_type', filters.hire_type)
    }

    // 정렬 및 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Employees] GET error:', error)
      return apiError('직원 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Employees] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 직원 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body: CreateEmployeeInput = await request.json()

    // 필수 필드 검증
    if (!body.name) {
      return apiError('이름은 필수입니다.')
    }

    // 사번 자동 생성 (없으면)
    let employeeNumber = body.employee_number
    if (!employeeNumber) {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      const year = new Date().getFullYear().toString().slice(-2)
      employeeNumber = `${year}${String((count || 0) + 1).padStart(4, '0')}`
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...body,
        company_id: companyId,
        employee_number: employeeNumber,
        status: body.status || 'active',
        hire_type: body.hire_type || 'regular',
      })
      .select(`
        *,
        department:departments(id, name),
        position:positions(id, name)
      `)
      .single()

    if (error) {
      console.error('[ERP Employees] POST error:', error)
      return apiError('직원 등록에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Employees] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

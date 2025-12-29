import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, dateRangeFilter } from '@/lib/erp/api-utils'

// GET: 경비 신청 목록 조회
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
    const categoryId = searchParams.get('category_id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('expense_requests')
      .select(`
        *,
        employee:employees!expense_requests_employee_id_fkey(id, name, employee_number),
        category:expense_categories(id, name),
        corporate_card:corporate_cards(id, card_name)
      `, { count: 'exact' })
      .eq('company_id', companyId)

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    query = dateRangeFilter(query, 'expense_date', startDate || undefined, endDate || undefined)

    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Expenses] GET error:', error)
      return apiError('경비 신청 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Expenses] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 경비 신청
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const {
      employee_id,
      expense_date,
      category_id,
      amount,
      payment_method,
      corporate_card_id,
      merchant_name,
      description,
      receipt_url,
      receipt_type,
    } = body

    if (!employee_id || !expense_date || !amount) {
      return apiError('필수 정보가 누락되었습니다.')
    }

    // 신청번호 생성
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const { count } = await supabase
      .from('expense_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', new Date().toISOString().slice(0, 10))

    const requestNumber = `E${date}-${String((count || 0) + 1).padStart(4, '0')}`

    const { data, error } = await supabase
      .from('expense_requests')
      .insert({
        company_id: companyId,
        employee_id,
        request_number: requestNumber,
        expense_date,
        category_id,
        amount,
        payment_method: payment_method || 'cash',
        corporate_card_id,
        merchant_name,
        description,
        receipt_url,
        receipt_type,
        status: 'pending',
      })
      .select(`
        *,
        employee:employees(id, name),
        category:expense_categories(id, name)
      `)
      .single()

    if (error) {
      console.error('[ERP Expenses] POST error:', error)
      return apiError('경비 신청에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Expenses] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, parseSearchParams } from '@/lib/erp/api-utils'

// GET: 거래처 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, sort_by, sort_order } = parsePaginationParams(searchParams)
    const { search, filters } = parseSearchParams(searchParams, ['partner_type', 'is_active'])

    let query = supabase
      .from('business_partners')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,business_number.ilike.%${search}%`)
    }

    if (filters.partner_type) {
      query = query.eq('partner_type', filters.partner_type)
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true')
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Partners] GET error:', error)
      return apiError('거래처 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Partners] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 거래처 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.name) {
      return apiError('거래처명은 필수입니다.')
    }

    const { data, error } = await supabase
      .from('business_partners')
      .insert({
        ...body,
        company_id: companyId,
        partner_type: body.partner_type || 'customer',
        payment_terms: body.payment_terms || 30,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[ERP Partners] POST error:', error)
      return apiError('거래처 등록에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Partners] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

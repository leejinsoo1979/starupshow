import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, parseSearchParams } from '@/lib/erp/api-utils'

// GET: 품목 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, sort_by, sort_order } = parsePaginationParams(searchParams)
    const { search, filters } = parseSearchParams(searchParams, ['product_type', 'category', 'is_active'])

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    if (filters.product_type) {
      query = query.eq('product_type', filters.product_type)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
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
      console.error('[ERP Products] GET error:', error)
      return apiError('품목 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Products] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 품목 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.name) {
      return apiError('품목명은 필수입니다.')
    }

    // 품목코드 자동 생성 (없으면)
    let productCode = body.code
    if (!productCode) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      productCode = `P${String((count || 0) + 1).padStart(5, '0')}`
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...body,
        company_id: companyId,
        code: productCode,
        product_type: body.product_type || 'product',
        unit: body.unit || 'EA',
        selling_price: body.selling_price || 0,
        purchase_price: body.purchase_price || 0,
        tax_type: body.tax_type || 'taxable',
        tax_rate: body.tax_rate ?? 10,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[ERP Products] POST error:', error)
      return apiError('품목 등록에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Products] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 품목 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return apiError('품목을 찾을 수 없습니다.', 404)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Product] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 품목 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('products')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Product] PUT error:', error)
      return apiError('품목 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Product] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 품목 비활성화
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Product] DELETE error:', error)
      return apiError('품목 비활성화에 실패했습니다.', 500)
    }

    return apiResponse({ message: '품목이 비활성화되었습니다.' })
  } catch (error) {
    console.error('[ERP Product] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 사업장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('business_locations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('[ERP Locations] GET error:', error)
      return apiError('사업장 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Locations] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 사업장 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.name) {
      return apiError('사업장명은 필수입니다.')
    }

    // 본사 설정 시 기존 본사 해제
    if (body.is_headquarters) {
      await supabase
        .from('business_locations')
        .update({ is_headquarters: false })
        .eq('company_id', companyId)
        .eq('is_headquarters', true)
    }

    const { data, error } = await supabase
      .from('business_locations')
      .insert({
        ...body,
        company_id: companyId,
        location_type: body.location_type || 'branch',
        is_headquarters: body.is_headquarters || false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[ERP Locations] POST error:', error)
      return apiError('사업장 등록에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Locations] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

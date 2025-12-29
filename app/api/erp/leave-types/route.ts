import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 휴가 유형 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('[ERP Leave Types] GET error:', error)
      return apiError('휴가 유형을 불러올 수 없습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Leave Types] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 휴가 유형 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.name) {
      return apiError('휴가 유형명은 필수입니다.')
    }

    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        ...body,
        company_id: companyId,
        is_paid: body.is_paid ?? true,
        is_annual_leave: body.is_annual_leave ?? false,
        default_days: body.default_days || 0,
        color: body.color || '#3B82F6',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[ERP Leave Types] POST error:', error)
      return apiError('휴가 유형 생성에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Leave Types] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 직급/직책 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const positionType = searchParams.get('type') // 'rank' | 'title'

    let query = supabase
      .from('positions')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (positionType) {
      query = query.eq('position_type', positionType)
    }

    const { data, error } = await query.order('level', { ascending: true })

    if (error) {
      console.error('[ERP Positions] GET error:', error)
      return apiError('직급/직책 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Positions] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 직급/직책 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.name) {
      return apiError('직급/직책명은 필수입니다.')
    }

    // 정렬 순서 자동 설정
    const { count } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('position_type', body.position_type || 'rank')

    const { data, error } = await supabase
      .from('positions')
      .insert({
        ...body,
        company_id: companyId,
        position_type: body.position_type || 'rank',
        level: body.level || (count || 0) + 1,
        sort_order: (count || 0) + 1,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[ERP Positions] POST error:', error)
      return apiError('직급/직책 생성에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Positions] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

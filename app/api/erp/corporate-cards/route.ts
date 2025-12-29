import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 법인카드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('corporate_cards')
      .select(`
        *,
        holder:employees!corporate_cards_holder_id_fkey(id, name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('card_name')

    if (error) {
      console.error('[ERP Corporate Cards] GET error:', error)
      return apiError('법인카드 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Corporate Cards] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 법인카드 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.card_name) {
      return apiError('카드명은 필수입니다.')
    }

    const { data, error } = await supabase
      .from('corporate_cards')
      .insert({
        ...body,
        company_id: companyId,
        is_active: true,
      })
      .select(`
        *,
        holder:employees(id, name)
      `)
      .single()

    if (error) {
      console.error('[ERP Corporate Cards] POST error:', error)
      return apiError('법인카드 등록에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Corporate Cards] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

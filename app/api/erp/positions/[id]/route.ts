import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// PUT: 직급/직책 수정
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
      .from('positions')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Position] PUT error:', error)
      return apiError('직급/직책 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Position] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 직급/직책 삭제 (비활성화)
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

    // 해당 직급 사용 중인 직원 확인
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('position_id', params.id)
      .eq('status', 'active')

    if (count && count > 0) {
      return apiError('해당 직급을 사용 중인 직원이 있어 삭제할 수 없습니다.')
    }

    // 비활성화 처리
    const { data, error } = await supabase
      .from('positions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Position] DELETE error:', error)
      return apiError('직급/직책 삭제에 실패했습니다.', 500)
    }

    return apiResponse({ message: '직급/직책이 삭제되었습니다.' })
  } catch (error) {
    console.error('[ERP Position] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

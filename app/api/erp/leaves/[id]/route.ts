import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 휴가 신청 상세 조회
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
      .from('leave_requests')
      .select(`
        *,
        employee:employees(id, name, employee_number, department:departments(name)),
        leave_type:leave_types(*),
        approver:employees!leave_requests_approver_id_fkey(id, name)
      `)
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error) {
      console.error('[ERP Leave] GET error:', error)
      return apiError('휴가 신청 정보를 불러올 수 없습니다.', 404)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Leave] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 휴가 승인/반려
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
    const { status, approver_id, rejection_reason } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return apiError('유효하지 않은 상태입니다.')
    }

    // 현재 휴가 신청 조회
    const { data: current } = await supabase
      .from('leave_requests')
      .select('*, leave_type:leave_types(is_annual_leave)')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('휴가 신청을 찾을 수 없습니다.', 404)
    }

    if (current.status !== 'pending') {
      return apiError('이미 처리된 휴가 신청입니다.')
    }

    const now = new Date().toISOString()

    // 휴가 상태 업데이트
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status,
        approver_id,
        approved_at: status === 'approved' ? now : null,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[ERP Leave] PUT error:', error)
      return apiError('휴가 처리에 실패했습니다.', 500)
    }

    // 승인 시 연차 잔여일수 차감
    if (status === 'approved' && current.leave_type?.is_annual_leave) {
      const year = new Date().getFullYear()
      const { error: balanceError } = await supabase
        .rpc('decrement_annual_leave', {
          p_employee_id: current.employee_id,
          p_year: year,
          p_days: current.days,
        })

      if (balanceError) {
        console.error('[ERP Leave] balance update error:', balanceError)
        // 롤백이 필요할 수 있음
      }
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Leave] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 휴가 신청 취소
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

    // 현재 상태 확인
    const { data: current } = await supabase
      .from('leave_requests')
      .select('status')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('휴가 신청을 찾을 수 없습니다.', 404)
    }

    if (current.status !== 'pending') {
      return apiError('대기 중인 휴가만 취소할 수 있습니다.')
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[ERP Leave] DELETE error:', error)
      return apiError('휴가 취소에 실패했습니다.', 500)
    }

    return apiResponse({ message: '휴가 신청이 취소되었습니다.' })
  } catch (error) {
    console.error('[ERP Leave] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 경비 신청 상세 조회
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
      .from('expense_requests')
      .select(`
        *,
        employee:employees(id, name, employee_number, department:departments(name)),
        category:expense_categories(*),
        corporate_card:corporate_cards(id, card_name, card_number),
        approver:employees!expense_requests_approver_id_fkey(id, name)
      `)
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return apiError('경비 신청을 찾을 수 없습니다.', 404)
    }

    // 결재 이력 조회
    const { data: approvals } = await supabase
      .from('expense_approvals')
      .select(`
        *,
        approver:employees(id, name, position:positions(name))
      `)
      .eq('expense_request_id', params.id)
      .order('approval_order')

    return apiResponse({
      ...data,
      approvals: approvals || [],
    })
  } catch (error) {
    console.error('[ERP Expense] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 경비 승인/반려/수정
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
    const { action, approver_id, rejection_reason, ...updateFields } = body

    // 현재 상태 조회
    const { data: current } = await supabase
      .from('expense_requests')
      .select('status')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('경비 신청을 찾을 수 없습니다.', 404)
    }

    const now = new Date().toISOString()

    // 승인/반려 처리
    if (action === 'approve' || action === 'reject') {
      if (current.status !== 'pending') {
        return apiError('대기 중인 신청만 처리할 수 있습니다.')
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      const { data, error } = await supabase
        .from('expense_requests')
        .update({
          status: newStatus,
          approver_id,
          approved_at: action === 'approve' ? now : null,
          rejection_reason: action === 'reject' ? rejection_reason : null,
          updated_at: now,
        })
        .eq('id', params.id)
        .select()
        .single()

      if (error) {
        console.error('[ERP Expense] action error:', error)
        return apiError('경비 처리에 실패했습니다.', 500)
      }

      // 결재 이력 추가
      await supabase
        .from('expense_approvals')
        .insert({
          expense_request_id: params.id,
          approver_id,
          approval_order: 1,
          status: newStatus === 'approved' ? 'approved' : 'rejected',
          approved_at: now,
          comment: rejection_reason,
        })

      return apiResponse(data)
    }

    // 정산 처리
    if (action === 'reimburse') {
      if (current.status !== 'approved') {
        return apiError('승인된 신청만 정산 처리할 수 있습니다.')
      }

      const { data, error } = await supabase
        .from('expense_requests')
        .update({
          status: 'reimbursed',
          reimbursed_at: now,
          reimbursement_amount: body.reimbursement_amount,
          updated_at: now,
        })
        .eq('id', params.id)
        .select()
        .single()

      if (error) {
        console.error('[ERP Expense] reimburse error:', error)
        return apiError('정산 처리에 실패했습니다.', 500)
      }

      return apiResponse(data)
    }

    // 일반 수정 (draft 상태만)
    if (current.status !== 'draft' && current.status !== 'pending') {
      return apiError('수정할 수 없는 상태입니다.')
    }

    const { data, error } = await supabase
      .from('expense_requests')
      .update({
        ...updateFields,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[ERP Expense] PUT error:', error)
      return apiError('경비 신청 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Expense] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 경비 신청 취소
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
      .from('expense_requests')
      .select('status')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('경비 신청을 찾을 수 없습니다.', 404)
    }

    if (!['draft', 'pending'].includes(current.status)) {
      return apiError('대기 중인 신청만 취소할 수 있습니다.')
    }

    // 실제 삭제 대신 상태 변경
    const { error } = await supabase
      .from('expense_requests')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[ERP Expense] DELETE error:', error)
      return apiError('경비 신청 취소에 실패했습니다.', 500)
    }

    return apiResponse({ message: '경비 신청이 취소되었습니다.' })
  } catch (error) {
    console.error('[ERP Expense] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

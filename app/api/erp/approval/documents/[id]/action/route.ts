import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/erp/approval/documents/[id]/action - 결재 처리 (승인/반려/취소)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const body = await request.json()
    const { action, approver_id, comment } = body

    if (!action || !approver_id) {
      return apiError('액션과 결재자 ID는 필수입니다.', 400)
    }

    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return apiError('유효하지 않은 액션입니다.', 400)
    }

    // 문서 조회
    const { data: document } = await supabase
      .from('approval_documents')
      .select(`
        *,
        approval_lines(
          id, approver_id, step_order, approval_type, status
        )
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (!document) {
      return apiError('결재 문서를 찾을 수 없습니다.', 404)
    }

    // 취소 처리 (기안자만)
    if (action === 'cancel') {
      if (document.drafter_id !== approver_id) {
        return apiError('기안자만 취소할 수 있습니다.', 403)
      }

      if (document.status !== 'pending') {
        return apiError('대기 중인 문서만 취소할 수 있습니다.', 400)
      }

      const { data, error } = await supabase
        .from('approval_documents')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return apiError('취소 처리에 실패했습니다.', 500)
      }

      return apiResponse(data)
    }

    // 승인/반려 처리
    if (document.status !== 'pending') {
      return apiError('대기 중인 문서만 결재할 수 있습니다.', 400)
    }

    // 현재 결재 순서 확인
    const sortedLines = document.approval_lines
      ?.sort((a: any, b: any) => a.step_order - b.step_order) || []

    const currentLine = sortedLines.find((line: any) => line.status === 'pending')

    if (!currentLine) {
      return apiError('결재 대기 중인 단계가 없습니다.', 400)
    }

    if (currentLine.approver_id !== approver_id) {
      return apiError('현재 결재 순서가 아닙니다.', 403)
    }

    const now = new Date().toISOString()

    // 결재선 상태 업데이트
    const lineStatus = action === 'approve' ? 'approved' : 'rejected'
    const { error: lineError } = await supabase
      .from('approval_lines')
      .update({
        status: lineStatus,
        action_date: now,
        comment: comment || null,
      })
      .eq('id', currentLine.id)

    if (lineError) {
      console.error('Update approval line error:', lineError)
      return apiError('결재 처리에 실패했습니다.', 500)
    }

    // 문서 상태 결정
    let documentStatus = 'pending'

    if (action === 'reject') {
      // 반려 시 문서 상태 변경
      documentStatus = 'rejected'

      // 나머지 결재선도 건너뛰기 처리
      await supabase
        .from('approval_lines')
        .update({ status: 'skipped' })
        .eq('document_id', id)
        .gt('step_order', currentLine.step_order)
    } else {
      // 승인 시 다음 결재자 확인
      const nextLine = sortedLines.find((line: any) =>
        line.step_order > currentLine.step_order && line.status === 'pending'
      )

      if (!nextLine) {
        // 모든 결재 완료
        documentStatus = 'approved'
      }
    }

    // 문서 상태 업데이트
    const docUpdates: any = {
      status: documentStatus,
      updated_at: now,
    }

    if (documentStatus === 'approved' || documentStatus === 'rejected') {
      docUpdates.completed_at = now
    }

    const { data: updatedDoc, error: docError } = await supabase
      .from('approval_documents')
      .update(docUpdates)
      .eq('id', id)
      .select()
      .single()

    if (docError) {
      console.error('Update document status error:', docError)
      return apiError('문서 상태 업데이트에 실패했습니다.', 500)
    }

    return apiResponse({
      document: updatedDoc,
      action,
      message: action === 'approve'
        ? (documentStatus === 'approved' ? '최종 승인되었습니다.' : '승인 처리되었습니다.')
        : '반려되었습니다.',
    })
  } catch (error) {
    console.error('Approval action API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

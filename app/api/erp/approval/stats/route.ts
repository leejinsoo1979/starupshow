import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET /api/erp/approval/stats - 결재 통계
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')

    // 전체 통계
    const { data: allDocs } = await supabase
      .from('approval_documents')
      .select('id, status, drafter_id')
      .eq('company_id', companyId)

    // 결재 대기 문서 (내가 결재해야 할 것)
    let inbox = 0
    if (employee_id) {
      const { data: pendingLines } = await supabase
        .from('approval_lines')
        .select(`
          id,
          document:approval_documents!inner(id, status)
        `)
        .eq('approver_id', employee_id)
        .eq('status', 'pending')

      inbox = pendingLines?.filter(line =>
        (line.document as any)?.status === 'pending'
      ).length || 0
    }

    // 내가 상신한 문서
    const sent = employee_id
      ? allDocs?.filter(d => d.drafter_id === employee_id).length || 0
      : 0

    // 임시저장
    const drafts = employee_id
      ? allDocs?.filter(d => d.drafter_id === employee_id && d.status === 'draft').length || 0
      : 0

    // 완료된 문서
    const completed = allDocs?.filter(d =>
      ['approved', 'rejected'].includes(d.status)
    ).length || 0

    // 이번 달 통계
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyDocs } = await supabase
      .from('approval_documents')
      .select('status, completed_at')
      .eq('company_id', companyId)
      .gte('draft_date', firstDayOfMonth.toISOString().split('T')[0])

    const monthlyStats = {
      total: monthlyDocs?.length || 0,
      approved: monthlyDocs?.filter(d => d.status === 'approved').length || 0,
      rejected: monthlyDocs?.filter(d => d.status === 'rejected').length || 0,
      pending: monthlyDocs?.filter(d => d.status === 'pending').length || 0,
    }

    return apiResponse({
      inbox,
      sent,
      drafts,
      completed,
      monthly: monthlyStats,
    })
  } catch (error) {
    console.error('Approval stats error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/erp/approval/documents/[id] - 결재 문서 상세
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const { data, error } = await supabase
      .from('approval_documents')
      .select(`
        *,
        template:approval_templates(id, name, code, category, form_fields),
        drafter:employees!approval_documents_drafter_id_fkey(
          id, name, profile_image_url, email,
          department:departments(id, name),
          position:positions!employees_position_id_fkey(id, name)
        ),
        approval_lines(
          id, approver_id, step_order, approval_type, status, action_date, comment,
          approver:employees!approval_lines_approver_id_fkey(
            id, name, profile_image_url,
            department:departments(id, name),
            position:positions!employees_position_id_fkey(id, name)
          )
        ),
        comments:approval_comments(
          id, content, created_at,
          employee:employees!approval_comments_employee_id_fkey(id, name, profile_image_url)
        )
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (error) {
      console.error('Get document error:', error)
      return apiError('결재 문서를 찾을 수 없습니다.', 404)
    }

    // 결재선 정렬
    if (data.approval_lines) {
      data.approval_lines.sort((a: any, b: any) => a.step_order - b.step_order)
    }

    // 댓글 정렬
    if (data.comments) {
      data.comments.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    return apiResponse(data)
  } catch (error) {
    console.error('Get document API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT /api/erp/approval/documents/[id] - 결재 문서 수정 (임시저장 문서만)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    // 기존 문서 확인
    const { data: existing } = await supabase
      .from('approval_documents')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (!existing) {
      return apiError('결재 문서를 찾을 수 없습니다.', 404)
    }

    if (existing.status !== 'draft') {
      return apiError('임시저장 문서만 수정할 수 있습니다.', 400)
    }

    const body = await request.json()
    const { title, content, form_data, is_urgent, approval_lines, attachments, submit } = body

    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (form_data !== undefined) updates.form_data = form_data
    if (is_urgent !== undefined) updates.is_urgent = is_urgent
    if (attachments !== undefined) updates.attachments = attachments

    // 상신 처리
    if (submit) {
      updates.status = 'pending'
    }

    const { data, error } = await supabase
      .from('approval_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update document error:', error)
      return apiError('결재 문서 수정에 실패했습니다.', 500)
    }

    // 결재선 업데이트 (상신 시)
    if (submit && approval_lines && approval_lines.length > 0) {
      // 기존 결재선 삭제
      await supabase.from('approval_lines').delete().eq('document_id', id)

      // 새 결재선 생성
      const linesToInsert = approval_lines.map((line: any, index: number) => ({
        document_id: id,
        approver_id: line.approver_id,
        step_order: index + 1,
        approval_type: line.approval_type || 'approval',
        status: 'pending',
      }))

      await supabase.from('approval_lines').insert(linesToInsert)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('Update document API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE /api/erp/approval/documents/[id] - 결재 문서 삭제 (임시저장만)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    // 문서 확인
    const { data: existing } = await supabase
      .from('approval_documents')
      .select('status')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (!existing) {
      return apiError('결재 문서를 찾을 수 없습니다.', 404)
    }

    if (existing.status !== 'draft') {
      return apiError('임시저장 문서만 삭제할 수 있습니다.', 400)
    }

    // 결재선 삭제
    await supabase.from('approval_lines').delete().eq('document_id', id)

    // 댓글 삭제
    await supabase.from('approval_comments').delete().eq('document_id', id)

    // 문서 삭제
    const { error } = await supabase
      .from('approval_documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete document error:', error)
      return apiError('결재 문서 삭제에 실패했습니다.', 500)
    }

    return apiResponse({ message: '삭제되었습니다.' })
  } catch (error) {
    console.error('Delete document API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

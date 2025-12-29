import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/erp/approval/documents/[id]/comments - 댓글 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const body = await request.json()
    const { employee_id, content } = body

    if (!employee_id || !content) {
      return apiError('작성자와 내용은 필수입니다.', 400)
    }

    // 문서 존재 확인
    const { data: document } = await supabase
      .from('approval_documents')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (!document) {
      return apiError('결재 문서를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('approval_comments')
      .insert({
        document_id: id,
        employee_id,
        content,
      })
      .select(`
        *,
        employee:employees!approval_comments_employee_id_fkey(id, name, profile_image_url)
      `)
      .single()

    if (error) {
      console.error('Create comment error:', error)
      return apiError('댓글 작성에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('Create comment API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

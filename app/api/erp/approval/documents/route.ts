import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams } from '@/lib/erp/api-utils'

// 문서번호 생성
function generateDocumentNumber(category: string): string {
  const prefix = category.toUpperCase().slice(0, 3)
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${year}-${random}`
}

// GET /api/erp/approval/documents - 결재 문서 목록
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, sort_by, sort_order } = parsePaginationParams(searchParams)

    const tab = searchParams.get('tab') // inbox, sent, drafts, completed
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const employee_id = searchParams.get('employee_id') // 현재 사용자
    const search = searchParams.get('search')

    let query = supabase
      .from('approval_documents')
      .select(`
        *,
        template:approval_templates(id, name, code, category),
        drafter:employees!approval_documents_drafter_id_fkey(
          id, name, profile_image_url,
          department:departments(id, name),
          position:positions!employees_position_id_fkey(id, name)
        ),
        approval_lines(
          id, approver_id, step_order, approval_type, status, action_date, comment,
          approver:employees!approval_lines_approver_id_fkey(id, name, position:positions!employees_position_id_fkey(id, name))
        )
      `, { count: 'exact' })
      .eq('company_id', companyId)

    // 탭 필터
    if (tab === 'inbox' && employee_id) {
      // 내가 결재해야 할 문서
      query = query
        .eq('status', 'pending')
        .contains('approval_lines', [{ approver_id: employee_id, status: 'pending' }])
    } else if (tab === 'sent' && employee_id) {
      // 내가 상신한 문서
      query = query.eq('drafter_id', employee_id)
    } else if (tab === 'drafts' && employee_id) {
      // 임시저장
      query = query.eq('drafter_id', employee_id).eq('status', 'draft')
    } else if (tab === 'completed') {
      // 완료된 문서
      query = query.in('status', ['approved', 'rejected'])
    }

    // 카테고리 필터
    if (category && category !== 'all') {
      query = query.eq('template.category', category)
    }

    // 상태 필터
    if (status) {
      query = query.eq('status', status)
    }

    // 검색
    if (search) {
      query = query.or(`title.ilike.%${search}%,document_number.ilike.%${search}%`)
    }

    // 정렬 및 페이지네이션
    const offset = (page - 1) * limit
    query = query
      .order('is_urgent', { ascending: false })
      .order(sort_by === 'created_at' ? 'draft_date' : sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Approval documents query error:', error)
      return apiError('결재 문서를 불러올 수 없습니다.', 500)
    }

    // 현재 결재자 정보 추가
    const enrichedData = data?.map(doc => {
      const pendingLine = doc.approval_lines
        ?.sort((a: any, b: any) => a.step_order - b.step_order)
        ?.find((line: any) => line.status === 'pending')

      return {
        ...doc,
        current_approver: pendingLine?.approver || null,
        approval_step: doc.approval_lines?.filter((l: any) => l.status !== 'pending').length || 0,
        total_steps: doc.approval_lines?.length || 0,
      }
    })

    return apiResponse({
      data: enrichedData || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Approval documents API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST /api/erp/approval/documents - 결재 문서 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const body = await request.json()
    const {
      template_id,
      title,
      content,
      form_data,
      drafter_id,
      is_urgent,
      approval_lines,
      attachments,
      save_as_draft,
    } = body

    if (!title || !drafter_id) {
      return apiError('제목과 기안자는 필수입니다.', 400)
    }

    // 템플릿 정보 조회
    let category = 'general'
    if (template_id) {
      const { data: template } = await supabase
        .from('approval_templates')
        .select('category')
        .eq('id', template_id)
        .single()
      category = template?.category || 'general'
    }

    // 문서 생성
    const documentNumber = generateDocumentNumber(category)
    const status = save_as_draft ? 'draft' : 'pending'

    const { data: document, error: docError } = await supabase
      .from('approval_documents')
      .insert({
        company_id: companyId,
        template_id,
        document_number: documentNumber,
        title,
        content,
        form_data: form_data || {},
        drafter_id,
        draft_date: new Date().toISOString().split('T')[0],
        status,
        is_urgent: is_urgent || false,
        attachments: attachments || [],
      })
      .select()
      .single()

    if (docError) {
      console.error('Create document error:', docError)
      return apiError('결재 문서 생성에 실패했습니다.', 500)
    }

    // 결재선 생성
    if (approval_lines && approval_lines.length > 0 && !save_as_draft) {
      const linesToInsert = approval_lines.map((line: any, index: number) => ({
        document_id: document.id,
        approver_id: line.approver_id,
        step_order: index + 1,
        approval_type: line.approval_type || 'approval',
        status: 'pending',
      }))

      const { error: lineError } = await supabase
        .from('approval_lines')
        .insert(linesToInsert)

      if (lineError) {
        console.error('Create approval lines error:', lineError)
        // 문서는 생성되었으므로 경고만 출력
      }
    }

    return apiResponse(document, 201)
  } catch (error) {
    console.error('Create document API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET /api/erp/approval/templates - 결재 양식 목록
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabase
      .from('approval_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Approval templates error:', error)
      return apiError('결재 양식을 불러올 수 없습니다.', 500)
    }

    return apiResponse(data || [])
  } catch (error) {
    console.error('Approval templates API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST /api/erp/approval/templates - 결재 양식 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사 정보를 찾을 수 없습니다.', 401)
    }

    const body = await request.json()
    const { name, code, category, description, form_fields, default_approvers } = body

    if (!name || !category) {
      return apiError('양식 이름과 분류는 필수입니다.', 400)
    }

    // 정렬 순서 계산
    const { count } = await supabase
      .from('approval_templates')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { data, error } = await supabase
      .from('approval_templates')
      .insert({
        company_id: companyId,
        name,
        code,
        category,
        description,
        form_fields: form_fields || [],
        default_approvers: default_approvers || [],
        sort_order: (count || 0) + 1,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create template error:', error)
      return apiError('결재 양식 생성에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('Create template API error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

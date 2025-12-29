import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 부서 목록 조회 (트리 구조)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const flat = searchParams.get('flat') === 'true'

    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        manager:employees!departments_manager_id_fkey(id, name),
        location:business_locations!departments_location_id_fkey(id, name)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[ERP Departments] GET error:', error)
      return apiError('부서 목록을 불러올 수 없습니다.', 500)
    }

    // flat=true면 그대로 반환, 아니면 트리 구조로 변환
    if (flat) {
      return apiResponse(data)
    }

    // 트리 구조로 변환
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }))
    }

    const tree = buildTree(data || [])
    return apiResponse(tree)
  } catch (error) {
    console.error('[ERP Departments] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 부서 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.name) {
      return apiError('부서명은 필수입니다.')
    }

    // 정렬 순서 자동 설정
    const { count } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('parent_id', body.parent_id || null)

    const { data, error } = await supabase
      .from('departments')
      .insert({
        ...body,
        company_id: companyId,
        sort_order: (count || 0) + 1,
        is_active: true,
      })
      .select(`
        *,
        manager:employees!departments_manager_id_fkey(id, name)
      `)
      .single()

    if (error) {
      console.error('[ERP Departments] POST error:', error)
      return apiError('부서 생성에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Departments] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

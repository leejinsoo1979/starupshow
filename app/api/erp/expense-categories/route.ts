import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 경비 카테고리 목록 조회
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
      .from('expense_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('[ERP Expense Categories] GET error:', error)
      return apiError('경비 카테고리를 불러올 수 없습니다.', 500)
    }

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
    console.error('[ERP Expense Categories] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 경비 카테고리 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    if (!body.name) {
      return apiError('카테고리명은 필수입니다.')
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        ...body,
        company_id: companyId,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[ERP Expense Categories] POST error:', error)
      return apiError('경비 카테고리 생성에 실패했습니다.', 500)
    }

    return apiResponse(data, 201)
  } catch (error) {
    console.error('[ERP Expense Categories] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

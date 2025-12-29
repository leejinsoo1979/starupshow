import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 부서 상세 조회
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
      .from('departments')
      .select(`
        *,
        manager:employees!departments_manager_id_fkey(id, name, position:positions(name)),
        location:business_locations(id, name),
        employees:employees!employees_department_id_fkey(id, name, position:positions(name))
      `)
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error) {
      console.error('[ERP Department] GET error:', error)
      return apiError('부서 정보를 불러올 수 없습니다.', 404)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Department] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 부서 수정
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

    const { data, error } = await supabase
      .from('departments')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Department] PUT error:', error)
      return apiError('부서 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Department] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 부서 삭제 (비활성화)
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

    // 하위 부서 확인
    const { count: childCount } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', params.id)
      .eq('is_active', true)

    if (childCount && childCount > 0) {
      return apiError('하위 부서가 있어 삭제할 수 없습니다.')
    }

    // 소속 직원 확인
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', params.id)
      .eq('status', 'active')

    if (employeeCount && employeeCount > 0) {
      return apiError('소속 직원이 있어 삭제할 수 없습니다.')
    }

    // 비활성화 처리
    const { data, error } = await supabase
      .from('departments')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Department] DELETE error:', error)
      return apiError('부서 삭제에 실패했습니다.', 500)
    }

    return apiResponse({ message: '부서가 삭제되었습니다.' })
  } catch (error) {
    console.error('[ERP Department] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

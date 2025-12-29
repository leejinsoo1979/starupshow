import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 사업장 상세 조회
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
      .from('business_locations')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return apiError('사업장을 찾을 수 없습니다.', 404)
    }

    // 소속 직원 수
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', params.id)
      .eq('status', 'active')

    // 소속 부서 수
    const { count: departmentCount } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', params.id)
      .eq('is_active', true)

    return apiResponse({
      ...data,
      employee_count: employeeCount || 0,
      department_count: departmentCount || 0,
    })
  } catch (error) {
    console.error('[ERP Location] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 사업장 수정
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

    // 본사 설정 시 기존 본사 해제
    if (body.is_headquarters) {
      await supabase
        .from('business_locations')
        .update({ is_headquarters: false })
        .eq('company_id', companyId)
        .eq('is_headquarters', true)
        .neq('id', params.id)
    }

    const { data, error } = await supabase
      .from('business_locations')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Location] PUT error:', error)
      return apiError('사업장 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Location] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 사업장 비활성화
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

    // 본사 여부 확인
    const { data: location } = await supabase
      .from('business_locations')
      .select('is_headquarters')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (location?.is_headquarters) {
      return apiError('본사는 삭제할 수 없습니다.')
    }

    // 소속 직원 확인
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', params.id)
      .eq('status', 'active')

    if (count && count > 0) {
      return apiError('소속 직원이 있어 삭제할 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('business_locations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Location] DELETE error:', error)
      return apiError('사업장 삭제에 실패했습니다.', 500)
    }

    return apiResponse({ message: '사업장이 삭제되었습니다.' })
  } catch (error) {
    console.error('[ERP Location] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

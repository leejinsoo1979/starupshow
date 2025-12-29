import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'
import type { UpdateEmployeeInput } from '@/lib/erp/types'

// GET: 직원 상세 조회
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
      .from('employees')
      .select(`
        *,
        department:departments(id, name, code),
        position:positions(id, name, code, level),
        location:business_locations(id, name, location_type)
      `)
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error) {
      console.error('[ERP Employee] GET error:', error)
      return apiError('직원 정보를 불러올 수 없습니다.', 404)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Employee] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 직원 정보 수정
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

    const body: UpdateEmployeeInput = await request.json()

    const { data, error } = await supabase
      .from('employees')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select(`
        *,
        department:departments(id, name),
        position:positions(id, name)
      `)
      .single()

    if (error) {
      console.error('[ERP Employee] PUT error:', error)
      return apiError('직원 정보 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Employee] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 직원 삭제 (실제 삭제 대신 퇴사 처리)
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

    // 실제 삭제 대신 퇴사 처리
    const { data, error } = await supabase
      .from('employees')
      .update({
        status: 'resigned',
        resignation_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Employee] DELETE error:', error)
      return apiError('직원 퇴사 처리에 실패했습니다.', 500)
    }

    return apiResponse({ message: '퇴사 처리되었습니다.', data })
  } catch (error) {
    console.error('[ERP Employee] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

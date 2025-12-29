import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 급여 대장 상세 조회 (급여 명세 포함)
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

    // 급여 대장 조회
    const { data: record, error: recordError } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (recordError || !record) {
      return apiError('급여 대장을 찾을 수 없습니다.', 404)
    }

    // 급여 명세 조회
    const { data: details, error: detailsError } = await supabase
      .from('payroll_details')
      .select(`
        *,
        employee:employees(id, name, employee_number, department:departments(name), position:positions(name))
      `)
      .eq('payroll_record_id', params.id)
      .order('employee_id')

    if (detailsError) {
      console.error('[ERP Payroll] details fetch error:', detailsError)
    }

    return apiResponse({
      ...record,
      details: details || [],
    })
  } catch (error) {
    console.error('[ERP Payroll] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 급여 대장 확정/지급 처리
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
    const { action } = body // 'confirm' | 'pay'

    // 현재 상태 확인
    const { data: current } = await supabase
      .from('payroll_records')
      .select('status')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('급여 대장을 찾을 수 없습니다.', 404)
    }

    const now = new Date().toISOString()

    if (action === 'confirm') {
      if (current.status !== 'draft') {
        return apiError('확정 대기 상태가 아닙니다.')
      }

      const { data, error } = await supabase
        .from('payroll_records')
        .update({
          status: 'confirmed',
          confirmed_at: now,
          confirmed_by: body.confirmed_by,
          updated_at: now,
        })
        .eq('id', params.id)
        .select()
        .single()

      if (error) {
        console.error('[ERP Payroll] confirm error:', error)
        return apiError('급여 확정에 실패했습니다.', 500)
      }

      return apiResponse(data)
    } else if (action === 'pay') {
      if (current.status !== 'confirmed') {
        return apiError('확정된 급여만 지급 처리할 수 있습니다.')
      }

      // 급여 대장 지급 처리
      const { data: record, error: recordError } = await supabase
        .from('payroll_records')
        .update({
          status: 'paid',
          paid_at: now,
          updated_at: now,
        })
        .eq('id', params.id)
        .select()
        .single()

      if (recordError) {
        console.error('[ERP Payroll] pay error:', recordError)
        return apiError('급여 지급 처리에 실패했습니다.', 500)
      }

      // 급여 명세 지급 처리
      await supabase
        .from('payroll_details')
        .update({
          is_paid: true,
          paid_at: now,
          updated_at: now,
        })
        .eq('payroll_record_id', params.id)

      return apiResponse(record)
    }

    return apiError('유효하지 않은 요청입니다.')
  } catch (error) {
    console.error('[ERP Payroll] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 급여 대장 삭제 (draft 상태만)
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

    // 현재 상태 확인
    const { data: current } = await supabase
      .from('payroll_records')
      .select('status')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('급여 대장을 찾을 수 없습니다.', 404)
    }

    if (current.status !== 'draft') {
      return apiError('작성 중인 급여 대장만 삭제할 수 있습니다.')
    }

    // 급여 명세 삭제
    await supabase
      .from('payroll_details')
      .delete()
      .eq('payroll_record_id', params.id)

    // 급여 대장 삭제
    const { error } = await supabase
      .from('payroll_records')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[ERP Payroll] DELETE error:', error)
      return apiError('급여 대장 삭제에 실패했습니다.', 500)
    }

    return apiResponse({ message: '급여 대장이 삭제되었습니다.' })
  } catch (error) {
    console.error('[ERP Payroll] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 급여 설정 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[ERP Payroll Settings] GET error:', error)
      return apiError('급여 설정을 불러올 수 없습니다.', 500)
    }

    // 설정이 없으면 기본값 반환
    if (!data) {
      return apiResponse({
        pay_day: 25,
        national_pension_rate: 4.5,
        health_insurance_rate: 3.545,
        long_term_care_rate: 12.81,
        employment_insurance_rate: 0.9,
        industrial_accident_rate: 0.7,
        income_tax_rate: 0,
        local_income_tax_rate: 10,
        overtime_rate: 1.5,
        night_rate: 0.5,
        holiday_rate: 1.5,
        settings: {},
      })
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Payroll Settings] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 급여 설정 생성/수정
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()

    // 기존 설정 확인
    const { data: existing } = await supabase
      .from('payroll_settings')
      .select('id')
      .eq('company_id', companyId)
      .single()

    if (existing) {
      // 업데이트
      const { data, error } = await supabase
        .from('payroll_settings')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('[ERP Payroll Settings] PUT error:', error)
        return apiError('급여 설정 수정에 실패했습니다.', 500)
      }

      return apiResponse(data)
    } else {
      // 생성
      const { data, error } = await supabase
        .from('payroll_settings')
        .insert({
          company_id: companyId,
          pay_day: body.pay_day || 25,
          national_pension_rate: body.national_pension_rate ?? 4.5,
          health_insurance_rate: body.health_insurance_rate ?? 3.545,
          long_term_care_rate: body.long_term_care_rate ?? 12.81,
          employment_insurance_rate: body.employment_insurance_rate ?? 0.9,
          industrial_accident_rate: body.industrial_accident_rate ?? 0.7,
          income_tax_rate: body.income_tax_rate ?? 0,
          local_income_tax_rate: body.local_income_tax_rate ?? 10,
          overtime_rate: body.overtime_rate ?? 1.5,
          night_rate: body.night_rate ?? 0.5,
          holiday_rate: body.holiday_rate ?? 1.5,
          settings: body.settings || {},
        })
        .select()
        .single()

      if (error) {
        console.error('[ERP Payroll Settings] POST error:', error)
        return apiError('급여 설정 생성에 실패했습니다.', 500)
      }

      return apiResponse(data, 201)
    }
  } catch (error) {
    console.error('[ERP Payroll Settings] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

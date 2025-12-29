import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, calculatePayroll } from '@/lib/erp/api-utils'

// GET: 급여 대장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePaginationParams(searchParams)
    const year = searchParams.get('year') || new Date().getFullYear()
    const month = searchParams.get('month')

    let query = supabase
      .from('payroll_records')
      .select(`
        *,
        employee:employees!payroll_records_employee_id_fkey(id, name, employee_number)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .eq('pay_year', year)

    if (month) {
      query = query.eq('pay_month', month)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order('pay_year', { ascending: false })
      .order('pay_month', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Payroll] GET error:', error)
      return apiError('급여 대장을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Payroll] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 급여 생성 (월별)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const { year, month } = body

    if (!year || !month) {
      return apiError('년도와 월은 필수입니다.')
    }

    // 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('payroll_records')
      .select('id')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('month', month)
      .single()

    if (existing) {
      return apiError('이미 해당 월의 급여 대장이 존재합니다.')
    }

    // 급여 설정 조회
    const { data: settings } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (!settings) {
      return apiError('급여 설정이 없습니다. 먼저 급여 설정을 완료해주세요.')
    }

    // 재직 중인 직원 조회
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (!employees || employees.length === 0) {
      return apiError('재직 중인 직원이 없습니다.')
    }

    // 해당 월의 근태 데이터 조회
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    // 급여 대장 생성
    const { data: payrollRecord, error: recordError } = await supabase
      .from('payroll_records')
      .insert({
        company_id: companyId,
        year,
        month,
        status: 'draft',
        total_employees: employees.length,
        total_earnings: 0,
        total_deductions: 0,
        total_net_pay: 0,
      })
      .select()
      .single()

    if (recordError) {
      console.error('[ERP Payroll] record creation error:', recordError)
      return apiError('급여 대장 생성에 실패했습니다.', 500)
    }

    // 각 직원별 급여 명세 생성
    let totalEarnings = 0
    let totalDeductions = 0
    let totalNetPay = 0

    const payrollDetails = []

    for (const employee of employees) {
      // 직원별 근태 조회
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('work_date', startDate)
        .lte('work_date', endDate)

      const workDays = attendanceData?.length || 0
      const overtimeHours = attendanceData?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0
      const nightHours = attendanceData?.reduce((sum, a) => sum + (a.night_hours || 0), 0) || 0

      // 직원 급여 항목 조회
      const { data: employeePayrollItems } = await supabase
        .from('employee_payroll_items')
        .select('*, payroll_item:payroll_items(*)')
        .eq('employee_id', employee.id)
        .lte('effective_date', endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`)

      // 기본급 찾기
      const baseSalaryItem = employeePayrollItems?.find(
        item => item.payroll_item?.code === 'BASE_SALARY'
      )
      const baseSalary = baseSalaryItem?.amount || 0

      // 급여 계산
      const totalWorkDays = 22 // 월 근무일수 (간단히 22일 가정)
      const calculation = calculatePayroll({
        baseSalary,
        workDays,
        totalWorkDays,
        overtimeHours,
        nightHours,
        holidayHours: 0,
        settings: {
          overtime_rate: settings.overtime_rate,
          night_rate: settings.night_rate,
          holiday_rate: settings.holiday_rate,
          national_pension_rate: settings.national_pension_rate,
          health_insurance_rate: settings.health_insurance_rate,
          long_term_care_rate: settings.long_term_care_rate,
          employment_insurance_rate: settings.employment_insurance_rate,
        },
      })

      // 급여 항목 목록 생성
      const earnings = [
        { item_id: 'base', name: '기본급', amount: calculation.earnings.base },
        { item_id: 'overtime', name: '연장수당', amount: calculation.earnings.overtime },
        { item_id: 'night', name: '야간수당', amount: calculation.earnings.night },
      ].filter(e => e.amount > 0)

      const deductions = [
        { item_id: 'pension', name: '국민연금', amount: calculation.deductions.nationalPension },
        { item_id: 'health', name: '건강보험', amount: calculation.deductions.healthInsurance },
        { item_id: 'longterm', name: '장기요양', amount: calculation.deductions.longTermCare },
        { item_id: 'employment', name: '고용보험', amount: calculation.deductions.employmentInsurance },
        { item_id: 'income_tax', name: '소득세', amount: calculation.deductions.incomeTax },
        { item_id: 'local_tax', name: '지방소득세', amount: calculation.deductions.localIncomeTax },
      ]

      payrollDetails.push({
        company_id: companyId,
        payroll_record_id: payrollRecord.id,
        employee_id: employee.id,
        year,
        month,
        work_days: workDays,
        work_hours: workDays * 8,
        overtime_hours: overtimeHours,
        night_hours: nightHours,
        holiday_hours: 0,
        earnings,
        total_earnings: calculation.earnings.total,
        deductions,
        total_deductions: calculation.deductions.total,
        national_pension: calculation.deductions.nationalPension,
        health_insurance: calculation.deductions.healthInsurance,
        long_term_care: calculation.deductions.longTermCare,
        employment_insurance: calculation.deductions.employmentInsurance,
        income_tax: calculation.deductions.incomeTax,
        local_income_tax: calculation.deductions.localIncomeTax,
        net_pay: calculation.netPay,
        bank_name: employee.bank_name,
        bank_account: employee.bank_account,
        bank_holder: employee.bank_holder,
        is_paid: false,
      })

      totalEarnings += calculation.earnings.total
      totalDeductions += calculation.deductions.total
      totalNetPay += calculation.netPay
    }

    // 급여 명세 일괄 삽입
    const { error: detailsError } = await supabase
      .from('payroll_details')
      .insert(payrollDetails)

    if (detailsError) {
      console.error('[ERP Payroll] details creation error:', detailsError)
      // 급여 대장 롤백
      await supabase.from('payroll_records').delete().eq('id', payrollRecord.id)
      return apiError('급여 명세 생성에 실패했습니다.', 500)
    }

    // 급여 대장 합계 업데이트
    const { data: updatedRecord, error: updateError } = await supabase
      .from('payroll_records')
      .update({
        total_earnings: totalEarnings,
        total_deductions: totalDeductions,
        total_net_pay: totalNetPay,
      })
      .eq('id', payrollRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('[ERP Payroll] record update error:', updateError)
    }

    return apiResponse(updatedRecord, 201)
  } catch (error) {
    console.error('[ERP Payroll] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

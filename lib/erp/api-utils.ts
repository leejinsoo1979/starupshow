import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Supabase 클라이언트 생성
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

// 표준 API 응답
export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

// 페이지네이션 파라미터 파싱
export function parsePaginationParams(searchParams: URLSearchParams) {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc',
  }
}

// 검색 파라미터 파싱
export function parseSearchParams(searchParams: URLSearchParams, fields: string[]) {
  const search = searchParams.get('search')
  const filters: Record<string, string> = {}

  fields.forEach(field => {
    const value = searchParams.get(field)
    if (value) filters[field] = value
  })

  return { search, filters }
}

// 회사 ID 가져오기 (user_id 기반)
export async function getCompanyId(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data.id
}

// 현재 사용자의 회사 ID 가져오기 (세션 기반)
export async function getCurrentCompanyId(request: Request): Promise<string | null> {
  // DEV 모드에서는 첫 번째 회사 반환
  if (process.env.NODE_ENV === 'development') {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single()
    return data?.id || null
  }

  // TODO: 실제 인증 구현 시 세션에서 user_id 추출
  return null
}

// 날짜 범위 필터 생성
export function dateRangeFilter(
  query: any,
  dateField: string,
  startDate?: string,
  endDate?: string
) {
  if (startDate) {
    query = query.gte(dateField, startDate)
  }
  if (endDate) {
    query = query.lte(dateField, endDate)
  }
  return query
}

// 통계 계산 유틸리티
export function calculateSum(items: any[], field: string): number {
  return items.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0)
}

export function calculateAverage(items: any[], field: string): number {
  if (items.length === 0) return 0
  return calculateSum(items, field) / items.length
}

// 급여 계산 유틸리티
export interface PayrollCalculationInput {
  baseSalary: number
  workDays: number
  totalWorkDays: number
  overtimeHours: number
  nightHours: number
  holidayHours: number
  settings: {
    overtime_rate: number
    night_rate: number
    holiday_rate: number
    national_pension_rate: number
    health_insurance_rate: number
    long_term_care_rate: number
    employment_insurance_rate: number
  }
}

export function calculatePayroll(input: PayrollCalculationInput) {
  const { baseSalary, workDays, totalWorkDays, overtimeHours, nightHours, holidayHours, settings } = input

  // 일할 계산
  const dailyRate = baseSalary / totalWorkDays
  const proRatedSalary = dailyRate * workDays

  // 시급 계산 (월 209시간 기준)
  const hourlyRate = baseSalary / 209

  // 수당 계산
  const overtimePay = hourlyRate * overtimeHours * settings.overtime_rate
  const nightPay = hourlyRate * nightHours * settings.night_rate
  const holidayPay = hourlyRate * holidayHours * settings.holiday_rate

  // 총 지급액
  const totalEarnings = proRatedSalary + overtimePay + nightPay + holidayPay

  // 4대보험 계산 (과세 대상 금액 기준)
  const taxableAmount = totalEarnings
  const nationalPension = Math.round(taxableAmount * settings.national_pension_rate / 100)
  const healthInsurance = Math.round(taxableAmount * settings.health_insurance_rate / 100)
  const longTermCare = Math.round(healthInsurance * settings.long_term_care_rate / 100)
  const employmentInsurance = Math.round(taxableAmount * settings.employment_insurance_rate / 100)

  // 세금 계산 (간이세액표 적용 필요 - 여기서는 간략화)
  // TODO: 실제 간이세액표 적용
  const incomeTax = Math.round(taxableAmount * 0.03) // 임시 3%
  const localIncomeTax = Math.round(incomeTax * 0.1)

  // 총 공제액
  const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax

  // 실수령액
  const netPay = totalEarnings - totalDeductions

  return {
    earnings: {
      base: proRatedSalary,
      overtime: overtimePay,
      night: nightPay,
      holiday: holidayPay,
      total: totalEarnings,
    },
    deductions: {
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      incomeTax,
      localIncomeTax,
      total: totalDeductions,
    },
    netPay,
  }
}

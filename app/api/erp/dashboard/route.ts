import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 대시보드 통계
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]

    // 직원 현황
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { count: activeEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active')

    const { count: onLeaveEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'on_leave')

    // 월별 매출/매입 현황
    const { data: salesData } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('company_id', companyId)
      .eq('transaction_type', 'sales')
      .neq('status', 'cancelled')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd)

    const { data: purchaseData } = await supabase
      .from('transactions')
      .select('total_amount')
      .eq('company_id', companyId)
      .eq('transaction_type', 'purchase')
      .neq('status', 'cancelled')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd)

    const monthlySales = salesData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
    const monthlyPurchases = purchaseData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
    const monthlyProfit = monthlySales - monthlyPurchases

    // 경비 현황
    const { count: pendingExpenses } = await supabase
      .from('expense_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending')

    const { data: approvedExpenseData } = await supabase
      .from('expense_requests')
      .select('amount')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd)

    const approvedExpenses = approvedExpenseData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // 휴가 현황
    const { count: pendingLeaves } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending')

    // 미수금/미지급금 현황
    const { data: receivableData } = await supabase
      .from('transactions')
      .select('total_amount, paid_amount')
      .eq('company_id', companyId)
      .eq('transaction_type', 'sales')
      .neq('payment_status', 'paid')
      .neq('status', 'cancelled')

    const { data: payableData } = await supabase
      .from('transactions')
      .select('total_amount, paid_amount')
      .eq('company_id', companyId)
      .eq('transaction_type', 'purchase')
      .neq('payment_status', 'paid')
      .neq('status', 'cancelled')

    const totalReceivable = receivableData?.reduce((sum, t) => sum + (t.total_amount - t.paid_amount), 0) || 0
    const totalPayable = payableData?.reduce((sum, t) => sum + (t.total_amount - t.paid_amount), 0) || 0

    // 최근 거래 (5건)
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_number,
        transaction_type,
        transaction_date,
        total_amount,
        status,
        partner:business_partners(name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5)

    // 오늘 출근 현황
    const today = now.toISOString().split('T')[0]
    const { count: todayAttendance } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('work_date', today)

    // 월별 매출 추이 (최근 6개월)
    const monthlySalesData = []
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(year, month - 1 - i, 1)
      const targetYear = targetDate.getFullYear()
      const targetMonth = targetDate.getMonth() + 1
      const targetStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
      const targetEnd = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0]

      const { data: monthSales } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('company_id', companyId)
        .eq('transaction_type', 'sales')
        .neq('status', 'cancelled')
        .gte('transaction_date', targetStart)
        .lte('transaction_date', targetEnd)

      const { data: monthPurchase } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('company_id', companyId)
        .eq('transaction_type', 'purchase')
        .neq('status', 'cancelled')
        .gte('transaction_date', targetStart)
        .lte('transaction_date', targetEnd)

      monthlySalesData.push({
        month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
        sales: monthSales?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0,
        purchases: monthPurchase?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0,
      })
    }

    return apiResponse({
      employees: {
        total: totalEmployees || 0,
        active: activeEmployees || 0,
        on_leave: onLeaveEmployees || 0,
        today_attendance: todayAttendance || 0,
      },
      financials: {
        monthly_sales: monthlySales,
        monthly_purchases: monthlyPurchases,
        monthly_profit: monthlyProfit,
        total_receivable: totalReceivable,
        total_payable: totalPayable,
      },
      expenses: {
        pending: pendingExpenses || 0,
        approved_this_month: approvedExpenses,
      },
      leaves: {
        pending: pendingLeaves || 0,
      },
      recent_transactions: recentTransactions || [],
      monthly_trend: monthlySalesData,
    })
  } catch (error) {
    console.error('[ERP Dashboard] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

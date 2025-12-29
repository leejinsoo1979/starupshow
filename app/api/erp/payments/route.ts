import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, dateRangeFilter } from '@/lib/erp/api-utils'

// GET: 수금/지급 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, sort_by, sort_order } = parsePaginationParams(searchParams)
    const transactionId = searchParams.get('transaction_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('payments')
      .select(`
        *,
        transaction:transactions(id, transaction_number, transaction_type, partner:business_partners(name))
      `, { count: 'exact' })
      .eq('company_id', companyId)

    if (transactionId) {
      query = query.eq('transaction_id', transactionId)
    }

    query = dateRangeFilter(query, 'payment_date', startDate || undefined, endDate || undefined)

    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Payments] GET error:', error)
      return apiError('수금/지급 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Payments] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 수금/지급 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const { transaction_id, payment_date, amount, payment_method, bank_name, account_number, notes } = body

    if (!transaction_id || !payment_date || !amount) {
      return apiError('필수 정보가 누락되었습니다.')
    }

    // 거래 조회
    const { data: transaction } = await supabase
      .from('transactions')
      .select('total_amount, paid_amount, payment_status')
      .eq('id', transaction_id)
      .eq('company_id', companyId)
      .single()

    if (!transaction) {
      return apiError('거래를 찾을 수 없습니다.', 404)
    }

    const remaining = transaction.total_amount - transaction.paid_amount
    if (amount > remaining) {
      return apiError(`결제 가능 금액(${remaining.toLocaleString()}원)을 초과했습니다.`)
    }

    // 결제 등록
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        company_id: companyId,
        transaction_id,
        payment_date,
        amount,
        payment_method,
        bank_name,
        account_number,
        notes,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('[ERP Payments] POST error:', paymentError)
      return apiError('수금/지급 등록에 실패했습니다.', 500)
    }

    // 거래 결제 상태 업데이트
    const newPaidAmount = transaction.paid_amount + amount
    const newPaymentStatus = newPaidAmount >= transaction.total_amount ? 'paid' : 'partial'

    await supabase
      .from('transactions')
      .update({
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction_id)

    return apiResponse(payment, 201)
  } catch (error) {
    console.error('[ERP Payments] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

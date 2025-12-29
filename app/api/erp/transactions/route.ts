import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId, parsePaginationParams, dateRangeFilter } from '@/lib/erp/api-utils'

// GET: 매출/매입 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, sort_by, sort_order } = parsePaginationParams(searchParams)
    const transactionType = searchParams.get('type') // 'sales' | 'purchase'
    const partnerId = searchParams.get('partner_id')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('transactions')
      .select(`
        *,
        partner:business_partners(id, name, business_number)
      `, { count: 'exact' })
      .eq('company_id', companyId)

    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }
    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus)
    }

    query = dateRangeFilter(query, 'transaction_date', startDate || undefined, endDate || undefined)

    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[ERP Transactions] GET error:', error)
      return apiError('거래 목록을 불러올 수 없습니다.', 500)
    }

    return apiResponse({
      data,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('[ERP Transactions] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// POST: 매출/매입 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const companyId = await getCurrentCompanyId(request)

    if (!companyId) {
      return apiError('회사를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const { transaction_type, partner_id, partner_name, transaction_date, items, description, notes } = body

    if (!transaction_type || !transaction_date) {
      return apiError('필수 정보가 누락되었습니다.')
    }

    if (!items || items.length === 0) {
      return apiError('품목이 최소 1개 이상 필요합니다.')
    }

    // 거래번호 생성
    const prefix = transaction_type === 'sales' ? 'S' : 'P'
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('transaction_type', transaction_type)
      .gte('transaction_date', new Date().toISOString().slice(0, 10))

    const transactionNumber = `${prefix}${date}-${String((count || 0) + 1).padStart(4, '0')}`

    // 금액 계산
    let supplyAmount = 0
    let taxAmount = 0

    const transactionItems = items.map((item: any, index: number) => {
      const itemSupply = item.quantity * item.unit_price
      const itemTax = item.tax_type === 'taxable' ? Math.round(itemSupply * 0.1) : 0

      supplyAmount += itemSupply
      taxAmount += itemTax

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit || 'EA',
        unit_price: item.unit_price,
        supply_amount: itemSupply,
        tax_amount: itemTax,
        total_amount: itemSupply + itemTax,
        description: item.description,
        sort_order: index + 1,
      }
    })

    const totalAmount = supplyAmount + taxAmount

    // 거래 생성
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        company_id: companyId,
        transaction_number: transactionNumber,
        transaction_type,
        partner_id,
        partner_name,
        transaction_date,
        supply_amount: supplyAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'unpaid',
        paid_amount: 0,
        description,
        notes,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[ERP Transactions] POST error:', transactionError)
      return apiError('거래 등록에 실패했습니다.', 500)
    }

    // 거래 품목 생성
    const itemsWithTransactionId = transactionItems.map((item: any) => ({
      ...item,
      transaction_id: transaction.id,
    }))

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(itemsWithTransactionId)

    if (itemsError) {
      console.error('[ERP Transactions] items error:', itemsError)
      // 거래 롤백
      await supabase.from('transactions').delete().eq('id', transaction.id)
      return apiError('거래 품목 등록에 실패했습니다.', 500)
    }

    return apiResponse({
      ...transaction,
      items: itemsWithTransactionId,
    }, 201)
  } catch (error) {
    console.error('[ERP Transactions] POST error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

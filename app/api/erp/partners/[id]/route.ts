import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 거래처 상세 조회
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
      .from('business_partners')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return apiError('거래처를 찾을 수 없습니다.', 404)
    }

    // 최근 거래 내역 조회
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, transaction_number, transaction_type, transaction_date, total_amount, status')
      .eq('partner_id', params.id)
      .order('transaction_date', { ascending: false })
      .limit(10)

    // 미수/미지급 현황
    const { data: unpaidStats } = await supabase
      .from('transactions')
      .select('transaction_type, total_amount, paid_amount')
      .eq('partner_id', params.id)
      .neq('payment_status', 'paid')

    let receivable = 0 // 매출채권 (미수금)
    let payable = 0 // 매입채무 (미지급금)

    unpaidStats?.forEach(t => {
      const remaining = t.total_amount - t.paid_amount
      if (t.transaction_type === 'sales') {
        receivable += remaining
      } else {
        payable += remaining
      }
    })

    return apiResponse({
      ...data,
      recent_transactions: transactions || [],
      balance: {
        receivable,
        payable,
      },
    })
  } catch (error) {
    console.error('[ERP Partner] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 거래처 수정
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
      .from('business_partners')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Partner] PUT error:', error)
      return apiError('거래처 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Partner] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 거래처 비활성화
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

    // 미결제 거래 확인
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', params.id)
      .neq('payment_status', 'paid')

    if (count && count > 0) {
      return apiError('미결제 거래가 있어 비활성화할 수 없습니다.')
    }

    const { data, error } = await supabase
      .from('business_partners')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Partner] DELETE error:', error)
      return apiError('거래처 비활성화에 실패했습니다.', 500)
    }

    return apiResponse({ message: '거래처가 비활성화되었습니다.' })
  } catch (error) {
    console.error('[ERP Partner] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

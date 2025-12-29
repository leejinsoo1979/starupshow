import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 거래 상세 조회
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

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        partner:business_partners(id, name, business_number, phone, email)
      `)
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error || !transaction) {
      return apiError('거래를 찾을 수 없습니다.', 404)
    }

    // 거래 품목 조회
    const { data: items } = await supabase
      .from('transaction_items')
      .select(`
        *,
        product:products(id, name, code)
      `)
      .eq('transaction_id', params.id)
      .order('sort_order')

    // 결제 내역 조회
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', params.id)
      .order('payment_date', { ascending: false })

    return apiResponse({
      ...transaction,
      items: items || [],
      payments: payments || [],
    })
  } catch (error) {
    console.error('[ERP Transaction] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 거래 수정
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

    // 현재 상태 확인
    const { data: current } = await supabase
      .from('transactions')
      .select('status')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('거래를 찾을 수 없습니다.', 404)
    }

    if (current.status === 'confirmed') {
      return apiError('확정된 거래는 수정할 수 없습니다.')
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Transaction] PUT error:', error)
      return apiError('거래 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Transaction] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 거래 취소
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
      .from('transactions')
      .select('status, payment_status')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (!current) {
      return apiError('거래를 찾을 수 없습니다.', 404)
    }

    if (current.payment_status !== 'unpaid') {
      return apiError('결제가 진행된 거래는 취소할 수 없습니다.')
    }

    // 취소 처리
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[ERP Transaction] DELETE error:', error)
      return apiError('거래 취소에 실패했습니다.', 500)
    }

    return apiResponse({ message: '거래가 취소되었습니다.', data })
  } catch (error) {
    console.error('[ERP Transaction] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, apiResponse, apiError, getCurrentCompanyId } from '@/lib/erp/api-utils'

// GET: 법인카드 상세 조회
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
      .from('corporate_cards')
      .select(`
        *,
        holder:employees(id, name, department:departments(name))
      `)
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single()

    if (error || !data) {
      return apiError('법인카드를 찾을 수 없습니다.', 404)
    }

    // 최근 사용 내역 조회
    const { data: recentExpenses } = await supabase
      .from('expense_requests')
      .select('id, expense_date, amount, merchant_name, status')
      .eq('corporate_card_id', params.id)
      .order('expense_date', { ascending: false })
      .limit(10)

    // 이번 달 사용 금액
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const { data: monthlyUsage } = await supabase
      .from('expense_requests')
      .select('amount')
      .eq('corporate_card_id', params.id)
      .gte('expense_date', monthStart)
      .in('status', ['approved', 'reimbursed'])

    const monthlyTotal = monthlyUsage?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    return apiResponse({
      ...data,
      recent_expenses: recentExpenses || [],
      monthly_usage: monthlyTotal,
      remaining_limit: data.credit_limit ? data.credit_limit - monthlyTotal : null,
    })
  } catch (error) {
    console.error('[ERP Corporate Card] GET error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// PUT: 법인카드 수정
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
      .from('corporate_cards')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Corporate Card] PUT error:', error)
      return apiError('법인카드 수정에 실패했습니다.', 500)
    }

    return apiResponse(data)
  } catch (error) {
    console.error('[ERP Corporate Card] PUT error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

// DELETE: 법인카드 비활성화
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

    const { data, error } = await supabase
      .from('corporate_cards')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('[ERP Corporate Card] DELETE error:', error)
      return apiError('법인카드 비활성화에 실패했습니다.', 500)
    }

    return apiResponse({ message: '법인카드가 비활성화되었습니다.' })
  } catch (error) {
    console.error('[ERP Corporate Card] DELETE error:', error)
    return apiError('서버 오류가 발생했습니다.', 500)
  }
}

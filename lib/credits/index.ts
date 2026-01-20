// GlowUS Credit System
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode } from '@/lib/dev-user'

// 크레딧 가격표
export const CREDIT_PRICING: Record<string, number> = {
  // AI 채팅 (저렴한 모델)
  chat_grok_fast: 1,
  chat_gemini_flash: 1,
  chat_deepseek: 1,
  chat_other: 3,        // 기타 모델 기본값
  // AI 채팅 (중급 모델)
  chat_gpt4o_mini: 3,
  chat_gpt4o: 10,
  chat_claude_sonnet: 10,
  chat_claude: 15,      // Claude 기본값
  // AI 채팅 (프리미엄 모델)
  chat_claude_opus: 30,
  // 기능
  matching: 50,
  document_analysis: 100,
  business_plan: 500,
}

// 모델명 → 크레딧 액션 매핑
export const MODEL_TO_ACTION: Record<string, string> = {
  'grok-4-1-fast': 'chat_grok_fast',
  'grok-4-1-fast-reasoning': 'chat_grok_fast',
  'grok-4-1-fast-non-reasoning': 'chat_grok_fast',
  'gemini-2.0-flash': 'chat_gemini_flash',
  'gemini-2.0-flash-lite': 'chat_gemini_flash',
  'deepseek-v3': 'chat_deepseek',
  'gpt-4o-mini': 'chat_gpt4o_mini',
  'gpt-4o': 'chat_gpt4o',
  'claude-sonnet-4': 'chat_claude_sonnet',
  'claude-3-5-sonnet': 'chat_claude_sonnet',
  'claude-opus-4': 'chat_claude_opus',
}

// 구독 티어
export const SUBSCRIPTION_TIERS = {
  free: { price: 0, credits: 1000, dailyCredits: 100 },
  basic: { price: 20, credits: 30000, dailyCredits: 0 },
  pro: { price: 50, credits: 100000, dailyCredits: 0 },
  enterprise: { price: 200, credits: -1, dailyCredits: 0 }, // -1 = unlimited
}

export interface UserCredits {
  id: string
  user_id: string
  balance: number
  daily_balance: number
  daily_reset_at: string
  tier: string
  tier_expires_at: string | null
  total_earned: number
  total_spent: number
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  balance_after: number
  type: string
  category: string | null
  description: string | null
  model_used: string | null
  tokens_input: number | null
  tokens_output: number | null
  created_at: string
}

/**
 * 사용자 크레딧 잔액 조회
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = createAdminClient()

  // 일일 리셋 체크
  await resetDailyCreditsIfNeeded(userId)

  const { data, error } = await (supabase as any)
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('[Credits] Failed to get user credits:', error)
    return null
  }

  return data
}

/**
 * 일일 크레딧 리셋 (24시간 지났으면)
 */
async function resetDailyCreditsIfNeeded(userId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data } = await (supabase as any)
    .from('user_credits')
    .select('daily_reset_at, tier')
    .eq('user_id', userId)
    .single()

  if (!data) return

  const resetAt = new Date(data.daily_reset_at)
  const now = new Date()
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60)

  // 24시간 이상 지났고, free 티어면 리셋
  if (hoursSinceReset >= 24 && data.tier === 'free') {
    await (supabase as any)
      .from('user_credits')
      .update({
        daily_balance: 100,
        daily_reset_at: now.toISOString(),
      })
      .eq('user_id', userId)
  }
}

/**
 * 크레딧 잔액 확인 (사용 가능한지)
 */
export async function checkCredits(userId: string, amount: number): Promise<{
  canUse: boolean
  balance: number
  dailyBalance: number
  tier: string
}> {
  // 🔥 개발 모드에서는 무조건 허용
  if (isDevMode()) {
    console.log('[Credits] DEV MODE: Bypassing credit check')
    return { canUse: true, balance: 999999, dailyBalance: 999999, tier: 'enterprise' }
  }

  const credits = await getUserCredits(userId)

  if (!credits) {
    return { canUse: false, balance: 0, dailyBalance: 0, tier: 'free' }
  }

  // Enterprise는 무제한
  if (credits.tier === 'enterprise') {
    return { canUse: true, balance: credits.balance, dailyBalance: credits.daily_balance, tier: credits.tier }
  }

  const totalAvailable = credits.balance + credits.daily_balance
  return {
    canUse: totalAvailable >= amount,
    balance: credits.balance,
    dailyBalance: credits.daily_balance,
    tier: credits.tier,
  }
}

/**
 * 크레딧 차감
 */
export async function deductCredits(
  userId: string,
  amount: number,
  options: {
    type?: string
    category?: string
    description?: string
    model?: string
    tokensInput?: number
    tokensOutput?: number
  } = {}
): Promise<{ success: boolean; balance: number; error?: string }> {
  // 🔥 개발 모드에서는 차감 스킵
  if (isDevMode()) {
    console.log('[Credits] DEV MODE: Skipping credit deduction')
    return { success: true, balance: 999999 }
  }

  const supabase = createAdminClient()

  const credits = await getUserCredits(userId)
  if (!credits) {
    return { success: false, balance: 0, error: '크레딧 정보를 찾을 수 없습니다' }
  }

  // Enterprise는 차감 없이 성공
  if (credits.tier === 'enterprise') {
    // 기록만 남김
    await (supabase as any)
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        balance_after: credits.balance,
        type: options.type || 'usage',
        category: options.category,
        description: options.description,
        model_used: options.model,
        tokens_input: options.tokensInput,
        tokens_output: options.tokensOutput,
      })

    return { success: true, balance: credits.balance }
  }

  // 일일 크레딧 먼저 사용, 부족하면 메인 잔액에서 차감
  let dailyDeduct = Math.min(credits.daily_balance, amount)
  let mainDeduct = amount - dailyDeduct

  if (credits.balance < mainDeduct) {
    return { success: false, balance: credits.balance + credits.daily_balance, error: '크레딧이 부족합니다' }
  }

  const newDailyBalance = credits.daily_balance - dailyDeduct
  const newBalance = credits.balance - mainDeduct
  const newTotalSpent = credits.total_spent + amount

  // 크레딧 업데이트
  const { error: updateError } = await (supabase as any)
    .from('user_credits')
    .update({
      balance: newBalance,
      daily_balance: newDailyBalance,
      total_spent: newTotalSpent,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('[Credits] Failed to deduct:', updateError)
    return { success: false, balance: credits.balance, error: '크레딧 차감 실패' }
  }

  // 거래 내역 기록
  await (supabase as any)
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      balance_after: newBalance + newDailyBalance,
      type: options.type || 'usage',
      category: options.category,
      description: options.description,
      model_used: options.model,
      tokens_input: options.tokensInput,
      tokens_output: options.tokensOutput,
    })

  return { success: true, balance: newBalance + newDailyBalance }
}

/**
 * 크레딧 추가 (충전/구독/보너스)
 */
export async function addCredits(
  userId: string,
  amount: number,
  options: {
    type: 'purchase' | 'subscription' | 'bonus' | 'refund'
    description?: string
  }
): Promise<{ success: boolean; balance: number; error?: string }> {
  const supabase = createAdminClient()

  const credits = await getUserCredits(userId)
  if (!credits) {
    return { success: false, balance: 0, error: '크레딧 정보를 찾을 수 없습니다' }
  }

  const newBalance = credits.balance + amount
  const newTotalEarned = credits.total_earned + amount

  const { error: updateError } = await (supabase as any)
    .from('user_credits')
    .update({
      balance: newBalance,
      total_earned: newTotalEarned,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('[Credits] Failed to add:', updateError)
    return { success: false, balance: credits.balance, error: '크레딧 추가 실패' }
  }

  // 거래 내역 기록
  await (supabase as any)
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      balance_after: newBalance,
      type: options.type,
      description: options.description,
    })

  return { success: true, balance: newBalance }
}

/**
 * 모델 사용 시 크레딧 차감
 */
export async function deductCreditsForModel(
  userId: string,
  model: string,
  tokensInput: number,
  tokensOutput: number
): Promise<{ success: boolean; balance: number; error?: string }> {
  const action = MODEL_TO_ACTION[model] || 'chat_grok_fast'
  const baseCredits = CREDIT_PRICING[action] || 1

  // 토큰 기반 추가 과금 (1K 토큰당 기본 크레딧의 10%)
  const tokenCredits = Math.ceil((tokensInput + tokensOutput) / 1000) * Math.ceil(baseCredits * 0.1)
  const totalCredits = baseCredits + tokenCredits

  return deductCredits(userId, totalCredits, {
    type: 'usage',
    category: 'chat',
    description: `AI 채팅 (${model})`,
    model,
    tokensInput,
    tokensOutput,
  })
}

/**
 * 기능 사용 시 크레딧 차감
 */
export async function deductCreditsForAction(
  userId: string,
  action: string,
  description?: string
): Promise<{ success: boolean; balance: number; error?: string }> {
  const credits = CREDIT_PRICING[action]
  if (!credits) {
    console.warn(`[Credits] Unknown action: ${action}`)
    return { success: true, balance: 0 } // 알 수 없는 액션은 무료로 처리
  }

  return deductCredits(userId, credits, {
    type: 'usage',
    category: action,
    description: description || action,
  })
}

/**
 * 거래 내역 조회
 */
export async function getCreditHistory(
  userId: string,
  limit: number = 50
): Promise<CreditTransaction[]> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase as any)
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Credits] Failed to get history:', error)
    return []
  }

  return data || []
}

/**
 * 구독 활성화
 */
export async function activateSubscription(
  userId: string,
  tier: 'basic' | 'pro' | 'enterprise',
  paymentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  const tierInfo = SUBSCRIPTION_TIERS[tier]

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  // 구독 생성
  const { error: subError } = await (supabase as any)
    .from('subscriptions')
    .insert({
      user_id: userId,
      tier,
      price_usd: tierInfo.price,
      credits_granted: tierInfo.credits,
      payment_id: paymentId,
      expires_at: expiresAt.toISOString(),
    })

  if (subError) {
    console.error('[Credits] Failed to create subscription:', subError)
    return { success: false, error: '구독 생성 실패' }
  }

  // 크레딧 업데이트
  const { error: creditError } = await (supabase as any)
    .from('user_credits')
    .update({
      tier,
      tier_expires_at: expiresAt.toISOString(),
      balance: tierInfo.credits === -1 ? 999999999 : tierInfo.credits,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (creditError) {
    console.error('[Credits] Failed to update credits for subscription:', creditError)
    return { success: false, error: '크레딧 업데이트 실패' }
  }

  // 거래 내역
  await (supabase as any)
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: tierInfo.credits === -1 ? 0 : tierInfo.credits,
      balance_after: tierInfo.credits === -1 ? 999999999 : tierInfo.credits,
      type: 'subscription',
      description: `${tier.toUpperCase()} 구독 시작`,
    })

  return { success: true }
}

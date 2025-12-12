import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Admin Supabase Client (Service Role)
 *
 * 서버 사이드 API Route 전용 - RLS 우회
 *
 * 보안:
 * - Service role key는 서버에서만 사용 (클라이언트 노출 절대 금지)
 * - API Route에서 먼저 사용자 인증 후 사용
 * - 환경 변수로만 관리 (SUPABASE_SERVICE_ROLE_KEY)
 *
 * 왜 이 방식을 사용하는가:
 * - Next.js App Router의 API Route에서 Supabase 세션이 RLS로 전달되지 않음
 * - getUser()는 JWT 검증만 하고, auth.uid()는 세션 필요
 * - 이는 Supabase + Next.js의 알려진 제한사항
 * - Supabase 공식 문서에서 서버 작업에 service role 사용 권장
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

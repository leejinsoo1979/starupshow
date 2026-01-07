/**
 * 마이뉴런 Graph API
 * GET: 그래프 데이터 조회
 */

import { NextResponse } from 'next/server'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { syncMyNeuronsGraph } from '@/lib/my-neurons/sync-service'

export async function GET() {
  try {
    const supabase = await createClient()
    const { user, error: authError } = await getAuthUser(supabase)

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const userName = user.user_metadata?.name || user.email?.split('@')[0] || '나'

    const result = await syncMyNeuronsGraph(user.id, userName)

    return NextResponse.json({
      success: true,
      data: result.graph,
      bottlenecks: result.bottlenecks,
      priorities: result.priorities,
    })
  } catch (error) {
    console.error('[my-neurons/graph] Error:', error)
    return NextResponse.json(
      { error: '그래프 데이터를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

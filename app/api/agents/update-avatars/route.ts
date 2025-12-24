import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: Update all agent avatars to lorelei style (except Amy)
export async function POST() {
  try {
    const adminClient = createAdminClient()

    // 모든 에이전트 조회
    const { data: agents, error: fetchError } = await (adminClient as any)
      .from('deployed_agents')
      .select('id, name, avatar_url')

    if (fetchError) {
      console.error('에이전트 조회 오류:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let updated = 0
    let skipped = 0

    for (const agent of agents || []) {
      const nameLower = agent.name?.toLowerCase() || ''

      // Amy는 제외 (실제 사진 사용)
      if (nameLower.includes('에이미') || nameLower.includes('amy')) {
        skipped++
        continue
      }

      // 이미 lorelei 스타일이면 스킵
      if (agent.avatar_url?.includes('lorelei')) {
        skipped++
        continue
      }

      // bottts 스타일이거나 avatar가 없는 경우만 업데이트
      if (
        !agent.avatar_url ||
        agent.avatar_url.includes('bottts') ||
        agent.avatar_url.includes('dicebear')
      ) {
        const newAvatarUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(agent.name)}`

        const { error: updateError } = await (adminClient as any)
          .from('deployed_agents')
          .update({ avatar_url: newAvatarUrl })
          .eq('id', agent.id)

        if (!updateError) {
          updated++
        }
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updated}개 에이전트 아바타 업데이트 완료, ${skipped}개 스킵됨`,
      updated,
      skipped,
    })
  } catch (error) {
    console.error('아바타 업데이트 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

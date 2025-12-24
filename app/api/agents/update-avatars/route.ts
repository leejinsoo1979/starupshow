import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 여성 에이전트 이름 목록
const FEMALE_AGENTS = ['레이첼', 'rachel', '애니', '에니', 'ani', 'annie']

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

    const details: any[] = []

    for (const agent of agents || []) {
      const nameLower = agent.name?.toLowerCase() || ''

      // Amy는 제외 (실제 사진 사용)
      if (nameLower.includes('에이미') || nameLower.includes('amy')) {
        details.push({ name: agent.name, status: 'skipped', reason: 'Amy - has real photo' })
        skipped++
        continue
      }

      // 커스텀 업로드 이미지가 있으면 스킵 (supabase storage 실제 이미지만)
      // dicebear, ui-avatars는 업데이트 대상
      if (agent.avatar_url &&
          !agent.avatar_url.includes('dicebear') &&
          !agent.avatar_url.includes('ui-avatars.com')) {
        details.push({ name: agent.name, status: 'skipped', reason: 'custom avatar', avatar_url: agent.avatar_url?.substring(0, 50) })
        skipped++
        continue
      }

      // 여성 에이전트 체크
      const isFemale = FEMALE_AGENTS.some(name => nameLower.includes(name))

      // 여성 에이전트: 여성스러운 시드 사용
      // 남성 에이전트: 기본 이름 시드 사용
      const seed = isFemale
        ? `${agent.name}-female-${Date.now()}`
        : agent.name

      const newAvatarUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}`

      const { error: updateError } = await (adminClient as any)
        .from('deployed_agents')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', agent.id)

      if (!updateError) {
        details.push({ name: agent.name, status: 'updated', gender: isFemale ? 'female' : 'male', newUrl: newAvatarUrl.substring(0, 60) })
        updated++
        console.log(`Updated ${agent.name} (${isFemale ? 'female' : 'male'})`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updated}개 에이전트 아바타 업데이트 완료, ${skipped}개 스킵됨`,
      updated,
      skipped,
      details,
    })
  } catch (error) {
    console.error('아바타 업데이트 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

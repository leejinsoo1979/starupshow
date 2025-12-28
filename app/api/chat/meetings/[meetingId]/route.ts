export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDevUserIfEnabled } from '@/lib/dev-user'

// GET: 개별 회의록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const devUser = getDevUserIfEnabled()
    let user: any = devUser

    if (!devUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { meetingId } = params

    // 회의록 조회
    const { data: meeting, error } = await (adminClient as any)
      .from('meeting_records')
      .select('*')
      .eq('id', meetingId)
      .single()

    if (error) {
      console.error('[Meeting API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // 사용자가 이 채팅방의 참여자인지 확인
    const { data: participant } = await (adminClient as any)
      .from('chat_participants')
      .select('id')
      .eq('room_id', meeting.room_id)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 날짜 포맷팅 추가
    const formattedMeeting = {
      ...meeting,
      formatted_date: new Date(meeting.started_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
      formatted_time: `${new Date(meeting.started_at).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })} ~ ${new Date(meeting.ended_at).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    }

    return NextResponse.json(formattedMeeting)
  } catch (error) {
    console.error('[Meeting API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: 회의록 업데이트 (요약, 액션 아이템 등)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const devUser = getDevUserIfEnabled()
    let user: any = devUser

    if (!devUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { meetingId } = params
    const body = await request.json()

    // 회의록 조회
    const { data: meeting } = await (adminClient as any)
      .from('meeting_records')
      .select('room_id, created_by')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // 생성자 확인
    if (meeting.created_by !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // 업데이트 가능한 필드만 추출
    const allowedFields = ['summary', 'key_points', 'action_items', 'decisions', 'risk_register']
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updateData.updated_at = new Date().toISOString()

    // 회의록 업데이트
    const { data: updated, error } = await (adminClient as any)
      .from('meeting_records')
      .update(updateData)
      .eq('id', meetingId)
      .select()
      .single()

    if (error) {
      console.error('[Meeting API] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Meeting API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 회의록 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const devUser = getDevUserIfEnabled()
    let user: any = devUser

    if (!devUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { meetingId } = params

    // 회의록 조회
    const { data: meeting } = await (adminClient as any)
      .from('meeting_records')
      .select('created_by')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // 생성자 확인
    if (meeting.created_by !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // 회의록 삭제
    const { error } = await (adminClient as any)
      .from('meeting_records')
      .delete()
      .eq('id', meetingId)

    if (error) {
      console.error('[Meeting API] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Meeting record deleted' })
  } catch (error) {
    console.error('[Meeting API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

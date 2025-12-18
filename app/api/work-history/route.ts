import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 에이전트 대화 기록 가져오기
        const { data: conversations, error } = await supabase
            .from('agent_conversations')
            .select(`
                id,
                last_message_at,
                created_at,
                deployed_agents (
                    id,
                    name,
                    description,
                    avatar_url
                ),
                agent_chat_messages (
                    content,
                    role,
                    created_at
                )
            `)
            .eq('user_id', user.id)
            .order('last_message_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('Error fetching work history:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // 데이터 포맷팅
        const workHistory = conversations?.map((conv: any) => {
            const lastMessage = conv.agent_chat_messages?.[0]
            const agent = conv.deployed_agents

            // 날짜 포맷팅
            const date = new Date(conv.last_message_at)
            const now = new Date()
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

            let dateStr = ''
            if (diffDays === 0) {
                dateStr = '오늘'
            } else if (diffDays === 1) {
                dateStr = '어제'
            } else {
                dateStr = date.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                })
            }

            return {
                id: conv.id,
                title: agent?.name || '대화',
                subtitle: lastMessage?.content?.slice(0, 50) || '',
                type: 'chat',
                date: dateStr,
                agentId: agent?.id,
                avatarUrl: agent?.avatar_url
            }
        }) || []

        return NextResponse.json({ workHistory })
    } catch (error) {
        console.error('Work history API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

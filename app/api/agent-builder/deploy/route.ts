import { NextRequest, NextResponse } from 'next/server'
import { deployAgentToApps, CustomAgentConfig } from '@/lib/agent-builder'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const agent: CustomAgentConfig = body.agent

        if (!agent || !agent.id) {
            return NextResponse.json(
                { success: false, error: '에이전트 설정이 필요합니다' },
                { status: 400 }
            )
        }

        const result = await deployAgentToApps(agent)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Agent deploy error:', error)
        return NextResponse.json(
            { success: false, error: '에이전트 배포 중 오류가 발생했습니다' },
            { status: 500 }
        )
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { generateAgentFromPrompt } from '@/lib/agent-builder'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userPrompt, refinements } = body

        if (!userPrompt) {
            return NextResponse.json(
                { success: false, error: '에이전트 설명을 입력해주세요' },
                { status: 400 }
            )
        }

        const result = await generateAgentFromPrompt({
            userPrompt,
            refinements
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Agent builder error:', error)
        return NextResponse.json(
            { success: false, error: '에이전트 생성 중 오류가 발생했습니다' },
            { status: 500 }
        )
    }
}

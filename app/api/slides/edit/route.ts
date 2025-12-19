export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

interface EditRequest {
    slide: any
    instruction: string
}

export async function POST(request: NextRequest) {
    try {
        const body: EditRequest = await request.json()
        const { slide, instruction } = body

        const apiKey = process.env.XAI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
        }

        const editPrompt = `당신은 전문 사업계획서 편집 전문가입니다.
다음 슬라이드를 수정 요청에 맞게 업데이트해주세요.

현재 슬라이드:
${JSON.stringify(slide, null, 2)}

수정 요청: ${instruction}

수정된 슬라이드를 동일한 JSON 구조로 반환해주세요.
type과 id는 유지하고, 내용만 수정해주세요.
JSON만 출력하세요.`

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'grok-3-mini',
                messages: [
                    { role: 'system', content: '당신은 전문 사업계획서 편집 전문가입니다. 요청에 맞게 슬라이드 콘텐츠를 수정합니다.' },
                    { role: 'user', content: editPrompt }
                ],
                temperature: 0.5,
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('[Slides Edit API] Grok error:', error)
            return NextResponse.json({ error: 'Failed to edit slide' }, { status: 500 })
        }

        const data = await response.json()
        let content = data.choices?.[0]?.message?.content || ''

        // Parse JSON from response
        try {
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (jsonMatch) {
                content = jsonMatch[1].trim()
            }

            const editedSlide = JSON.parse(content)
            return NextResponse.json({
                success: true,
                slide: editedSlide
            })
        } catch (parseError) {
            console.error('[Slides Edit API] JSON parse error:', parseError)
            return NextResponse.json({ error: 'Failed to parse edited slide' }, { status: 500 })
        }
    } catch (error) {
        console.error('[Slides Edit API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

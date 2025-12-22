import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/ai/openai'

export async function POST(req: NextRequest) {
    try {
        const { text, voice = 'alloy', model = 'tts-1' } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        const openai = getOpenAI()

        const mp3 = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: text,
        })

        const buffer = Buffer.from(await mp3.arrayBuffer())

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            },
        })
    } catch (error: any) {
        console.error('[TTS API Error]:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { createReadStream } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getOpenAI } from '@/lib/ai/openai'

export async function POST(req: NextRequest) {
    const tempPath = join(tmpdir(), `stt_${Date.now()}.webm`)

    try {
        const formData = await req.formData()
        const audioFile = formData.get('audio') as File

        if (!audioFile) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
        }

        console.log('[STT] Received:', audioFile.name, audioFile.size, 'bytes')

        // 임시 파일로 저장
        const arrayBuffer = await audioFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await writeFile(tempPath, buffer)

        const openai = getOpenAI()

        // 파일 스트림으로 전송
        const transcription = await openai.audio.transcriptions.create({
            file: createReadStream(tempPath) as any,
            model: 'whisper-1',
            language: 'ko',
        })

        console.log('[STT] ✅', transcription.text)

        // 임시 파일 삭제
        await unlink(tempPath).catch(() => {})

        return NextResponse.json({
            text: transcription.text,
            success: true
        })
    } catch (error: any) {
        console.error('[STT Error]:', error.message)
        await unlink(tempPath).catch(() => {})
        return NextResponse.json(
            { error: error.message || 'Internal Server Error', success: false },
            { status: 500 }
        )
    }
}

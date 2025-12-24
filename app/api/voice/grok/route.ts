import { NextRequest, NextResponse } from 'next/server'

// Grok Voice API - TTS 엔드포인트
// WebSocket 기반 실시간 API를 HTTP로 래핑
export async function POST(req: NextRequest) {
    try {
        const { text, voice = 'Eve' } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        const XAI_API_KEY = process.env.XAI_API_KEY
        if (!XAI_API_KEY) {
            return NextResponse.json({ error: 'XAI API key not configured' }, { status: 500 })
        }

        console.log('[Grok TTS] Starting with text:', text.substring(0, 50))

        const audioChunks: Buffer[] = []

        await new Promise<void>((resolve, reject) => {
            const WebSocket = require('ws')

            const ws = new WebSocket('wss://api.x.ai/v1/realtime', {
                headers: {
                    'Authorization': `Bearer ${XAI_API_KEY}`,
                }
            })

            let configured = false

            ws.on('open', () => {
                console.log('[Grok TTS] WebSocket connected')
            })

            ws.on('message', (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString())
                    console.log('[Grok TTS] Received:', message.type)

                    // conversation.created 이벤트 시 세션 설정
                    if (message.type === 'conversation.created' && !configured) {
                        configured = true
                        console.log('[Grok TTS] Configuring session...')

                        // 세션 업데이트
                        ws.send(JSON.stringify({
                            type: 'session.update',
                            session: {
                                voice: voice,
                                modalities: ['text', 'audio'],
                                input_audio_format: 'pcm16',
                                output_audio_format: 'pcm16',
                                turn_detection: null,
                            }
                        }))
                    }

                    // 세션 업데이트 완료 후 텍스트 전송
                    if (message.type === 'session.updated') {
                        console.log('[Grok TTS] Session updated, sending text...')

                        // 사용자 메시지로 텍스트 전송
                        ws.send(JSON.stringify({
                            type: 'conversation.item.create',
                            item: {
                                type: 'message',
                                role: 'user',
                                content: [{
                                    type: 'input_text',
                                    text: text
                                }]
                            }
                        }))

                        // 응답 생성 요청
                        setTimeout(() => {
                            console.log('[Grok TTS] Requesting response...')
                            ws.send(JSON.stringify({
                                type: 'response.create',
                                response: {
                                    modalities: ['audio', 'text']
                                }
                            }))
                        }, 50)
                    }

                    // 오디오 델타 수신 (Grok은 response.output_audio.delta 사용)
                    if (message.type === 'response.output_audio.delta') {
                        const audioData = Buffer.from(message.delta, 'base64')
                        audioChunks.push(audioData)
                        if (audioChunks.length === 1) {
                            console.log('[Grok TTS] First audio chunk received')
                        }
                    }

                    // 응답 완료
                    if (message.type === 'response.done') {
                        console.log('[Grok TTS] Response done, chunks:', audioChunks.length)
                        ws.close()
                        resolve()
                    }

                    // 에러 처리
                    if (message.type === 'error') {
                        console.error('[Grok TTS] Error:', message.error)
                        ws.close()
                        reject(new Error(message.error?.message || 'Grok Voice API error'))
                    }
                } catch (e) {
                    console.error('[Grok TTS] Parse error:', e)
                }
            })

            ws.on('error', (error: Error) => {
                console.error('[Grok TTS] WebSocket Error:', error.message)
                reject(error)
            })

            ws.on('close', (code: number) => {
                console.log('[Grok TTS] Closed with code:', code)
                if (audioChunks.length === 0 && configured) {
                    reject(new Error('No audio received'))
                }
            })

            // 20초 타임아웃
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    console.log('[Grok TTS] Timeout')
                    ws.close()
                    reject(new Error('Timeout'))
                }
            }, 20000)
        })

        if (audioChunks.length === 0) {
            return NextResponse.json({ error: 'No audio generated' }, { status: 500 })
        }

        // PCM을 WAV로 변환
        const pcmBuffer = Buffer.concat(audioChunks)
        console.log('[Grok TTS] Total PCM size:', pcmBuffer.length)

        const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16)

        return new NextResponse(wavBuffer, {
            headers: {
                'Content-Type': 'audio/wav',
                'Content-Length': wavBuffer.length.toString(),
            },
        })
    } catch (error: any) {
        console.error('[Grok Voice API Error]:', error.message)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}

// PCM을 WAV로 변환하는 헬퍼 함수
function pcmToWav(pcmData: Buffer, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
    const byteRate = sampleRate * numChannels * bitsPerSample / 8
    const blockAlign = numChannels * bitsPerSample / 8
    const dataSize = pcmData.length
    const headerSize = 44
    const totalSize = headerSize + dataSize

    const buffer = Buffer.alloc(totalSize)

    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(totalSize - 8, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16)
    buffer.writeUInt16LE(1, 20)
    buffer.writeUInt16LE(numChannels, 22)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(byteRate, 28)
    buffer.writeUInt16LE(blockAlign, 32)
    buffer.writeUInt16LE(bitsPerSample, 34)
    buffer.write('data', 36)
    buffer.writeUInt32LE(dataSize, 40)
    pcmData.copy(buffer, 44)

    return buffer
}

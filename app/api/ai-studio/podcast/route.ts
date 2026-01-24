import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

function getTTSApiKey(): string {
  const key = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY
  if (!key) {
    throw new Error('GOOGLE_TTS_API_KEY is not configured')
  }
  return key
}

interface Source {
  id: string
  type: 'pdf' | 'web' | 'youtube' | 'text'
  title: string
  content?: string
  summary?: string
}

// Google Cloud TTS Neural2 - Much more natural than Wavenet
const VOICES = {
  host: {
    languageCode: 'ko-KR',
    name: 'ko-KR-Neural2-C', // Male Neural2 voice - most natural
  },
  guest: {
    languageCode: 'ko-KR',
    name: 'ko-KR-Neural2-A', // Female Neural2 voice - most natural
  }
}

// Generate speech using Google Cloud TTS Neural2
async function synthesizeSpeech(text: string, voice: 'host' | 'guest'): Promise<Buffer> {
  const voiceConfig = VOICES[voice]
  const ttsApiKey = getTTSApiKey()

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.name
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: voice === 'host' ? -1.0 : 1.5, // Slightly lower for host, higher for guest
          speakingRate: 0.95, // Slightly slower for more natural pace
          effectsProfileId: ['headphone-class-device'] // Better audio quality
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('TTS API error:', error)
    throw new Error('TTS API 오류')
  }

  const data = await response.json()
  return Buffer.from(data.audioContent, 'base64')
}

export async function POST(req: Request) {
  try {
    const { sources } = await req.json() as { sources: Source[] }

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: '소스가 필요합니다' }, { status: 400 })
    }

    // Build context from sources
    const sourceContext = sources.map((s, i) => {
      const content = s.content || s.summary || ''
      return `[소스 ${i + 1}: ${s.title}]\n${content.slice(0, 5000)}`
    }).join('\n\n---\n\n')

    // Generate podcast script using Gemini
    const client = getGeminiClient()
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096
      }
    })

    const scriptPrompt = `당신은 팟캐스트 대본 작가입니다. 다음 자료들을 기반으로 두 사람(진행자, 게스트)이 대화하는 형식의 팟캐스트 대본을 작성해주세요.

## 자료
${sourceContext}

## 요구사항
1. 진행자(Host)와 게스트(Guest)가 번갈아가며 대화하는 형식
2. 자연스럽고 친근한 말투 사용
3. 핵심 내용을 쉽게 설명
4. 길이: 약 3-5분 분량 (각 발언 2-4문장)
5. 형식: 각 발언을 [Host] 또는 [Guest]로 시작

## 대본 예시
[Host] 안녕하세요! 오늘은 흥미로운 주제를 가져왔습니다.
[Guest] 네, 정말 기대되네요. 어떤 내용인가요?
[Host] 오늘 다룰 주제는...

## 팟캐스트 대본`

    const scriptResult = await model.generateContent(scriptPrompt)
    const script = await scriptResult.response.text()

    // Parse script into segments
    const segments: { speaker: 'host' | 'guest'; text: string }[] = []
    const lines = script.split('\n').filter(line => line.trim())

    for (const line of lines) {
      if (line.startsWith('[Host]') || line.startsWith('[진행자]')) {
        segments.push({
          speaker: 'host',
          text: line.replace(/\[Host\]|\[진행자\]/, '').trim()
        })
      } else if (line.startsWith('[Guest]') || line.startsWith('[게스트]')) {
        segments.push({
          speaker: 'guest',
          text: line.replace(/\[Guest\]|\[게스트\]/, '').trim()
        })
      }
    }

    if (segments.length === 0) {
      // If parsing failed, try to generate as single narration
      segments.push({ speaker: 'host', text: script.slice(0, 2000) })
    }

    // Generate audio for each segment
    const audioBuffers: Buffer[] = []

    for (const segment of segments.slice(0, 20)) { // Limit to 20 segments
      if (segment.text.length > 0) {
        try {
          const audio = await synthesizeSpeech(segment.text, segment.speaker)
          audioBuffers.push(audio)
        } catch (error) {
          console.error('TTS error for segment:', error)
        }
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({
        success: true,
        title: '소스 기반 팟캐스트',
        transcript: script,
        audioUrl: null,
        message: '오디오 생성에 실패했지만 대본은 생성되었습니다.'
      })
    }

    // Combine audio buffers
    const combinedAudio = Buffer.concat(audioBuffers)
    const base64Audio = combinedAudio.toString('base64')
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`

    // Estimate duration (rough estimate: 150 words per minute for Korean)
    const wordCount = script.replace(/\[Host\]|\[Guest\]|\[진행자\]|\[게스트\]/g, '').length / 2
    const estimatedMinutes = Math.ceil(wordCount / 150)

    return NextResponse.json({
      success: true,
      title: '소스 기반 팟캐스트',
      audioUrl,
      duration: `${estimatedMinutes}분`,
      transcript: script
    })
  } catch (error) {
    console.error('Podcast generation error:', error)
    return NextResponse.json(
      { error: '팟캐스트 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

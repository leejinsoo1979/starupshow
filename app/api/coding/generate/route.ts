import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' })

export async function POST(request: Request) {
    try {
        const { message, projectType, currentFiles, images } = await request.json()

        if (!message) {
            return new Response(JSON.stringify({ error: '메시지가 필요합니다.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // 전문적인 시스템 프롬프트 - 계획 → 분석 → 구현 플로우
        const systemPrompt = `당신은 15년 이상 경력의 시니어 풀스택 엔지니어입니다. 무엇이든 만들 수 있습니다.

## 🎯 응답 플로우 (반드시 순서대로)

### 1단계: 요구사항 분석 (2-3문장)
사용자가 원하는 것을 명확히 파악하고 핵심 기능을 정리합니다.

### 2단계: 구현 계획
**구현할 기능:** (번호 목록)
**기술 스택:** (사용할 기술)
**파일 구조:** (생성할 파일들)

### 3단계: 코드 구현
계획에 따라 완벽하게 동작하는 코드 작성

## 📁 코드 파일 형식 (필수)
\`\`\`language:filename.ext
[완전한 코드]
\`\`\`

## ⚡ 코드 품질 기준
- 즉시 실행 가능한 완전한 코드
- 에러 핸들링, 엣지 케이스 처리
- 모던 웹 (ES6+, CSS Grid/Flexbox)
- 다크 모드 기본, 세련된 UI
- 반응형 디자인

## 📌 요청 유형별 가이드

**웹페이지/랜딩페이지:**
- 시맨틱 HTML5, 모던 CSS
- 애니메이션, 트랜지션 효과
- 반응형 레이아웃

**웹 앱 (Todo, 계산기, 폼 등):**
- 상태 관리, LocalStorage 영속성
- 폼 유효성 검사
- 사용자 피드백 (로딩, 에러 상태)

**게임:**
- Canvas 또는 DOM 기반
- requestAnimationFrame 게임 루프
- 키보드/마우스 이벤트 처리
- 게임 상태 관리

**데이터 시각화:**
- Chart.js 또는 커스텀 Canvas
- 인터랙티브 차트
- 반응형 그래프

**유틸리티 도구:**
- 명확한 입출력
- 복사/다운로드 기능
- 결과 미리보기

## 📌 프로젝트 컨텍스트
- 타입: ${projectType || 'simple-web'}
- 기존 파일: ${currentFiles?.map((f: { name: string }) => f.name).join(', ') || '없음'}

## 🗣️ 언어
- 설명/주석: 한국어
- 변수/함수명: 영어 camelCase`

        // Gemini API 스트리밍 호출
        const stream = await genai.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: images && images.length > 0
                        ? [
                            { text: `${systemPrompt}\n\n사용자 요청: ${message}` },
                            ...images.map((img: string) => ({
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: img.replace(/^data:image\/\w+;base64,/, '')
                                }
                            }))
                        ]
                        : [{ text: `${systemPrompt}\n\n사용자 요청: ${message}` }]
                }
            ],
            config: {
                maxOutputTokens: 8192,
                temperature: 0.7
            }
        })

        // ReadableStream 생성
        const encoder = new TextEncoder()
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.text
                        if (text) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`))
                        }
                    }
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                    controller.close()
                } catch (error) {
                    console.error('Stream error:', error)
                    controller.error(error)
                }
            }
        })

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })
    } catch (error) {
        console.error('Code generation error:', error)
        return new Response(JSON.stringify({ error: '코드 생성에 실패했습니다.', details: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

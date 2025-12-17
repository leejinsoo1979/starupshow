import { NextResponse } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

// Google AI 클라이언트 생성
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
})

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY

// 타임스탬프 포맷팅
function formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// YouTube Data API로 영상 정보 가져오기
async function getVideoInfo(videoId: string) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
        )
        const data = await response.json()

        if (data.items && data.items.length > 0) {
            const item = data.items[0]
            const snippet = item.snippet
            const stats = item.statistics

            return {
                id: videoId,
                title: snippet.title,
                channel: snippet.channelTitle,
                thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                date: new Date(snippet.publishedAt).toLocaleDateString('ko-KR'),
                views: parseInt(stats.viewCount).toLocaleString() + '회',
                likes: stats.likeCount ? parseInt(stats.likeCount).toLocaleString() : '',
                description: snippet.description || '',
            }
        }
    } catch (error) {
        console.error('Failed to fetch video info:', error)
    }

    return {
        id: videoId,
        title: '영상 제목을 불러올 수 없습니다',
        channel: '',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        date: '',
        views: '',
        likes: '',
        description: '',
    }
}

// YouTube Data API로 댓글 가져오기
async function getComments(videoId: string, maxResults: number = 20) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=relevance&key=${YOUTUBE_API_KEY}`
        )
        const data = await response.json()

        // API 오류 체크
        if (data.error) {
            console.error('YouTube Comments API Error:', data.error.message)
            // 댓글이 비활성화된 영상이거나 API 제한
            if (data.error.code === 403) {
                console.log('Comments API disabled or quota exceeded')
            }
            return []
        }

        if (data.items && data.items.length > 0) {
            return data.items.map((item: any) => {
                const comment = item.snippet.topLevelComment.snippet
                return {
                    id: item.id,
                    author: comment.authorDisplayName,
                    authorImage: comment.authorProfileImageUrl,
                    text: comment.textDisplay,
                    likes: comment.likeCount,
                    date: new Date(comment.publishedAt).toLocaleDateString('ko-KR'),
                }
            })
        }
    } catch (error) {
        console.error('Failed to fetch comments:', error)
    }
    return []
}

// YouTube Data API로 자막 목록 가져오기
async function getCaptionsList(videoId: string) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${YOUTUBE_API_KEY}`
        )
        const data = await response.json()
        return data.items || []
    } catch (error) {
        console.error('Failed to fetch captions list:', error)
        return []
    }
}

// 자막 XML 파싱
function parseTranscriptXml(xml: string): { start: number; text: string }[] {
    const results: { start: number; text: string }[] = []
    const regex = /<text start="([^"]+)"[^>]*>([^<]*)<\/text>/g
    let match

    while ((match = regex.exec(xml)) !== null) {
        const start = parseFloat(match[1])
        let text = match[2]
        // HTML 엔티티 디코딩
        text = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n/g, ' ')
            .trim()

        if (text) {
            results.push({ start, text })
        }
    }

    return results
}

// JSON 객체를 괄호 매칭으로 추출
function extractJsonObject(str: string, startIndex: number): string | null {
    let depth = 0
    let start = -1

    for (let i = startIndex; i < str.length; i++) {
        if (str[i] === '{') {
            if (depth === 0) start = i
            depth++
        } else if (str[i] === '}') {
            depth--
            if (depth === 0 && start !== -1) {
                return str.slice(start, i + 1)
            }
        }
    }
    return null
}

// YouTube 페이지에서 자막 URL 추출
async function fetchTranscript(videoId: string): Promise<{ start: number; text: string }[]> {
    try {
        // 1. 영상 페이지 가져오기
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
        const response = await fetch(watchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
        })

        if (!response.ok) {
            console.error('Failed to fetch video page:', response.status)
            return []
        }

        const html = await response.text()

        // 2. ytInitialPlayerResponse에서 자막 정보 추출 (괄호 매칭 사용)
        const playerResponseIndex = html.indexOf('ytInitialPlayerResponse')
        if (playerResponseIndex === -1) {
            console.error('Could not find ytInitialPlayerResponse')
            return []
        }

        const equalIndex = html.indexOf('=', playerResponseIndex)
        if (equalIndex === -1) {
            console.error('Could not find = after ytInitialPlayerResponse')
            return []
        }

        const jsonStr = extractJsonObject(html, equalIndex + 1)
        if (!jsonStr) {
            console.error('Could not extract JSON object')
            return []
        }

        let playerResponse
        try {
            playerResponse = JSON.parse(jsonStr)
        } catch (e) {
            console.error('Failed to parse player response:', e)
            return []
        }

        // 3. 자막 트랙 찾기
        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
        if (!captions || captions.length === 0) {
            console.log('No captions available for this video')
            console.log('Available keys:', Object.keys(playerResponse || {}))
            return []
        }

        console.log(`Found ${captions.length} caption tracks`)

        // 4. 한국어 > 영어 > 첫번째 자막 순으로 선택
        let selectedCaption = captions.find((c: any) => c.languageCode === 'ko')
        if (!selectedCaption) {
            selectedCaption = captions.find((c: any) => c.languageCode === 'en')
        }
        if (!selectedCaption) {
            selectedCaption = captions[0]
        }

        console.log(`Selected caption: ${selectedCaption.languageCode} - ${selectedCaption.name?.simpleText || 'auto'}`)

        // 5. 자막 데이터 가져오기 (XML 형식)
        let captionUrl = selectedCaption.baseUrl
        console.log('Caption URL:', captionUrl.slice(0, 300))

        const captionResponse = await fetch(captionUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
            }
        })

        if (!captionResponse.ok) {
            console.error('Failed to fetch caption data:', captionResponse.status, captionResponse.statusText)
            return []
        }

        const captionData = await captionResponse.text()
        console.log('Caption data length:', captionData.length)
        console.log('Caption data sample:', captionData.slice(0, 500))

        // 6. 데이터 파싱
        const results: { start: number; text: string }[] = []

        // XML 형식: <text start="..." dur="...">내용</text>
        if (captionData.includes('<text')) {
            const regex = /<text[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g
            let match

            while ((match = regex.exec(captionData)) !== null) {
                const start = parseFloat(match[1])
                let text = match[2]
                text = text
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, ' ')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\n/g, ' ')
                    .trim()

                if (text) {
                    results.push({ start, text })
                }
            }
        }

        // JSON3 형식
        if (results.length === 0 && captionData.trim().startsWith('{')) {
            try {
                const jsonData = JSON.parse(captionData)
                if (jsonData.events) {
                    for (const event of jsonData.events) {
                        if (event.segs) {
                            const text = event.segs.map((s: any) => s.utf8 || '').join('').trim()
                            if (text) {
                                results.push({
                                    start: (event.tStartMs || 0) / 1000,
                                    text
                                })
                            }
                        }
                    }
                }
            } catch (e) {
                console.log('Not JSON format:', e)
            }
        }

        console.log(`✓ Transcript fetched: ${results.length} items`)
        return results

    } catch (error) {
        console.error('Error fetching transcript:', error)
        return []
    }
}

// AI로 요약 생성
async function generateSummary(transcript: string, videoTitle: string) {
    const prompt = `당신은 전문적인 콘텐츠 요약 전문가입니다. 아래 유튜브 영상의 스크립트를 분석하고 구조화된 요약을 생성해주세요.

영상 제목: ${videoTitle}

스크립트:
${transcript.slice(0, 15000)}

다음 JSON 형식으로 응답해주세요 (반드시 유효한 JSON만 출력, 마크다운 코드블록 없이):

{
    "threeLine": [
        "첫 번째 핵심 요약 (2-3문장)",
        "두 번째 핵심 요약 (2-3문장)",
        "세 번째 핵심 요약 (2-3문장)"
    ],
    "tableOfContents": [
        "주제1",
        "주제2",
        "주제3",
        "주제4",
        "주제5"
    ],
    "timeline": [
        {
            "title": "섹션 제목",
            "timestamp": "00:00",
            "content": "이 섹션의 주요 내용 요약 (2-3문장)",
            "details": [
                "세부 포인트 1",
                "세부 포인트 2"
            ]
        }
    ]
}

주의사항:
1. 한국어로 작성
2. threeLine은 영상의 가장 중요한 3가지 핵심 메시지
3. tableOfContents는 주요 주제 5-7개
4. timeline은 시간순 4-7개 섹션
5. JSON만 출력 (마크다운 없이)`

    try {
        const { text } = await generateText({
            model: google('gemini-2.0-flash-exp'),
            prompt,
        })

        // JSON 추출
        let jsonStr = text.trim()
        // 코드 블록 제거
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```(?:json)?\n?/g, '').trim()
        }

        const summary = JSON.parse(jsonStr)
        return summary
    } catch (error) {
        console.error('Failed to generate summary:', error)
        return {
            threeLine: [
                '영상 요약을 생성하는 중 오류가 발생했습니다.',
                '잠시 후 다시 시도해주세요.',
                '',
            ],
            tableOfContents: ['요약 생성 실패'],
            timeline: [{
                title: '요약 생성 실패',
                timestamp: '00:00',
                content: 'AI 요약 생성 중 오류가 발생했습니다.',
                details: [],
            }],
        }
    }
}

// Python 백엔드 호출
async function callPythonBackend(videoId: string) {
    try {
        const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8002'
        const response = await fetch(`${pythonBackendUrl}/api/youtube/transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoId, generate_summary: true }),
        })

        if (!response.ok) {
            return null
        }

        const data = await response.json()
        if (data.success) {
            return {
                videoInfo: data.videoInfo,
                transcript: data.transcript?.map((t: any) => ({
                    timestamp: t.timestamp,
                    text: t.text,
                })) || [],
                summary: data.summary,
            }
        }
        return null
    } catch (error) {
        console.log('Python backend not available, falling back to direct fetch')
        return null
    }
}

export async function POST(request: Request) {
    try {
        const { videoId } = await request.json()

        if (!videoId) {
            return NextResponse.json(
                { error: '유효한 유튜브 링크를 입력해주세요' },
                { status: 400 }
            )
        }

        console.log(`Processing video: ${videoId}`)

        // 영상 정보와 댓글은 항상 YouTube Data API로 가져오기
        const [videoInfo, comments] = await Promise.all([
            getVideoInfo(videoId),
            getComments(videoId, 10)
        ])
        console.log(`Video info: ${videoInfo.title}, Comments: ${comments.length}`)

        // 1. Python 백엔드 시도 (yt-dlp 사용)
        const pythonResult = await callPythonBackend(videoId)
        if (pythonResult) {
            console.log('✓ Got result from Python backend')
            return NextResponse.json({
                ...pythonResult,
                videoInfo,  // YouTube Data API에서 가져온 정보로 덮어쓰기
                comments,
            })
        }

        // 2. 직접 추출 시도 (fallback)
        console.log('Falling back to direct extraction...')

        // 자막 가져오기
        const transcriptItems = await fetchTranscript(videoId)

        if (transcriptItems.length === 0) {
            return NextResponse.json(
                { error: '이 영상에서 자막을 가져올 수 없습니다. YouTube가 IP를 차단했거나 자막이 없는 영상입니다.' },
                { status: 400 }
            )
        }

        // 스크립트 포맷팅
        const transcript = transcriptItems.map((item) => ({
            timestamp: formatTimestamp(item.start),
            text: item.text,
        }))

        const fullTranscript = transcriptItems.map((item) => item.text).join(' ')
        console.log(`Transcript length: ${fullTranscript.length} chars`)

        // AI 요약 생성
        const summary = await generateSummary(fullTranscript, videoInfo.title)

        return NextResponse.json({
            videoInfo,
            transcript,
            summary,
            comments,
        })
    } catch (error) {
        console.error('YouTube summarize error:', error)
        return NextResponse.json(
            { error: '요약 생성 중 오류가 발생했습니다' },
            { status: 500 }
        )
    }
}

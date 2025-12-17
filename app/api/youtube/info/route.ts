import { NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY

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
        title: '',
        channel: '',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        date: '',
        views: '',
        likes: '',
        description: '',
    }
}

// YouTube Data API로 댓글 가져오기
async function getComments(videoId: string, maxResults: number = 10) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=relevance&key=${YOUTUBE_API_KEY}`
        )
        const data = await response.json()

        if (data.error) {
            console.error('YouTube Comments API Error:', data.error.message)
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

export async function POST(request: Request) {
    try {
        const { videoId } = await request.json()

        if (!videoId) {
            return NextResponse.json(
                { error: '유효한 비디오 ID가 필요합니다' },
                { status: 400 }
            )
        }

        // 빠르게 영상 정보 + 댓글만 가져오기
        const [videoInfo, comments] = await Promise.all([
            getVideoInfo(videoId),
            getComments(videoId, 10)
        ])

        return NextResponse.json({
            videoInfo,
            comments,
        })
    } catch (error) {
        console.error('YouTube info error:', error)
        return NextResponse.json(
            { error: '영상 정보를 가져오는 중 오류가 발생했습니다' },
            { status: 500 }
        )
    }
}

"""
YouTube Transcript Skill
- 유튜브 영상의 자막을 추출하고 AI로 요약
- 개별 실행 가능, 에이전트 빌더 스킬로 등록 가능
"""

import re
import json
import sys
from typing import Optional, List, Dict, Any
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import requests

# AI 요약을 위한 설정
GOOGLE_API_KEY = None
OPENAI_API_KEY = None

def extract_video_id(url: str) -> Optional[str]:
    """유튜브 URL에서 비디오 ID 추출"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/shorts\/([^&\n?#]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    # 이미 video ID인 경우
    if len(url) == 11 and re.match(r'^[a-zA-Z0-9_-]+$', url):
        return url

    return None


def get_video_info(video_id: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """YouTube Data API로 영상 정보 가져오기"""
    if not api_key:
        return {
            'id': video_id,
            'title': '제목을 불러올 수 없습니다',
            'channel': '',
            'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
            'date': '',
            'views': '',
        }

    try:
        url = f'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id={video_id}&key={api_key}'
        response = requests.get(url)
        data = response.json()

        if data.get('items') and len(data['items']) > 0:
            item = data['items'][0]
            snippet = item['snippet']
            stats = item.get('statistics', {})

            thumbnails = snippet.get('thumbnails', {})
            thumbnail = (
                thumbnails.get('maxres', {}).get('url') or
                thumbnails.get('high', {}).get('url') or
                f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg'
            )

            return {
                'id': video_id,
                'title': snippet.get('title', ''),
                'channel': snippet.get('channelTitle', ''),
                'thumbnail': thumbnail,
                'date': snippet.get('publishedAt', '')[:10],
                'views': f"{int(stats.get('viewCount', 0)):,}회" if stats.get('viewCount') else '',
            }
    except Exception as e:
        print(f"Error fetching video info: {e}", file=sys.stderr)

    return {
        'id': video_id,
        'title': '제목을 불러올 수 없습니다',
        'channel': '',
        'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
        'date': '',
        'views': '',
    }


def get_transcript(video_id: str, languages: List[str] = ['ko', 'en'], cookies_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """유튜브 영상의 자막 추출"""
    try:
        # 쿠키 파일이 있으면 세션에 로드
        http_client = None
        if cookies_path:
            import http.cookiejar
            http_client = requests.Session()
            cookie_jar = http.cookiejar.MozillaCookieJar(cookies_path)
            try:
                cookie_jar.load()
                http_client.cookies = cookie_jar
            except:
                pass

        api = YouTubeTranscriptApi(http_client=http_client)

        # 언어 우선순위대로 시도
        transcript_list = api.list(video_id)

        # 수동 자막 먼저 시도
        for lang in languages:
            try:
                transcript = transcript_list.find_manually_created_transcript([lang])
                fetched = transcript.fetch()
                return [{'start': s.start, 'duration': s.duration, 'text': s.text} for s in fetched]
            except:
                pass

        # 자동 생성 자막 시도
        for lang in languages:
            try:
                transcript = transcript_list.find_generated_transcript([lang])
                fetched = transcript.fetch()
                return [{'start': s.start, 'duration': s.duration, 'text': s.text} for s in fetched]
            except:
                pass

        # 아무 자막이나 가져오기
        for transcript in transcript_list:
            try:
                fetched = transcript.fetch()
                return [{'start': s.start, 'duration': s.duration, 'text': s.text} for s in fetched]
            except:
                continue

        return []
    except Exception as e:
        error_msg = str(e)
        if 'IpBlocked' in type(e).__name__:
            print(f"YouTube IP 차단됨. 쿠키 파일을 설정하거나 잠시 후 다시 시도하세요.", file=sys.stderr)
        else:
            print(f"Error fetching transcript: {e}", file=sys.stderr)
        return []


def format_timestamp(seconds: float) -> str:
    """초를 HH:MM:SS 또는 MM:SS 형식으로 변환"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def summarize_with_gemini(transcript_text: str, video_title: str, api_key: str) -> Dict[str, Any]:
    """Gemini로 자막 요약"""
    prompt = f'''당신은 전문적인 콘텐츠 요약 전문가입니다. 아래 유튜브 영상의 스크립트를 분석하고 구조화된 요약을 생성해주세요.

영상 제목: {video_title}

스크립트:
{transcript_text[:15000]}

다음 JSON 형식으로 응답해주세요 (반드시 유효한 JSON만 출력, 마크다운 코드블록 없이):

{{
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
        {{
            "title": "섹션 제목",
            "timestamp": "00:00",
            "content": "이 섹션의 주요 내용 요약 (2-3문장)",
            "details": [
                "세부 포인트 1",
                "세부 포인트 2"
            ]
        }}
    ]
}}

주의사항:
1. 한국어로 작성
2. threeLine은 영상의 가장 중요한 3가지 핵심 메시지
3. tableOfContents는 주요 주제 5-7개
4. timeline은 시간순 4-7개 섹션
5. JSON만 출력 (마크다운 없이)'''

    try:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}'
        response = requests.post(url, json={
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.3,
                'maxOutputTokens': 4000,
            }
        })

        result = response.json()
        text = result['candidates'][0]['content']['parts'][0]['text']

        # JSON 추출
        json_str = text.strip()
        if json_str.startswith('```'):
            json_str = re.sub(r'```(?:json)?\n?', '', json_str).strip()

        return json.loads(json_str)
    except Exception as e:
        print(f"Error generating summary: {e}", file=sys.stderr)
        return {
            'threeLine': [
                '영상 요약을 생성하는 중 오류가 발생했습니다.',
                '잠시 후 다시 시도해주세요.',
                '',
            ],
            'tableOfContents': ['요약 생성 실패'],
            'timeline': [{
                'title': '요약 생성 실패',
                'timestamp': '00:00',
                'content': 'AI 요약 생성 중 오류가 발생했습니다.',
                'details': [],
            }],
        }


def summarize_with_grok(transcript_text: str, video_title: str, api_key: str) -> Dict[str, Any]:
    """Grok으로 자막 요약"""
    prompt = f'''당신은 전문적인 콘텐츠 요약 전문가입니다. 아래 유튜브 영상의 스크립트를 분석하고 구조화된 요약을 생성해주세요.

영상 제목: {video_title}

스크립트:
{transcript_text[:15000]}

다음 JSON 형식으로 응답해주세요 (반드시 유효한 JSON만 출력, 마크다운 코드블록 없이):

{{
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
        {{
            "title": "섹션 제목",
            "timestamp": "00:00",
            "content": "이 섹션의 주요 내용 요약 (2-3문장)",
            "details": [
                "세부 포인트 1",
                "세부 포인트 2"
            ]
        }}
    ]
}}

주의사항:
1. 한국어로 작성
2. threeLine은 영상의 가장 중요한 3가지 핵심 메시지
3. tableOfContents는 주요 주제 5-7개
4. timeline은 시간순 4-7개 섹션
5. JSON만 출력 (마크다운 없이)'''

    try:
        url = 'https://api.x.ai/v1/chat/completions'
        response = requests.post(url,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'grok-3-mini-fast-beta',
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.3,
                'max_tokens': 4000,
            }
        )

        result = response.json()
        text = result['choices'][0]['message']['content']

        # JSON 추출
        json_str = text.strip()
        if json_str.startswith('```'):
            json_str = re.sub(r'```(?:json)?\n?', '', json_str).strip()

        return json.loads(json_str)
    except Exception as e:
        print(f"Error generating summary with Grok: {e}", file=sys.stderr)
        return None


def process_youtube_video(
    url_or_id: str,
    google_api_key: Optional[str] = None,
    grok_api_key: Optional[str] = None,
    languages: List[str] = ['ko', 'en'],
    generate_summary: bool = True
) -> Dict[str, Any]:
    """
    유튜브 영상 처리 메인 함수

    Args:
        url_or_id: 유튜브 URL 또는 비디오 ID
        google_api_key: Google API 키 (영상 정보 및 Gemini 요약용)
        grok_api_key: Grok API 키 (대체 요약용)
        languages: 자막 언어 우선순위
        generate_summary: AI 요약 생성 여부

    Returns:
        {
            'success': bool,
            'videoInfo': {...},
            'transcript': [...],
            'fullText': str,
            'summary': {...} (if generate_summary)
        }
    """
    # 비디오 ID 추출
    video_id = extract_video_id(url_or_id)
    if not video_id:
        return {'success': False, 'error': '유효한 유튜브 링크가 아닙니다'}

    # 영상 정보 가져오기
    video_info = get_video_info(video_id, google_api_key)

    # 자막 가져오기
    raw_transcript = get_transcript(video_id, languages)
    if not raw_transcript:
        return {'success': False, 'error': '이 영상에서 자막을 가져올 수 없습니다'}

    # 자막 포맷팅
    transcript = [
        {
            'timestamp': format_timestamp(item['start']),
            'text': item['text'],
            'start': item['start'],
            'duration': item.get('duration', 0)
        }
        for item in raw_transcript
    ]

    full_text = ' '.join([item['text'] for item in raw_transcript])

    result = {
        'success': True,
        'videoInfo': video_info,
        'transcript': transcript,
        'fullText': full_text,
    }

    # AI 요약 생성
    if generate_summary:
        summary = None

        # Grok 먼저 시도
        if grok_api_key:
            summary = summarize_with_grok(full_text, video_info.get('title', ''), grok_api_key)

        # Grok 실패 시 Gemini 시도
        if not summary and google_api_key:
            summary = summarize_with_gemini(full_text, video_info.get('title', ''), google_api_key)

        if summary:
            result['summary'] = summary

    return result


# 에이전트 빌더 스킬 인터페이스
def skill_interface(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    에이전트 빌더에서 호출할 수 있는 스킬 인터페이스

    Input:
        {
            "url": "https://youtube.com/watch?v=...",
            "languages": ["ko", "en"],  # optional
            "generate_summary": true     # optional
        }

    Output:
        {
            "success": bool,
            "videoInfo": {...},
            "transcript": [...],
            "summary": {...}
        }
    """
    import os

    url = input_data.get('url') or input_data.get('video_id')
    if not url:
        return {'success': False, 'error': 'URL이 필요합니다'}

    languages = input_data.get('languages', ['ko', 'en'])
    generate_summary = input_data.get('generate_summary', True)

    # 환경 변수에서 API 키 가져오기
    google_api_key = os.environ.get('GOOGLE_API_KEY')
    grok_api_key = os.environ.get('XAI_API_KEY')

    return process_youtube_video(
        url,
        google_api_key=google_api_key,
        grok_api_key=grok_api_key,
        languages=languages,
        generate_summary=generate_summary
    )


# CLI 인터페이스
if __name__ == '__main__':
    import argparse
    import os

    parser = argparse.ArgumentParser(description='YouTube 영상 자막 추출 및 요약')
    parser.add_argument('url', help='유튜브 URL 또는 비디오 ID')
    parser.add_argument('--languages', '-l', nargs='+', default=['ko', 'en'], help='자막 언어 우선순위')
    parser.add_argument('--no-summary', action='store_true', help='AI 요약 생성 안함')
    parser.add_argument('--json', action='store_true', help='JSON 형식으로 출력')
    parser.add_argument('--google-api-key', help='Google API 키')
    parser.add_argument('--grok-api-key', help='Grok API 키')

    args = parser.parse_args()

    # API 키 설정
    google_api_key = args.google_api_key or os.environ.get('GOOGLE_API_KEY')
    grok_api_key = args.grok_api_key or os.environ.get('XAI_API_KEY')

    result = process_youtube_video(
        args.url,
        google_api_key=google_api_key,
        grok_api_key=grok_api_key,
        languages=args.languages,
        generate_summary=not args.no_summary
    )

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result['success']:
            print(f"\n📺 {result['videoInfo']['title']}")
            print(f"📺 {result['videoInfo']['channel']}")
            print(f"📅 {result['videoInfo']['date']} | 👁 {result['videoInfo']['views']}")
            print("\n" + "="*50 + "\n")

            print("📝 자막:")
            for item in result['transcript'][:10]:
                print(f"  [{item['timestamp']}] {item['text']}")
            if len(result['transcript']) > 10:
                print(f"  ... ({len(result['transcript']) - 10}개 더)")

            if 'summary' in result:
                print("\n" + "="*50 + "\n")
                print("📌 3줄 요약:")
                for line in result['summary']['threeLine']:
                    print(f"  • {line}")

                print("\n📋 목차:")
                for item in result['summary']['tableOfContents']:
                    print(f"  • {item}")

                print("\n⏱️ 타임라인:")
                for section in result['summary']['timeline']:
                    print(f"  [{section['timestamp']}] {section['title']}")
                    print(f"      {section['content']}")
        else:
            print(f"❌ 오류: {result['error']}")

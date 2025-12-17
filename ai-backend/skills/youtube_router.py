"""
YouTube Transcript API Router
FastAPI 라우터로 YouTube 자막 추출 기능 제공
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import subprocess
import json
import tempfile

router = APIRouter()


class YouTubeRequest(BaseModel):
    url: str
    languages: List[str] = ['ko', 'en']
    generate_summary: bool = True
    proxy: Optional[str] = None  # 프록시 URL (예: 'socks5://127.0.0.1:1080')
    use_supadata: bool = False  # Supadata API 사용 여부


class TranscriptItem(BaseModel):
    timestamp: str
    text: str
    start: float
    duration: float


class VideoInfo(BaseModel):
    id: str
    title: str
    channel: str
    thumbnail: str
    date: str
    views: str


class TimelineItem(BaseModel):
    title: str
    timestamp: str
    content: str
    details: List[str]


class Summary(BaseModel):
    threeLine: List[str]
    tableOfContents: List[str]
    timeline: List[TimelineItem]
    keyPoints: Optional[List[str]] = None  # 핵심요약 (5-10개 포인트)
    blogPost: Optional[str] = None  # 블로그 글


class YouTubeResponse(BaseModel):
    success: bool
    videoInfo: Optional[VideoInfo] = None
    transcript: Optional[List[TranscriptItem]] = None
    fullText: Optional[str] = None
    summary: Optional[Summary] = None
    error: Optional[str] = None


def get_transcript_with_supadata(video_id: str, languages: List[str] = ['ko', 'en']) -> dict:
    """Supadata API를 사용하여 자막 추출 (유료 서비스, 안정적)

    환경변수 SUPADATA_API_KEY 필요
    가입: https://supadata.ai
    """
    import requests

    api_key = os.environ.get('SUPADATA_API_KEY')
    if not api_key:
        return {'success': False, 'error': 'SUPADATA_API_KEY 환경변수가 설정되지 않았습니다. https://supadata.ai 에서 무료 가입하세요.'}

    try:
        lang = languages[0] if languages else 'en'
        url = f"https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v={video_id}&lang={lang}"

        resp = requests.get(url, headers={'x-api-key': api_key}, timeout=30)

        if resp.status_code == 401:
            return {'success': False, 'error': 'Supadata API 키가 유효하지 않습니다'}

        if resp.status_code != 200:
            return {'success': False, 'error': f'Supadata API 오류: {resp.status_code}'}

        data = resp.json()

        # 응답 파싱
        transcript = []
        full_text = []

        if 'content' in data:
            for item in data['content']:
                start = item.get('offset', 0) / 1000  # ms to seconds
                text = item.get('text', '').strip()

                if text:
                    mins = int(start // 60)
                    secs = int(start % 60)
                    transcript.append({
                        'start': start,
                        'duration': item.get('duration', 0) / 1000,
                        'text': text,
                        'timestamp': f"{mins:02d}:{secs:02d}"
                    })
                    full_text.append(text)

        if not transcript:
            return {'success': False, 'error': '자막을 찾을 수 없습니다'}

        # 비디오 정보 - Supadata에서 제공하거나 yt-dlp로 가져오기
        title = data.get('title', '')
        channel = ''
        views = ''
        upload_date = ''

        # 제목이 없으면 yt-dlp로 영상 정보만 가져오기
        if not title:
            try:
                import subprocess
                import sys
                cmd = [sys.executable, '-m', 'yt_dlp', '--skip-download', '-j', f'https://www.youtube.com/watch?v={video_id}']
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode == 0 and result.stdout:
                    import json as json_module
                    for line in reversed(result.stdout.strip().split('\n')):
                        if line.strip().startswith('{'):
                            try:
                                info = json_module.loads(line)
                                title = info.get('title', '')
                                channel = info.get('channel', info.get('uploader', ''))
                                views = f"{info.get('view_count', 0):,}회" if info.get('view_count') else ''
                                upload_date = info.get('upload_date', '')[:10] if info.get('upload_date') else ''
                                break
                            except:
                                pass
            except Exception as e:
                print(f"yt-dlp video info error: {e}")

        video_info = {
            'id': video_id,
            'title': title,
            'channel': channel,
            'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
            'date': upload_date,
            'views': views
        }

        return {
            'success': True,
            'videoInfo': video_info,
            'transcript': transcript,
            'fullText': ' '.join(full_text)
        }

    except Exception as e:
        return {'success': False, 'error': f'Supadata API 오류: {str(e)}'}


def get_transcript_with_proxy(video_id: str, languages: List[str] = ['ko', 'en']) -> dict:
    """프록시 서비스를 통해 자막 추출 (Bright Data, ScraperAPI 등)

    환경변수:
    - BRIGHTDATA_PROXY: Bright Data 프록시 URL
    - SCRAPERAPI_KEY: ScraperAPI 키
    """
    import requests
    import re

    # Bright Data 프록시
    brightdata_proxy = os.environ.get('BRIGHTDATA_PROXY')
    if brightdata_proxy:
        try:
            url = f'https://www.youtube.com/watch?v={video_id}'
            proxies = {'http': brightdata_proxy, 'https': brightdata_proxy}

            resp = requests.get(url, proxies=proxies, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }, timeout=30)

            if resp.status_code == 200 and 'captionTracks' in resp.text:
                # 자막 URL 추출
                match = re.search(r'ytInitialPlayerResponse\s*=\s*(\{.+?\});', resp.text)
                if match:
                    import json
                    player_response = json.loads(match.group(1))
                    captions = player_response.get('captions', {}).get('playerCaptionsTracklistRenderer', {}).get('captionTracks', [])

                    if captions:
                        # 언어 선택
                        selected = None
                        for lang in languages:
                            for cap in captions:
                                if cap.get('languageCode') == lang:
                                    selected = cap
                                    break
                            if selected:
                                break
                        if not selected:
                            selected = captions[0]

                        # 자막 다운로드
                        cap_resp = requests.get(selected['baseUrl'], proxies=proxies, headers={
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }, timeout=30)

                        if cap_resp.status_code == 200:
                            # XML 파싱
                            transcript = []
                            text_matches = re.findall(r'<text start="([^"]+)"[^>]*>([^<]*)</text>', cap_resp.text)
                            for start, text in text_matches:
                                text = text.replace('&amp;', '&').replace('&#39;', "'").replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>')
                                if text.strip():
                                    start_sec = float(start)
                                    mins = int(start_sec // 60)
                                    secs = int(start_sec % 60)
                                    transcript.append({
                                        'start': start_sec,
                                        'duration': 0,
                                        'text': text.strip(),
                                        'timestamp': f"{mins:02d}:{secs:02d}"
                                    })

                            if transcript:
                                # 비디오 정보
                                video_info = {
                                    'id': video_id,
                                    'title': player_response.get('videoDetails', {}).get('title', ''),
                                    'channel': player_response.get('videoDetails', {}).get('author', ''),
                                    'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
                                    'date': '',
                                    'views': f"{int(player_response.get('videoDetails', {}).get('viewCount', 0)):,}회"
                                }

                                return {
                                    'success': True,
                                    'videoInfo': video_info,
                                    'transcript': transcript,
                                    'fullText': ' '.join([t['text'] for t in transcript])
                                }
        except Exception as e:
            print(f"Bright Data proxy error: {e}")

    # ScraperAPI
    scraperapi_key = os.environ.get('SCRAPERAPI_KEY')
    if scraperapi_key:
        try:
            url = f'http://api.scraperapi.com?api_key={scraperapi_key}&url=https://www.youtube.com/watch?v={video_id}'
            resp = requests.get(url, timeout=60)

            if resp.status_code == 200 and 'captionTracks' in resp.text:
                # 위와 동일한 파싱 로직
                match = re.search(r'ytInitialPlayerResponse\s*=\s*(\{.+?\});', resp.text)
                if match:
                    import json
                    player_response = json.loads(match.group(1))
                    captions = player_response.get('captions', {}).get('playerCaptionsTracklistRenderer', {}).get('captionTracks', [])

                    if captions:
                        selected = captions[0]
                        for lang in languages:
                            for cap in captions:
                                if cap.get('languageCode') == lang:
                                    selected = cap
                                    break

                        cap_url = f'http://api.scraperapi.com?api_key={scraperapi_key}&url={selected["baseUrl"]}'
                        cap_resp = requests.get(cap_url, timeout=60)

                        if cap_resp.status_code == 200:
                            transcript = []
                            text_matches = re.findall(r'<text start="([^"]+)"[^>]*>([^<]*)</text>', cap_resp.text)
                            for start, text in text_matches:
                                text = text.replace('&amp;', '&').replace('&#39;', "'").replace('&quot;', '"')
                                if text.strip():
                                    start_sec = float(start)
                                    mins = int(start_sec // 60)
                                    secs = int(start_sec % 60)
                                    transcript.append({
                                        'start': start_sec,
                                        'duration': 0,
                                        'text': text.strip(),
                                        'timestamp': f"{mins:02d}:{secs:02d}"
                                    })

                            if transcript:
                                video_info = {
                                    'id': video_id,
                                    'title': player_response.get('videoDetails', {}).get('title', ''),
                                    'channel': player_response.get('videoDetails', {}).get('author', ''),
                                    'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
                                    'date': '',
                                    'views': ''
                                }

                                return {
                                    'success': True,
                                    'videoInfo': video_info,
                                    'transcript': transcript,
                                    'fullText': ' '.join([t['text'] for t in transcript])
                                }
        except Exception as e:
            print(f"ScraperAPI error: {e}")

    return {'success': False, 'error': '프록시 서비스가 설정되지 않았거나 실패했습니다'}


def get_transcript_with_ytdlp(video_id: str, languages: List[str] = ['ko', 'en'], proxy: str = None) -> dict:
    """yt-dlp를 사용하여 자막 추출 (직접 파일 다운로드 방식)

    Args:
        video_id: YouTube 비디오 ID
        languages: 자막 언어 우선순위
        proxy: 프록시 URL (예: 'socks5://127.0.0.1:1080' 또는 'http://proxy:8080')
    """
    import re
    import sys
    import glob

    # 환경변수에서 프록시 설정 확인
    if not proxy:
        proxy = os.environ.get('YOUTUBE_PROXY') or os.environ.get('HTTP_PROXY') or os.environ.get('BRIGHTDATA_PROXY')

    try:
        # 임시 디렉토리 생성
        output_dir = tempfile.mkdtemp(prefix='yt_')
        output_template = os.path.join(output_dir, '%(id)s')

        # 1. 먼저 영상 정보만 가져오기
        cmd = [sys.executable, '-m', 'yt_dlp', '--skip-download', '-j']
        if proxy:
            cmd.extend(['--proxy', proxy])
        cmd.append(f'https://www.youtube.com/watch?v={video_id}')

        info_result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        video_info = {
            'id': video_id,
            'title': '',
            'channel': '',
            'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
            'date': '',
            'views': '',
        }

        if info_result.returncode == 0 and info_result.stdout:
            stdout_lines = info_result.stdout.strip().split('\n')
            for line in reversed(stdout_lines):
                if line.strip().startswith('{'):
                    try:
                        info = json.loads(line)
                        video_info = {
                            'id': video_id,
                            'title': info.get('title', ''),
                            'channel': info.get('channel', info.get('uploader', '')),
                            'thumbnail': info.get('thumbnail', f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg'),
                            'date': info.get('upload_date', '')[:10] if info.get('upload_date') else '',
                            'views': f"{info.get('view_count', 0):,}회" if info.get('view_count') else '',
                        }
                    except:
                        pass
                    break

        # 2. 자막 파일 직접 다운로드 (yt-dlp가 처리)
        lang_opts = ','.join(languages)
        sub_cmd = [
            sys.executable, '-m', 'yt_dlp',
            '--skip-download',
            '--write-sub',
            '--write-auto-sub',
            '--sub-lang', lang_opts,
            '--sub-format', 'vtt/srt/best',
            '--convert-subs', 'vtt',
        ]
        if proxy:
            sub_cmd.extend(['--proxy', proxy])
        sub_cmd.extend(['-o', output_template, f'https://www.youtube.com/watch?v={video_id}'])

        sub_result = subprocess.run(
            sub_cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=output_dir
        )

        # 3. 다운로드된 자막 파일 찾기
        sub_files = glob.glob(os.path.join(output_dir, '*.vtt')) + \
                    glob.glob(os.path.join(output_dir, '*.srt'))

        if not sub_files:
            # 디렉토리 정리
            import shutil
            shutil.rmtree(output_dir, ignore_errors=True)
            return {'success': False, 'error': '자막 파일을 다운로드할 수 없습니다. 이 영상에 자막이 없거나 YouTube가 차단했을 수 있습니다.'}

        # 가장 최근 파일 사용
        sub_file = max(sub_files, key=os.path.getmtime)

        with open(sub_file, 'r', encoding='utf-8') as f:
            sub_content = f.read()

        # 디렉토리 정리
        import shutil
        shutil.rmtree(output_dir, ignore_errors=True)

        # 4. VTT/SRT 파싱
        transcript = []

        if 'WEBVTT' in sub_content or sub_file.endswith('.vtt'):
            # VTT 형식 파싱
            # 패턴: 00:00:00.000 --> 00:00:00.000
            pattern = r'(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}[^\n]*\n((?:(?!\d{2}:\d{2}:\d{2}).*\n?)*)'
            matches = re.findall(pattern, sub_content)

            for timestamp, text in matches:
                # 타임스탬프 파싱
                timestamp = timestamp.replace(',', '.')
                parts = timestamp.split(':')
                hrs = int(parts[0])
                mins = int(parts[1])
                secs = float(parts[2])
                start = hrs * 3600 + mins * 60 + secs

                # 텍스트 정리
                text = re.sub(r'<[^>]+>', '', text)  # HTML 태그 제거
                text = re.sub(r'\{[^}]+\}', '', text)  # 스타일 태그 제거
                text = text.strip()

                if text and not text.startswith('WEBVTT'):
                    transcript.append({
                        'start': start,
                        'duration': 0,
                        'text': text,
                        'timestamp': f"{mins:02d}:{int(secs):02d}" if hrs == 0 else f"{hrs:02d}:{mins:02d}:{int(secs):02d}"
                    })
        else:
            # SRT 형식 파싱
            pattern = r'(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}\n((?:(?!\d+\n\d{2}:\d{2}:\d{2}).*\n?)*)'
            matches = re.findall(pattern, sub_content)

            for timestamp, text in matches:
                timestamp = timestamp.replace(',', '.')
                parts = timestamp.split(':')
                hrs = int(parts[0])
                mins = int(parts[1])
                secs = float(parts[2])
                start = hrs * 3600 + mins * 60 + secs

                text = re.sub(r'<[^>]+>', '', text)
                text = text.strip()

                if text:
                    transcript.append({
                        'start': start,
                        'duration': 0,
                        'text': text,
                        'timestamp': f"{mins:02d}:{int(secs):02d}" if hrs == 0 else f"{hrs:02d}:{mins:02d}:{int(secs):02d}"
                    })

        # 중복 제거 (연속된 같은 텍스트)
        deduplicated = []
        prev_text = ''
        for item in transcript:
            if item['text'] != prev_text:
                deduplicated.append(item)
                prev_text = item['text']
        transcript = deduplicated

        if not transcript:
            return {'success': False, 'error': '자막 파싱 실패'}

        return {
            'success': True,
            'videoInfo': video_info,
            'transcript': transcript,
            'fullText': ' '.join([t['text'] for t in transcript])
        }

    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'yt-dlp 타임아웃 (120초 초과)'}
    except FileNotFoundError:
        return {'success': False, 'error': 'yt-dlp가 설치되지 않았습니다'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def generate_summary_with_ai(full_text: str, title: str) -> dict:
    """AI로 요약 생성 (핵심요약 + 블로그 글 포함)"""
    import requests

    # Grok API 먼저 시도
    grok_api_key = os.environ.get('XAI_API_KEY')
    if grok_api_key:
        try:
            prompt = f'''당신은 유튜브 영상 분석 전문가입니다. 스크립트를 꼼꼼히 읽고 상세한 타임라인과 요약을 작성하세요.

영상 제목: {title}

스크립트 (타임스탬프 포함):
{full_text[:20000]}

다음 JSON 형식으로 응답하세요 (마크다운 코드블록 없이 순수 JSON만):

{{
    "threeLine": [
        "핵심 메시지 1: 영상에서 가장 중요한 주장이나 정보를 구체적으로 (예: 특정 수치, 사례, 인용문 포함)",
        "핵심 메시지 2: 두 번째로 중요한 내용을 구체적으로",
        "핵심 메시지 3: 세 번째로 중요한 내용을 구체적으로"
    ],
    "keyPoints": [
        "💡 [주제] 구체적인 인사이트 (예시나 수치 포함)",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트"
    ],
    "tableOfContents": [
        "1. 첫 번째 대주제",
        "2. 두 번째 대주제",
        "3. 세 번째 대주제",
        "4. 네 번째 대주제",
        "5. 다섯 번째 대주제"
    ],
    "timeline": [
        {{
            "title": "🎬 인트로: [구체적인 도입부 내용]",
            "timestamp": "00:00",
            "content": "이 섹션에서 다루는 내용을 3-5문장으로 상세히 설명. 발화자가 말한 핵심 내용, 예시, 주장을 구체적으로 포함.",
            "details": [
                "• 첫 번째 세부 포인트: 구체적인 내용이나 예시",
                "• 두 번째 세부 포인트: 언급된 수치나 사례",
                "• 세 번째 세부 포인트: 핵심 인용이나 주장",
                "• 네 번째 세부 포인트: 추가 정보"
            ]
        }},
        {{
            "title": "📌 [두 번째 섹션 제목]",
            "timestamp": "MM:SS",
            "content": "상세 설명...",
            "details": ["• 세부1", "• 세부2", "• 세부3", "• 세부4"]
        }}
    ],
    "blogPost": "상세 블로그 글 (2500자 이상)"
}}

⚠️ 타임라인 작성 규칙 (매우 중요!!!):
1. 최소 8-12개 섹션으로 나누세요 (영상 길이에 비례)
2. timestamp는 스크립트의 실제 타임스탬프를 참고하여 정확히 기입
3. title은 이모지 + 구체적인 제목 (예: "🔥 AI 에이전트가 바꿀 업무 자동화의 미래")
4. content는 3-5문장으로 해당 구간의 핵심 내용을 상세히 설명
5. details는 4-6개의 구체적인 포인트 (예시, 수치, 인용문 포함)
6. 각 섹션이 무슨 내용인지 읽는 사람이 영상을 안 봐도 이해할 수 있게 작성

📝 전체 작성 규칙:
- 모든 내용은 한국어로 작성
- 추상적인 표현 금지, 구체적인 정보만 작성
- "~에 대해 설명합니다" 같은 메타 설명 금지
- 실제 영상에서 언급된 내용만 작성
- blogPost는 2500자 이상, 독자가 영상을 안 봐도 될 정도로 상세히'''

            response = requests.post(
                'https://api.x.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {grok_api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'grok-3-mini-fast-beta',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.4,
                    'max_tokens': 8000,
                },
                timeout=120
            )

            if response.ok:
                result = response.json()
                text = result['choices'][0]['message']['content']

                # JSON 추출
                import re
                json_str = text.strip()
                if json_str.startswith('```'):
                    json_str = re.sub(r'```(?:json)?\n?', '', json_str).strip()

                return json.loads(json_str)
        except Exception as e:
            print(f"Grok API error: {e}")

    # Gemini API 시도
    google_api_key = os.environ.get('GOOGLE_API_KEY')
    if google_api_key:
        try:
            prompt = f'''당신은 유튜브 영상 분석 전문가입니다. 스크립트를 꼼꼼히 읽고 상세한 타임라인과 요약을 작성하세요.

영상 제목: {title}

스크립트 (타임스탬프 포함):
{full_text[:20000]}

다음 JSON 형식으로 응답하세요 (마크다운 코드블록 없이 순수 JSON만):

{{
    "threeLine": [
        "핵심 메시지 1: 영상에서 가장 중요한 주장이나 정보를 구체적으로 (예: 특정 수치, 사례, 인용문 포함)",
        "핵심 메시지 2: 두 번째로 중요한 내용을 구체적으로",
        "핵심 메시지 3: 세 번째로 중요한 내용을 구체적으로"
    ],
    "keyPoints": [
        "💡 [주제] 구체적인 인사이트 (예시나 수치 포함)",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트",
        "💡 [주제] 구체적인 인사이트"
    ],
    "tableOfContents": [
        "1. 첫 번째 대주제",
        "2. 두 번째 대주제",
        "3. 세 번째 대주제",
        "4. 네 번째 대주제",
        "5. 다섯 번째 대주제"
    ],
    "timeline": [
        {{
            "title": "🎬 인트로: [구체적인 도입부 내용]",
            "timestamp": "00:00",
            "content": "이 섹션에서 다루는 내용을 3-5문장으로 상세히 설명. 발화자가 말한 핵심 내용, 예시, 주장을 구체적으로 포함.",
            "details": [
                "• 첫 번째 세부 포인트: 구체적인 내용이나 예시",
                "• 두 번째 세부 포인트: 언급된 수치나 사례",
                "• 세 번째 세부 포인트: 핵심 인용이나 주장",
                "• 네 번째 세부 포인트: 추가 정보"
            ]
        }},
        {{
            "title": "📌 [두 번째 섹션 제목]",
            "timestamp": "MM:SS",
            "content": "상세 설명...",
            "details": ["• 세부1", "• 세부2", "• 세부3", "• 세부4"]
        }}
    ],
    "blogPost": "상세 블로그 글 (2500자 이상)"
}}

⚠️ 타임라인 작성 규칙 (매우 중요!!!):
1. 최소 8-12개 섹션으로 나누세요 (영상 길이에 비례)
2. timestamp는 스크립트의 실제 타임스탬프를 참고하여 정확히 기입
3. title은 이모지 + 구체적인 제목 (예: "🔥 AI 에이전트가 바꿀 업무 자동화의 미래")
4. content는 3-5문장으로 해당 구간의 핵심 내용을 상세히 설명
5. details는 4-6개의 구체적인 포인트 (예시, 수치, 인용문 포함)
6. 각 섹션이 무슨 내용인지 읽는 사람이 영상을 안 봐도 이해할 수 있게 작성

📝 전체 작성 규칙:
- 모든 내용은 한국어로 작성
- 추상적인 표현 금지, 구체적인 정보만 작성
- "~에 대해 설명합니다" 같은 메타 설명 금지
- 실제 영상에서 언급된 내용만 작성
- blogPost는 2500자 이상, 독자가 영상을 안 봐도 될 정도로 상세히'''

            url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={google_api_key}'
            response = requests.post(url, json={
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {
                    'temperature': 0.4,
                    'maxOutputTokens': 8000,
                }
            }, timeout=120)

            if response.ok:
                result = response.json()
                text = result['candidates'][0]['content']['parts'][0]['text']

                # JSON 추출
                import re
                json_str = text.strip()
                if json_str.startswith('```'):
                    json_str = re.sub(r'```(?:json)?\n?', '', json_str).strip()

                return json.loads(json_str)
        except Exception as e:
            print(f"Gemini API error: {e}")

    return None


@router.post("/transcript", response_model=YouTubeResponse)
async def get_youtube_transcript(request: YouTubeRequest):
    """유튜브 영상의 자막 추출 및 요약"""
    import re

    # URL에서 비디오 ID 추출
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/shorts\/([^&\n?#]+)',
    ]

    video_id = None
    for pattern in patterns:
        match = re.search(pattern, request.url)
        if match:
            video_id = match.group(1)
            break

    if not video_id and len(request.url) == 11:
        video_id = request.url

    if not video_id:
        return YouTubeResponse(success=False, error='유효한 유튜브 링크가 아닙니다')

    # 자막 추출 시도 (우선순위: Supadata → 프록시 → yt-dlp)
    result = None

    # 1. Supadata API 사용 (가장 안정적, 유료)
    if request.use_supadata or os.environ.get('SUPADATA_API_KEY'):
        result = get_transcript_with_supadata(video_id, request.languages)
        if result['success']:
            print(f"✓ Got transcript from Supadata API")

    # 2. 프록시 서비스 시도 (Bright Data, ScraperAPI)
    if not result or not result['success']:
        if os.environ.get('BRIGHTDATA_PROXY') or os.environ.get('SCRAPERAPI_KEY'):
            result = get_transcript_with_proxy(video_id, request.languages)
            if result['success']:
                print(f"✓ Got transcript via proxy service")

    # 3. yt-dlp 시도 (로컬 환경 또는 VPN 사용 시)
    if not result or not result['success']:
        result = get_transcript_with_ytdlp(video_id, request.languages, request.proxy)
        if result['success']:
            print(f"✓ Got transcript from yt-dlp")

    if not result['success']:
        error_msg = result.get('error', '알 수 없는 오류')
        # IP 차단 관련 에러인 경우 추가 안내
        if '429' in str(error_msg) or '차단' in str(error_msg) or 'blocked' in str(error_msg).lower():
            error_msg += '\n\n해결 방법:\n1. VPN 사용\n2. 몇 시간 후 재시도\n3. SUPADATA_API_KEY 환경변수 설정 (https://supadata.ai 무료 가입)'
        return YouTubeResponse(success=False, error=error_msg)

    # 응답 구성
    response = YouTubeResponse(
        success=True,
        videoInfo=VideoInfo(**result['videoInfo']),
        transcript=[TranscriptItem(**t) for t in result['transcript']],
        fullText=result['fullText']
    )

    # AI 요약 생성
    if request.generate_summary:
        summary = generate_summary_with_ai(result['fullText'], result['videoInfo']['title'])
        if summary:
            response.summary = Summary(**summary)

    return response


@router.get("/test")
async def test_youtube():
    """YouTube 스킬 테스트"""
    return {"status": "ok", "message": "YouTube transcript skill is ready"}

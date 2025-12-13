#!/usr/bin/env python3
"""YouTube transcript fetcher script for agent tools."""

import sys
import json
import re

def extract_video_id(url_or_id):
    """Extract video ID from YouTube URL or return as-is if already an ID."""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)',
        r'youtube\.com\/shorts\/([^&\s?]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)

    # Check if it's already a video ID (10-12 alphanumeric chars)
    if re.match(r'^[a-zA-Z0-9_-]{10,12}$', url_or_id):
        return url_or_id

    return None

def fetch_transcript(video_url, lang='ko'):
    """Fetch transcript for a YouTube video."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            TranscriptsDisabled,
            NoTranscriptFound,
            VideoUnavailable
        )
    except ImportError:
        return json.dumps({
            'error': 'youtube_transcript_api가 설치되지 않았습니다. pip install youtube_transcript_api를 실행하세요.'
        })

    video_id = extract_video_id(video_url)
    if not video_id:
        return json.dumps({'error': '유효한 YouTube URL이 아닙니다.'})

    # Languages to try in order
    languages_to_try = [lang, 'ko', 'en', 'ja', 'zh']
    # Remove duplicates while preserving order
    languages_to_try = list(dict.fromkeys(languages_to_try))

    yt = YouTubeTranscriptApi()

    for try_lang in languages_to_try:
        try:
            transcript = yt.fetch(video_id, languages=[try_lang])

            # Extract text from snippets
            snippets = transcript.snippets if hasattr(transcript, 'snippets') else []
            full_text = ' '.join([s.text for s in snippets])

            # Limit to 15000 chars
            full_text = full_text[:15000]

            return json.dumps({
                'videoId': video_id,
                'videoUrl': f'https://www.youtube.com/watch?v={video_id}',
                'transcript': full_text,
                'language': try_lang,
                'segmentCount': len(snippets),
            }, ensure_ascii=False)

        except NoTranscriptFound:
            continue
        except TranscriptsDisabled:
            return json.dumps({
                'error': '이 영상에서 자막이 비활성화되어 있습니다.',
                'videoId': video_id,
                'videoUrl': f'https://www.youtube.com/watch?v={video_id}',
                'suggestion': '웹 검색으로 이 영상에 대한 정보를 찾아보세요.',
            }, ensure_ascii=False)
        except VideoUnavailable:
            return json.dumps({
                'error': '영상을 찾을 수 없습니다.',
                'videoId': video_id,
            }, ensure_ascii=False)
        except Exception as e:
            # Try next language
            continue

    # No transcript found in any language
    return json.dumps({
        'error': '자막을 가져올 수 없습니다. 이 영상에는 자막이 없습니다.',
        'videoId': video_id,
        'videoUrl': f'https://www.youtube.com/watch?v={video_id}',
        'suggestion': '웹 검색으로 이 영상에 대한 정보를 찾아보세요.',
    }, ensure_ascii=False)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: fetch-youtube-transcript.py <video_url> [lang]'}))
        sys.exit(1)

    video_url = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else 'ko'

    result = fetch_transcript(video_url, lang)
    print(result)

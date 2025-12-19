/**
 * Video Frame Capture Utility
 *
 * 비디오에서 현재 프레임을 캡처하는 클라이언트 사이드 유틸리티
 */

export interface CapturedFrame {
  timestamp: number
  dataUrl: string
  width: number
  height: number
  format: 'image/png' | 'image/jpeg'
}

/**
 * 비디오 요소에서 현재 프레임 캡처
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  options: {
    format?: 'image/png' | 'image/jpeg'
    quality?: number
    maxWidth?: number
    maxHeight?: number
  } = {}
): CapturedFrame | null {
  const {
    format = 'image/jpeg',
    quality = 0.8,
    maxWidth = 1280,
    maxHeight = 720
  } = options

  if (video.readyState < 2) {
    console.warn('[VideoCapture] Video not ready')
    return null
  }

  // Calculate dimensions
  let width = video.videoWidth
  let height = video.videoHeight

  // Scale down if needed
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height)
    width = Math.floor(width * ratio)
    height = Math.floor(height * ratio)
  }

  // Create canvas and capture
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.error('[VideoCapture] Canvas context not available')
    return null
  }

  ctx.drawImage(video, 0, 0, width, height)

  return {
    timestamp: video.currentTime,
    dataUrl: canvas.toDataURL(format, quality),
    width,
    height,
    format
  }
}

/**
 * 비디오에서 여러 프레임 캡처 (타임라인)
 */
export async function captureVideoTimeline(
  video: HTMLVideoElement,
  options: {
    count?: number
    startTime?: number
    endTime?: number
    format?: 'image/png' | 'image/jpeg'
    quality?: number
  } = {}
): Promise<CapturedFrame[]> {
  const {
    count = 5,
    startTime = 0,
    endTime = video.duration,
    format = 'image/jpeg',
    quality = 0.6
  } = options

  const frames: CapturedFrame[] = []
  const duration = endTime - startTime
  const interval = duration / (count - 1)

  // Store original time
  const originalTime = video.currentTime

  for (let i = 0; i < count; i++) {
    const targetTime = startTime + interval * i

    // Seek to target time
    video.currentTime = targetTime

    // Wait for seek to complete
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked)
        resolve()
      }
      video.addEventListener('seeked', onSeeked)
    })

    const frame = captureVideoFrame(video, { format, quality })
    if (frame) {
      frames.push(frame)
    }
  }

  // Restore original time
  video.currentTime = originalTime

  return frames
}

/**
 * YouTube iframe에서 현재 상태 정보 가져오기
 * (YouTube iframe은 직접 캡처 불가, 메타데이터만 반환)
 */
export function getYouTubePlayerState(iframe: HTMLIFrameElement): {
  videoId: string | null
  timestamp: number | null
} | null {
  try {
    const src = iframe.src
    const url = new URL(src)

    // Extract video ID
    let videoId: string | null = null
    if (url.hostname.includes('youtube.com')) {
      videoId = url.searchParams.get('v') || url.pathname.split('/').pop() || null
    }

    // Timestamp from URL (if available)
    const timestamp = parseInt(url.searchParams.get('start') || '0')

    return { videoId, timestamp }
  } catch {
    return null
  }
}

/**
 * Data URL을 Blob으로 변환
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }

  return new Blob([array], { type: mime })
}

/**
 * 캡처된 프레임을 서버에 업로드
 */
export async function uploadCapturedFrame(
  frame: CapturedFrame,
  sessionId: string
): Promise<{ url: string; id: string } | null> {
  try {
    const blob = dataUrlToBlob(frame.dataUrl)
    const formData = new FormData()
    formData.append('file', blob, `frame-${frame.timestamp}.jpg`)
    formData.append('sessionId', sessionId)
    formData.append('timestamp', frame.timestamp.toString())

    const response = await fetch('/api/session/upload-frame', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    return response.json()
  } catch (error) {
    console.error('[VideoCapture] Upload failed:', error)
    return null
  }
}

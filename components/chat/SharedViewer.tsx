'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  Hand, Share2, Download, FileText, Image as ImageIcon, Film,
  Globe, RefreshCw
} from 'lucide-react'
import { SharedViewerState, SharedMediaType } from '@/types/chat'
import { createClient } from '@/lib/supabase/client'

interface SharedViewerProps {
  roomId: string
  onClose: () => void
  accentColor?: string
}

export function SharedViewer({ roomId, onClose, accentColor = '#3B82F6' }: SharedViewerProps) {
  const [viewerState, setViewerState] = useState<SharedViewerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPresenter, setIsPresenter] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfPages, setPdfPages] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [iframeError, setIframeError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())

  // 뷰어 상태 조회
  const fetchViewerState = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/viewer`)
      if (!res.ok) {
        setViewerState(null)
        return
      }
      const data = await res.json()
      setViewerState(data)
    } catch (err) {
      console.error('Failed to fetch viewer state:', err)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  // 초기 로드
  useEffect(() => {
    fetchViewerState()
  }, [fetchViewerState])

  // 실시간 업데이트 polling (500ms)
  useEffect(() => {
    const interval = setInterval(fetchViewerState, 500)
    return () => clearInterval(interval)
  }, [fetchViewerState])

  // URL 변경 시 iframe 에러 상태 초기화
  useEffect(() => {
    setIframeError(false)
  }, [viewerState?.media_url])

  // 비디오 싱크
  useEffect(() => {
    if (!viewerState || viewerState.media_type !== 'video' || !videoRef.current) return

    const video = videoRef.current
    const timeDiff = Math.abs((video.currentTime || 0) - (viewerState.playback_time || 0))

    // 2초 이상 차이나면 시간 점프
    if (timeDiff > 2) {
      video.currentTime = viewerState.playback_time || 0
    }

    // 재생 상태 동기화
    if (viewerState.is_playing && video.paused) {
      video.play().catch(() => {})
    } else if (!viewerState.is_playing && !video.paused) {
      video.pause()
    }
  }, [viewerState])

  // 뷰어 제어 액션
  const sendAction = async (action: string, payload: Record<string, any> = {}) => {
    try {
      await fetch(`/api/chat/rooms/${roomId}/viewer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      await fetchViewerState()
    } catch (err) {
      console.error('Failed to send action:', err)
    }
  }

  // PDF 페이지 변경
  const handlePageChange = (delta: number) => {
    if (!viewerState) return
    const newPage = (viewerState.current_page || 1) + delta
    if (newPage >= 1 && newPage <= (viewerState.total_pages || 1)) {
      sendAction('page_change', { page: newPage })
    }
  }

  // 줌 변경
  const handleZoom = (delta: number) => {
    if (!viewerState) return
    const newZoom = (viewerState.zoom_level || 1) + delta
    sendAction('zoom', { zoom: newZoom })
  }

  // 비디오 재생/일시정지
  const handlePlayPause = () => {
    if (!viewerState) return
    sendAction(viewerState.is_playing ? 'pause' : 'play')
  }

  // 비디오 시간 이동
  const handleSeek = (time: number) => {
    sendAction('seek', { time })
  }

  // 제어권 가져오기/놓기
  const handleControl = () => {
    if (isPresenter) {
      sendAction('release_control')
      setIsPresenter(false)
    } else {
      sendAction('take_control')
      setIsPresenter(true)
    }
  }

  // 공유 종료
  const handleClose = async () => {
    try {
      await fetch(`/api/chat/rooms/${roomId}/viewer`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to close viewer:', err)
    }
    onClose()
  }

  // 전체화면
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // 미디어 타입 아이콘
  const MediaIcon = viewerState?.media_type === 'pdf' ? FileText
    : viewerState?.media_type === 'video' ? Film
    : viewerState?.media_type === 'weblink' ? Globe
    : ImageIcon

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900/95">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full" />
      </div>
    )
  }

  if (!viewerState) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-900/95 text-zinc-400">
        <Share2 className="w-12 h-12 mb-4 opacity-50" />
        <p>공유 중인 파일이 없습니다</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-zinc-900/95 text-white relative"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/50">
        <div className="flex items-center gap-3">
          <MediaIcon className="w-5 h-5" style={{ color: accentColor }} />
          <span className="font-medium truncate max-w-[200px]">
            {viewerState.media_name}
          </span>
          {viewerState.presenter_id && (
            <span className="px-2 py-0.5 text-xs bg-zinc-700 rounded">
              제어 중
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 제어권 버튼 */}
          <button
            onClick={handleControl}
            className={`p-2 rounded-lg transition-colors ${
              isPresenter
                ? 'bg-blue-500/20 text-blue-400'
                : 'hover:bg-zinc-700 text-zinc-400'
            }`}
            title={isPresenter ? '제어권 놓기' : '제어권 가져오기'}
          >
            <Hand className="w-4 h-4" />
          </button>

          {/* 전체화면 */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* 닫기 */}
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* PDF 뷰어 */}
          {viewerState.media_type === 'pdf' && (
            <motion.div
              key="pdf"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center p-2"
            >
              <div
                className="w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden"
                style={{ transform: `scale(${viewerState.zoom_level || 1})`, transformOrigin: 'center center' }}
              >
                <iframe
                  src={`${viewerState.media_url}#page=${viewerState.current_page || 1}`}
                  className="w-full h-full border-0"
                  title={viewerState.media_name}
                />
              </div>
            </motion.div>
          )}

          {/* 이미지 뷰어 */}
          {viewerState.media_type === 'image' && (
            <motion.div
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <img
                src={viewerState.media_url}
                alt={viewerState.media_name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{ transform: `scale(${viewerState.zoom_level || 1})` }}
              />
            </motion.div>
          )}

          {/* 비디오 뷰어 */}
          {viewerState.media_type === 'video' && (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <video
                ref={videoRef}
                src={viewerState.media_url}
                className="max-w-full max-h-full rounded-lg shadow-2xl"
                muted={isMuted}
                onClick={handlePlayPause}
                onTimeUpdate={(e) => {
                  // 발표자인 경우에만 시간 동기화
                  if (isPresenter) {
                    const time = Math.floor(e.currentTarget.currentTime)
                    if (time !== viewerState.playback_time) {
                      // 디바운스 필요시 추가
                    }
                  }
                }}
              />
            </motion.div>
          )}

          {/* 웹링크 뷰어 */}
          {viewerState.media_type === 'weblink' && (
            <motion.div
              key="weblink"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col overflow-hidden"
            >
              {/* 상단 URL 바 */}
              <div className="shrink-0 h-12 px-3 flex items-center gap-3 bg-zinc-800 border-b border-zinc-700">
                {/* 새로고침 버튼 */}
                <button
                  onClick={() => iframeRef.current && (iframeRef.current.src = iframeRef.current.src)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white"
                  title="새로고침"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* URL 입력창 */}
                <div className="flex-1 h-8 flex items-center gap-2 px-3 bg-zinc-900 rounded-md border border-zinc-600 focus-within:border-blue-500">
                  <Globe className="shrink-0 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={urlInput || viewerState.media_url}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onFocus={() => setUrlInput(viewerState.media_url)}
                    onBlur={() => setUrlInput('')}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const url = e.currentTarget.value.trim()
                        if (url && url.startsWith('http')) {
                          try {
                            // API로 URL 업데이트
                            await fetch(`/api/chat/rooms/${roomId}/viewer`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                media_type: 'weblink',
                                media_url: url,
                                media_name: new URL(url).hostname,
                              }),
                            })
                            // 즉시 상태 갱신
                            await fetchViewerState()
                            // 입력창 포커스 해제
                            e.currentTarget.blur()
                            setUrlInput('')
                          } catch (err) {
                            console.error('Navigation failed:', err)
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setUrlInput('')
                        e.currentTarget.blur()
                      }
                    }}
                    className="flex-1 w-full bg-transparent text-sm text-zinc-200 outline-none"
                    placeholder="URL 입력 후 Enter"
                  />
                </div>

                {/* 새 탭에서 열기 */}
                <a
                  href={viewerState.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white"
                  title="새 탭에서 열기"
                >
                  <Maximize2 className="w-4 h-4" />
                </a>
              </div>

              {/* iframe 또는 차단 시 대체 UI */}
              <div className="flex-1 overflow-auto bg-zinc-900 relative">
                {iframeError ? (
                  /* 차단된 사이트 대체 UI */
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Globe className="w-10 h-10 text-zinc-500" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-zinc-200 mb-2">
                        이 사이트는 미리보기를 지원하지 않습니다
                      </h3>
                      <p className="text-sm text-zinc-400 max-w-md">
                        {new URL(viewerState.media_url).hostname}은(는) 보안 정책으로 인해<br />
                        외부 임베딩을 차단하고 있습니다.
                      </p>
                    </div>
                    <a
                      href={viewerState.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Maximize2 className="w-5 h-5" />
                      새 탭에서 열기
                    </a>
                  </div>
                ) : (
                  /* 정상 iframe - 스크롤 가능 */
                  <iframe
                    key={viewerState.media_url}
                    ref={iframeRef}
                    src={convertToEmbedUrl(viewerState.media_url)}
                    className="w-full h-full border-0 bg-white"
                    title={viewerState.media_name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    scrolling="yes"
                    onLoad={(e) => {
                      // iframe 로드 성공 시 에러 상태 초기화
                      setIframeError(false)
                    }}
                    onError={() => {
                      setIframeError(true)
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 컨트롤 바 (웹링크는 상단에 자체 툴바가 있으므로 숨김) */}
      {viewerState.media_type !== 'weblink' && (
      <div className="px-4 py-3 border-t border-zinc-700/50 bg-zinc-800/50">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 줌 컨트롤 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 transition-colors"
              disabled={!isPresenter && !!viewerState.presenter_id}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-zinc-400 w-12 text-center">
              {Math.round((viewerState.zoom_level || 1) * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 transition-colors"
              disabled={!isPresenter && !!viewerState.presenter_id}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* 중앙: PDF 페이지 / 비디오 재생 컨트롤 */}
          <div className="flex items-center gap-3">
            {viewerState.media_type === 'pdf' && (
              <>
                <button
                  onClick={() => handlePageChange(-1)}
                  className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-50"
                  disabled={(viewerState.current_page || 1) <= 1 || (!isPresenter && !!viewerState.presenter_id)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm">
                  {viewerState.current_page || 1} / {viewerState.total_pages || 1}
                </span>
                <button
                  onClick={() => handlePageChange(1)}
                  className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-50"
                  disabled={(viewerState.current_page || 1) >= (viewerState.total_pages || 1) || (!isPresenter && !!viewerState.presenter_id)}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {viewerState.media_type === 'video' && (
              <>
                <button
                  onClick={handlePlayPause}
                  className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                  style={{ color: accentColor }}
                  disabled={!isPresenter && !!viewerState.presenter_id}
                >
                  {viewerState.is_playing ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>

                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>{formatTime(viewerState.playback_time || 0)}</span>
                  <div className="w-32 h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${((viewerState.playback_time || 0) / (viewerState.duration || 1)) * 100}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                  <span>{formatTime(viewerState.duration || 0)}</span>
                </div>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            )}

          </div>

          {/* 오른쪽: 다운로드 */}
          <div className="flex items-center gap-2">
            <a
              href={viewerState.media_url}
              download={viewerState.media_name}
              className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

// 시간 포맷팅 (초 -> MM:SS)
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// URL을 임베드 가능한 형식으로 변환
function convertToEmbedUrl(url: string): string {
  try {
    const urlObj = new URL(url)

    // YouTube 변환
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = ''
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1)
      } else {
        videoId = urlObj.searchParams.get('v') || ''
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    // Vimeo 변환
    if (urlObj.hostname.includes('vimeo.com')) {
      const videoId = urlObj.pathname.split('/').pop()
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`
      }
    }

    // Google Docs/Slides/Sheets 변환
    if (urlObj.hostname.includes('docs.google.com')) {
      if (!url.includes('/embed') && !url.includes('/preview')) {
        return url.replace('/edit', '/embed').replace('/view', '/embed')
      }
    }

    // 네이티브 임베드 지원 사이트 목록
    const nativeEmbedDomains = [
      'youtube.com', 'youtu.be', 'vimeo.com',
      'docs.google.com', 'figma.com', 'canva.com',
      'codepen.io', 'codesandbox.io', 'stackblitz.com',
      'notion.so', 'miro.com', 'loom.com',
      'spotify.com', 'soundcloud.com'
    ]

    // 네이티브 임베드 지원 사이트는 원본 URL 반환
    const isNativeEmbed = nativeEmbedDomains.some(domain =>
      urlObj.hostname.includes(domain)
    )
    if (isNativeEmbed) {
      return url
    }

    // 그 외 사이트는 프록시 사용
    return `/api/proxy?url=${encodeURIComponent(url)}`
  } catch {
    return url
  }
}

export default SharedViewer

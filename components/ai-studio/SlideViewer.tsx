"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  Check,
  X,
  Grid3X3,
  Play,
  FileText,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'

interface Slide {
  number: number
  title: string
  content: string[]
  speakerNotes?: string
  layout: 'title' | 'content' | 'two-column' | 'quote' | 'image'
  imageUrl?: string | null
  imageLoading?: boolean
}

interface SlideViewerProps {
  content: string
  isDark: boolean
  themeColor: string
  onClose: () => void
}

function parseSlides(content: string): Slide[] {
  const slides: Slide[] = []

  // 슬라이드 구분 패턴들
  const slideRegex = /##\s*(?:슬라이드|Slide)\s*(\d+)[:\s]*([^\n]*)/gi
  const parts = content.split(/(?=##\s*(?:슬라이드|Slide)\s*\d+)/gi)

  for (const part of parts) {
    if (!part.trim()) continue

    const headerMatch = part.match(/##\s*(?:슬라이드|Slide)\s*(\d+)[:\s]*([^\n]*)/i)
    if (!headerMatch) continue

    const slideNum = parseInt(headerMatch[1])
    const title = headerMatch[2]?.replace(/[*#]/g, '').trim() || `슬라이드 ${slideNum}`

    // 내용 추출
    const contentPart = part.slice(headerMatch[0].length)
    const bulletPoints: string[] = []
    const lines = contentPart.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        const point = trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim()
        if (point && !point.startsWith('발표자') && !point.startsWith('📝')) {
          bulletPoints.push(point)
        }
      }
    }

    // 발표자 노트 추출
    const notesMatch = contentPart.match(/(?:📝\s*발표자\s*노트|발표자\s*노트)[:\s]*([^\n]+)/i)
    const speakerNotes = notesMatch?.[1]?.trim()

    // 레이아웃 결정
    let layout: Slide['layout'] = 'content'
    if (slideNum === 1 || title.toLowerCase().includes('제목')) {
      layout = 'title'
    } else if (bulletPoints.length > 6) {
      layout = 'two-column'
    }

    slides.push({
      number: slideNum,
      title,
      content: bulletPoints.length > 0 ? bulletPoints : ['내용을 준비 중입니다'],
      speakerNotes,
      layout
    })
  }

  // 파싱 실패시 기본 슬라이드 생성
  if (slides.length === 0) {
    slides.push({
      number: 1,
      title: '프레젠테이션',
      content: ['내용을 생성 중입니다...'],
      layout: 'title'
    })
  }

  return slides
}

export default function SlideViewer({ content, isDark, themeColor, onClose }: SlideViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [copied, setCopied] = useState(false)
  const [slidesWithImages, setSlidesWithImages] = useState<Slide[]>([])
  const [imagesGenerated, setImagesGenerated] = useState(false)

  const parsedSlides = parseSlides(content)
  const slides = slidesWithImages.length > 0 ? slidesWithImages : parsedSlides
  const slide = slides[currentSlide]

  // Gemini 이미지 생성 함수
  const generateSlideImage = useCallback(async (slideData: Slide, totalSlides: number): Promise<string | null> => {
    try {
      const response = await fetch('/api/ai-studio/slide-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideTitle: slideData.title,
          slideContent: slideData.content,
          slideNumber: slideData.number,
          totalSlides
        })
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.success && !data.placeholder ? data.imageUrl : null
    } catch (error) {
      console.error('Image generation failed:', error)
      return null
    }
  }, [])

  // 슬라이드 로드시 이미지 생성
  useEffect(() => {
    if (imagesGenerated || parsedSlides.length === 0) return

    const generateAllImages = async () => {
      // 먼저 로딩 상태로 설정
      const initialSlides = parsedSlides.map(s => ({
        ...s,
        imageLoading: true,
        imageUrl: null
      }))
      setSlidesWithImages(initialSlides)

      // 병렬로 이미지 생성 (최대 3개씩 배치)
      const batchSize = 3
      const results: Slide[] = [...initialSlides]

      for (let i = 0; i < parsedSlides.length; i += batchSize) {
        const batch = parsedSlides.slice(i, i + batchSize)
        const promises = batch.map(async (slideData, idx) => {
          const imageUrl = await generateSlideImage(slideData, parsedSlides.length)
          return { index: i + idx, imageUrl }
        })

        const batchResults = await Promise.all(promises)
        batchResults.forEach(({ index, imageUrl }) => {
          results[index] = {
            ...results[index],
            imageUrl,
            imageLoading: false
          }
        })

        // 실시간 업데이트
        setSlidesWithImages([...results])
      }

      setImagesGenerated(true)
    }

    generateAllImages()
  }, [parsedSlides, imagesGenerated, generateSlideImage])

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const copyAll = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 키보드 네비게이션
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft') {
        prevSlide()
      } else if (e.key === 'Escape') {
        if (showGrid) {
          setShowGrid(false)
        } else if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      } else if (e.key === 'g') {
        setShowGrid(!showGrid)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlide, isFullscreen, showGrid])

  // 슬라이드 그라데이션 배경
  const getSlideBackground = (index: number) => {
    const gradients = [
      `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
      `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)`,
      `linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)`,
    ]
    return index === 0 ? gradients[0] : (isDark ? gradients[1] : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        isFullscreen ? "" : "p-4"
      )}
    >
      <div className="absolute inset-0 bg-black/90" onClick={() => !isFullscreen && onClose()} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          "relative flex flex-col z-10",
          isFullscreen ? "w-full h-full" : "w-full max-w-6xl max-h-[90vh] mx-auto rounded-2xl overflow-hidden"
        )}
        style={{ backgroundColor: isDark ? '#0a0a14' : '#f1f5f9' }}
      >
        {/* Top Bar */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2 border-b",
          isDark ? "bg-black/40 border-white/10" : "bg-white border-gray-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
              프레젠테이션 - {slides.length}개 슬라이드
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showGrid ? "bg-white/20" : "",
                isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
              )}
              title="그리드 보기 (G)"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showNotes ? "bg-white/20" : "",
                isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
              )}
              title="발표자 노트"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={copyAll}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Grid View */}
          <AnimatePresence>
            {showGrid && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-black/95 overflow-y-auto p-6"
              >
                <div className="grid grid-cols-4 gap-4 max-w-6xl mx-auto">
                  {slides.map((s, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => { setCurrentSlide(idx); setShowGrid(false) }}
                      className={cn(
                        "aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                        idx === currentSlide ? "border-white ring-2 ring-white/50" : "border-transparent hover:border-white/30"
                      )}
                    >
                      <div
                        className="w-full h-full p-3 flex flex-col"
                        style={{ background: getSlideBackground(idx) }}
                      >
                        <span className={cn(
                          "text-[10px] font-bold truncate",
                          idx === 0 ? "text-white" : isDark ? "text-white" : "text-gray-900"
                        )}>
                          {s.title}
                        </span>
                        <div className="flex-1 flex items-center justify-center">
                          <span className={cn(
                            "text-xs opacity-60",
                            idx === 0 ? "text-white" : isDark ? "text-white" : "text-gray-600"
                          )}>
                            {idx + 1}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Slide Thumbnails */}
          <div className={cn(
            "w-24 flex-shrink-0 overflow-y-auto py-2 border-r",
            isDark ? "bg-black/40 border-white/10" : "bg-gray-100 border-gray-200"
          )}>
            {slides.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={cn(
                  "w-full px-2 py-1 transition-all",
                  idx === currentSlide ? "" : "opacity-50 hover:opacity-80"
                )}
              >
                <div
                  className={cn(
                    "aspect-[16/9] rounded border-2 overflow-hidden",
                    idx === currentSlide
                      ? "border-white shadow-lg shadow-white/20"
                      : "border-transparent"
                  )}
                  style={{ background: getSlideBackground(idx) }}
                >
                  <div className="w-full h-full p-1.5 flex flex-col">
                    <span className={cn(
                      "text-[6px] font-bold truncate leading-tight",
                      idx === 0 ? "text-white" : isDark ? "text-white" : "text-gray-900"
                    )}>
                      {s.title}
                    </span>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-medium mt-1 block",
                  isDark ? "text-zinc-500" : "text-gray-500"
                )}>
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>

          {/* Main Slide View */}
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-4xl aspect-[16/9] rounded-xl overflow-hidden shadow-2xl"
                  style={{
                    background: getSlideBackground(currentSlide),
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  {/* Slide Content */}
                  {slide.layout === 'title' ? (
                    // Title Slide
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                      {/* AI Generated Background Image */}
                      {slide.imageUrl && (
                        <div className="absolute inset-0">
                          <img
                            src={slide.imageUrl}
                            alt=""
                            className="w-full h-full object-cover opacity-30"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/50" />
                        </div>
                      )}

                      {/* Loading indicator */}
                      {slide.imageLoading && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-white/70" />
                          <span className="text-xs text-white/70">이미지 생성 중</span>
                        </div>
                      )}

                      {/* Decorative elements */}
                      <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }}
                      />
                      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%, 30%)' }}
                      />

                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-white mb-6 relative z-10 drop-shadow-lg"
                      >
                        {slide.title}
                      </motion.h1>

                      {slide.content[0] !== '내용을 준비 중입니다' && (
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-xl text-white/90 max-w-2xl relative z-10 drop-shadow-md"
                        >
                          {slide.content[0]}
                        </motion.p>
                      )}

                      {/* Slide number badge */}
                      <div className="absolute bottom-6 right-6 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                        <span className="text-sm font-medium text-white">{slide.number} / {slides.length}</span>
                      </div>
                    </div>
                  ) : slide.layout === 'two-column' ? (
                    // Two Column Layout with Image
                    <div className="w-full h-full flex flex-col p-8 relative">
                      {/* Loading indicator */}
                      {slide.imageLoading && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1.5 z-20">
                          <Loader2 className="w-3 h-3 animate-spin text-white/70" />
                          <span className="text-xs text-white/70">이미지 생성 중</span>
                        </div>
                      )}

                      <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "text-2xl md:text-3xl font-bold mb-6 pb-4 border-b z-10",
                          isDark ? "text-white border-white/20" : "text-gray-900 border-gray-200"
                        )}
                      >
                        <span className="inline-block w-1 h-8 mr-3 rounded-full" style={{ backgroundColor: themeColor }} />
                        {slide.title}
                      </motion.h2>

                      <div className="flex-1 flex gap-6 overflow-hidden">
                        {/* Content columns */}
                        <div className={cn(
                          "grid grid-cols-2 gap-4",
                          slide.imageUrl ? "flex-1" : "w-full"
                        )}>
                          {[0, 1].map(col => (
                            <div key={col} className="space-y-3">
                              {slide.content
                                .filter((_, i) => i % 2 === col)
                                .map((point, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                    className="flex items-start gap-3"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                      style={{ backgroundColor: themeColor }}
                                    />
                                    <p className={cn(
                                      "text-sm leading-relaxed",
                                      isDark ? "text-zinc-300" : "text-gray-700"
                                    )}>
                                      {point}
                                    </p>
                                  </motion.div>
                                ))}
                            </div>
                          ))}
                        </div>

                        {/* AI Generated Image */}
                        {slide.imageUrl && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-xl self-center"
                          >
                            <img
                              src={slide.imageUrl}
                              alt={slide.title}
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                        )}
                      </div>

                      {/* Slide number */}
                      <div className="flex justify-end mt-4">
                        <span className={cn(
                          "text-sm font-medium px-3 py-1 rounded-full",
                          isDark ? "bg-white/10 text-white/60" : "bg-gray-100 text-gray-500"
                        )}>
                          {slide.number} / {slides.length}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Default Content Layout with Image
                    <div className="w-full h-full flex flex-col p-8 relative">
                      {/* Loading indicator */}
                      {slide.imageLoading && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1.5 z-20">
                          <Loader2 className="w-3 h-3 animate-spin text-white/70" />
                          <span className="text-xs text-white/70">이미지 생성 중</span>
                        </div>
                      )}

                      <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "text-2xl md:text-3xl font-bold mb-6 pb-4 border-b flex items-center",
                          isDark ? "text-white border-white/20" : "text-gray-900 border-gray-200"
                        )}
                      >
                        <span
                          className="inline-block w-1.5 h-8 mr-4 rounded-full"
                          style={{ backgroundColor: themeColor }}
                        />
                        {slide.title}
                      </motion.h2>

                      <div className="flex-1 flex gap-6 overflow-hidden">
                        {/* Content area */}
                        <div className={cn(
                          "flex-1 space-y-4 overflow-y-auto pr-2",
                          slide.imageUrl ? "" : "w-full"
                        )}>
                          {slide.content.map((point, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + idx * 0.08 }}
                              className="flex items-start gap-4 group"
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: `${themeColor}20` }}
                              >
                                <span className="text-sm font-bold" style={{ color: themeColor }}>
                                  {idx + 1}
                                </span>
                              </div>
                              <p className={cn(
                                "text-base md:text-lg leading-relaxed flex-1",
                                isDark ? "text-zinc-200" : "text-gray-700"
                              )}>
                                {point}
                              </p>
                            </motion.div>
                          ))}
                        </div>

                        {/* AI Generated Image */}
                        {slide.imageUrl && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="w-56 flex-shrink-0 flex items-center"
                          >
                            <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
                              <img
                                src={slide.imageUrl}
                                alt={slide.title}
                                className="w-full h-auto object-cover"
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Slide number */}
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          {slides.map((_, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "h-1 rounded-full transition-all",
                                idx === currentSlide ? "w-6" : "w-1"
                              )}
                              style={{
                                backgroundColor: idx === currentSlide ? themeColor : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                              }}
                            />
                          ))}
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          isDark ? "text-white/60" : "text-gray-500"
                        )}>
                          {slide.number} / {slides.length}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className={cn(
                  "p-3 rounded-full transition-all disabled:opacity-30",
                  isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => setCurrentSlide(0)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                )}
              >
                <Play className="w-4 h-4 inline mr-2" />
                처음부터
              </button>

              <button
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
                className={cn(
                  "p-3 rounded-full transition-all disabled:opacity-30",
                  isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                )}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Speaker Notes Panel */}
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className={cn(
                  "flex-shrink-0 border-l overflow-hidden",
                  isDark ? "bg-black/40 border-white/10" : "bg-gray-100 border-gray-200"
                )}
              >
                <div className="w-[280px] p-4 h-full overflow-y-auto">
                  <h4 className={cn(
                    "text-xs font-semibold uppercase tracking-wider mb-3",
                    isDark ? "text-zinc-500" : "text-gray-500"
                  )}>
                    발표자 노트
                  </h4>
                  <p className={cn(
                    "text-sm leading-relaxed",
                    isDark ? "text-zinc-400" : "text-gray-600"
                  )}>
                    {slide.speakerNotes || '이 슬라이드에 대한 발표자 노트가 없습니다.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

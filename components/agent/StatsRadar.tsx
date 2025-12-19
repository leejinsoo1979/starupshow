'use client'

import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useThemeStore, accentColors } from '@/stores/themeStore'
import {
  Brain,
  MessageSquare,
  Lightbulb,
  Users,
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

// ============================================
// Types
// ============================================

export interface AgentStatsData {
  analysis: number
  communication: number
  creativity: number
  leadership: number
  execution: number
  adaptability: number
  level?: number
  experience_points?: number
}

interface StatsRadarProps {
  stats: AgentStatsData
  previousStats?: AgentStatsData
  isDark?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  showOverlay?: boolean
  animated?: boolean
  className?: string
}

// ============================================
// Constants
// ============================================

const STAT_KEYS = ['analysis', 'communication', 'creativity', 'leadership', 'execution', 'adaptability'] as const

const STAT_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  analysis: { label: '분석력', icon: Brain },
  communication: { label: '소통력', icon: MessageSquare },
  creativity: { label: '창의력', icon: Lightbulb },
  leadership: { label: '리더십', icon: Users },
  execution: { label: '실행력', icon: Target },
  adaptability: { label: '적응력', icon: Zap },
}

const SIZE_CONFIG = {
  sm: { size: 240, labelOffset: 25 },
  md: { size: 340, labelOffset: 35 },
  lg: { size: 440, labelOffset: 45 },
}

// ============================================
// Color Utility - 단일 색상에서 팔레트 생성
// ============================================

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function createMonochromaticPalette(baseColor: string) {
  const hsl = hexToHsl(baseColor)

  return {
    base: baseColor,
    light: hslToHex(hsl.h, Math.max(hsl.s - 10, 20), Math.min(hsl.l + 15, 85)),
    lighter: hslToHex(hsl.h, Math.max(hsl.s - 20, 15), Math.min(hsl.l + 25, 90)),
    dark: hslToHex(hsl.h, Math.min(hsl.s + 10, 100), Math.max(hsl.l - 15, 25)),
    darker: hslToHex(hsl.h, Math.min(hsl.s + 15, 100), Math.max(hsl.l - 25, 15)),
    muted: hslToHex(hsl.h, Math.max(hsl.s - 30, 10), hsl.l),
    glow: `${baseColor}60`,
    glowStrong: `${baseColor}90`,
    bg: `${baseColor}15`,
    bgHover: `${baseColor}25`,
  }
}

// ============================================
// Hook: 테마 색상 가져오기
// ============================================

function useThemeColors() {
  const { accentColor } = useThemeStore()

  return useMemo(() => {
    const accent = accentColors.find(c => c.id === accentColor) || accentColors[0]
    return createMonochromaticPalette(accent.color)
  }, [accentColor])
}

// ============================================
// Modern Hexagonal Radar Chart (SVG-based)
// ============================================

export function StatsRadar({
  stats,
  previousStats,
  isDark = false,
  size = 'md',
  showLabels = true,
  showOverlay = true,
  animated = true,
  className,
}: StatsRadarProps) {
  const colors = useThemeColors()
  const config = SIZE_CONFIG[size]
  const svgSize = config.size
  const center = svgSize / 2
  const maxRadius = center - config.labelOffset - 10

  // Animation state
  const [animationProgress, setAnimationProgress] = useState(animated ? 0 : 1)
  const [hoveredStat, setHoveredStat] = useState<string | null>(null)

  useEffect(() => {
    if (!animated) return
    const duration = 1200
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimationProgress(eased)
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [animated])

  // 각 꼭지점 좌표 계산 (6각형)
  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
    const radius = (value / 100) * maxRadius
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    }
  }

  // 폴리곤 포인트 문자열 생성
  const createPolygonPoints = (values: number[]): string => {
    return values
      .map((value, index) => {
        const point = getPoint(index, value * animationProgress)
        return `${point.x},${point.y}`
      })
      .join(' ')
  }

  const currentValues = STAT_KEYS.map(key => stats[key] || 0)
  const previousValues = previousStats ? STAT_KEYS.map(key => previousStats[key] || 0) : null

  const average = Math.round(currentValues.reduce((a, b) => a + b, 0) / currentValues.length)
  const previousAverage = previousValues
    ? Math.round(previousValues.reduce((a, b) => a + b, 0) / previousValues.length)
    : null
  const averageChange = previousAverage !== null ? average - previousAverage : null

  const gridLevels = [20, 40, 60, 80, 100]
  const id = useMemo(() => Math.random().toString(36).substr(2, 9), [])

  return (
    <div className={cn('relative', className)}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="overflow-visible"
      >
        <defs>
          {/* 단일 색상 그라데이션 */}
          <linearGradient id={`mainGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.light} stopOpacity={0.8} />
            <stop offset="50%" stopColor={colors.base} stopOpacity={0.6} />
            <stop offset="100%" stopColor={colors.dark} stopOpacity={0.7} />
          </linearGradient>

          {/* 이전 스탯 (회색/뮤트) */}
          <linearGradient id={`prevGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.muted} stopOpacity={0.3} />
            <stop offset="100%" stopColor={colors.muted} stopOpacity={0.15} />
          </linearGradient>

          {/* 글로우 필터 */}
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`glowStrong-${id}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 배경 */}
        <circle
          cx={center}
          cy={center}
          r={maxRadius + 5}
          fill="none"
          stroke={isDark ? '#3f3f4620' : '#e4e4e720'}
          strokeWidth={1}
        />

        {/* 그리드 - 육각형 */}
        {gridLevels.map((level) => {
          const points = Array.from({ length: 6 }, (_, i) => {
            const point = getPoint(i, level)
            return `${point.x},${point.y}`
          }).join(' ')

          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke={isDark ? '#3f3f46' : '#d4d4d8'}
              strokeWidth={level === 100 ? 1.5 : 0.5}
              opacity={level === 100 ? 0.5 : 0.3}
            />
          )
        })}

        {/* 축선 */}
        {STAT_KEYS.map((_, index) => {
          const endPoint = getPoint(index, 100)
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke={isDark ? '#3f3f46' : '#d4d4d8'}
              strokeWidth={0.5}
              opacity={0.4}
            />
          )
        })}

        {/* 30일 전 스탯 */}
        {showOverlay && previousValues && animationProgress > 0 && (
          <polygon
            points={createPolygonPoints(previousValues)}
            fill={`url(#prevGrad-${id})`}
            stroke={colors.muted}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.5 * animationProgress}
          />
        )}

        {/* 현재 스탯 영역 */}
        <polygon
          points={createPolygonPoints(currentValues)}
          fill={`url(#mainGrad-${id})`}
          stroke="none"
          filter={`url(#glow-${id})`}
          opacity={animationProgress}
        />

        {/* 현재 스탯 테두리 */}
        <polygon
          points={createPolygonPoints(currentValues)}
          fill="none"
          stroke={colors.base}
          strokeWidth={2.5}
          strokeLinejoin="round"
          filter={`url(#glow-${id})`}
          opacity={animationProgress}
        />

        {/* 꼭지점 */}
        {STAT_KEYS.map((key, index) => {
          const value = currentValues[index]
          const point = getPoint(index, value * animationProgress)
          const isHovered = hoveredStat === key

          return (
            <g key={key}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? 12 : 8}
                fill={colors.base}
                opacity={isHovered ? 0.4 : 0.2}
                filter={isHovered ? `url(#glowStrong-${id})` : `url(#glow-${id})`}
                style={{ transition: 'all 0.3s ease' }}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? 6 : 4}
                fill={colors.base}
                stroke={isDark ? '#18181b' : '#ffffff'}
                strokeWidth={2}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                onMouseEnter={() => setHoveredStat(key)}
                onMouseLeave={() => setHoveredStat(null)}
              />
            </g>
          )
        })}

        {/* 라벨 */}
        {showLabels && STAT_KEYS.map((key, index) => {
          const labelInfo = STAT_LABELS[key]
          const labelPoint = getPoint(index, 115)
          const value = currentValues[index]
          const isHovered = hoveredStat === key

          const isLeft = index === 4 || index === 5
          const isRight = index === 1 || index === 2
          const isTop = index === 0
          const isBottom = index === 3

          let dx = 0, dy = 0
          if (isLeft) dx = -8
          if (isRight) dx = 8
          if (isTop) dy = -8
          if (isBottom) dy = 8

          return (
            <g
              key={key}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                opacity: hoveredStat && hoveredStat !== key ? 0.5 : 1,
              }}
              onMouseEnter={() => setHoveredStat(key)}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <foreignObject
                x={labelPoint.x - 40 + dx}
                y={labelPoint.y - 12 + dy}
                width={80}
                height={24}
              >
                <div
                  className={cn(
                    'flex items-center justify-center gap-1 px-2 py-0.5 rounded-full transition-all',
                    isHovered ? 'scale-110' : ''
                  )}
                  style={{
                    background: isHovered ? colors.bg : 'transparent',
                  }}
                >
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: isHovered
                        ? colors.base
                        : isDark ? '#a1a1aa' : '#71717a',
                    }}
                  >
                    {labelInfo.label}
                  </span>
                </div>
              </foreignObject>

              {isHovered && (
                <foreignObject
                  x={labelPoint.x - 20 + dx}
                  y={labelPoint.y + 10 + dy}
                  width={40}
                  height={20}
                >
                  <div className="flex items-center justify-center">
                    <span
                      className="text-xs font-bold"
                      style={{ color: colors.base }}
                    >
                      {value}
                    </span>
                  </div>
                </foreignObject>
              )}
            </g>
          )
        })}
      </svg>

      {/* 중앙 평균값 */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          'flex flex-col items-center justify-center pointer-events-none'
        )}
      >
        <span
          className={cn('text-3xl font-bold tabular-nums', isDark ? 'text-white' : 'text-zinc-900')}
          style={{ textShadow: `0 0 20px ${colors.glow}` }}
        >
          {Math.round(average * animationProgress)}
        </span>
        {averageChange !== null && averageChange !== 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full',
              averageChange > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            )}
            style={{ color: averageChange > 0 ? '#10b981' : '#f43f5e' }}
          >
            {averageChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {averageChange > 0 ? '+' : ''}{averageChange}
          </div>
        )}
        <span className={cn('text-[10px] mt-0.5 uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          평균
        </span>
      </div>

      {/* 범례 */}
      {showOverlay && previousStats && (
        <div
          className={cn(
            'absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-4',
            'flex items-center gap-4 text-[10px]',
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          )}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: colors.base }} />
            <span>현재</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded-full"
              style={{
                backgroundColor: colors.muted,
                backgroundImage: `repeating-linear-gradient(90deg, ${colors.muted} 0px, ${colors.muted} 4px, transparent 4px, transparent 8px)`,
              }}
            />
            <span>30일 전</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Stats Radar Panel (단순화)
// ============================================

export function StatsRadarPanel({
  stats,
  previousStats,
  isDark = false,
  title = '능력치 분석',
  className,
}: {
  stats: AgentStatsData
  previousStats?: AgentStatsData
  isDark?: boolean
  title?: string
  className?: string
}) {
  const colors = useThemeColors()

  return (
    <div
      className={cn(
        'p-5 md:p-6 rounded-2xl border backdrop-blur-sm',
        isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/80 border-zinc-200',
        className
      )}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="p-2 rounded-xl"
          style={{ backgroundColor: colors.bg }}
        >
          <Brain className="w-5 h-5" style={{ color: colors.base }} />
        </div>
        <div>
          <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
            {title}
          </h4>
          {stats.level && (
            <span className="text-xs" style={{ color: colors.base }}>
              Level {stats.level}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[340px]">
        <StatsRadar
          stats={stats}
          previousStats={previousStats}
          isDark={isDark}
          size="md"
          showOverlay={!!previousStats}
        />
      </div>
    </div>
  )
}

// ============================================
// Stats Summary (미니 버전)
// ============================================

export function StatsRadarSummary({
  stats,
  isDark = false,
  className,
}: {
  stats: Partial<AgentStatsData>
  isDark?: boolean
  className?: string
}) {
  const colors = useThemeColors()

  return (
    <div className={cn('grid grid-cols-3 gap-2 mt-4', className)}>
      {STAT_KEYS.map((key) => {
        const value = (stats as any)[key] || 0
        const label = STAT_LABELS[key].label

        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
            )}
            style={{ boxShadow: `inset 0 0 0 1px ${colors.bg}` }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: colors.base,
                boxShadow: `0 0 8px ${colors.glow}`,
              }}
            />
            <div className="flex-1 min-w-0">
              <span className={cn('text-[10px]', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                {label}
              </span>
              <span
                className="text-xs font-bold ml-1 tabular-nums"
                style={{ color: colors.base }}
              >
                {value}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsRadar

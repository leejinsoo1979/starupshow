'use client'

import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Brain, MessageSquare, Lightbulb, Users } from 'lucide-react'

export interface AgentStatsData {
  analysis: number
  communication: number
  creativity: number
  leadership: number
  level?: number
  experience_points?: number
}

interface StatsRadarProps {
  stats: AgentStatsData
  isDark?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  showTooltip?: boolean
  animated?: boolean
  className?: string
}

interface RadarDataPoint {
  stat: string
  fullName: string
  value: number
  fullMark: 100
  icon: React.ElementType
  color: string
}

const STAT_CONFIG = {
  analysis: {
    label: '분석력',
    fullName: '분석력 (Analysis)',
    icon: Brain,
    color: '#3b82f6', // blue-500
  },
  communication: {
    label: '커뮤니케이션',
    fullName: '커뮤니케이션 (Communication)',
    icon: MessageSquare,
    color: '#22c55e', // green-500
  },
  creativity: {
    label: '창의력',
    fullName: '창의력 (Creativity)',
    icon: Lightbulb,
    color: '#8b5cf6', // violet-500
  },
  leadership: {
    label: '리더십',
    fullName: '리더십 (Leadership)',
    icon: Users,
    color: '#f59e0b', // amber-500
  },
} as const

const SIZE_CONFIG = {
  sm: { height: 200, fontSize: 10, outerRadius: 60 },
  md: { height: 280, fontSize: 12, outerRadius: 90 },
  lg: { height: 360, fontSize: 14, outerRadius: 120 },
}

function CustomTooltip({
  active,
  payload,
  isDark,
}: {
  active?: boolean
  payload?: Array<{ payload: RadarDataPoint }>
  isDark?: boolean
}) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const Icon = data.icon

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-lg shadow-lg border',
        isDark
          ? 'bg-zinc-800 border-zinc-700'
          : 'bg-white border-zinc-200'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: data.color }} />
        <span
          className={cn(
            'text-sm font-medium',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}
        >
          {data.fullName}
        </span>
      </div>
      <div
        className={cn(
          'text-lg font-bold mt-1',
          isDark ? 'text-white' : 'text-zinc-900'
        )}
        style={{ color: data.color }}
      >
        {data.value}
        <span className={cn('text-xs ml-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          / 100
        </span>
      </div>
    </div>
  )
}

const LABEL_TO_KEY: Record<string, keyof typeof STAT_CONFIG> = {
  '분석력': 'analysis',
  '커뮤니케이션': 'communication',
  '창의력': 'creativity',
  '리더십': 'leadership',
}

function CustomAngleAxis({
  x,
  y,
  payload,
  isDark,
}: {
  x: number
  y: number
  payload: { value: string }
  isDark: boolean
}) {
  const statKey = LABEL_TO_KEY[payload.value] || 'analysis'
  const config = STAT_CONFIG[statKey]

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="middle"
        fill={isDark ? '#a1a1aa' : '#71717a'}
        fontSize={12}
        fontWeight={500}
      >
        {payload.value}
      </text>
    </g>
  )
}

export function StatsRadar({
  stats,
  isDark = false,
  size = 'md',
  showLabels = true,
  showTooltip = true,
  animated = true,
  className,
}: StatsRadarProps) {
  const sizeConfig = SIZE_CONFIG[size]

  const data: RadarDataPoint[] = useMemo(
    () => [
      {
        stat: STAT_CONFIG.analysis.label,
        fullName: STAT_CONFIG.analysis.fullName,
        value: stats.analysis,
        fullMark: 100,
        icon: STAT_CONFIG.analysis.icon,
        color: STAT_CONFIG.analysis.color,
      },
      {
        stat: STAT_CONFIG.communication.label,
        fullName: STAT_CONFIG.communication.fullName,
        value: stats.communication,
        fullMark: 100,
        icon: STAT_CONFIG.communication.icon,
        color: STAT_CONFIG.communication.color,
      },
      {
        stat: STAT_CONFIG.creativity.label,
        fullName: STAT_CONFIG.creativity.fullName,
        value: stats.creativity,
        fullMark: 100,
        icon: STAT_CONFIG.creativity.icon,
        color: STAT_CONFIG.creativity.color,
      },
      {
        stat: STAT_CONFIG.leadership.label,
        fullName: STAT_CONFIG.leadership.fullName,
        value: stats.leadership,
        fullMark: 100,
        icon: STAT_CONFIG.leadership.icon,
        color: STAT_CONFIG.leadership.color,
      },
    ],
    [stats]
  )

  // 평균 스탯 계산
  const averageStat = useMemo(() => {
    return Math.round((stats.analysis + stats.communication + stats.creativity + stats.leadership) / 4)
  }, [stats])

  // 가장 높은 스탯 계산
  const topStat = useMemo(() => {
    const entries = Object.entries({
      analysis: stats.analysis,
      communication: stats.communication,
      creativity: stats.creativity,
      leadership: stats.leadership,
    })
    const [key, value] = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max))
    return { key: key as keyof typeof STAT_CONFIG, value }
  }, [stats])

  // 그라디언트 ID
  const gradientId = useMemo(() => `statsRadarGradient-${Math.random().toString(36).substr(2, 9)}`, [])

  return (
    <div className={cn('relative', className)}>
      <ResponsiveContainer width="100%" height={sizeConfig.height}>
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius={sizeConfig.outerRadius}
          data={data}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <PolarGrid
            stroke={isDark ? '#3f3f46' : '#e4e4e7'}
            strokeDasharray="3 3"
          />
          {showLabels && (
            <PolarAngleAxis
              dataKey="stat"
              tick={(props) => <CustomAngleAxis {...props} isDark={isDark} />}
              tickLine={false}
            />
          )}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: isDark ? '#71717a' : '#a1a1aa', fontSize: 10 }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Stats"
            dataKey="value"
            stroke={isDark ? '#a78bfa' : '#8b5cf6'}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            fillOpacity={0.6}
            animationBegin={0}
            animationDuration={animated ? 1000 : 0}
            animationEasing="ease-out"
          />
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip isDark={isDark} />}
              cursor={false}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>

      {/* 중앙 평균 스탯 표시 */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          'flex flex-col items-center justify-center',
          'pointer-events-none'
        )}
      >
        <span
          className={cn(
            'text-2xl font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}
        >
          {averageStat}
        </span>
        <span
          className={cn(
            'text-xs',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}
        >
          평균
        </span>
      </div>
    </div>
  )
}

// 스탯 요약 컴포넌트 (레이더 차트 아래 표시용)
export function StatsRadarSummary({
  stats,
  isDark = false,
}: {
  stats: AgentStatsData
  isDark?: boolean
}) {
  const statEntries = [
    { key: 'analysis', ...STAT_CONFIG.analysis, value: stats.analysis },
    { key: 'communication', ...STAT_CONFIG.communication, value: stats.communication },
    { key: 'creativity', ...STAT_CONFIG.creativity, value: stats.creativity },
    { key: 'leadership', ...STAT_CONFIG.leadership, value: stats.leadership },
  ]

  // 가장 높은 스탯
  const topStat = statEntries.reduce((max, curr) => (curr.value > max.value ? curr : max))
  // 가장 낮은 스탯
  const lowStat = statEntries.reduce((min, curr) => (curr.value < min.value ? curr : min))

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 mt-4 pt-4 border-t',
        isDark ? 'border-zinc-700' : 'border-zinc-200'
      )}
    >
      <div
        className={cn(
          'p-3 rounded-lg',
          isDark ? 'bg-zinc-900' : 'bg-zinc-100'
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <topStat.icon className="w-4 h-4" style={{ color: topStat.color }} />
          <span
            className={cn(
              'text-xs font-medium',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            강점
          </span>
        </div>
        <p
          className={cn(
            'text-sm font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}
        >
          {topStat.label}
        </p>
        <p className="text-lg font-bold" style={{ color: topStat.color }}>
          {topStat.value}
        </p>
      </div>

      <div
        className={cn(
          'p-3 rounded-lg',
          isDark ? 'bg-zinc-900' : 'bg-zinc-100'
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <lowStat.icon className="w-4 h-4" style={{ color: lowStat.color }} />
          <span
            className={cn(
              'text-xs font-medium',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            성장 포인트
          </span>
        </div>
        <p
          className={cn(
            'text-sm font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}
        >
          {lowStat.label}
        </p>
        <p className="text-lg font-bold" style={{ color: lowStat.color }}>
          {lowStat.value}
        </p>
      </div>
    </div>
  )
}

// 전체 스탯 패널 (레이더 차트 + 요약)
export function StatsRadarPanel({
  stats,
  isDark = false,
  title = '능력치 분석',
  className,
}: {
  stats: AgentStatsData
  isDark?: boolean
  title?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'p-4 md:p-6 rounded-xl md:rounded-2xl border',
        isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-violet-500" />
        <h4
          className={cn(
            'font-semibold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}
        >
          {title}
        </h4>
        {stats.level && (
          <span
            className={cn(
              'ml-auto text-xs px-2 py-0.5 rounded-full',
              isDark
                ? 'bg-violet-900/30 text-violet-400'
                : 'bg-violet-100 text-violet-600'
            )}
          >
            Lv.{stats.level}
          </span>
        )}
      </div>

      <StatsRadar stats={stats} isDark={isDark} size="md" />
      <StatsRadarSummary stats={stats} isDark={isDark} />
    </div>
  )
}

export default StatsRadar

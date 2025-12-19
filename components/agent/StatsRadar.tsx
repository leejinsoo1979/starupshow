'use client'

import { useMemo, useState } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  Brain,
  MessageSquare,
  Lightbulb,
  Users,
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Code,
  FileText,
  Database,
  Globe,
  Palette,
} from 'lucide-react'

// ============================================
// Types
// ============================================

export interface AgentStatsData {
  // 6종 핵심 능력치
  analysis: number
  communication: number
  creativity: number
  leadership: number
  execution: number      // 실행력 추가
  adaptability: number   // 적응력 추가
  level?: number
  experience_points?: number
}

export interface DomainExpertise {
  domain: string
  label: string
  score: number
  icon: React.ElementType
  color: string
}

export interface StatsHistory {
  date: string
  analysis: number
  communication: number
  creativity: number
  leadership: number
  execution: number
  adaptability: number
}

interface StatsRadarProps {
  stats: AgentStatsData
  previousStats?: AgentStatsData // 30일 전 스탯 (변화량 오버레이용)
  domainExpertise?: DomainExpertise[]
  statsHistory?: StatsHistory[] // 30일 히스토리
  isDark?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  showTooltip?: boolean
  showOverlay?: boolean // 30일 변화량 오버레이
  animated?: boolean
  className?: string
}

interface RadarDataPoint {
  stat: string
  fullName: string
  value: number
  previousValue?: number
  change?: number
  fullMark: 100
  icon: React.ElementType
  color: string
}

// ============================================
// Constants - 6종 능력치
// ============================================

const STAT_CONFIG = {
  analysis: {
    label: '분석력',
    fullName: '분석력 (Analysis)',
    icon: Brain,
    color: '#3b82f6', // blue-500
  },
  communication: {
    label: '소통력',
    fullName: '소통력 (Communication)',
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
  execution: {
    label: '실행력',
    fullName: '실행력 (Execution)',
    icon: Target,
    color: '#ef4444', // red-500
  },
  adaptability: {
    label: '적응력',
    fullName: '적응력 (Adaptability)',
    icon: Zap,
    color: '#06b6d4', // cyan-500
  },
} as const

// 도메인 전문성 기본값
const DEFAULT_DOMAIN_EXPERTISE: DomainExpertise[] = [
  { domain: 'development', label: '개발', score: 0, icon: Code, color: '#3b82f6' },
  { domain: 'documentation', label: '문서화', score: 0, icon: FileText, color: '#22c55e' },
  { domain: 'data', label: '데이터', score: 0, icon: Database, color: '#8b5cf6' },
  { domain: 'web', label: '웹/API', score: 0, icon: Globe, color: '#f59e0b' },
  { domain: 'design', label: '디자인', score: 0, icon: Palette, color: '#ec4899' },
]

const SIZE_CONFIG = {
  sm: { height: 220, fontSize: 10, outerRadius: 70 },
  md: { height: 320, fontSize: 12, outerRadius: 100 },
  lg: { height: 400, fontSize: 14, outerRadius: 140 },
}

const LABEL_TO_KEY: Record<string, keyof typeof STAT_CONFIG> = {
  '분석력': 'analysis',
  '소통력': 'communication',
  '창의력': 'creativity',
  '리더십': 'leadership',
  '실행력': 'execution',
  '적응력': 'adaptability',
}

// ============================================
// Custom Tooltip
// ============================================

function CustomTooltip({
  active,
  payload,
  isDark,
}: {
  active?: boolean
  payload?: Array<{ payload: RadarDataPoint; dataKey: string; name: string }>
  isDark?: boolean
}) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const Icon = data.icon
  const showChange = data.change !== undefined && data.change !== 0

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm',
        isDark
          ? 'bg-zinc-900/95 border-zinc-700'
          : 'bg-white/95 border-zinc-200'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="p-1.5 rounded-lg"
          style={{ backgroundColor: `${data.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: data.color }} />
        </div>
        <span
          className={cn(
            'text-sm font-semibold',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}
        >
          {data.fullName}
        </span>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <span
            className="text-2xl font-bold"
            style={{ color: data.color }}
          >
            {data.value}
          </span>
          <span className={cn('text-xs ml-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            / 100
          </span>
        </div>

        {showChange && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            data.change! > 0
              ? 'bg-green-500/20 text-green-500'
              : 'bg-red-500/20 text-red-500'
          )}>
            {data.change! > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {data.change! > 0 ? '+' : ''}{data.change}
          </div>
        )}
      </div>

      {data.previousValue !== undefined && (
        <div className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          30일 전: {data.previousValue}
        </div>
      )}
    </div>
  )
}

// ============================================
// Custom Angle Axis (6각형 라벨)
// ============================================

function CustomAngleAxis({
  x,
  y,
  payload,
  isDark,
  cx,
  cy,
}: {
  x: number
  y: number
  payload: { value: string }
  isDark: boolean
  cx?: number
  cy?: number
}) {
  const statKey = LABEL_TO_KEY[payload.value] || 'analysis'
  const config = STAT_CONFIG[statKey]
  const Icon = config.icon

  // 라벨 위치 조정
  const dx = cx ? (x - cx) * 0.15 : 0
  const dy = cy ? (y - cy) * 0.15 : 0

  return (
    <g transform={`translate(${x + dx},${y + dy})`}>
      <foreignObject x={-30} y={-12} width={60} height={24}>
        <div className="flex items-center justify-center gap-1">
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: config.color }}
          />
          <span
            style={{
              color: isDark ? '#a1a1aa' : '#71717a',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {payload.value}
          </span>
        </div>
      </foreignObject>
    </g>
  )
}

// ============================================
// Main StatsRadar Component
// ============================================

export function StatsRadar({
  stats,
  previousStats,
  isDark = false,
  size = 'md',
  showLabels = true,
  showTooltip = true,
  showOverlay = true,
  animated = true,
  className,
}: StatsRadarProps) {
  const sizeConfig = SIZE_CONFIG[size]

  // 현재 스탯 데이터 (6각형)
  const data: RadarDataPoint[] = useMemo(() => {
    const statKeys: (keyof typeof STAT_CONFIG)[] = [
      'analysis', 'communication', 'creativity',
      'leadership', 'execution', 'adaptability'
    ]

    return statKeys.map(key => {
      const config = STAT_CONFIG[key]
      const value = stats[key] || 0
      const prevValue = previousStats?.[key]
      const change = prevValue !== undefined ? value - prevValue : undefined

      return {
        stat: config.label,
        fullName: config.fullName,
        value,
        previousValue: prevValue,
        change,
        fullMark: 100,
        icon: config.icon,
        color: config.color,
      }
    })
  }, [stats, previousStats])

  // previousData는 이제 main data에 포함됨 (previousValue 필드)

  // 평균 스탯 계산
  const averageStat = useMemo(() => {
    const values = [
      stats.analysis, stats.communication, stats.creativity,
      stats.leadership, stats.execution || 0, stats.adaptability || 0
    ]
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }, [stats])

  // 평균 변화량
  const averageChange = useMemo(() => {
    if (!previousStats) return null
    const currentAvg = averageStat
    const prevValues = [
      previousStats.analysis, previousStats.communication, previousStats.creativity,
      previousStats.leadership, previousStats.execution || 0, previousStats.adaptability || 0
    ]
    const prevAvg = Math.round(prevValues.reduce((a, b) => a + b, 0) / prevValues.length)
    return currentAvg - prevAvg
  }, [averageStat, previousStats])

  // 그라디언트 IDs
  const gradientId = useMemo(() => `statsRadarGradient-${Math.random().toString(36).substr(2, 9)}`, [])
  const prevGradientId = useMemo(() => `statsPrevGradient-${Math.random().toString(36).substr(2, 9)}`, [])

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
            {/* 현재 스탯 그라디언트 */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.4} />
            </linearGradient>
            {/* 30일 전 스탯 그라디언트 (오버레이) */}
            <linearGradient id={prevGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
            </linearGradient>
          </defs>

          {/* 6각형 그리드 */}
          <PolarGrid
            stroke={isDark ? '#3f3f46' : '#e4e4e7'}
            strokeDasharray="3 3"
            gridType="polygon"
          />

          {/* 라벨 (6각형 꼭지점) */}
          {showLabels && (
            <PolarAngleAxis
              dataKey="stat"
              tick={(props) => <CustomAngleAxis {...props} isDark={isDark} />}
              tickLine={false}
            />
          )}

          {/* 값 축 */}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 9 }}
            tickCount={5}
            axisLine={false}
          />

          {/* 30일 전 스탯 오버레이 */}
          {showOverlay && previousStats && (
            <Radar
              name="30일 전"
              dataKey="previousValue"
              stroke={isDark ? '#f59e0b' : '#d97706'}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill={`url(#${prevGradientId})`}
              fillOpacity={0.3}
              animationBegin={300}
              animationDuration={animated ? 800 : 0}
            />
          )}

          {/* 현재 스탯 */}
          <Radar
            name="현재"
            dataKey="value"
            stroke={isDark ? '#a78bfa' : '#8b5cf6'}
            strokeWidth={2.5}
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

          {showOverlay && previousStats && (
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="line"
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
            'text-3xl font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}
        >
          {averageStat}
        </span>
        {averageChange !== null && averageChange !== 0 && (
          <div className={cn(
            'flex items-center gap-0.5 text-xs font-medium mt-0.5',
            averageChange > 0 ? 'text-green-500' : 'text-red-500'
          )}>
            {averageChange > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {averageChange > 0 ? '+' : ''}{averageChange}
          </div>
        )}
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

// ============================================
// 도메인 전문성 탭
// ============================================

export function DomainExpertisePanel({
  expertise = DEFAULT_DOMAIN_EXPERTISE,
  isDark = false,
  className,
}: {
  expertise?: DomainExpertise[]
  isDark?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {expertise.map((domain) => {
        const Icon = domain.icon
        return (
          <div key={domain.domain} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: `${domain.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: domain.color }} />
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}>
                  {domain.label}
                </span>
              </div>
              <span
                className="text-sm font-bold"
                style={{ color: domain.color }}
              >
                {domain.score}%
              </span>
            </div>
            <div className={cn(
              'h-2 rounded-full overflow-hidden',
              isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            )}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${domain.score}%`,
                  background: `linear-gradient(90deg, ${domain.color}, ${domain.color}99)`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// 30일 변화량 요약
// ============================================

export function StatsChangeOverview({
  stats,
  previousStats,
  isDark = false,
}: {
  stats: AgentStatsData
  previousStats: AgentStatsData
  isDark?: boolean
}) {
  const changes = useMemo(() => {
    const statKeys: (keyof typeof STAT_CONFIG)[] = [
      'analysis', 'communication', 'creativity',
      'leadership', 'execution', 'adaptability'
    ]

    return statKeys.map(key => {
      const current = stats[key] || 0
      const previous = previousStats[key] || 0
      const change = current - previous
      return {
        key,
        ...STAT_CONFIG[key],
        current,
        previous,
        change,
      }
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  }, [stats, previousStats])

  const improved = changes.filter(c => c.change > 0)
  const declined = changes.filter(c => c.change < 0)

  return (
    <div className={cn(
      'grid grid-cols-2 gap-4',
      isDark ? 'text-zinc-300' : 'text-zinc-700'
    )}>
      {/* 상승한 능력치 */}
      <div className={cn(
        'p-4 rounded-xl border',
        isDark ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className={cn(
            'text-sm font-semibold',
            isDark ? 'text-green-400' : 'text-green-700'
          )}>
            상승
          </span>
        </div>
        {improved.length > 0 ? (
          <div className="space-y-2">
            {improved.slice(0, 3).map(item => {
              const Icon = item.icon
              return (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-green-500">
                    +{item.change}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            변화 없음
          </p>
        )}
      </div>

      {/* 하락한 능력치 */}
      <div className={cn(
        'p-4 rounded-xl border',
        isDark ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className={cn(
            'text-sm font-semibold',
            isDark ? 'text-red-400' : 'text-red-700'
          )}>
            하락
          </span>
        </div>
        {declined.length > 0 ? (
          <div className="space-y-2">
            {declined.slice(0, 3).map(item => {
              const Icon = item.icon
              return (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-red-500">
                    {item.change}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            변화 없음
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// 전체 스탯 패널 (탭 포함)
// ============================================

type TabType = 'radar' | 'domain' | 'changes'

export function StatsRadarPanel({
  stats,
  previousStats,
  domainExpertise,
  isDark = false,
  title = '능력치 분석',
  className,
}: {
  stats: AgentStatsData
  previousStats?: AgentStatsData
  domainExpertise?: DomainExpertise[]
  isDark?: boolean
  title?: string
  className?: string
}) {
  const [activeTab, setActiveTab] = useState<TabType>('radar')

  const tabs = [
    { id: 'radar' as const, label: '레이더' },
    { id: 'domain' as const, label: '도메인 전문성' },
    ...(previousStats ? [{ id: 'changes' as const, label: '30일 변화' }] : []),
  ]

  return (
    <div
      className={cn(
        'p-4 md:p-6 rounded-xl md:rounded-2xl border',
        isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
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
                'text-xs px-2 py-0.5 rounded-full',
                isDark
                  ? 'bg-violet-900/30 text-violet-400'
                  : 'bg-violet-100 text-violet-600'
              )}
            >
              Lv.{stats.level}
            </span>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className={cn(
        'flex gap-1 p-1 rounded-lg mb-4',
        isDark ? 'bg-zinc-900' : 'bg-zinc-200'
      )}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              activeTab === tab.id
                ? isDark
                  ? 'bg-zinc-700 text-white'
                  : 'bg-white text-zinc-900 shadow-sm'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-300'
                  : 'text-zinc-600 hover:text-zinc-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'radar' && (
        <StatsRadar
          stats={stats}
          previousStats={previousStats}
          isDark={isDark}
          size="md"
          showOverlay={!!previousStats}
        />
      )}

      {activeTab === 'domain' && (
        <DomainExpertisePanel
          expertise={domainExpertise || DEFAULT_DOMAIN_EXPERTISE}
          isDark={isDark}
        />
      )}

      {activeTab === 'changes' && previousStats && (
        <StatsChangeOverview
          stats={stats}
          previousStats={previousStats}
          isDark={isDark}
        />
      )}
    </div>
  )
}

// ============================================
// 스탯 요약 컴포넌트 (구버전 호환용)
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
  const statItems = [
    { key: 'analysis', label: '분석력', icon: Brain, color: '#3b82f6' },
    { key: 'communication', label: '소통력', icon: MessageSquare, color: '#22c55e' },
    { key: 'creativity', label: '창의력', icon: Lightbulb, color: '#8b5cf6' },
    { key: 'leadership', label: '리더십', icon: Users, color: '#f59e0b' },
    { key: 'execution', label: '실행력', icon: Target, color: '#ef4444' },
    { key: 'adaptability', label: '적응력', icon: Zap, color: '#06b6d4' },
  ]

  return (
    <div className={cn('grid grid-cols-3 gap-2 mt-4', className)}>
      {statItems.map((item) => {
        const Icon = item.icon
        const value = (stats as any)[item.key] || 0
        return (
          <div
            key={item.key}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
            )}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
            <div className="flex-1 min-w-0">
              <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                {item.label}
              </span>
              <span
                className="text-xs font-bold ml-1"
                style={{ color: item.color }}
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

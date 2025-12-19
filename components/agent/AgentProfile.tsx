'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Bot,
  Calendar,
  Clock,
  Trophy,
  TrendingUp,
  Target,
  CheckCircle,
  XCircle,
  Zap,
  DollarSign,
  Star,
  Award,
  Sparkles,
  Activity,
  BarChart3,
  Users,
  MessageSquare,
  Brain,
  FileText,
  Loader2,
} from 'lucide-react'

// ============================================
// Types
// ============================================

export interface AgentProfileData {
  // 기본 정보
  id: string
  name: string
  role: string
  description: string
  avatar_url?: string
  status: 'ACTIVE' | 'INACTIVE' | 'BUSY' | 'ERROR'
  created_at: string

  // 통계
  stats: {
    daysSinceCreation: number
    trustScore: number
    successRate: number
    avgResponseTime: number // seconds
    totalCost: number
    totalConversations: number
    totalTasksCompleted: number
    totalMeetings: number
  }

  // 능력치
  abilities: {
    level: number
    experience_points: number
    analysis: number
    communication: number
    creativity: number
    leadership: number
  }

  // 최근 성과
  recentAchievements: Array<{
    id: string
    type: 'task_complete' | 'milestone' | 'level_up' | 'streak' | 'feedback'
    title: string
    description?: string
    date: string
    value?: number
  }>
}

interface AgentProfileProps {
  agentId: string
  isDark?: boolean
  compact?: boolean
  className?: string
}

// ============================================
// Status Config
// ============================================

const statusConfig = {
  ACTIVE: { label: '활성', color: '#22c55e', bgColor: 'bg-green-500/20' },
  INACTIVE: { label: '비활성', color: '#64748b', bgColor: 'bg-zinc-500/20' },
  BUSY: { label: '작업 중', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  ERROR: { label: '오류', color: '#ef4444', bgColor: 'bg-red-500/20' },
}

const achievementConfig = {
  task_complete: { icon: CheckCircle, color: '#22c55e', label: '업무 완료' },
  milestone: { icon: Trophy, color: '#f59e0b', label: '마일스톤' },
  level_up: { icon: Sparkles, color: '#8b5cf6', label: '레벨 업' },
  streak: { icon: Zap, color: '#3b82f6', label: '연속 달성' },
  feedback: { icon: Star, color: '#ec4899', label: '피드백' },
}

// ============================================
// Helper Functions
// ============================================

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}초`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}분`
  return `${(seconds / 3600).toFixed(1)}시간`
}

function formatCurrency(amount: number): string {
  if (amount < 1) return `$${amount.toFixed(4)}`
  if (amount < 1000) return `$${amount.toFixed(2)}`
  return `$${(amount / 1000).toFixed(1)}K`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function getDaysSince(dateStr: string): number {
  const created = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// ============================================
// Stat Card Component
// ============================================

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  isDark,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  color: string
  isDark: boolean
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all hover:scale-[1.02]',
        isDark
          ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
          : 'bg-white border-zinc-200 hover:border-zinc-300'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {subValue && (
          <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {subValue}
          </span>
        )}
      </div>
      <p className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
        {value}
      </p>
      <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
        {label}
      </p>
    </div>
  )
}

// ============================================
// Achievement Item Component
// ============================================

function AchievementItem({
  achievement,
  isDark,
}: {
  achievement: AgentProfileData['recentAchievements'][0]
  isDark: boolean
}) {
  const config = achievementConfig[achievement.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
      )}
    >
      <div
        className="p-2 rounded-lg shrink-0"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          {achievement.title}
        </p>
        {achievement.description && (
          <p className={cn('text-xs truncate', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {achievement.description}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {formatDate(achievement.date)}
        </p>
        {achievement.value !== undefined && (
          <p className="text-xs font-medium" style={{ color: config.color }}>
            +{achievement.value}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// Progress Ring Component
// ============================================

function ProgressRing({
  value,
  maxValue = 100,
  size = 80,
  strokeWidth = 6,
  color,
  label,
  isDark,
}: {
  value: number
  maxValue?: number
  size?: number
  strokeWidth?: number
  color: string
  label: string
  isDark: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / maxValue, 1)
  const strokeDashoffset = circumference - progress * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isDark ? '#3f3f46' : '#e4e4e7'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
            {Math.round(value)}
          </span>
        </div>
      </div>
      <span className={cn('text-xs mt-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
        {label}
      </span>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function AgentProfile({
  agentId,
  isDark = false,
  compact = false,
  className,
}: AgentProfileProps) {
  const [data, setData] = useState<AgentProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/agents/${agentId}/profile`)
        if (!res.ok) throw new Error('프로필 로드 실패')
        const result = await res.json()
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [agentId])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn('text-center py-12', isDark ? 'text-zinc-400' : 'text-zinc-500', className)}>
        {error || '프로필을 불러올 수 없습니다'}
      </div>
    )
  }

  const status = statusConfig[data.status]

  return (
    <div className={cn('space-y-6', className)}>
      {/* 헤더: 기본 정보 */}
      <div
        className={cn(
          'p-6 rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
        )}
      >
        <div className="flex items-start gap-4">
          {/* 아바타 */}
          <div
            className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center shrink-0',
              'bg-gradient-to-br from-violet-500 to-purple-600'
            )}
          >
            {data.avatar_url ? (
              <img
                src={data.avatar_url}
                alt={data.name}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              <Bot className="w-10 h-10 text-white" />
            )}
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className={cn('text-xl font-bold truncate', isDark ? 'text-white' : 'text-zinc-900')}>
                {data.name}
              </h2>
              <span
                className={cn('px-2 py-0.5 rounded-full text-xs font-medium', status.bgColor)}
                style={{ color: status.color }}
              >
                {status.label}
              </span>
            </div>
            <p className={cn('text-sm mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              {data.role}
            </p>
            <p className={cn('text-sm line-clamp-2', isDark ? 'text-zinc-500' : 'text-zinc-600')}>
              {data.description}
            </p>
          </div>

          {/* Day 카운터 */}
          <div className="text-right shrink-0">
            <div
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                isDark ? 'bg-zinc-900' : 'bg-zinc-100'
              )}
            >
              <Calendar className="w-4 h-4 text-violet-500" />
              <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                Day {data.stats.daysSinceCreation}
              </span>
            </div>
            <p className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              {new Date(data.created_at).toLocaleDateString('ko-KR')} 합류
            </p>
          </div>
        </div>

        {/* 레벨 바 */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                Lv.{data.abilities.level}
              </span>
            </div>
            <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              {data.abilities.experience_points} XP
            </span>
          </div>
          <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-zinc-700' : 'bg-zinc-200')}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `${(data.abilities.experience_points % 1000) / 10}%` }}
            />
          </div>
        </div>
      </div>

      {/* 통계 그리드 */}
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Trophy}
            label="신뢰도"
            value={`${data.stats.trustScore}%`}
            color="#f59e0b"
            isDark={isDark}
          />
          <StatCard
            icon={Target}
            label="성공률"
            value={`${data.stats.successRate}%`}
            subValue={`${data.stats.totalTasksCompleted} 완료`}
            color="#22c55e"
            isDark={isDark}
          />
          <StatCard
            icon={Clock}
            label="평균 응답"
            value={formatTime(data.stats.avgResponseTime)}
            color="#3b82f6"
            isDark={isDark}
          />
          <StatCard
            icon={DollarSign}
            label="총 비용"
            value={formatCurrency(data.stats.totalCost)}
            color="#8b5cf6"
            isDark={isDark}
          />
        </div>
      )}

      {/* 활동 요약 & 능력치 */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 활동 요약 */}
          <div
            className={cn(
              'p-6 rounded-2xl border',
              isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
            )}
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                활동 요약
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <MessageSquare className={cn('w-6 h-6 mx-auto mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                <p className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                  {data.stats.totalConversations}
                </p>
                <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>대화</p>
              </div>
              <div>
                <CheckCircle className={cn('w-6 h-6 mx-auto mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                <p className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                  {data.stats.totalTasksCompleted}
                </p>
                <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>완료 업무</p>
              </div>
              <div>
                <Users className={cn('w-6 h-6 mx-auto mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                <p className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                  {data.stats.totalMeetings}
                </p>
                <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>회의 참여</p>
              </div>
            </div>
          </div>

          {/* 능력치 미니 차트 */}
          <div
            className={cn(
              'p-6 rounded-2xl border',
              isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
            )}
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                능력치
              </h3>
            </div>
            <div className="flex justify-around">
              <ProgressRing
                value={data.abilities.analysis}
                color="#3b82f6"
                label="분석력"
                isDark={isDark}
              />
              <ProgressRing
                value={data.abilities.communication}
                color="#22c55e"
                label="소통력"
                isDark={isDark}
              />
              <ProgressRing
                value={data.abilities.creativity}
                color="#8b5cf6"
                label="창의력"
                isDark={isDark}
              />
              <ProgressRing
                value={data.abilities.leadership}
                color="#f59e0b"
                label="리더십"
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      )}

      {/* 최근 성과 */}
      {!compact && data.recentAchievements.length > 0 && (
        <div
          className={cn(
            'p-6 rounded-2xl border',
            isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
              최근 성과
            </h3>
            <span
              className={cn(
                'ml-auto text-xs px-2 py-0.5 rounded-full',
                isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              )}
            >
              {data.recentAchievements.length}개
            </span>
          </div>
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {data.recentAchievements.map((achievement) => (
              <AchievementItem
                key={achievement.id}
                achievement={achievement}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentProfile

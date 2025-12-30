'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAgentTaskRealtime, getProgressColor, getProgressLabel } from './hooks/useAgentTaskRealtime'
import type { TaskWithDetails } from '@/types/task-hub'
import { cn } from '@/lib/utils'

// ============================================
// 타입 정의
// ============================================
interface AgentTaskProgressProps {
  agentId: string
  agentName?: string
  maxTasks?: number
  onTaskClick?: (task: TaskWithDetails) => void
}

interface TaskProgress {
  id: string
  title: string
  status: string
  progress: number
  result?: string
  error?: string
  startedAt?: string
  updatedAt?: string
}

// ============================================
// AgentTaskProgress 컴포넌트
// ============================================
export function AgentTaskProgress({
  agentId,
  agentName = 'Agent',
  maxTasks = 5,
  onTaskClick,
}: AgentTaskProgressProps) {
  const [activeTasks, setActiveTasks] = useState<TaskProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 초기 활성 Task 로드
  const loadActiveTasks = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/task-hub/agent?agent_id=${agentId}&status=IN_PROGRESS,TODO`
      )
      const result = await response.json()

      if (result.success) {
        const tasks = (result.data.assigned || []).map((task: TaskWithDetails) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          progress: (task.metadata as any)?.progress || 0,
          result: (task.metadata as any)?.result,
          error: (task.metadata as any)?.error,
          startedAt: (task.metadata as any)?.started_at,
          updatedAt: task.updated_at,
        }))
        setActiveTasks(tasks.slice(0, maxTasks))
      }
    } catch (error) {
      console.error('[AgentTaskProgress] Failed to load:', error)
    } finally {
      setIsLoading(false)
    }
  }, [agentId, maxTasks])

  useEffect(() => {
    loadActiveTasks()
  }, [loadActiveTasks])

  // 실시간 업데이트 구독
  useAgentTaskRealtime({
    agentIds: [agentId],
    onTaskInsert: (task) => {
      setActiveTasks(prev => {
        const newTask: TaskProgress = {
          id: task.id,
          title: task.title,
          status: task.status,
          progress: (task.metadata as any)?.progress || 0,
          startedAt: new Date().toISOString(),
        }
        return [newTask, ...prev].slice(0, maxTasks)
      })
    },
    onTaskUpdate: (task) => {
      setActiveTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                status: task.status,
                progress: (task.metadata as any)?.progress || t.progress,
                result: (task.metadata as any)?.result,
                error: (task.metadata as any)?.error,
                updatedAt: task.updated_at,
              }
            : t
        )
      )
    },
    onTaskDelete: (taskId) => {
      setActiveTasks(prev => prev.filter(t => t.id !== taskId))
    },
    onProgressUpdate: (taskId, progress, result) => {
      setActiveTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, progress, result, updatedAt: new Date().toISOString() }
            : t
        )
      )
    },
    enabled: true,
  })

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
      </div>
    )
  }

  if (activeTasks.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-400 text-sm">
        <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
        진행 중인 Task 없음
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3">
      {activeTasks.map((task, index) => (
        <TaskProgressCard
          key={task.id}
          task={task}
          isFirst={index === 0}
          onClick={() => {
            // 전체 Task 정보 조회 후 클릭 이벤트
            fetch(`/api/task-hub/${task.id}`)
              .then(res => res.json())
              .then(result => {
                if (result.success && onTaskClick) {
                  onTaskClick(result.data)
                }
              })
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// TaskProgressCard 컴포넌트
// ============================================
interface TaskProgressCardProps {
  task: TaskProgress
  isFirst?: boolean
  onClick?: () => void
}

function TaskProgressCard({ task, isFirst, onClick }: TaskProgressCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // 진행률 변경 시 애니메이션
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 500)
    return () => clearTimeout(timer)
  }, [task.progress])

  const statusIcon = () => {
    switch (task.status) {
      case 'DONE':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'IN_PROGRESS':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'TODO':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative p-3 rounded-lg border transition-all cursor-pointer',
        isFirst
          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
        'hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600'
      )}
    >
      {/* 상태 아이콘 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon()}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {task.status === 'IN_PROGRESS' ? '진행 중' : getProgressLabel(task.progress)}
          </span>
        </div>

        {task.updatedAt && (
          <span className="text-xs text-zinc-400">
            {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true, locale: ko })}
          </span>
        )}
      </div>

      {/* 제목 */}
      <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 mb-2">
        {task.title}
      </h4>

      {/* 진행률 바 */}
      <div className="relative">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
          <span>진행률</span>
          <span className={cn(isAnimating && 'text-purple-600 font-medium')}>
            {task.progress}%
          </span>
        </div>
        <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              getProgressColor(task.progress),
              isAnimating && 'animate-pulse'
            )}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* 결과/에러 표시 */}
      {task.result && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400 line-clamp-1">
          <Zap className="w-3 h-3 inline mr-1" />
          {task.result}
        </div>
      )}

      {task.error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400 line-clamp-1">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {task.error}
        </div>
      )}

      {/* 활성 표시기 */}
      {task.status === 'IN_PROGRESS' && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// 미니 진행률 위젯 (사이드바/헤더용)
// ============================================
interface MiniTaskProgressProps {
  agentId: string
  size?: 'sm' | 'md'
}

export function MiniTaskProgress({ agentId, size = 'sm' }: MiniTaskProgressProps) {
  const [progress, setProgress] = useState<{ count: number; avgProgress: number } | null>(null)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `/api/task-hub/agent?agent_id=${agentId}&status=IN_PROGRESS`
        )
        const result = await response.json()

        if (result.success) {
          const tasks = result.data.assigned || []
          const avgProgress = tasks.length > 0
            ? tasks.reduce((sum: number, t: any) => sum + ((t.metadata as any)?.progress || 0), 0) / tasks.length
            : 0

          setProgress({
            count: tasks.length,
            avgProgress: Math.round(avgProgress),
          })
        }
      } catch (error) {
        console.error('[MiniTaskProgress] Failed to fetch:', error)
      }
    }

    fetchProgress()
    const interval = setInterval(fetchProgress, 10000) // 10초마다 갱신
    return () => clearInterval(interval)
  }, [agentId])

  // 실시간 업데이트 구독
  useAgentTaskRealtime({
    agentIds: [agentId],
    onProgressUpdate: () => {
      // 진행률 변경 시 즉시 재조회
      fetch(`/api/task-hub/agent?agent_id=${agentId}&status=IN_PROGRESS`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            const tasks = result.data.assigned || []
            const avgProgress = tasks.length > 0
              ? tasks.reduce((sum: number, t: any) => sum + ((t.metadata as any)?.progress || 0), 0) / tasks.length
              : 0

            setProgress({
              count: tasks.length,
              avgProgress: Math.round(avgProgress),
            })
          }
        })
    },
    enabled: true,
  })

  if (!progress || progress.count === 0) {
    return null
  }

  const sizeClasses = size === 'sm'
    ? 'w-4 h-4 text-[10px]'
    : 'w-6 h-6 text-xs'

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900',
          sizeClasses
        )}
      >
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {progress.count}
        </span>
      </div>
      <div
        className={cn(
          'h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden',
          size === 'sm' ? 'w-12' : 'w-16'
        )}
      >
        <div
          className={cn('h-full rounded-full', getProgressColor(progress.avgProgress))}
          style={{ width: `${progress.avgProgress}%` }}
        />
      </div>
    </div>
  )
}

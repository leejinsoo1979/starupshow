'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { TaskWithDetails, TaskStatus } from '@/types/task-hub'
import { TASK_STATUS_COLUMNS, TASK_PRIORITIES } from '@/types/task-hub'
import { cn } from '@/lib/utils'

// ============================================
// 타입 정의
// ============================================
interface Agent {
  id: string
  name: string
  avatar_url?: string
  status?: 'ACTIVE' | 'IDLE' | 'BUSY' | 'OFFLINE'
}

interface AgentTaskPanelProps {
  agents: Agent[]
  companyId?: string
  projectId?: string
  onTaskClick?: (task: TaskWithDetails) => void
  onAssignTask?: (agentId: string, taskId: string) => void
}

interface AgentTaskGroup {
  agent: Agent
  tasks: TaskWithDetails[]
  isExpanded: boolean
}

// ============================================
// AgentTaskPanel 컴포넌트
// ============================================
export function AgentTaskPanel({
  agents,
  companyId,
  projectId,
  onTaskClick,
  onAssignTask,
}: AgentTaskPanelProps) {
  const [agentGroups, setAgentGroups] = useState<AgentTaskGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // Agent별 Task 로드
  const loadAgentTasks = useCallback(async () => {
    setIsLoading(true)

    const groups: AgentTaskGroup[] = []

    for (const agent of agents) {
      try {
        const params = new URLSearchParams({
          agent_id: agent.id,
          include_created: 'true',
        })

        const response = await fetch(`/api/task-hub/agent?${params}`)
        const result = await response.json()

        if (result.success) {
          groups.push({
            agent,
            tasks: result.data.assigned || [],
            isExpanded: true,
          })
        }
      } catch (error) {
        console.error(`[AgentTaskPanel] Failed to load tasks for ${agent.name}:`, error)
        groups.push({
          agent,
          tasks: [],
          isExpanded: true,
        })
      }
    }

    setAgentGroups(groups)
    setIsLoading(false)
  }, [agents])

  useEffect(() => {
    if (agents.length > 0) {
      loadAgentTasks()
    }
  }, [agents, loadAgentTasks])

  // 그룹 확장/축소 토글
  const toggleGroup = (agentId: string) => {
    setAgentGroups(prev =>
      prev.map(g =>
        g.agent.id === agentId ? { ...g, isExpanded: !g.isExpanded } : g
      )
    )
  }

  // Agent 상태 아이콘
  const getAgentStatusIcon = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      case 'BUSY':
        return <span className="w-2 h-2 bg-yellow-500 rounded-full" />
      case 'IDLE':
        return <span className="w-2 h-2 bg-blue-500 rounded-full" />
      default:
        return <span className="w-2 h-2 bg-zinc-400 rounded-full" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded-lg mb-2" />
            <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
        <Bot className="w-10 h-10 mb-2" />
        <p>등록된 Agent가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-500" />
          Agent Tasks
        </h3>
        <button
          onClick={loadAgentTasks}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Agent 목록 */}
      <div className="flex-1 overflow-y-auto">
        {agentGroups.map(group => (
          <div key={group.agent.id} className="border-b border-zinc-100 dark:border-zinc-800">
            {/* Agent 헤더 */}
            <button
              onClick={() => toggleGroup(group.agent.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              {group.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              )}

              {/* Agent 아바타 */}
              <div className="relative">
                {group.agent.avatar_url ? (
                  <img
                    src={group.agent.avatar_url}
                    alt={group.agent.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5">
                  {getAgentStatusIcon(group.agent.status)}
                </div>
              </div>

              {/* Agent 이름 */}
              <div className="flex-1 text-left">
                <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                  {group.agent.name}
                </div>
                <div className="text-xs text-zinc-500">
                  {group.tasks.length}개 Task 진행 중
                </div>
              </div>

              {/* Task 카운트 배지 */}
              {group.tasks.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full">
                  {group.tasks.length}
                </span>
              )}
            </button>

            {/* Agent의 Task 목록 */}
            {group.isExpanded && (
              <div className="pb-2">
                {group.tasks.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-zinc-400 text-center">
                    할당된 Task가 없습니다
                  </div>
                ) : (
                  group.tasks.map(task => (
                    <AgentTaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick?.(task)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// AgentTaskCard 컴포넌트
// ============================================
interface AgentTaskCardProps {
  task: TaskWithDetails
  onClick: () => void
}

function AgentTaskCard({ task, onClick }: AgentTaskCardProps) {
  const statusConfig = TASK_STATUS_COLUMNS.find(s => s.id === task.status)
  const priorityConfig = TASK_PRIORITIES.find(p => p.id === task.priority)

  // 진행률 (metadata에서 추출)
  const progress = (task.metadata as any)?.progress || 0

  // 상태별 아이콘
  const getStatusIcon = () => {
    switch (task.status) {
      case 'DONE':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'IN_PROGRESS':
        return <Play className="w-4 h-4 text-yellow-500" />
      case 'IN_REVIEW':
        return <Clock className="w-4 h-4 text-purple-500" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />
    }
  }

  return (
    <div
      onClick={onClick}
      className="mx-4 mb-2 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer transition-all hover:shadow-sm"
    >
      {/* 상단: 상태 + 우선순위 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${statusConfig?.color}20`,
              color: statusConfig?.color,
            }}
          >
            {statusConfig?.name}
          </span>
        </div>

        {task.priority !== 'NONE' && priorityConfig && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${priorityConfig.color}20`,
              color: priorityConfig.color,
            }}
          >
            {priorityConfig.icon}
          </span>
        )}
      </div>

      {/* 제목 */}
      <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* 진행률 바 (IN_PROGRESS일 때만) */}
      {task.status === 'IN_PROGRESS' && progress > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>진행률</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 하단: 시간 정보 */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: ko })}
        </span>

        {task.due_date && (
          <span className={cn(
            'flex items-center gap-1',
            new Date(task.due_date) < new Date() && task.status !== 'DONE' && 'text-red-500'
          )}>
            <Clock className="w-3 h-3" />
            {format(new Date(task.due_date), 'M/d')}
          </span>
        )}
      </div>

      {/* 결과/에러 미리보기 */}
      {(task.metadata as any)?.result && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400 line-clamp-2">
          <Zap className="w-3 h-3 inline mr-1" />
          {(task.metadata as any).result.substring(0, 100)}...
        </div>
      )}

      {(task.metadata as any)?.error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400 line-clamp-2">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {(task.metadata as any).error.substring(0, 100)}...
        </div>
      )}
    </div>
  )
}

// ============================================
// Agent 선택 드롭다운 컴포넌트
// ============================================
interface AgentSelectorProps {
  agents: Agent[]
  selectedId?: string
  onSelect: (agentId: string) => void
  placeholder?: string
}

export function AgentSelector({
  agents,
  selectedId,
  onSelect,
  placeholder = 'Agent 선택',
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedAgent = agents.find(a => a.id === selectedId)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:border-purple-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          {selectedAgent ? (
            <>
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Bot className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-zinc-800 dark:text-zinc-200">
                {selectedAgent.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-zinc-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-zinc-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => {
                onSelect(agent.id)
                setIsOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors',
                selectedId === agent.id && 'bg-purple-50 dark:bg-purple-900/20'
              )}
            >
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Bot className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-zinc-800 dark:text-zinc-200">
                {agent.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

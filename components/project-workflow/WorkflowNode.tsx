'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bot,
  User,
  ChevronDown,
  Zap,
  Brain,
  Search,
  FileText,
  Send,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectTaskWithAssignee, ProjectTaskStatus } from '@/types/database'

interface WorkflowNodeData {
  task: ProjectTaskWithAssignee
  onStatusChange: (taskId: string, status: ProjectTaskStatus) => void
  onExecute: (task: ProjectTaskWithAssignee) => void
  onClick?: (task: ProjectTaskWithAssignee) => void
}

const STATUS_CONFIG = {
  TODO: {
    color: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600',
    iconColor: 'text-zinc-500 dark:text-zinc-400',
    label: '할 일',
    icon: Clock,
    glow: '',
  },
  IN_PROGRESS: {
    color: 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-500',
    iconColor: 'text-blue-500 dark:text-blue-400',
    label: '진행 중',
    icon: Play,
    glow: 'shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30',
  },
  REVIEW: {
    color: 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-500',
    iconColor: 'text-amber-500 dark:text-amber-400',
    label: '검토',
    icon: AlertCircle,
    glow: 'shadow-lg shadow-amber-500/20 dark:shadow-amber-500/30',
  },
  DONE: {
    color: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-500',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    label: '완료',
    icon: CheckCircle2,
    glow: '',
  },
  CANCELLED: {
    color: 'bg-red-50 dark:bg-red-950/50 border-red-400 dark:border-red-500',
    iconColor: 'text-red-500 dark:text-red-400',
    label: '취소',
    icon: AlertCircle,
    glow: '',
  },
}

const PRIORITY_CONFIG = {
  low: { color: 'bg-zinc-200 dark:bg-zinc-700', text: '낮음' },
  medium: { color: 'bg-blue-200 dark:bg-blue-800', text: '중간' },
  high: { color: 'bg-orange-200 dark:bg-orange-800', text: '높음' },
  urgent: { color: 'bg-red-200 dark:bg-red-800', text: '긴급' },
}

const EXECUTION_PHASES = [
  { icon: Brain, label: '분석', color: 'text-purple-500' },
  { icon: Search, label: '검색', color: 'text-blue-500' },
  { icon: FileText, label: '작성', color: 'text-emerald-500' },
  { icon: Send, label: '전송', color: 'text-indigo-500' },
]

function WorkflowNodeComponent({ data }: NodeProps<WorkflowNodeData>) {
  const { task, onStatusChange, onExecute, onClick } = data
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [executionPhase, setExecutionPhase] = useState(0)
  const [isExecuting, setIsExecuting] = useState(false)

  const statusConfig = STATUS_CONFIG[task.status]
  const StatusIcon = statusConfig.icon
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium

  const handleExecute = () => {
    if (!task.assignee_agent_id || isExecuting) return
    setIsExecuting(true)
    setExecutionPhase(0)

    // Animate through phases
    const interval = setInterval(() => {
      setExecutionPhase(prev => {
        if (prev >= EXECUTION_PHASES.length - 1) {
          clearInterval(interval)
          setTimeout(() => {
            setIsExecuting(false)
            onExecute(task)
          }, 500)
          return prev
        }
        return prev + 1
      })
    }, 800)
  }

  return (
    <>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-zinc-900"
      />

      {/* Node Container */}
      <div
        onClick={() => onClick?.(task)}
        className={cn(
          'relative w-64 rounded-xl border-2 transition-all duration-300 cursor-pointer',
          'hover:scale-[1.02] hover:shadow-xl',
          statusConfig.color,
          statusConfig.glow,
          task.status === 'IN_PROGRESS' && 'animate-pulse-subtle'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'p-1.5 rounded-lg',
                task.status === 'IN_PROGRESS'
                  ? 'bg-blue-500 text-white'
                  : task.status === 'DONE'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              )}
            >
              <StatusIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {statusConfig.label}
            </span>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 py-1 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 z-50">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(task.id, status as ProjectTaskStatus)
                      setShowStatusMenu(false)
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs flex items-center gap-2',
                      'hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors',
                      task.status === status && 'bg-zinc-100 dark:bg-zinc-700'
                    )}
                  >
                    <config.icon className={cn('w-3.5 h-3.5', config.iconColor)} />
                    {config.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 line-clamp-2">
            {task.title}
          </h4>

          {/* Priority Badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                priorityConfig.color,
                'text-zinc-700 dark:text-zinc-200'
              )}
            >
              {priorityConfig.text}
            </span>
          </div>

          {/* Assignee */}
          {(task.assignee_user || task.assignee_agent) && (
            <div className="flex items-center gap-2 pt-1">
              {task.assignee_agent ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Bot className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs text-purple-700 dark:text-purple-300">
                    {task.assignee_agent.name}
                  </span>
                </div>
              ) : task.assignee_user ? (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {task.assignee_user.name || task.assignee_user.email}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Agent Execution */}
          {task.assignee_agent && (
            <div className="pt-2 border-t border-inherit">
              {isExecuting ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {EXECUTION_PHASES.map((phase, idx) => {
                      const PhaseIcon = phase.icon
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'p-1.5 rounded-lg transition-all duration-300',
                            idx === executionPhase
                              ? 'bg-white dark:bg-zinc-800 shadow-md scale-110'
                              : idx < executionPhase
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : 'bg-zinc-100 dark:bg-zinc-800/50'
                          )}
                        >
                          <PhaseIcon
                            className={cn(
                              'w-3.5 h-3.5 transition-colors',
                              idx === executionPhase
                                ? cn(phase.color, 'animate-pulse')
                                : idx < executionPhase
                                ? 'text-emerald-500'
                                : 'text-zinc-400'
                            )}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {EXECUTION_PHASES[executionPhase]?.label} 중...
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleExecute}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2 rounded-lg',
                    'bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium',
                    'hover:from-purple-600 hover:to-indigo-600 transition-all',
                    'shadow-md hover:shadow-lg'
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  에이전트 실행
                </button>
              )}
            </div>
          )}
        </div>

        {/* Running Indicator */}
        {task.status === 'IN_PROGRESS' && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-zinc-900"
      />
    </>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)

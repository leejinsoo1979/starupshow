'use client'

import { useState } from 'react'
import {
  Calendar,
  User,
  Bot,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  ArrowUpDown,
} from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { TaskWithDetails, TaskStatus, TaskPriority } from '@/types/task-hub'
import { TASK_STATUS_COLUMNS, TASK_PRIORITIES } from '@/types/task-hub'
import { cn } from '@/lib/utils'

interface ListViewProps {
  tasks: TaskWithDetails[]
  onTaskClick: (task: TaskWithDetails) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  isLoading?: boolean
  groupBy?: 'status' | 'priority' | 'assignee' | 'project' | 'none'
}

export function ListView({
  tasks,
  onTaskClick,
  onStatusChange,
  isLoading = false,
  groupBy = 'status',
}: ListViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['TODO', 'IN_PROGRESS']))
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 그룹화 함수
  const groupTasks = () => {
    const groups: Record<string, TaskWithDetails[]> = {}

    tasks.forEach(task => {
      let groupKey: string

      switch (groupBy) {
        case 'status':
          groupKey = task.status
          break
        case 'priority':
          groupKey = task.priority
          break
        case 'assignee':
          groupKey = task.assignee_name || task.agent_name || '미할당'
          break
        case 'project':
          groupKey = task.project_name || '프로젝트 없음'
          break
        default:
          groupKey = 'all'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(task)
    })

    // 정렬
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        let comparison = 0
        if (sortBy === 'created_at') {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        } else if (sortBy === 'due_date') {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity
          comparison = aDate - bDate
        } else if (sortBy === 'priority') {
          const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return sortOrder === 'asc' ? comparison : -comparison
      })
    })

    return groups
  }

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const handleSort = (field: 'created_at' | 'due_date' | 'priority') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getGroupLabel = (key: string) => {
    if (groupBy === 'status') {
      const status = TASK_STATUS_COLUMNS.find(s => s.id === key)
      return status ? status.name : key
    }
    if (groupBy === 'priority') {
      const priority = TASK_PRIORITIES.find(p => p.id === key)
      return priority ? priority.name : key
    }
    return key
  }

  const getGroupColor = (key: string) => {
    if (groupBy === 'status') {
      const status = TASK_STATUS_COLUMNS.find(s => s.id === key)
      return status?.color
    }
    if (groupBy === 'priority') {
      const priority = TASK_PRIORITIES.find(p => p.id === key)
      return priority?.color
    }
    return '#6B7280'
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  const groups = groupTasks()
  const groupKeys = Object.keys(groups)

  // 그룹 정렬 (상태 순서대로)
  if (groupBy === 'status') {
    groupKeys.sort((a, b) => {
      const statusOrder = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']
      return statusOrder.indexOf(a) - statusOrder.indexOf(b)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 테이블 헤더 */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <div className="w-8" /> {/* 체크박스 */}
        <div className="flex-1">제목</div>
        <button
          onClick={() => handleSort('priority')}
          className="w-24 flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          우선순위
          {sortBy === 'priority' && <ArrowUpDown className="w-3 h-3" />}
        </button>
        <div className="w-24">상태</div>
        <button
          onClick={() => handleSort('due_date')}
          className="w-24 flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          마감일
          {sortBy === 'due_date' && <ArrowUpDown className="w-3 h-3" />}
        </button>
        <div className="w-32">담당자</div>
      </div>

      {/* 그룹화된 Task 목록 */}
      <div className="flex-1 overflow-y-auto">
        {groupBy === 'none' ? (
          // 그룹 없이 표시
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        ) : (
          // 그룹별 표시
          groupKeys.map(groupKey => (
            <div key={groupKey} className="border-b border-zinc-100 dark:border-zinc-800">
              {/* 그룹 헤더 */}
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                {expandedGroups.has(groupKey) ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                )}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getGroupColor(groupKey) }}
                />
                <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                  {getGroupLabel(groupKey)}
                </span>
                <span className="text-xs text-zinc-400">
                  {groups[groupKey].length}
                </span>
              </button>

              {/* 그룹 내 Task 목록 */}
              {expandedGroups.has(groupKey) && (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {groups[groupKey].map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onStatusChange={onStatusChange}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* 빈 상태 */}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-40 text-zinc-400">
            Task가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

// 개별 Task 행 컴포넌트
interface TaskRowProps {
  task: TaskWithDetails
  onClick: () => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

function TaskRow({ task, onClick, onStatusChange }: TaskRowProps) {
  const priorityConfig = TASK_PRIORITIES.find(p => p.id === task.priority)
  const statusConfig = TASK_STATUS_COLUMNS.find(s => s.id === task.status)
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'DONE'

  const handleToggleDone = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
    onStatusChange(task.id, newStatus)
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
    >
      {/* 완료 토글 */}
      <button
        onClick={handleToggleDone}
        className="flex-shrink-0"
      >
        {task.status === 'DONE' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-accent" />
        )}
      </button>

      {/* 제목 */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-sm font-medium truncate',
          task.status === 'DONE' && 'line-through text-zinc-400'
        )}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-zinc-400 truncate mt-0.5">
            {task.description}
          </div>
        )}
      </div>

      {/* 우선순위 */}
      <div className="w-24 flex-shrink-0">
        {task.priority !== 'NONE' && priorityConfig && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${priorityConfig.color}20`,
              color: priorityConfig.color,
            }}
          >
            {priorityConfig.icon} {priorityConfig.name}
          </span>
        )}
      </div>

      {/* 상태 */}
      <div className="w-24 flex-shrink-0">
        {statusConfig && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${statusConfig.color}20`,
              color: statusConfig.color,
            }}
          >
            {statusConfig.name}
          </span>
        )}
      </div>

      {/* 마감일 */}
      <div className="w-24 flex-shrink-0">
        {task.due_date && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <Calendar className="w-3 h-3" />
            {format(parseISO(task.due_date), 'M/d', { locale: ko })}
          </span>
        )}
      </div>

      {/* 담당자 */}
      <div className="w-32 flex-shrink-0">
        {task.assignee_id && (
          <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            {task.assignee_type === 'AGENT' ? (
              <>
                <Bot className="w-3 h-3 text-purple-500" />
                <span className="truncate">{task.agent_name}</span>
              </>
            ) : (
              <>
                <User className="w-3 h-3" />
                <span className="truncate">{task.assignee_name}</span>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

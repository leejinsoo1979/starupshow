'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Calendar,
  User,
  Bot,
  CheckSquare,
  MessageSquare,
  Paperclip,
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { TaskWithDetails, TaskPriority } from '@/types/task-hub'
import { TASK_PRIORITIES } from '@/types/task-hub'
import { cn } from '@/lib/utils'

interface KanbanCardProps {
  task: TaskWithDetails
  onClick: () => void
  isDragging?: boolean
}

export function KanbanCard({ task, onClick, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityConfig = TASK_PRIORITIES.find(p => p.id === task.priority)

  // 마감일 포맷팅
  const formatDueDate = (dateStr: string | undefined) => {
    if (!dateStr) return null
    const date = parseISO(dateStr)
    if (isToday(date)) return '오늘'
    if (isTomorrow(date)) return '내일'
    return format(date, 'M/d', { locale: ko })
  }

  const dueDate = formatDueDate(task.due_date)
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'DONE'

  // 하위 Task 진행률
  const subtaskProgress = task.subtask_count > 0
    ? `${task.completed_subtask_count}/${task.subtask_count}`
    : null

  // 체크리스트 진행률
  const checklistProgress = task.checklist_count > 0
    ? `${task.completed_checklist_count}/${task.checklist_count}`
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-zinc-800 rounded-lg p-3 shadow-sm border border-zinc-200 dark:border-zinc-700',
        'cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600 transition-all',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg ring-2 ring-accent',
      )}
    >
      {/* 상단: 우선순위 + 라벨 */}
      <div className="flex items-center gap-1 mb-2">
        {task.priority !== 'NONE' && priorityConfig && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: `${priorityConfig.color}20`,
              color: priorityConfig.color,
            }}
          >
            {priorityConfig.icon} {priorityConfig.name}
          </span>
        )}
        {task.labels?.slice(0, 2).map((label, i) => (
          <span
            key={i}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${label.color}20`,
              color: label.color,
            }}
          >
            {label.name}
          </span>
        ))}
        {task.labels?.length > 2 && (
          <span className="text-xs text-zinc-400">+{task.labels.length - 2}</span>
        )}
      </div>

      {/* 제목 */}
      <h4 className="font-medium text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* 하단: 메타 정보 */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          {/* 마감일 */}
          {dueDate && (
            <span
              className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-500'
              )}
            >
              <Calendar className="w-3 h-3" />
              {dueDate}
            </span>
          )}

          {/* 체크리스트 진행률 */}
          {checklistProgress && (
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {checklistProgress}
            </span>
          )}

          {/* 하위 Task 진행률 */}
          {subtaskProgress && (
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="text-[10px]">Sub</span>
              {subtaskProgress}
            </span>
          )}
        </div>

        {/* 담당자 */}
        <div className="flex items-center gap-1">
          {task.assignee_id && (
            <>
              {task.assignee_type === 'AGENT' ? (
                <span className="flex items-center gap-1 text-purple-500" title={task.agent_name || 'Agent'}>
                  <Bot className="w-3 h-3" />
                  <span className="max-w-[60px] truncate">{task.agent_name}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1" title={task.assignee_name || 'User'}>
                  <User className="w-3 h-3" />
                  <span className="max-w-[60px] truncate">{task.assignee_name}</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 태그 */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded"
            >
              #{tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-zinc-400">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* 프로젝트 표시 */}
      {task.project_name && (
        <div className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
          📁 {task.project_name}
        </div>
      )}
    </div>
  )
}

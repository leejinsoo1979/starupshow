'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { KanbanCard } from './KanbanCard'
import type { KanbanColumn as KanbanColumnType, TaskWithDetails } from '@/types/task-hub'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  column: KanbanColumnType
  onTaskClick: (task: TaskWithDetails) => void
  onTaskCreate: () => void
}

export function KanbanColumn({ column, onTaskClick, onTaskCreate }: KanbanColumnProps) {
  // 컬럼 전체를 droppable로 설정
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  return (
    <div
      className={cn(
        'flex-shrink-0 w-72 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg flex flex-col max-h-full',
        isOver && 'ring-2 ring-accent ring-offset-2 dark:ring-offset-zinc-900'
      )}
    >
      {/* 컬럼 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
            {column.name}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-500 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={onTaskCreate}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
          title="새 Task 추가"
        >
          <Plus className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Task 목록 - 이 영역이 실제 드롭 영역 */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]",
          isOver && "bg-accent/10"
        )}
      >
        {column.tasks.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center h-full min-h-[150px] text-sm text-zinc-400 dark:text-zinc-600",
              "border-2 border-dashed rounded-lg transition-colors",
              isOver
                ? "border-accent bg-accent/5 text-accent"
                : "border-zinc-200 dark:border-zinc-700"
            )}
          >
            Task를 여기에 드롭하세요
          </div>
        ) : (
          column.tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>

      {/* 컬럼 하단 - 새 Task 추가 버튼 */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-700">
        <button
          onClick={onTaskCreate}
          className="w-full flex items-center justify-center gap-1 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>새 Task</span>
        </button>
      </div>
    </div>
  )
}

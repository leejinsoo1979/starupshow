'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type {
  TaskWithDetails,
  TaskStatus,
  KanbanColumn as KanbanColumnType,
} from '@/types/task-hub'
import { TASK_STATUS_COLUMNS } from '@/types/task-hub'

interface KanbanBoardProps {
  tasks: TaskWithDetails[]
  onTaskMove: (taskId: string, newStatus: TaskStatus, newPosition: number) => void
  onTaskClick: (task: TaskWithDetails) => void
  onTaskCreate: (status: TaskStatus) => void
  isLoading?: boolean
  visibleColumns?: TaskStatus[]
}

export function KanbanBoard({
  tasks,
  onTaskMove,
  onTaskClick,
  onTaskCreate,
  isLoading = false,
  visibleColumns = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null)

  // 센서 설정 (마우스, 키보드)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 움직여야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 컬럼별 Task 그룹화
  const columns: KanbanColumnType[] = useMemo(() => {
    return TASK_STATUS_COLUMNS
      .filter(col => visibleColumns.includes(col.id))
      .map(col => ({
        ...col,
        tasks: tasks
          .filter(task => task.status === col.id)
          .sort((a, b) => a.position - b.position),
      }))
  }, [tasks, visibleColumns])

  // 커스텀 collision detection - 빈 컬럼에도 잘 드롭되도록
  const collisionDetection: CollisionDetection = (args) => {
    // 먼저 pointerWithin으로 정확한 위치 확인
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    // fallback으로 rectIntersection 사용
    return rectIntersection(args)
  }

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  // 드래그 중 (컬럼 간 이동)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // 같은 위치면 무시
    if (activeId === overId) return

    // 컬럼으로 이동하는 경우
    const overColumn = columns.find(col => col.id === overId)
    if (overColumn) {
      const activeTask = tasks.find(t => t.id === activeId)
      if (activeTask && activeTask.status !== overColumn.id) {
        // 컬럼 변경 시 상태 업데이트
        onTaskMove(activeId, overColumn.id, overColumn.tasks.length)
      }
    }
  }

  // 드래그 종료
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    // 컬럼 위에 드롭한 경우
    const overColumn = columns.find(col => col.id === overId)
    if (overColumn) {
      onTaskMove(activeId, overColumn.id, overColumn.tasks.length)
      return
    }

    // 다른 Task 위에 드롭한 경우
    const overTask = tasks.find(t => t.id === overId)
    if (overTask) {
      const targetColumn = columns.find(col => col.id === overTask.status)
      if (targetColumn) {
        const overIndex = targetColumn.tasks.findIndex(t => t.id === overId)
        onTaskMove(activeId, overTask.status, overIndex)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {visibleColumns.map(status => (
          <div
            key={status}
            className="flex-shrink-0 w-72 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-3 animate-pulse"
          >
            <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto min-h-[calc(100vh-200px)]">
        {columns.map(column => (
          <SortableContext
            key={column.id}
            items={column.tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              column={column}
              onTaskClick={onTaskClick}
              onTaskCreate={() => onTaskCreate(column.id)}
            />
          </SortableContext>
        ))}
      </div>

      {/* 드래그 중인 카드 오버레이 */}
      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            onClick={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

"use client"

import { useDroppable } from "@dnd-kit/core"
import { KanbanColumnType } from "./KanbanBoard"
import { MoreHorizontal, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface KanbanColumnProps {
  column: KanbanColumnType
  children: React.ReactNode
  accentColor: string
}

export function KanbanColumn({ column, children, accentColor }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 flex flex-col bg-zinc-900/50 rounded-xl border transition-all duration-200 ${
        isOver ? "border-zinc-600 bg-zinc-800/50" : "border-zinc-800"
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-semibold text-zinc-100">{column.title}</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400">
              {column.tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px] max-h-[calc(100vh-300px)]">
        {children}
        {column.tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-zinc-700 rounded-lg">
            <p className="text-sm text-zinc-500">태스크를 여기로 드래그하세요</p>
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="p-3 border-t border-zinc-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          태스크 추가
        </Button>
      </div>
    </div>
  )
}

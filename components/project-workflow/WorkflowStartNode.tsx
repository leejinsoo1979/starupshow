'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkflowStartNodeData {
  label: string
}

function WorkflowStartNodeComponent({ data }: NodeProps<WorkflowStartNodeData>) {
  return (
    <>
      <div
        className={cn(
          'flex items-center justify-center w-16 h-16 rounded-full',
          'bg-gradient-to-br from-emerald-400 to-emerald-600',
          'shadow-lg shadow-emerald-500/30',
          'border-4 border-white dark:border-zinc-900'
        )}
      >
        <PlayCircle className="w-8 h-8 text-white" />
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {data.label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-zinc-900"
      />
    </>
  )
}

export const WorkflowStartNode = memo(WorkflowStartNodeComponent)

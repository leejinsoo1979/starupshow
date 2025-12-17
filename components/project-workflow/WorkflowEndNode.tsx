'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkflowEndNodeData {
  label: string
}

function WorkflowEndNodeComponent({ data }: NodeProps<WorkflowEndNodeData>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white dark:!border-zinc-900"
      />

      <div
        className={cn(
          'flex items-center justify-center w-16 h-16 rounded-full',
          'bg-gradient-to-br from-rose-400 to-rose-600',
          'shadow-lg shadow-rose-500/30',
          'border-4 border-white dark:border-zinc-900'
        )}
      >
        <CheckCircle2 className="w-8 h-8 text-white" />
      </div>

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {data.label}
        </span>
      </div>
    </>
  )
}

export const WorkflowEndNode = memo(WorkflowEndNodeComponent)

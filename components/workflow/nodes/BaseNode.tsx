"use client"

import { memo, ReactNode } from "react"
import { Handle, Position, NodeProps } from "reactflow"
import { motion } from "framer-motion"
import type { NodeData } from "@/lib/workflow"

interface BaseNodeProps extends NodeProps<NodeData> {
  icon: ReactNode
  color: string
  children?: ReactNode
  showSourceHandle?: boolean
  showTargetHandle?: boolean
  sourceHandles?: { id: string; position: Position; label?: string; style?: React.CSSProperties }[]
  targetHandles?: { id: string; position: Position; label?: string; style?: React.CSSProperties }[]
}

function BaseNodeComponent({
  data,
  selected,
  icon,
  color,
  children,
  showSourceHandle = true,
  showTargetHandle = true,
  sourceHandles,
  targetHandles,
}: BaseNodeProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        min-w-[200px] rounded-lg bg-zinc-900 border-2 shadow-lg
        transition-all duration-200
        ${selected ? "border-accent shadow-accent/20" : "border-zinc-700 hover:border-zinc-500"}
      `}
      style={{
        borderLeftColor: color,
        borderLeftWidth: 4,
      }}
    >
      {/* Default target handle */}
      {showTargetHandle && !targetHandles && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-accent hover:!border-accent transition-colors"
        />
      )}

      {/* Custom target handles */}
      {targetHandles?.map((handle) => (
        <Handle
          key={handle.id}
          type="target"
          position={handle.position}
          id={handle.id}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-accent hover:!border-accent transition-colors"
          style={handle.style}
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        <div
          className="p-1.5 rounded-md"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-100 truncate">
            {data.label}
          </h4>
          {data.description && (
            <p className="text-xs text-zinc-500 truncate">{data.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      {children && (
        <div className="p-3 text-xs text-zinc-400">{children}</div>
      )}

      {/* Default source handle */}
      {showSourceHandle && !sourceHandles && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-accent hover:!border-accent transition-colors"
        />
      )}

      {/* Custom source handles */}
      {sourceHandles?.map((handle) => (
        <div key={handle.id} className="relative">
          <Handle
            type="source"
            position={handle.position}
            id={handle.id}
            className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-accent hover:!border-accent transition-colors"
            style={handle.style}
          />
          {handle.label && (
            <span
              className="absolute text-[10px] text-zinc-500"
              style={{
                ...handle.style,
                bottom: handle.position === Position.Bottom ? -18 : undefined,
                transform: "translateX(-50%)",
              }}
            >
              {handle.label}
            </span>
          )}
        </div>
      ))}
    </motion.div>
  )
}

export const BaseNode = memo(BaseNodeComponent)

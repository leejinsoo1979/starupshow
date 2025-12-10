"use client"

import { memo, ReactNode } from "react"
import { Handle, Position, NodeProps } from "reactflow"
import { motion } from "framer-motion"
import type { AgentNodeData } from "@/lib/agent"

interface BaseAgentNodeProps extends NodeProps<AgentNodeData> {
  icon: ReactNode
  color: string
  bgColor: string
  borderColor: string
  inputHandles?: number
  outputHandles?: number
}

function BaseAgentNodeComponent({
  data,
  selected,
  icon,
  color,
  bgColor,
  borderColor,
  inputHandles = 1,
  outputHandles = 1,
}: BaseAgentNodeProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative min-w-[180px] rounded-xl shadow-lg transition-all duration-200 ${
        selected ? "ring-2 ring-offset-2 ring-offset-zinc-950" : ""
      }`}
      style={{
        backgroundColor: bgColor,
        borderWidth: 2,
        borderColor: selected ? color : borderColor,
        boxShadow: selected ? `0 0 20px ${color}40` : undefined,
      }}
    >
      {/* Input Handles */}
      {inputHandles > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-zinc-500 transition-colors"
          style={{ left: -6 }}
        />
      )}

      {/* Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}30` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-100 truncate">
              {data.label}
            </div>
            {data.agentType && (
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {data.agentType}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="text-xs text-zinc-400 line-clamp-2 mt-1">
            {data.description}
          </div>
        )}

        {/* Model Badge */}
        {data.model && (
          <div
            className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {data.model}
          </div>
        )}

        {/* Memory Type Badge */}
        {data.memoryType && (
          <div
            className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {data.memoryType} memory
          </div>
        )}

        {/* Vector Store Badge */}
        {data.vectorStore && (
          <div
            className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {data.vectorStore}
          </div>
        )}
      </div>

      {/* Output Handles */}
      {outputHandles === 1 && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-zinc-500 transition-colors"
          style={{ right: -6 }}
        />
      )}

      {/* Multiple output handles for router/evaluator */}
      {outputHandles > 1 && (
        <>
          {Array.from({ length: outputHandles }).map((_, i) => {
            const percentage = ((i + 1) / (outputHandles + 1)) * 100
            return (
              <Handle
                key={`output-${i}`}
                type="source"
                position={Position.Right}
                id={String.fromCharCode(97 + i)} // a, b, c...
                className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-zinc-500 transition-colors"
                style={{ right: -6, top: `${percentage}%` }}
              />
            )
          })}
        </>
      )}

      {/* No output handle for output node */}
      {outputHandles === 0 && null}
    </motion.div>
  )
}

export const BaseAgentNode = memo(BaseAgentNodeComponent)

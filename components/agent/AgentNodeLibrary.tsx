"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  GitBranch,
  Database,
  Wrench,
  Search,
  MessageSquare,
  Send,
  Link,
  CheckCircle,
  Code,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { AGENT_NODE_CONFIGS, getCategoryLabel } from "@/lib/agent"
import type { AgentType } from "@/lib/agent"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  GitBranch,
  Database,
  Wrench,
  Search,
  MessageSquare,
  Send,
  Link,
  CheckCircle,
  Code,
}

interface AgentNodeLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: AgentType) => void
}

export function AgentNodeLibrary({ onDragStart }: AgentNodeLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "core",
    "io",
    "memory",
    "tools",
    "control",
  ])

  const categories = Array.from(
    new Set(Object.values(AGENT_NODE_CONFIGS).map((c) => c.category))
  )

  const filteredNodes = Object.values(AGENT_NODE_CONFIGS).filter(
    (config) =>
      config.labelKo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.descriptionKo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-100">에이전트 노드</h2>
        </div>
        <input
          type="text"
          placeholder="노드 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {categories.map((category) => {
          const categoryNodes = filteredNodes.filter(
            (node) => node.category === category
          )
          if (categoryNodes.length === 0) return null

          const isExpanded = expandedCategories.includes(category)

          return (
            <div key={category} className="rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
              >
                <span>{getCategoryLabel(category)}</span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1 pt-1"
                  >
                    {categoryNodes.map((config) => {
                      const IconComponent = iconMap[config.icon]
                      return (
                        <motion.div
                          key={config.type}
                          draggable
                          onDragStart={(e) =>
                            onDragStart(
                              e as unknown as React.DragEvent,
                              config.type
                            )
                          }
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-3 p-2 mx-1 rounded-lg bg-zinc-800/30 hover:bg-zinc-800 cursor-grab active:cursor-grabbing border border-transparent hover:border-zinc-700 transition-all"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${config.color}20` }}
                          >
                            {IconComponent && (
                              <IconComponent
                                className="w-4 h-4"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-200 truncate">
                              {config.labelKo}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                              {config.descriptionKo}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer Tips */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
        <p className="text-xs text-zinc-500">
          💡 노드를 드래그하여 캔버스에 추가하세요
        </p>
      </div>
    </div>
  )
}

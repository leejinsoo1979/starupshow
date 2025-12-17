'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Clock, Bot, User } from 'lucide-react'
import type { ImmutableMemoryRecord, MemoryEventType } from '@/types/memory'
import type { AccentColor } from '@/stores/themeStore'

interface TimelineGroup {
  date: string
  memories: ImmutableMemoryRecord[]
}

interface EventTypeConfig {
  label: string
  icon: React.ElementType
  color: string
}

interface MemoryTimelineProps {
  groups: TimelineGroup[]
  onSelectMemory: (memory: ImmutableMemoryRecord) => void
  eventTypeConfig: Record<MemoryEventType, EventTypeConfig>
  accentColor: { id: AccentColor; name: string; color: string; hoverColor: string; rgb: string }
  mounted: boolean
}

export function MemoryTimeline({
  groups,
  onSelectMemory,
  eventTypeConfig,
  accentColor,
  mounted,
}: MemoryTimelineProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-8">
      {groups.map((group, groupIndex) => (
        <motion.div
          key={group.date}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.1 }}
        >
          {/* Date Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-zinc-50 via-white to-transparent dark:from-zinc-950 dark:via-zinc-900 dark:to-transparent py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: mounted ? accentColor.color : '#8b5cf6' }}
              />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{group.date}</h2>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {group.memories.length}개의 기억
              </span>
            </div>
          </div>

          {/* Timeline Items */}
          <div className="relative ml-1.5 border-l-2 border-zinc-200 dark:border-zinc-800 pl-6 space-y-4 mt-4">
            {group.memories.map((memory, memoryIndex) => {
              const config = eventTypeConfig[memory.event_type]
              const Icon = config?.icon || ChevronRight

              return (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIndex * 0.1 + memoryIndex * 0.05 }}
                  onClick={() => onSelectMemory(memory)}
                  className="group relative cursor-pointer"
                >
                  {/* Timeline Dot */}
                  <div
                    className="absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 transition-transform group-hover:scale-125"
                    style={{ backgroundColor: config?.color || '#64748b' }}
                  />

                  {/* Card */}
                  <div className="bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 transition-all hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-0.5">
                    <div className="flex items-start gap-4">
                      {/* Event Icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config?.color || '#64748b'}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: config?.color || '#64748b' }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${config?.color || '#64748b'}20`,
                                color: config?.color || '#64748b',
                              }}
                            >
                              {config?.label || memory.event_type}
                            </span>
                            {memory.role && (
                              <span className="flex items-center gap-1 text-xs text-zinc-500">
                                {memory.role === 'assistant' || memory.role === 'agent' ? (
                                  <Bot className="w-3 h-3" />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                {memory.role === 'assistant' || memory.role === 'agent' ? '에이전트' : '사용자'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-zinc-400">
                            <Clock className="w-3 h-3" />
                            {formatTime(memory.timestamp)}
                          </div>
                        </div>

                        {memory.context?.category && (
                          <h3 className="font-medium text-zinc-900 dark:text-white mb-1 truncate">
                            {memory.context.category}
                          </h3>
                        )}

                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {truncateContent(memory.raw_content)}
                        </p>

                        {/* Agent Info */}
                        {memory.source_agent && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <Bot className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-xs text-zinc-500">
                              에이전트: {memory.source_agent}
                            </span>
                          </div>
                        )}

                        {/* Tags */}
                        {memory.context?.tags && Array.isArray(memory.context.tags) && memory.context.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {memory.context.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              >
                                #{tag}
                              </span>
                            ))}
                            {memory.context.tags.length > 3 && (
                              <span className="text-[10px] text-zinc-400">
                                +{memory.context.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

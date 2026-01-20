'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Search,
  RefreshCw,
  MessageCircle,
  FileSpreadsheet,
  FileText,
  Presentation,
  Globe,
  Code,
  Image,
  X,
  ChevronLeft,
} from 'lucide-react'
import { useThemeStore, accentColors } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

type TaskType = 'chat' | 'ai-sheet' | 'ai-docs' | 'ai-slides' | 'ai-summary' | 'ai-blog' | 'ai-coding' | 'image-gen'

interface TaskHistoryItem {
  id: string
  type: TaskType
  title: string
  preview?: string
  createdAt: string
  updatedAt?: string
  metadata?: {
    model?: string
    tokens?: number
    agent?: string
    agentId?: string
    appType?: string
  }
}

const typeIconMap: Record<TaskType, React.ElementType> = {
  'chat': MessageCircle,
  'ai-sheet': FileSpreadsheet,
  'ai-docs': FileText,
  'ai-slides': Presentation,
  'ai-summary': Globe,
  'ai-blog': FileText,
  'ai-coding': Code,
  'image-gen': Image,
}

const typeLabelMap: Record<TaskType, string> = {
  'chat': '채팅',
  'ai-sheet': 'AI 시트',
  'ai-docs': 'AI 문서',
  'ai-slides': 'AI 슬라이드',
  'ai-summary': 'AI 요약',
  'ai-blog': 'AI 블로그',
  'ai-coding': 'AI 코딩',
  'image-gen': '이미지 생성',
}

interface TaskHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectChat?: (id: string) => void
}

export function TaskHistorySidebar({ isOpen, onClose, onSelectChat }: TaskHistorySidebarProps) {
  const router = useRouter()
  const { accentColor } = useThemeStore()
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const themeColorData = accentColors.find(c => c.id === accentColor)
  const themeColor = themeColorData?.color || '#3b82f6'

  useEffect(() => {
    if (isOpen) {
      fetchTasks()
    }
  }, [isOpen])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/task-history', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        console.log('[TaskHistorySidebar] Fetched tasks:', data)
        setTasks(data.tasks || [])
      } else {
        console.error('[TaskHistorySidebar] API error:', res.status)
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks
    const query = searchQuery.toLowerCase()
    return tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.preview?.toLowerCase().includes(query)
    )
  }, [tasks, searchQuery])

  const handleTaskClick = (task: TaskHistoryItem) => {
    onClose()

    if (task.metadata?.agentId) {
      router.push(`/dashboard-group/works?conversation=${task.id}`)
      return
    }

    switch (task.type) {
      case 'chat':
        if (onSelectChat) {
          onSelectChat(task.id)
        } else {
          router.push(`/dashboard-group/messenger?room=${task.id}`)
        }
        break
      case 'ai-sheet':
        router.push(`/dashboard-group/apps/ai-sheet?id=${task.id}`)
        break
      case 'ai-docs':
        router.push(`/dashboard-group/apps/ai-docs?id=${task.id}`)
        break
      case 'ai-slides':
        router.push(`/dashboard-group/apps/ai-slides?id=${task.id}`)
        break
      default:
        router.push(`/dashboard-group/apps/${task.type}?id=${task.id}`)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 top-12 left-[344px] bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-[56px] top-12 w-72 bg-zinc-900 border-r border-zinc-700 shadow-2xl z-[60] flex flex-col"
            style={{ height: 'calc(100vh - 48px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                작업 목록
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchTasks}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  title="새로고침"
                >
                  <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-zinc-700">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    작업 목록이 비어있습니다
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredTasks.map((task, index) => {
                    const Icon = typeIconMap[task.type]
                    return (
                      <motion.button
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleTaskClick(task)}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all',
                          'hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                        )}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-800">
                          <Icon className="w-4 h-4 text-zinc-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                              {task.metadata?.agent ? '에이전트' : typeLabelMap[task.type]}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {task.title}
                          </h3>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                            {formatDistanceToNow(parseISO(task.updatedAt || task.createdAt), { addSuffix: true, locale: ko })}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

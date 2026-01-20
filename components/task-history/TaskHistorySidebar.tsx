'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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
  LayoutGrid,
} from 'lucide-react'
import { useThemeStore, accentColors } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

// 작업 타입 정의
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

// 아이콘 매핑
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

// 타입 라벨 매핑
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
  isDark: boolean
  compact?: boolean  // 헤더 없이 목록만 표시
}

export function TaskHistorySidebar({ isDark, compact = false }: TaskHistorySidebarProps) {
  const router = useRouter()
  const { accentColor } = useThemeStore()
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 테마 색상
  const themeColorData = accentColors.find(c => c.id === accentColor)
  const themeColor = themeColorData?.color || '#3b82f6'

  // 작업 목록 가져오기
  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/task-history')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 작업 목록
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks
    const query = searchQuery.toLowerCase()
    return tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.preview?.toLowerCase().includes(query)
    )
  }, [tasks, searchQuery])

  // 작업 클릭 핸들러
  const handleTaskClick = (task: TaskHistoryItem) => {
    // 에이전트 대화인 경우 Works 페이지로 이동
    if (task.metadata?.agentId) {
      router.push(`/dashboard-group/works?conversation=${task.id}`)
      return
    }

    switch (task.type) {
      case 'chat':
        router.push(`/dashboard-group/messenger?room=${task.id}`)
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
    <div className="h-full flex flex-col">
      {/* 헤더 - compact 모드에서는 숨김 */}
      {!compact && (
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <h3 className={cn(
            'text-sm font-semibold',
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          )}>
            작업 목록
          </h3>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      )}

      {/* 검색 - compact 모드에서는 숨김 */}
      {!compact && (
        <div className="px-3 py-2">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="채팅 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'flex-1 bg-transparent text-xs placeholder:text-zinc-500 outline-none border-none ring-0 focus:outline-none focus:border-none focus:ring-0',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}
            />
          </div>
        </div>
      )}

      {/* 작업 목록 */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <LayoutGrid className={cn(
              'w-8 h-8 mb-2',
              isDark ? 'text-zinc-600' : 'text-zinc-300'
            )} />
            <p className={cn(
              'text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              작업 목록이 비어있습니다
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
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
                    'w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors',
                    isDark
                      ? 'hover:bg-zinc-800'
                      : 'hover:bg-zinc-100'
                  )}
                >
                  {/* 아이콘 */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: `${themeColor}15` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: themeColor }} />
                  </div>
                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn(
                        'text-[9px] font-medium px-1 py-0.5 rounded',
                        isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-500'
                      )}>
                        {task.metadata?.agent ? '에이전트' : typeLabelMap[task.type]}
                      </span>
                      {task.metadata?.agent && (
                        <span className={cn(
                          'text-[9px] px-1 py-0.5 rounded',
                          isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
                        )}>
                          {task.metadata.agent}
                        </span>
                      )}
                    </div>
                    <h4 className={cn(
                      'text-xs font-medium truncate',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      {task.title}
                    </h4>
                    {task.preview && (
                      <p className={cn(
                        'text-[10px] truncate',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        {task.preview}
                      </p>
                    )}
                    <p className={cn(
                      'text-[10px] mt-0.5',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}>
                      {formatDistanceToNow(parseISO(task.updatedAt || task.createdAt), { addSuffix: true, locale: ko })}
                    </p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

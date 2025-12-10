'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { CommitTimeline, Commit } from '@/components/commits'
import {
  GitCommit,
  Plus,
  AlertTriangle,
  Zap,
  Info,
  Loader2,
  Calendar,
  Filter,
  Search,
  List,
  Clock,
  LayoutList,
} from 'lucide-react'

type ViewMode = 'timeline' | 'list'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  completed_at?: string
  created_at: string
  author?: {
    id: string
    name: string
    avatar_url?: string
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

export default function CommitsPage() {
  const { currentStartup } = useAuthStore()
  const { openCommitModal } = useUIStore()
  const [isLoading, setIsLoading] = useState(true)
  const [commits, setCommits] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')

  const fetchCommits = useCallback(async () => {
    if (!currentStartup?.id) {
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          author:users!author_id(id, name, avatar_url)
        `)
        .eq('startup_id', currentStartup.id)
        .eq('status', 'DONE')
        .order('completed_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setCommits(data || [])
    } catch (error) {
      console.error('Error fetching commits:', error)
      // Mock data for development
      setCommits([
        {
          id: '1',
          title: '사용자 인증 로직 개선',
          description: 'JWT 토큰 갱신 로직 수정 및 보안 강화',
          status: 'DONE',
          priority: 'HIGH',
          completed_at: new Date(Date.now() - 3600000).toISOString(),
          created_at: new Date(Date.now() - 7200000).toISOString(),
          author: { id: '1', name: '김개발' },
        },
        {
          id: '2',
          title: 'API 응답 속도 최적화',
          description: '쿼리 최적화 및 캐싱 적용',
          status: 'DONE',
          priority: 'MEDIUM',
          completed_at: new Date(Date.now() - 86400000).toISOString(),
          created_at: new Date(Date.now() - 172800000).toISOString(),
          author: { id: '2', name: '이엔지' },
        },
        {
          id: '3',
          title: '대시보드 UI 리팩토링',
          description: '컴포넌트 구조 개선 및 성능 최적화',
          status: 'DONE',
          priority: 'LOW',
          completed_at: new Date(Date.now() - 172800000).toISOString(),
          created_at: new Date(Date.now() - 259200000).toISOString(),
          author: { id: '3', name: '박프론트' },
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [currentStartup?.id])

  useEffect(() => {
    fetchCommits()
  }, [fetchCommits])

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      case 'MEDIUM':
        return <Zap className="w-4 h-4 text-yellow-400" />
      default:
        return <Info className="w-4 h-4 text-zinc-400" />
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '높음'
      case 'URGENT':
        return '긴급'
      case 'MEDIUM':
        return '보통'
      default:
        return '낮음'
    }
  }

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return 'bg-red-500/20 text-red-400'
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-zinc-700 text-zinc-400'
    }
  }

  const filteredCommits = commits.filter((commit) => {
    const matchesSearch =
      commit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commit.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority =
      filterPriority === 'all' || commit.priority === filterPriority

    return matchesSearch && matchesPriority
  })

  // Group commits by date
  const groupedCommits = filteredCommits.reduce((groups, commit) => {
    const date = new Date(commit.completed_at || commit.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(commit)
    return groups
  }, {} as Record<string, Task[]>)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-zinc-500">커밋 기록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // Convert Task[] to Commit[] for CommitTimeline
  const timelineCommits: Commit[] = commits.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    author: {
      id: task.author?.id || 'unknown',
      name: task.author?.name || '알 수 없음',
      avatar: task.author?.avatar_url,
    },
    timestamp: new Date(task.completed_at || task.created_at),
    impactLevel: (task.priority === 'HIGH' || task.priority === 'URGENT')
      ? 'high'
      : task.priority === 'MEDIUM'
        ? 'medium'
        : 'low',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">커밋 기록</h1>
          <p className="text-zinc-500 mt-1">팀의 모든 작업 기록을 확인하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="타임라인 뷰"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-white'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="리스트 뷰"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={openCommitModal} leftIcon={<Plus className="w-4 h-4" />}>
            새 커밋
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card variant="default">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="커밋 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-accent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus-accent"
              >
                <option value="all">모든 영향도</option>
                <option value="HIGH">높음</option>
                <option value="MEDIUM">보통</option>
                <option value="LOW">낮음</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commits View */}
      {filteredCommits.length === 0 ? (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <GitCommit className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">커밋이 없습니다</h3>
            <p className="text-zinc-500 mb-6">첫 번째 커밋을 기록해보세요</p>
            <Button onClick={openCommitModal} leftIcon={<Plus className="w-4 h-4" />}>
              커밋 작성하기
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'timeline' ? (
        /* Timeline View - New CommitTimeline Component */
        <CommitTimeline
          commits={timelineCommits}
          onCommitClick={(commit) => console.log('Commit clicked:', commit)}
        />
      ) : (
        /* List View - Original grouped list */
        <motion.div
          className="space-y-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {Object.entries(groupedCommits).map(([date, dateCommits]) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-medium text-zinc-400">{date}</h3>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600">{dateCommits.length}개의 커밋</span>
              </div>

              {/* Commits */}
              <div className="space-y-2 pl-7">
                {dateCommits.map((commit) => (
                  <motion.div
                    key={commit.id}
                    variants={item}
                    className="group"
                  >
                    <Card
                      variant="default"
                      className="hover:border-zinc-600 transition-colors cursor-pointer"
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <GitCommit className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-zinc-100 group-hover:text-accent transition-colors">
                                {commit.title}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getPriorityBadgeStyle(commit.priority)}`}>
                                {getPriorityIcon(commit.priority)}
                              </span>
                            </div>
                            {commit.description && (
                              <p className="text-sm text-zinc-500 line-clamp-1 mb-2">
                                {commit.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span className="font-medium text-zinc-400">
                                {commit.author?.name || '알 수 없음'}
                              </span>
                              <span>•</span>
                              <span>
                                {formatRelativeTime(commit.completed_at || commit.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

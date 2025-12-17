'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Search,
  Calendar,
  Clock,
  Filter,
  MessageSquare,
  FileText,
  Mail,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Milestone,
  Settings2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Sparkles,
  TrendingUp,
  BarChart3,
  Bot,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useThemeStore, accentColors } from '@/stores/themeStore'
import { MemoryTimeline } from '@/components/memory/MemoryTimeline'
import { MemorySearch } from '@/components/memory/MemorySearch'
import { MemoryDetailModal } from '@/components/memory/MemoryDetailModal'
import type { ImmutableMemoryRecord, MemoryEventType } from '@/types/memory'

interface MemoryStats {
  total: number
  byEventType: Record<MemoryEventType, number>
  byAgent: Record<string, number>
  today: number
  thisWeek: number
}

interface Agent {
  id: string
  name: string
  avatar_url?: string
}

interface TimelineGroup {
  date: string
  memories: ImmutableMemoryRecord[]
}

const eventTypeConfig: Record<MemoryEventType, { label: string; icon: React.ElementType; color: string }> = {
  conversation: { label: '대화', icon: MessageSquare, color: '#3b82f6' },
  task_created: { label: '태스크 생성', icon: FileText, color: '#22c55e' },
  task_completed: { label: '태스크 완료', icon: CheckCircle, color: '#10b981' },
  document_created: { label: '문서 생성', icon: FileText, color: '#8b5cf6' },
  document_updated: { label: '문서 수정', icon: FileText, color: '#a855f7' },
  email_sent: { label: '이메일 발신', icon: Mail, color: '#f59e0b' },
  email_received: { label: '이메일 수신', icon: Mail, color: '#eab308' },
  meeting: { label: '미팅', icon: Calendar, color: '#ec4899' },
  decision: { label: '결정', icon: Milestone, color: '#ef4444' },
  milestone: { label: '마일스톤', icon: TrendingUp, color: '#06b6d4' },
  insight: { label: '인사이트', icon: Lightbulb, color: '#f97316' },
  error: { label: '오류', icon: AlertCircle, color: '#dc2626' },
  system: { label: '시스템', icon: Settings2, color: '#64748b' },
  custom: { label: '커스텀', icon: Sparkles, color: '#8b5cf6' },
}

export default function MemoryPage() {
  const [mounted, setMounted] = useState(false)
  const [memories, setMemories] = useState<ImmutableMemoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const { accentColor } = useThemeStore()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEventTypes, setSelectedEventTypes] = useState<MemoryEventType[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({})
  const [naturalTimeQuery, setNaturalTimeQuery] = useState('')
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)

  // UI States
  const [showFilters, setShowFilters] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<ImmutableMemoryRecord | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchAgents()
    fetchMemories()
    fetchStats()
  }, [])

  // 에이전트 변경 시 메모리 다시 로드
  useEffect(() => {
    if (mounted) {
      fetchMemories()
    }
  }, [selectedAgent])

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        setAgents(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    }
  }

  const fetchMemories = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedEventTypes.length > 0) {
        params.append('event_types', selectedEventTypes.join(','))
      }
      if (selectedAgent) {
        params.append('owner_agent_id', selectedAgent)  // 에이전트별 독립 메모리
      }
      if (dateRange.start) {
        params.append('start_date', dateRange.start)
      }
      if (dateRange.end) {
        params.append('end_date', dateRange.end)
      }
      if (naturalTimeQuery) {
        params.append('natural_time', naturalTimeQuery)
      }
      params.append('limit', '100')

      const res = await fetch(`/api/memory?${params.toString()}`)
      if (!res.ok) throw new Error('메모리를 불러오는데 실패했습니다')

      const { data } = await res.json()
      setMemories(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/memory/timeline')
      if (res.ok) {
        const { data } = await res.json()
        if (data?.stats) {
          setStats(data.stats)
        }
      }
    } catch (err) {
      console.error('Stats fetch error:', err)
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      fetchMemories()
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 50 }),
      })
      if (!res.ok) throw new Error('검색 실패')

      const { data } = await res.json()
      setMemories(data?.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 오류')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchMemories(), fetchStats()])
    setIsRefreshing(false)
  }

  const currentAccent = accentColors.find((c) => c.id === accentColor) || accentColors[0]

  // Group memories by date
  const timelineGroups = useMemo(() => {
    const groups: TimelineGroup[] = []
    const groupMap = new Map<string, ImmutableMemoryRecord[]>()

    memories.forEach((memory) => {
      const date = new Date(memory.timestamp).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
      const existing = groupMap.get(date) || []
      existing.push(memory)
      groupMap.set(date, existing)
    })

    groupMap.forEach((memories, date) => {
      groups.push({ date, memories })
    })

    return groups
  }, [memories])

  // Filter memories by search query (client-side for quick filtering)
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return timelineGroups

    return timelineGroups.map((group) => ({
      ...group,
      memories: group.memories.filter(
        (m) =>
          m.raw_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.context?.category?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter((group) => group.memories.length > 0)
  }, [timelineGroups, searchQuery])

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: mounted ? `${currentAccent.color}30` : '#8b5cf630' }}
          />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-3xl bg-purple-500/20" />
        </div>

        <div className="relative px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              {/* Icon */}
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: mounted
                      ? `linear-gradient(135deg, ${currentAccent.color}, ${currentAccent.color}cc)`
                      : 'linear-gradient(135deg, #8b5cf6, #8b5cf6cc)',
                  }}
                >
                  <Brain className="w-8 h-8 text-white" />
                </div>
                {stats && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{stats.today}</span>
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  장기 메모리
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                  {stats ? `${stats.total}개의 기억` : '불변의 AI 기억 저장소'} • 모든 대화와 활동이 영구 보존됩니다
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Agent Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                    selectedAgent
                      ? 'border-transparent text-white'
                      : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  style={selectedAgent ? { backgroundColor: mounted ? currentAccent.color : '#8b5cf6' } : {}}
                >
                  <Bot className="w-4 h-4" />
                  {selectedAgent
                    ? agents.find((a) => a.id === selectedAgent)?.name || '에이전트'
                    : '전체 에이전트'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAgentDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {showAgentDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setSelectedAgent(null)
                          setShowAgentDropdown(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors ${
                          !selectedAgent ? 'bg-zinc-100 dark:bg-zinc-700' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-600 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white text-sm">전체 에이전트</p>
                          <p className="text-xs text-zinc-500">모든 메모리 보기</p>
                        </div>
                      </button>
                      <div className="border-t border-zinc-100 dark:border-zinc-700" />
                      {agents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            setSelectedAgent(agent.id)
                            setShowAgentDropdown(false)
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors ${
                            selectedAgent === agent.id ? 'bg-zinc-100 dark:bg-zinc-700' : ''
                          }`}
                        >
                          {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={agent.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: mounted ? currentAccent.color : '#8b5cf6' }}
                            >
                              {agent.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white text-sm">{agent.name}</p>
                            <p className="text-xs text-zinc-500">{agent.name}의 메모리</p>
                          </div>
                          {selectedAgent === agent.id && (
                            <CheckCircle className="w-4 h-4 ml-auto text-emerald-500" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-zinc-300 dark:border-zinc-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${currentAccent.color}20` }}
                  >
                    <BarChart3 className="w-5 h-5" style={{ color: currentAccent.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
                    <p className="text-xs text-zinc-500">전체 메모리</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20">
                    <Clock className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.today}</p>
                    <p className="text-xs text-zinc-500">오늘</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.thisWeek}</p>
                    <p className="text-xs text-zinc-500">이번 주</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/20">
                    <Bot className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {Object.keys(stats.byAgent || {}).length}
                    </p>
                    <p className="text-xs text-zinc-500">활성 에이전트</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="mt-6">
            <MemorySearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearch={handleSearch}
              naturalTimeQuery={naturalTimeQuery}
              onNaturalTimeChange={setNaturalTimeQuery}
              selectedEventTypes={selectedEventTypes}
              onEventTypesChange={setSelectedEventTypes}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              accentColor={currentAccent}
              mounted={mounted}
            />
          </div>

          {/* Event Type Pills */}
          {selectedEventTypes.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-xs text-zinc-500">필터:</span>
              {selectedEventTypes.map((type) => {
                const config = eventTypeConfig[type]
                const Icon = config.icon
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedEventTypes((prev) => prev.filter((t) => t !== type))}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: `${config.color}20`, color: config.color }}
                  >
                    <Icon className="w-3 h-3" />
                    {config.label}
                    <X className="w-3 h-3" />
                  </button>
                )
              })}
              <button
                onClick={() => setSelectedEventTypes([])}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                전체 해제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <Loader2 className="w-10 h-10 animate-spin text-zinc-300 dark:text-zinc-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              </div>
            </div>
            <p className="mt-4 text-zinc-500">메모리를 불러오는 중...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-zinc-500">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchMemories}>
              다시 시도
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && memories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
              style={{
                background: mounted
                  ? `linear-gradient(135deg, ${currentAccent.color}40, ${currentAccent.color}20)`
                  : 'linear-gradient(135deg, #8b5cf640, #8b5cf620)',
              }}
            >
              <Brain className="w-10 h-10" style={{ color: mounted ? currentAccent.color : '#8b5cf6' }} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              {searchQuery || selectedEventTypes.length > 0 ? '검색 결과가 없습니다' : '아직 기억이 없습니다'}
            </h3>
            <p className="mt-2 text-zinc-500 text-center max-w-md">
              {searchQuery || selectedEventTypes.length > 0
                ? '다른 검색어나 필터를 시도해보세요'
                : 'AI 에이전트와의 대화를 시작하면 여기에 기억이 저장됩니다'}
            </p>
          </div>
        )}

        {/* Timeline */}
        {!loading && !error && filteredGroups.length > 0 && (
          <MemoryTimeline
            groups={filteredGroups}
            onSelectMemory={setSelectedMemory}
            eventTypeConfig={eventTypeConfig}
            accentColor={currentAccent}
            mounted={mounted}
          />
        )}
      </div>

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDetailModal
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
            eventTypeConfig={eventTypeConfig}
            accentColor={currentAccent}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

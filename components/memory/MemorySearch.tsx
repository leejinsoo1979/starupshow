'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
  Mail,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Milestone,
  Settings2,
  TrendingUp,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react'
import type { MemoryEventType } from '@/types/memory'
import type { AccentColor } from '@/stores/themeStore'

interface MemorySearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearch: (query: string) => void
  naturalTimeQuery: string
  onNaturalTimeChange: (query: string) => void
  selectedEventTypes: MemoryEventType[]
  onEventTypesChange: (types: MemoryEventType[]) => void
  showFilters: boolean
  onToggleFilters: () => void
  accentColor: { id: AccentColor; name: string; color: string; hoverColor: string; rgb: string }
  mounted: boolean
}

const eventTypes: { type: MemoryEventType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'conversation', label: '대화', icon: MessageSquare, color: '#3b82f6' },
  { type: 'task_created', label: '태스크 생성', icon: FileText, color: '#22c55e' },
  { type: 'task_completed', label: '태스크 완료', icon: CheckCircle, color: '#10b981' },
  { type: 'document_created', label: '문서 생성', icon: FileText, color: '#8b5cf6' },
  { type: 'document_updated', label: '문서 수정', icon: FileText, color: '#a855f7' },
  { type: 'email_sent', label: '이메일 발신', icon: Mail, color: '#f59e0b' },
  { type: 'email_received', label: '이메일 수신', icon: Mail, color: '#eab308' },
  { type: 'meeting', label: '미팅', icon: Calendar, color: '#ec4899' },
  { type: 'decision', label: '결정', icon: Milestone, color: '#ef4444' },
  { type: 'milestone', label: '마일스톤', icon: TrendingUp, color: '#06b6d4' },
  { type: 'insight', label: '인사이트', icon: Lightbulb, color: '#f97316' },
  { type: 'error', label: '오류', icon: AlertCircle, color: '#dc2626' },
  { type: 'system', label: '시스템', icon: Settings2, color: '#64748b' },
  { type: 'custom', label: '커스텀', icon: Sparkles, color: '#8b5cf6' },
]

const quickTimeFilters = [
  { label: '오늘', value: '오늘' },
  { label: '어제', value: '어제' },
  { label: '이번 주', value: '이번주' },
  { label: '지난 주', value: '지난주' },
  { label: '이번 달', value: '이번달' },
  { label: '지난 달', value: '지난달' },
]

export function MemorySearch({
  searchQuery,
  onSearchChange,
  onSearch,
  naturalTimeQuery,
  onNaturalTimeChange,
  selectedEventTypes,
  onEventTypesChange,
  showFilters,
  onToggleFilters,
  accentColor,
  mounted,
}: MemorySearchProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchQuery)
    }
  }

  const toggleEventType = (type: MemoryEventType) => {
    if (selectedEventTypes.includes(type)) {
      onEventTypesChange(selectedEventTypes.filter((t) => t !== type))
    } else {
      onEventTypesChange([...selectedEventTypes, type])
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div
          className={`relative flex-1 transition-all ${
            isSearchFocused ? 'rounded-xl' : ''
          }`}
          style={isSearchFocused ? { boxShadow: `0 0 0 2px ${mounted ? accentColor.color : '#8b5cf6'}` } : {}}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="메모리 검색... (시맨틱 검색 지원)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Natural Time Query */}
        <div className="relative w-48">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="예: 어제, 지난주"
            value={naturalTimeQuery}
            onChange={(e) => onNaturalTimeChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none transition-all"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
            showFilters || selectedEventTypes.length > 0
              ? 'border-transparent text-white'
              : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
          style={
            showFilters || selectedEventTypes.length > 0
              ? { backgroundColor: mounted ? accentColor.color : '#8b5cf6' }
              : {}
          }
        >
          <Filter className="w-4 h-4" />
          필터
          {selectedEventTypes.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
              {selectedEventTypes.length}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Quick Time Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500 mr-2">빠른 시간 필터:</span>
        {quickTimeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onNaturalTimeChange(naturalTimeQuery === filter.value ? '' : filter.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              naturalTimeQuery === filter.value
                ? 'text-white shadow-md'
                : 'bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            style={
              naturalTimeQuery === filter.value
                ? { backgroundColor: mounted ? accentColor.color : '#8b5cf6' }
                : {}
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">이벤트 유형</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {eventTypes.map(({ type, label, icon: Icon, color }) => {
                  const isSelected = selectedEventTypes.includes(type)
                  return (
                    <button
                      key={type}
                      onClick={() => toggleEventType(type)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                        isSelected
                          ? ''
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                      style={{
                        backgroundColor: isSelected ? `${color}15` : undefined,
                        boxShadow: isSelected ? `0 0 0 2px ${color}` : undefined,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isSelected ? '' : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                        style={{ color: isSelected ? color : undefined }}
                      >
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {selectedEventTypes.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => onEventTypesChange([])}
                    className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

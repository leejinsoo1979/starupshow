'use client'

import { useState } from 'react'
import { useMyNeuronsStore } from '@/lib/my-neurons/store'
import { NODE_COLORS, STATUS_COLORS, NODE_ICONS } from '@/lib/my-neurons/constants'
import type { MyNeuronType, NeuronStatus } from '@/lib/my-neurons/types'
import { cn } from '@/lib/utils'
import {
  Filter,
  X,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Home,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NODE_TYPE_OPTIONS: { type: MyNeuronType; label: string }[] = [
  { type: 'project', label: '프로젝트' },
  { type: 'task', label: '할 일' },
  { type: 'doc', label: '문서' },
  { type: 'person', label: '팀원' },
  { type: 'agent', label: '에이전트' },
  { type: 'objective', label: '목표' },
  { type: 'key_result', label: '핵심 결과' },
  { type: 'program', label: '정부지원' },
  { type: 'application', label: '지원서' },
  { type: 'milestone', label: '마일스톤' },
  { type: 'budget', label: '예산' },
]

const STATUS_OPTIONS: { status: NeuronStatus; label: string }[] = [
  { status: 'active', label: '진행 중' },
  { status: 'blocked', label: '막힘' },
  { status: 'urgent', label: '긴급' },
  { status: 'waiting', label: '대기' },
  { status: 'completed', label: '완료' },
  { status: 'attention', label: '주의' },
]

interface FilterToolbarProps {
  onRefresh?: () => void
  isLoading?: boolean
}

export function FilterToolbar({ onRefresh, isLoading }: FilterToolbarProps) {
  const filterByType = useMyNeuronsStore((s) => s.filterByType)
  const filterByStatus = useMyNeuronsStore((s) => s.filterByStatus)
  const showBottlenecksOnly = useMyNeuronsStore((s) => s.showBottlenecksOnly)
  const graph = useMyNeuronsStore((s) => s.graph)

  const setFilterByType = useMyNeuronsStore((s) => s.setFilterByType)
  const setFilterByStatus = useMyNeuronsStore((s) => s.setFilterByStatus)
  const setShowBottlenecksOnly = useMyNeuronsStore((s) => s.setShowBottlenecksOnly)
  const focusOnSelf = useMyNeuronsStore((s) => s.focusOnSelf)

  const hasFilters =
    filterByType.length > 0 || filterByStatus.length > 0 || showBottlenecksOnly

  const clearAllFilters = () => {
    setFilterByType([])
    setFilterByStatus([])
    setShowBottlenecksOnly(false)
  }

  const toggleTypeFilter = (type: MyNeuronType) => {
    if (filterByType.includes(type)) {
      setFilterByType(filterByType.filter((t) => t !== type))
    } else {
      setFilterByType([...filterByType, type])
    }
  }

  const toggleStatusFilter = (status: NeuronStatus) => {
    if (filterByStatus.includes(status)) {
      setFilterByStatus(filterByStatus.filter((s) => s !== status))
    } else {
      setFilterByStatus([...filterByStatus, status])
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur border-b border-zinc-800">
      {/* Home / Focus Self */}
      <button
        onClick={focusOnSelf}
        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        title="나에게 포커스"
      >
        <Home className="w-4 h-4 text-zinc-400" />
      </button>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          'p-2 rounded-lg hover:bg-zinc-800 transition-colors',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
        title="새로고침"
      >
        <RefreshCw
          className={cn('w-4 h-4 text-zinc-400', isLoading && 'animate-spin')}
        />
      </button>

      <div className="w-px h-5 bg-zinc-700" />

      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
              filterByType.length > 0
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            타입
            {filterByType.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px]">
                {filterByType.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-48 bg-zinc-900 border-zinc-700"
        >
          <DropdownMenuLabel className="text-zinc-400 text-xs">
            노드 타입
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-700" />
          {NODE_TYPE_OPTIONS.map(({ type, label }) => (
            <DropdownMenuCheckboxItem
              key={type}
              checked={filterByType.includes(type)}
              onCheckedChange={() => toggleTypeFilter(type)}
              className="text-zinc-300 text-xs focus:bg-zinc-800 focus:text-zinc-100"
            >
              <span
                className="w-4 h-4 rounded-full mr-2 flex items-center justify-center text-[10px]"
                style={{ backgroundColor: NODE_COLORS[type] + '40' }}
              >
                {NODE_ICONS[type]}
              </span>
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
              filterByStatus.length > 0
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            상태
            {filterByStatus.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-[10px]">
                {filterByStatus.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-40 bg-zinc-900 border-zinc-700"
        >
          <DropdownMenuLabel className="text-zinc-400 text-xs">
            상태
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-700" />
          {STATUS_OPTIONS.map(({ status, label }) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filterByStatus.includes(status)}
              onCheckedChange={() => toggleStatusFilter(status)}
              className="text-zinc-300 text-xs focus:bg-zinc-800 focus:text-zinc-100"
            >
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bottleneck Toggle */}
      <button
        onClick={() => setShowBottlenecksOnly(!showBottlenecksOnly)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
          showBottlenecksOnly
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        병목만
      </button>

      {/* Clear Filters */}
      {hasFilters && (
        <>
          <div className="w-px h-5 bg-zinc-700" />
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            초기화
          </button>
        </>
      )}

      {/* Stats */}
      <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
        <span>{graph?.stats?.totalNodes || 0} 노드</span>
        <span>{graph?.stats?.totalEdges || 0} 연결</span>
        {(graph?.stats?.blockedTasks || 0) > 0 && (
          <span className="text-red-400">
            {graph?.stats?.blockedTasks} 막힘
          </span>
        )}
        {(graph?.stats?.urgentItems || 0) > 0 && (
          <span className="text-amber-400">
            {graph?.stats?.urgentItems} 긴급
          </span>
        )}
      </div>
    </div>
  )
}

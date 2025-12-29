'use client'

import React from 'react'
import { LucideIcon, Plus, Download, Upload, Filter } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  // Common action buttons
  onAdd?: () => void
  addLabel?: string
  onExport?: () => void
  onImport?: () => void
  onFilter?: () => void
  filterActive?: boolean
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  onAdd,
  addLabel = '추가',
  onExport,
  onImport,
  onFilter,
  filterActive,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Icon className="w-5 h-5 text-purple-500" />
          </div>
        )}
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onFilter && (
          <button
            onClick={onFilter}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${filterActive ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          >
            <Filter className="w-4 h-4" />
            필터
          </button>
        )}
        {onImport && (
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            가져오기
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            내보내기
          </button>
        )}
        {actions}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  )
}

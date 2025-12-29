'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus, Search, Filter, Download, Settings } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface GenericPageProps {
  title: string
  description: string
  icon?: LucideIcon
  backHref?: string
  showAddButton?: boolean
  addButtonLabel?: string
  children?: React.ReactNode
}

export function GenericPage({
  title,
  description,
  icon: Icon,
  backHref = '/dashboard-group/erp',
  showAddButton = true,
  addButtonLabel = '추가',
  children
}: GenericPageProps) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(backHref)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn('p-2 rounded-lg', isDark ? 'bg-accent/20' : 'bg-accent/10')}>
                <Icon className="w-5 h-5 text-accent" />
              </div>
            )}
            <div>
              <h1 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                {title}
              </h1>
              <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                {description}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showAddButton && (
            <button className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-accent text-white hover:bg-accent/90'
            )}>
              <Plus className="w-4 h-4" />
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* 검색 및 필터 바 */}
      <div className={cn(
        'flex items-center gap-4 p-4 rounded-xl border',
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      )}>
        <div className="flex-1 relative">
          <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          <input
            type="text"
            placeholder="검색..."
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border text-sm',
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-accent'
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-accent'
            )}
          />
        </div>
        <button className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
          isDark
            ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
        )}>
          <Filter className="w-4 h-4" />
          필터
        </button>
        <button className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
          isDark
            ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
        )}>
          <Download className="w-4 h-4" />
          내보내기
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      {children || (
        <div className={cn(
          'rounded-xl border p-8 text-center',
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        )}>
          <div className={cn(
            'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            {Icon ? <Icon className="w-8 h-8 text-accent" /> : <Settings className="w-8 h-8 text-accent" />}
          </div>
          <h3 className={cn('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-zinc-900')}>
            {title}
          </h3>
          <p className={cn('text-sm mb-4', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            아직 등록된 데이터가 없습니다.
          </p>
          <button className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            'bg-accent text-white hover:bg-accent/90'
          )}>
            <Plus className="w-4 h-4" />
            첫 {title} 등록하기
          </button>
        </div>
      )}
    </div>
  )
}

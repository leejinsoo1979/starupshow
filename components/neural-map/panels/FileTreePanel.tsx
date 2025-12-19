'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useNeuralMapStore } from '@/lib/neural-map/store'
import type { NeuralFile } from '@/lib/neural-map/types'
import {
  Search,
  FolderOpen,
  Folder,
  FileText,
  Image,
  Film,
  FileCode,
  Upload,
  ChevronRight,
  ChevronDown,
  Clock,
  Plus,
  File,
} from 'lucide-react'

// 파일 타입별 아이콘
function FileIcon({ type }: { type: string }) {
  switch (type) {
    case 'pdf':
      return <FileText className="w-4 h-4 text-red-400" />
    case 'image':
      return <Image className="w-4 h-4 text-emerald-400" />
    case 'video':
      return <Film className="w-4 h-4 text-purple-400" />
    case 'markdown':
      return <FileCode className="w-4 h-4 text-blue-400" />
    default:
      return <File className="w-4 h-4 text-zinc-400" />
  }
}

// 파일 그룹 (타입별 분류)
interface FileGroup {
  type: string
  label: string
  icon: React.ReactNode
  files: NeuralFile[]
}

export function FileTreePanel() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['pdf', 'image']))

  // Store에서 파일 목록 가져오기
  const files = useNeuralMapStore((s) => s.files)
  const currentTheme = useNeuralMapStore((s) => s.currentTheme)

  // 파일을 타입별로 그룹화
  const fileGroups: FileGroup[] = [
    {
      type: 'pdf',
      label: '문서',
      icon: <FileText className="w-4 h-4" />,
      files: files.filter((f) => f.type === 'pdf'),
    },
    {
      type: 'image',
      label: '이미지',
      icon: <Image className="w-4 h-4" />,
      files: files.filter((f) => f.type === 'image'),
    },
    {
      type: 'video',
      label: '비디오',
      icon: <Film className="w-4 h-4" />,
      files: files.filter((f) => f.type === 'video'),
    },
    {
      type: 'markdown',
      label: '마크다운',
      icon: <FileCode className="w-4 h-4" />,
      files: files.filter((f) => f.type === 'markdown'),
    },
  ].filter((group) => group.files.length > 0)

  // 검색 필터링
  const filteredGroups = searchQuery
    ? fileGroups.map((group) => ({
        ...group,
        files: group.files.filter((f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((group) => group.files.length > 0)
    : fileGroups

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // 테마 색상 사용
  const accentColor = currentTheme?.ui?.accentColor || '#3B82F6'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={cn('p-3 border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={cn('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            파일 트리
          </h2>
          <button
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="새 폴더"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          />
          <input
            type="text"
            placeholder="파일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors',
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-600'
                : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300'
            )}
          />
        </div>
      </div>

      {/* File Groups */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredGroups.length === 0 ? (
          <div className={cn('text-center py-8', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">파일이 없습니다</p>
            <p className="text-xs mt-1">파일을 업로드해주세요</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.type}>
              <button
                onClick={() => toggleGroup(group.type)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-sm',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
                )}
              >
                {expandedGroups.has(group.type) ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                {expandedGroups.has(group.type) ? (
                  <FolderOpen className="w-4 h-4" style={{ color: accentColor }} />
                ) : (
                  <Folder className="w-4 h-4" style={{ color: accentColor }} />
                )}
                <span className="flex-1 text-left truncate">{group.label}</span>
                <span className={cn('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                  {group.files.length}
                </span>
              </button>
              <AnimatePresence>
                {expandedGroups.has(group.type) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    {group.files.map((file) => (
                      <button
                        key={file.id}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-sm ml-4',
                          isDark
                            ? 'hover:bg-zinc-800 text-zinc-400'
                            : 'hover:bg-zinc-100 text-zinc-600'
                        )}
                      >
                        <FileIcon type={file.type} />
                        <span className="flex-1 text-left truncate">{file.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Recent Files */}
      <div className={cn('p-3 border-t', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <span className={cn('text-xs font-medium', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
            최근 사용
          </span>
        </div>
        <div className="space-y-1">
          {files.slice(0, 3).map((file) => (
            <button
              key={file.id}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-sm',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-600'
              )}
            >
              <FileIcon type={file.type} />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
          {files.length === 0 && (
            <p className={cn('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
              최근 사용 파일 없음
            </p>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <div className={cn('p-3 border-t', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        <button
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25'
          )}
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          }}
        >
          <Upload className="w-4 h-4" />
          <span>파일 업로드</span>
        </button>
      </div>
    </div>
  )
}

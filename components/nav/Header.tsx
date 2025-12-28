'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useNeuralMapStore } from '@/lib/neural-map/store'
import { createClient } from '@/lib/supabase/client'
import { getInitials, cn } from '@/lib/utils'
import { ThemeDropdown } from './ThemeDropdown'
import {
  Bell,
  Search,
  Plus,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Command,
  Bot,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  Folder,
} from 'lucide-react'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { openCommitModal, sidebarOpen, agentSidebarOpen, toggleAgentSidebar } = useUIStore()
  const { user, logout: clearAuth } = useAuthStore()
  const { resolvedTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)

  // Neural Map store for search
  const files = useNeuralMapStore((s) => s.files)
  const graph = useNeuralMapStore((s) => s.graph)
  const searchQuery = useNeuralMapStore((s) => s.searchQuery)
  const setSearchQuery = useNeuralMapStore((s) => s.setSearchQuery)
  const setFocusNodeId = useNeuralMapStore((s) => s.setFocusNodeId)
  const openCodePreview = useNeuralMapStore((s) => s.openCodePreview)

  // 검색 결과
  const suggestions = useMemo(() => {
    const query = searchQuery?.toLowerCase().trim() || ''
    console.log('[Header Search] query:', query, 'files:', files.length, 'nodes:', graph?.nodes?.length)
    if (!query || query.length < 1) return []

    const results: { type: 'file' | 'node'; name: string; path?: string; id: string; item: any }[] = []

    files.forEach(f => {
      if (f.name.toLowerCase().includes(query) || f.path?.toLowerCase().includes(query)) {
        results.push({ type: 'file', name: f.name, path: f.path, id: f.id, item: f })
      }
    })

    graph?.nodes?.forEach(n => {
      if (n.title.toLowerCase().includes(query) || n.id.toLowerCase().includes(query)) {
        if (!results.some(r => r.id === n.id)) {
          results.push({ type: 'node', name: n.title, id: n.id, item: n })
        }
      }
    })

    console.log('[Header Search] results:', results.length)
    return results.slice(0, 10)
  }, [searchQuery, files, graph?.nodes])

  // 자동완성 표시
  useEffect(() => {
    setShowAutocomplete(suggestions.length > 0 && searchQuery.length > 0 && searchFocused)
    setSelectedIndex(0)
  }, [suggestions.length, searchQuery.length, searchFocused])

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectSuggestion = (suggestion: typeof suggestions[0]) => {
    if (suggestion.type === 'file') {
      openCodePreview(suggestion.item)
    } else {
      setFocusNodeId(suggestion.id)
    }
    setShowAutocomplete(false)
    setSearchQuery('')
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelectSuggestion(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
    }
  }

  useEffect(() => {
    const checkElectron = () => {
      const isEl = typeof window !== 'undefined' &&
        (!!(window as any).electron ||
          navigator.userAgent.toLowerCase().includes('electron') ||
          (window as any).process?.versions?.electron);
      setIsElectron(isEl)
    }
    checkElectron()
  }, [])

  if (isElectron) return null

  // resolvedTheme이 undefined일 때(SSR) dark로 기본값
  const isDark = resolvedTheme === 'dark' || resolvedTheme === undefined

  // Calculate header left position based on sidebar state and email page
  const isEmailPage = pathname?.includes('/email')
  // 이메일 페이지: Level1(64px) + FolderMenu(256px) = 320px - 폴더 메뉴는 자체 헤더 사용
  const headerLeft = sidebarOpen ? (isEmailPage ? 320 : 304) : 64

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearAuth()
    router.push('/auth-group/login')
  }

  return (
    <header
      className={`fixed top-0 right-0 z-40 h-16 backdrop-blur-xl transition-all duration-300 ${isDark
        ? 'bg-zinc-900/80 border-b border-zinc-800'
        : 'bg-white/80 border-b border-zinc-200'
        }`}
      style={{ left: sidebarOpen ? 304 : 64, top: 'var(--title-bar-height, 0px)', WebkitAppRegion: 'drag' } as any}
    >
      <div className="h-full px-6 flex items-center justify-end gap-3 w-fit ml-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Search - 에이전트 빌더 옆 */}
        <div className="w-72" ref={searchRef}>
          <motion.div
            className={`relative transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}
          >
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10 ${searchFocused ? 'text-accent' : 'text-theme-muted'}`} />
            <input
              type="text"
              placeholder="파일/노드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={`w-full h-9 pl-9 pr-16 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all ${isDark
                ? 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500'
                : 'bg-zinc-100 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                }`}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            />
            <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-200'
              }`}>
              <Command className="w-3 h-3 text-theme-muted" />
              <span className="text-xs text-theme-muted font-medium">K</span>
            </div>

            {/* 자동완성 드롭다운 */}
            <AnimatePresence>
              {showAutocomplete && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    'absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto',
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                  )}
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                        index === selectedIndex
                          ? isDark ? 'bg-zinc-700 text-white' : 'bg-blue-50 text-blue-900'
                          : isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                      )}
                    >
                      {suggestion.type === 'file' ? (
                        <FileText className="w-4 h-4 flex-shrink-0 text-blue-500" />
                      ) : (
                        <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{suggestion.name}</div>
                        {suggestion.path && (
                          <div className={cn('truncate text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                            {suggestion.path}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Agent Builder Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => router.push('/agent-builder')}
            size="sm"
            variant="outline"
            leftIcon={<Bot className="w-4 h-4" />}
          >
            에이전트 빌더
          </Button>
        </motion.div>

        {/* Quick Commit Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={openCommitModal}
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-lg shadow-accent/20"
          >
            커밋
          </Button>
        </motion.div>

        {/* Theme Toggle */}
        <ThemeDropdown />

        {/* Notifications */}
        <motion.button
          className={`relative p-2.5 rounded-xl transition-colors ${isDark
            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
            : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
            }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-5 h-5" />
          <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger-500 rounded-full border-2 ${isDark ? 'border-zinc-900' : 'border-white'
            }`} />
        </motion.button>

        {/* User Menu */}
        <div className="relative">
          <motion.button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
              }`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/25">
              <span className="text-sm font-bold text-white">
                {user?.name ? getInitials(user.name) : 'U'}
              </span>
            </div>
            <motion.div
              animate={{ rotate: showUserMenu ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-theme-muted" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <motion.div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                <motion.div
                  className={`absolute right-0 mt-2 w-64 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-50 overflow-hidden ${isDark
                    ? 'bg-zinc-900/95 border border-zinc-700/50'
                    : 'bg-white/95 border border-zinc-200'
                    }`}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* User Info */}
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/25">
                        <span className="text-lg font-bold text-white">
                          {user?.name ? getInitials(user.name) : 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-theme">
                          {user?.name || '사용자'}
                        </p>
                        <p className="text-xs text-theme-muted">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/dashboard-group/profile')
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark
                        ? 'text-zinc-300 hover:bg-zinc-800'
                        : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                    >
                      <User className="w-4 h-4 text-theme-muted" />
                      프로필
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/dashboard-group/settings')
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark
                        ? 'text-zinc-300 hover:bg-zinc-800'
                        : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                    >
                      <Settings className="w-4 h-4 text-theme-muted" />
                      설정
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/dashboard-group/conversations')
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark
                        ? 'text-zinc-300 hover:bg-zinc-800'
                        : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                    >
                      <MessageSquare className="w-4 h-4 text-theme-muted" />
                      대화목록
                    </button>
                  </div>

                  {/* Logout */}
                  <div className={`border-t pt-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-400 hover:bg-danger-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={toggleAgentSidebar}
          className={`p-2.5 rounded-xl transition-colors ${isDark
            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
            : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
            }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={agentSidebarOpen ? 'AI 어시스턴트 닫기' : 'AI 어시스턴트 열기'}
        >
          {agentSidebarOpen ? (
            <PanelRightClose className="w-5 h-5" />
          ) : (
            <PanelRightOpen className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </header>
  )
}

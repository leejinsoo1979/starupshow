'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, Plus, Building2 } from 'lucide-react'
import type { NestedMenuItem, Category } from './types'

// 중첩 메뉴 아이템 컴포넌트 (재귀)
export function NestedMenuItemComponent({
  item,
  depth = 0,
  isDark,
  pathname,
  expandedItems,
  toggleExpand
}: {
  item: NestedMenuItem
  depth?: number
  isDark: boolean
  pathname: string
  expandedItems: Set<string>
  toggleExpand: (name: string) => void
}) {
  const router = useRouter()
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.name)
  const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))
  const IconComponent = item.icon

  const paddingLeft = 12 + depth * 12

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => toggleExpand(item.name)}
          className={cn(
            'w-full flex items-center gap-2 py-1.5 text-xs font-medium transition-all duration-200 rounded-md',
            depth === 0
              ? (isDark ? 'text-zinc-300 font-semibold' : 'text-zinc-700 font-semibold')
              : (isDark ? 'text-zinc-400' : 'text-zinc-600'),
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'
          )}
          style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '8px' }}
        >
          {IconComponent && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />}
          <span className="flex-1 text-left truncate">{item.name}</span>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )}
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {item.children!.map((child) => (
                <NestedMenuItemComponent
                  key={child.name}
                  item={child}
                  depth={depth + 1}
                  isDark={isDark}
                  pathname={pathname}
                  expandedItems={expandedItems}
                  toggleExpand={toggleExpand}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // 링크 아이템
  return (
    <button
      onClick={() => {
        if (item.href && item.href !== '#') {
          router.push(item.href)
        }
      }}
      className={cn(
        'w-full flex items-center gap-2 py-1.5 text-xs transition-all duration-200 rounded-md text-left',
        isActive
          ? 'bg-accent text-white font-medium'
          : isDark
            ? 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      )}
      style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '8px' }}
    >
      {IconComponent && <IconComponent className="w-3 h-3 flex-shrink-0" />}
      <span className="truncate">{item.name}</span>
    </button>
  )
}

// 상위 메뉴 카드 컴포넌트 (2열 그리드용)
interface TopLevelCardMenuProps {
  item: NestedMenuItem
  isDark: boolean
  isExpanded: boolean
  onToggle: () => void
  accentColor: string
}

export function TopLevelCardMenu({
  item,
  isDark,
  isExpanded,
  onToggle,
  accentColor
}: TopLevelCardMenuProps) {
  const router = useRouter()
  const IconComponent = item.icon

  const handleClick = () => {
    const targetHref = item.href || (item.children && item.children.length > 0 ? item.children[0].href : null)
    onToggle()
    if (targetHref) {
      router.push(targetHref)
    }
  }

  // 테마 색상 클래스
  const getThemeClasses = () => {
    const colors: Record<string, any> = {
      purple: {
        border: 'hover:border-purple-500',
        text: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
        bg: 'hover:bg-purple-50 dark:hover:bg-purple-900/10',
        iconBg: 'group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20',
      },
      green: {
        border: 'hover:border-green-500',
        text: 'group-hover:text-green-600 dark:group-hover:text-green-400',
        bg: 'hover:bg-green-50 dark:hover:bg-green-900/10',
        iconBg: 'group-hover:bg-green-100 dark:group-hover:bg-green-500/20',
      },
      orange: {
        border: 'hover:border-orange-500',
        text: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
        bg: 'hover:bg-orange-50 dark:hover:bg-orange-900/10',
        iconBg: 'group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20',
      },
      pink: {
        border: 'hover:border-pink-500',
        text: 'group-hover:text-pink-600 dark:group-hover:text-pink-400',
        bg: 'hover:bg-pink-50 dark:hover:bg-pink-900/10',
        iconBg: 'group-hover:bg-pink-100 dark:group-hover:bg-pink-500/20',
      },
      red: {
        border: 'hover:border-red-500',
        text: 'group-hover:text-red-600 dark:group-hover:text-red-400',
        bg: 'hover:bg-red-50 dark:hover:bg-red-900/10',
        iconBg: 'group-hover:bg-red-100 dark:group-hover:bg-red-500/20',
      },
      yellow: {
        border: 'hover:border-yellow-500',
        text: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-400',
        bg: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/10',
        iconBg: 'group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20',
      },
      cyan: {
        border: 'hover:border-cyan-500',
        text: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
        bg: 'hover:bg-cyan-50 dark:hover:bg-cyan-900/10',
        iconBg: 'group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/20',
      },
      blue: {
        border: 'hover:border-blue-500',
        text: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        bg: 'hover:bg-blue-50 dark:hover:bg-blue-900/10',
        iconBg: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20',
      },
    }
    return colors[accentColor] || colors.blue
  }

  const theme = getThemeClasses()

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group w-full flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200',
        isDark
          ? 'bg-zinc-800/50 border-zinc-700'
          : 'bg-zinc-50 border-zinc-200',
        theme.border,
        theme.bg
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
        isDark ? 'bg-zinc-700/50' : 'bg-zinc-200/50',
        theme.iconBg
      )}>
        {IconComponent && <IconComponent className={cn(
          'w-4 h-4 transition-colors',
          isDark ? 'text-zinc-400' : 'text-zinc-500',
          theme.text
        )} />}
      </div>
      <span className={cn(
        'text-xs font-medium text-center truncate w-full transition-colors',
        isDark ? 'text-zinc-300' : 'text-zinc-700',
        theme.text
      )}>
        {item.name}
      </span>
    </button>
  )
}

// 서브메뉴 패널 Props
interface SubMenuPanelProps {
  isDark: boolean
  isDashboardRoot: boolean
  currentCategory: string
  activeItems: NestedMenuItem[]
  navCategories: Category[]
  isCompanyMenu: boolean
  selectedCompanyMenu: string | null
  setSelectedCompanyMenu: (menu: string | null) => void
  expandedItems: Set<string>
  toggleExpand: (name: string) => void
  pathname: string
  currentTeam: { name: string; industry?: string } | null
  isVC: boolean
  accentColor: string
  onTeamCreateClick: () => void
  onWorkCreateClick: () => void
}

export function SubMenuPanel({
  isDark,
  isDashboardRoot,
  currentCategory,
  activeItems,
  navCategories,
  isCompanyMenu,
  selectedCompanyMenu,
  setSelectedCompanyMenu,
  expandedItems,
  toggleExpand,
  pathname,
  currentTeam,
  isVC,
  accentColor,
  onTeamCreateClick,
  onWorkCreateClick,
}: SubMenuPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'h-full border-r overflow-hidden bg-white dark:bg-zinc-950',
        isDashboardRoot
          ? (isDark ? 'border-white/10' : 'border-zinc-200/50')
          : isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}
    >
      <div className="h-full flex flex-col" style={{ width: 240 }}>
        {/* Category Header */}
        <div className={cn(
          'h-16 flex items-center px-4 border-b flex-shrink-0',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          {currentCategory === 'apps' ? (
            <div className="flex items-center gap-2 w-full">
              <h2 className={cn(
                'text-lg font-bold',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}>
                Apps
              </h2>
            </div>
          ) : pathname.startsWith('/dashboard-group/works') ? (
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => router.push('/dashboard-group')}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                )}
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <h2 className={cn(
                'text-lg font-bold',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}>
                Works
              </h2>
            </div>
          ) : (
            <h2 className={cn(
              'text-sm font-semibold',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}>
              {navCategories.find(c => c.id === currentCategory)?.name}
            </h2>
          )}
        </div>

        {/* Team Info (for non-VC users) */}
        {!isVC && currentTeam && !isCompanyMenu && (
          <div className={cn(
            'px-3 py-3 border-b flex-shrink-0',
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          )}>
            <div className={cn(
              'flex items-center gap-2 p-2 rounded-lg',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
            )}>
              <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-xs font-medium truncate',
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                )}>
                  {currentTeam.name}
                </p>
                <p className={cn(
                  'text-[10px] truncate',
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                )}>
                  {currentTeam.industry || '스타트업'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Work Create Button */}
        {pathname.startsWith('/dashboard-group/works') && (
          <div className="px-3 py-3 flex-shrink-0">
            <button
              onClick={onWorkCreateClick}
              className="w-full py-2.5 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>페이지 생성</span>
            </button>
          </div>
        )}

        {/* Sub Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {isCompanyMenu ? (
            // 회사 메뉴 - 드릴다운 네비게이션
            <AnimatePresence mode="wait">
              {selectedCompanyMenu === null ? (
                // 메인 카드 그리드 뷰
                <motion.div
                  key="card-grid"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {activeItems.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <TopLevelCardMenu
                        item={item}
                        isDark={isDark}
                        isExpanded={false}
                        onToggle={() => setSelectedCompanyMenu(item.name)}
                        accentColor={accentColor}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                // 선택된 메뉴의 하위 메뉴 뷰
                <motion.div
                  key={`submenu-${selectedCompanyMenu}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* 뒤로가기 버튼 */}
                  <button
                    onClick={() => {
                      setSelectedCompanyMenu(null)
                      router.push('/dashboard-group/company')
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-2 mb-3 rounded-lg text-sm font-medium transition-colors',
                      isDark
                        ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    )}
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>전체 메뉴</span>
                  </button>

                  {/* 현재 메뉴 타이틀 */}
                  {(() => {
                    const selectedItem = activeItems.find(item => item.name === selectedCompanyMenu)
                    const IconComponent = selectedItem?.icon
                    return (
                      <div className={cn(
                        'flex items-center gap-2 px-2 py-2 mb-2 rounded-lg',
                        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                      )}>
                        {IconComponent && (
                          <IconComponent className={cn(
                            'w-4 h-4',
                            isDark ? 'text-zinc-300' : 'text-zinc-700'
                          )} />
                        )}
                        <span className={cn(
                          'text-sm font-semibold',
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        )}>
                          {selectedCompanyMenu}
                        </span>
                      </div>
                    )
                  })()}

                  {/* 하위 메뉴 목록 */}
                  <div className="space-y-0.5">
                    {activeItems
                      .find(item => item.name === selectedCompanyMenu)
                      ?.children?.map((child) => (
                        <NestedMenuItemComponent
                          key={child.name}
                          item={child}
                          depth={0}
                          isDark={isDark}
                          pathname={pathname}
                          expandedItems={expandedItems}
                          toggleExpand={toggleExpand}
                        />
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            // 일반 메뉴 - 중첩 메뉴 지원
            activeItems.map((item, index) => {
              const hasChildren = item.children && item.children.length > 0
              const isMessengerFreeChat = item.href === '/dashboard-group/messenger' && item.name === '자유채팅'
              const messengerMode = searchParams.get('mode')
              const isActive = item.href && (
                isMessengerFreeChat
                  ? pathname === item.href && !messengerMode
                  : (pathname === item.href || pathname.startsWith(item.href + '?'))
              )
              const IconComponent = item.icon
              const isExpanded = expandedItems.has(item.name)

              if (hasChildren) {
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                        isDark
                          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                      )}
                    >
                      {IconComponent && (
                        <IconComponent className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden pl-4 space-y-0.5"
                        >
                          {item.children!.map((child) => {
                            let childActive = false
                            if (child.href) {
                              const childUrl = new URL(child.href, 'http://localhost')
                              const childPath = childUrl.pathname
                              const childMode = childUrl.searchParams.get('mode')
                              const childStatus = childUrl.searchParams.get('status')
                              const currentMode = searchParams.get('mode')
                              const currentStatus = searchParams.get('status')

                              if (pathname === childPath) {
                                if (childMode || childStatus) {
                                  childActive = childMode === currentMode && childStatus === currentStatus
                                } else {
                                  childActive = !currentMode && !currentStatus
                                }
                              }
                            }
                            const ChildIcon = child.icon
                            return (
                              <button
                                key={child.name}
                                onClick={() => {
                                  if (child.href && child.href !== '#') {
                                    router.push(child.href)
                                  }
                                }}
                                className={cn(
                                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left',
                                  childActive
                                    ? 'bg-accent text-white'
                                    : isDark
                                      ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                                )}
                              >
                                {ChildIcon && (
                                  <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                )}
                                <span>{child.name}</span>
                              </button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              }

              // Handle "팀 생성" special case
              if (item.href === '#create-team') {
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={onTeamCreateClick}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-2 border-dashed',
                        isDark
                          ? 'border-zinc-700 text-zinc-400 hover:border-accent hover:text-accent hover:bg-accent/10'
                          : 'border-zinc-300 text-zinc-500 hover:border-accent hover:text-accent hover:bg-accent/10'
                      )}
                    >
                      {IconComponent && (
                        <IconComponent className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{item.name}</span>
                    </button>
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => {
                      if (item.href && item.href !== '#') {
                        router.push(item.href)
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left',
                      isActive
                        ? 'bg-accent text-white shadow-md shadow-accent/20'
                        : isDark
                          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    )}
                  >
                    {IconComponent && (
                      <IconComponent className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isActive ? 'text-white' : ''
                      )} />
                    )}
                    <span>{item.name}</span>
                  </button>
                </motion.div>
              )
            })
          )}
        </nav>
      </div>
    </motion.aside>
  )
}

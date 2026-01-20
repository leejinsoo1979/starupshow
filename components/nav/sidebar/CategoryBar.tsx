'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui'
import { ThemeDropdown } from '../ThemeDropdown'
import {
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import type { Category } from './types'

interface CategoryBarProps {
  categories: Category[]
  currentCategory: string
  isDark: boolean
  isDashboardRoot: boolean
  sidebarOpen: boolean
  pathname: string
  onCategoryClick: (category: Category) => void
  onToggleSidebar: () => void
  onLogout: () => void
}

export function CategoryBar({
  categories,
  currentCategory,
  isDark,
  isDashboardRoot,
  sidebarOpen,
  pathname,
  onCategoryClick,
  onToggleSidebar,
  onLogout,
}: CategoryBarProps) {
  return (
    <motion.aside
      className={cn(
        'w-16 h-full flex flex-col items-center py-4 border-r transition-colors duration-300 z-20',
        isDashboardRoot
          ? (isDark
            ? 'bg-black/20 backdrop-blur-xl border-white/10'
            : 'bg-white/60 backdrop-blur-xl border-zinc-200/50')
          : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      )}
    >
      {/* Logo */}
      <Logo collapsed className="mb-6" />

      {/* Category Icons */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {categories.map((category) => {
          const isActive = currentCategory === category.id
          return (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category)}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative',
                isActive
                  ? 'bg-accent text-white shadow-lg shadow-accent/25'
                  : isDashboardRoot
                    ? (isDark
                      ? 'text-white/70 hover:bg-white/10 hover:text-white'
                      : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900')
                    : isDark
                      ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                      : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
              )}
            >
              <category.icon className="w-5 h-5" />
              {/* Tooltip */}
              <div className={cn(
                'absolute left-full ml-2 px-2 py-1 text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50',
                isDark || isDashboardRoot
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'bg-white text-zinc-900 border border-zinc-200 shadow-lg'
              )}>
                {category.name}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {/* 사이드바 토글 버튼 */}
        <button
          onClick={onToggleSidebar}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative',
            isDark
              ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
          )}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
          <div className={cn(
            'absolute left-full ml-2 px-2 py-1 text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50',
            isDark
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'bg-white text-zinc-900 border border-zinc-200 shadow-lg'
          )}>
            {sidebarOpen ? '메뉴 접기' : '메뉴 펼치기'}
          </div>
        </button>

        <ThemeDropdown
          align="left-start"
          trigger={
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative',
                isDark
                  ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                  : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
              )}
            >
              <Settings className="w-5 h-5" />
              <div className={cn(
                'absolute left-full ml-2 px-2 py-1 text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50',
                isDark
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'bg-white text-zinc-900 border border-zinc-200 shadow-lg'
              )}>
                설정
              </div>
            </div>
          }
        />

        <button
          onClick={onLogout}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative',
            isDark
              ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400'
              : 'text-zinc-500 hover:bg-zinc-200 hover:text-red-500'
          )}
        >
          <LogOut className="w-5 h-5 rotate-180" />
          <div className={cn(
            'absolute left-full ml-2 px-2 py-1 text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50',
            isDark
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'bg-white text-zinc-900 border border-zinc-200 shadow-lg'
          )}>
            나가기
          </div>
        </button>
      </div>
    </motion.aside>
  )
}

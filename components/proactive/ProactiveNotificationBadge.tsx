'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ProactiveSuggestionList } from './ProactiveSuggestionList'
import {
  useMissionControlStore,
  selectPendingSuggestionsCount,
} from '@/lib/mission-control/store'
import { Bell, X, Sparkles } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ProactiveNotificationBadgeProps {
  agentId?: string
  className?: string
  showDropdown?: boolean
  maxDropdownItems?: number
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  onBadgeClick?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ProactiveNotificationBadge({
  agentId,
  className,
  showDropdown = true,
  maxDropdownItems = 5,
  position = 'bottom-right',
  onBadgeClick,
}: ProactiveNotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const pendingCount = useMissionControlStore(selectPendingSuggestionsCount)
  const previousCountRef = useRef(pendingCount)

  // Animate when new notification arrives
  useEffect(() => {
    if (pendingCount > previousCountRef.current) {
      setHasNewNotification(true)
      const timer = setTimeout(() => setHasNewNotification(false), 3000)
      return () => clearTimeout(timer)
    }
    previousCountRef.current = pendingCount
  }, [pendingCount])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleClick = () => {
    if (onBadgeClick) {
      onBadgeClick()
    } else if (showDropdown) {
      setIsOpen(!isOpen)
    }
  }

  const positionClasses = {
    'top-right': 'top-full mt-2 right-0',
    'bottom-right': 'bottom-full mb-2 right-0',
    'top-left': 'top-full mt-2 left-0',
    'bottom-left': 'bottom-full mb-2 left-0',
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Badge Button */}
      <motion.button
        onClick={handleClick}
        className={cn(
          'relative p-2 rounded-xl transition-all duration-200',
          'hover:bg-gray-100 dark:hover:bg-zinc-800',
          'focus:outline-none focus:ring-2 focus:ring-accent/50',
          pendingCount > 0 && 'text-accent',
          !pendingCount && 'text-zinc-500 dark:text-zinc-400'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={hasNewNotification ? {
          scale: [1, 1.2, 1],
          rotate: [0, -10, 10, -10, 0],
        } : {}}
        transition={{ duration: 0.5 }}
      >
        <Bell className="w-5 h-5" />

        {/* Count Badge */}
        <AnimatePresence>
          {pendingCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                'absolute -top-1 -right-1',
                'min-w-[18px] h-[18px] px-1',
                'flex items-center justify-center',
                'text-[10px] font-bold text-white',
                'bg-gradient-to-r from-accent to-accent/80',
                'rounded-full shadow-lg shadow-accent/25'
              )}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse animation for new notifications */}
        <AnimatePresence>
          {hasNewNotification && (
            <motion.span
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: 2 }}
              className="absolute inset-0 rounded-full bg-accent"
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: position.includes('top') ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position.includes('top') ? -10 : 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute z-50',
              'w-80 max-h-[400px]',
              'bg-white dark:bg-zinc-900',
              'border border-gray-200 dark:border-zinc-700',
              'rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/30',
              'overflow-hidden',
              positionClasses[position]
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  능동적 제안
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[320px] overflow-y-auto p-3">
              <ProactiveSuggestionList
                agentId={agentId}
                maxItems={maxDropdownItems}
                compact={true}
                showEmpty={true}
              />
            </div>

            {/* Footer */}
            {pendingCount > maxDropdownItems && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-zinc-800">
                <button className="w-full text-center text-xs text-accent hover:underline">
                  {pendingCount - maxDropdownItems}개 더 보기
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Floating Badge Variant
// ============================================================================

interface FloatingProactiveBadgeProps extends ProactiveNotificationBadgeProps {
  floatPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
}

export function FloatingProactiveBadge({
  floatPosition = 'bottom-right',
  ...props
}: FloatingProactiveBadgeProps) {
  const positionClasses = {
    'top-right': 'fixed top-4 right-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'top-left': 'fixed top-4 left-4',
    'bottom-left': 'fixed bottom-4 left-4',
  }

  return (
    <div className={cn(positionClasses[floatPosition], 'z-50')}>
      <div className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-700">
        <ProactiveNotificationBadge
          {...props}
          position={floatPosition.includes('bottom') ? 'top-right' : 'bottom-right'}
        />
      </div>
    </div>
  )
}

export default ProactiveNotificationBadge

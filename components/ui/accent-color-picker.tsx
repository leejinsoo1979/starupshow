'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore, accentColors } from '@/stores/themeStore'
import { Check, Palette } from 'lucide-react'

export function AccentColorPicker() {
  const [isOpen, setIsOpen] = useState(false)
  const { accentColor, setAccentColor } = useThemeStore()
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply accent color on mount and change
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const selectedAccent = accentColors.find((c) => c.id === accentColor)
    if (selectedAccent) {
      root.style.setProperty('--accent-color', selectedAccent.color)
      root.style.setProperty('--accent-color-hover', selectedAccent.hoverColor)
      root.style.setProperty('--accent-color-rgb', selectedAccent.rgb)
    }
  }, [accentColor, mounted])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) {
    return (
      <div
        className="w-6 h-6 rounded-full bg-zinc-700"
      />
    )
  }

  const currentColor = accentColors.find((c) => c.id === accentColor)

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
        style={{
          backgroundColor: currentColor?.color,
          boxShadow: `0 2px 8px ${currentColor?.color}40`
        }}
        whileTap={{ scale: 0.95 }}
        aria-label="강조 색상 선택"
      >
        <Palette className="w-3.5 h-3.5 text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 mt-2 p-3 bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-700/50 z-50 min-w-[200px]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3 font-medium">
              강조 색상
            </p>
            <div className="grid grid-cols-4 gap-2">
              {accentColors.map((color) => {
                const isActive = accentColor === color.id
                return (
                  <motion.button
                    key={color.id}
                    onClick={() => {
                      setAccentColor(color.id)
                      setIsOpen(false)
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isActive ? 'ring-2 ring-offset-2 ring-offset-zinc-900' : 'hover:scale-110'
                    }`}
                    style={{
                      backgroundColor: color.color,
                      ['--tw-ring-color' as string]: isActive ? color.color : undefined
                    }}
                    whileTap={{ scale: 0.9 }}
                    title={color.name}
                  >
                    {isActive && <Check className="w-4 h-4 text-white" />}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  defaultActive?: string
}

export function AnimeNavBar({ items, className, defaultActive = "HOME" }: NavBarProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>(defaultActive)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <motion.div
      className={cn(
        "flex items-center gap-1 bg-white/80 dark:bg-black/50 border border-gray-200 dark:border-white/10 backdrop-blur-lg py-1.5 px-1.5 rounded-full shadow-lg relative",
        className
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
    >
      {items.map((item) => {
        const isActive = activeTab === item.name
        const isHovered = hoveredTab === item.name

        return (
          <Link
            key={item.name}
            href={item.url}
            onClick={() => setActiveTab(item.name)}
            onMouseEnter={() => setHoveredTab(item.name)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              "relative cursor-pointer text-xs font-semibold tracking-wide px-4 py-2 rounded-full transition-all duration-300",
              "text-zinc-600 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white",
              isActive && "text-zinc-900 dark:text-white"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 rounded-full -z-10 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute inset-0 bg-accent/30 rounded-full" />
                <div className="absolute inset-[-2px] bg-accent/20 rounded-full blur-sm" />
              </motion.div>
            )}

            <span className="relative z-10">{item.name}</span>

            <AnimatePresence>
              {isHovered && !isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-zinc-200 dark:bg-white/10 rounded-full -z-10"
                />
              )}
            </AnimatePresence>
          </Link>
        )
      })}
    </motion.div>
  )
}

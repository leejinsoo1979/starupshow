'use client'

import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    label?: string
  }
  loading?: boolean
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-purple-500',
  trend,
  loading = false,
  className = '',
  onClick,
}: StatCardProps) {
  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-zinc-700 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-zinc-400 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend.value >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
              {trend.label && <span className="text-zinc-500">{trend.label}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg bg-zinc-800 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}

interface StatGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5
  className?: string
}

export function StatGrid({ children, columns = 4, className = '' }: StatGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  )
}

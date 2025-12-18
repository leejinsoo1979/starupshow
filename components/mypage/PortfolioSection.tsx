'use client'

import { useState } from 'react'
import { Rocket, Trophy, Newspaper, FolderKanban, Pencil } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { portfolioData } from '@/lib/mypage-data'

interface PortfolioSectionProps {
  data?: typeof portfolioData
  onEdit?: () => void
}

export function PortfolioSection({ data = portfolioData, onEdit }: PortfolioSectionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [activeFilter, setActiveFilter] = useState('전체')

  const filteredProjects =
    activeFilter === '전체' ? data.projects : data.projects.filter((p) => p.category === activeFilter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case '운영중':
        return 'bg-green-500/20 text-green-400'
      case '개발중':
        return 'bg-blue-500/20 text-blue-400'
      case '완료':
        return 'bg-zinc-500/20 text-zinc-400'
      default:
        return 'bg-zinc-500/20 text-zinc-400'
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn(
            'text-2xl md:text-3xl font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            포트폴리오
          </h2>
          {onEdit && (
            <button
              onClick={onEdit}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              )}
              title="포트폴리오 편집"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="w-10 h-1 bg-accent rounded-full mb-6" />
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        {data.categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveFilter(category)}
            className={cn(
              'px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all',
              activeFilter === category
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : isDark
                  ? 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredProjects.map((project, index) => (
          <div
            key={index}
            className={cn(
              'group relative rounded-xl md:rounded-2xl border overflow-hidden transition-all duration-300',
              isDark
                ? 'bg-zinc-800/50 border-zinc-800 hover:border-accent hover:shadow-xl hover:shadow-accent/10'
                : 'bg-white border-zinc-200 hover:border-accent hover:shadow-xl hover:shadow-accent/10'
            )}
          >
            <div className={cn(
              'aspect-[4/3] overflow-hidden flex items-center justify-center',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}>
              <div className="text-accent/30">
                {project.category === '프로젝트' && <Rocket className="w-12 h-12" />}
                {project.category === '성과' && <Trophy className="w-12 h-12" />}
                {project.category === '미디어' && <Newspaper className="w-12 h-12" />}
              </div>
            </div>

            <div className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  getStatusColor(project.status)
                )}>
                  {project.status}
                </span>
                <span className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {project.category}
                </span>
              </div>
              <h3 className={cn(
                'text-base md:text-lg font-semibold mb-2',
                isDark ? 'text-white' : 'text-zinc-900'
              )}>
                {project.title}
              </h3>
              <p className={cn(
                'text-xs md:text-sm',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}>
                {project.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

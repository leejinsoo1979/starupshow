'use client'

import { Calendar, Clock, ArrowRight, BarChart3, Wallet, Users } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { activityData } from '@/lib/mypage-data'

interface ActivitySectionProps {
  data?: typeof activityData
}

export function ActivitySection({ data = activityData }: ActivitySectionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className={cn(
          'text-2xl md:text-3xl font-bold mb-4',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          활동
        </h2>
        <div className="w-10 h-1 bg-accent rounded-full mb-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {data.posts.map((post, index) => (
          <article
            key={index}
            className={cn(
              'group rounded-xl md:rounded-2xl border overflow-hidden transition-all duration-300',
              isDark
                ? 'bg-zinc-800/50 border-zinc-800 hover:border-accent hover:shadow-lg hover:shadow-accent/10'
                : 'bg-white border-zinc-200 hover:border-accent hover:shadow-lg hover:shadow-accent/10'
            )}
          >
            <div className={cn(
              'aspect-video overflow-hidden flex items-center justify-center',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}>
              <div className="text-accent/30">
                {post.category === '경영' && <BarChart3 className="w-10 h-10" />}
                {post.category === '투자' && <Wallet className="w-10 h-10" />}
                {post.category === '조직' && <Users className="w-10 h-10" />}
              </div>
            </div>
            <div className="p-4 md:p-5">
              <div className={cn(
                'flex items-center gap-2 flex-wrap text-xs mb-3',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                <span className="px-2.5 md:px-3 py-0.5 md:py-1 bg-accent/10 text-accent rounded-full font-medium">
                  {post.category}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  {post.readTime}
                </span>
              </div>
              <h3 className={cn(
                'text-base md:text-lg font-semibold mb-3 leading-tight group-hover:text-accent transition-colors',
                isDark ? 'text-white' : 'text-zinc-900'
              )}>
                {post.title}
              </h3>
              <p className={cn(
                'text-xs md:text-sm leading-relaxed mb-4',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}>
                {post.excerpt}
              </p>

              {/* Read More Link */}
              <button className="flex items-center gap-2 text-xs md:text-sm text-accent hover:gap-3 transition-all font-medium">
                자세히 보기
                <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

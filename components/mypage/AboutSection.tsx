'use client'

import { Lightbulb, Code, Users, TrendingUp } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { aboutData } from '@/lib/mypage-data'

const iconMap = {
  Lightbulb,
  Code,
  Users,
  TrendingUp,
}

interface AboutSectionProps {
  data?: typeof aboutData
}

export function AboutSection({ data = aboutData }: AboutSectionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="space-y-8 md:space-y-10">
      {/* About Me */}
      <div>
        <h2 className={cn(
          'text-2xl md:text-3xl font-bold mb-4',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          소개
        </h2>
        <div className="w-10 h-1 bg-accent rounded-full mb-6" />
        <div className={cn(
          'space-y-4 text-sm md:text-base leading-relaxed',
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        )}>
          {data.description.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h3 className={cn(
          'text-xl md:text-2xl font-bold mb-6',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          주요 성과
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {data.achievements.map((item, index) => (
            <div
              key={index}
              className={cn(
                'p-4 md:p-6 rounded-xl md:rounded-2xl border text-center',
                isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              )}
            >
              <p className="text-2xl md:text-3xl font-bold text-accent mb-1">{item.value}</p>
              <p className={cn(
                'text-xs md:text-sm',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What I'm Doing */}
      <div>
        <h3 className={cn(
          'text-xl md:text-2xl font-bold mb-6',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          전문 분야
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {data.services.map((service, index) => {
            const IconComponent = iconMap[service.icon as keyof typeof iconMap]
            return (
              <div
                key={index}
                className={cn(
                  'flex gap-3 md:gap-4 p-4 md:p-6 rounded-xl md:rounded-2xl border transition-colors',
                  isDark
                    ? 'bg-zinc-800/50 border-zinc-800 hover:border-accent'
                    : 'bg-zinc-50 border-zinc-200 hover:border-accent'
                )}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                  {IconComponent && (
                    <IconComponent className="w-full h-full text-accent" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <h4 className={cn(
                    'text-base md:text-lg font-semibold mb-2',
                    isDark ? 'text-white' : 'text-zinc-900'
                  )}>
                    {service.title}
                  </h4>
                  <p className={cn(
                    'text-xs md:text-sm leading-relaxed',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    {service.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

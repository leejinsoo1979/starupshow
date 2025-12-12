'use client'

import { BookOpen, Briefcase, Building2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { resumeData } from '@/lib/mypage-data'

interface ResumeSectionProps {
  data?: typeof resumeData
}

export function ResumeSection({ data = resumeData }: ResumeSectionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="space-y-8 md:space-y-10">
      <div>
        <h2 className={cn(
          'text-2xl md:text-3xl font-bold mb-4',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          이력
        </h2>
        <div className="w-10 h-1 bg-accent rounded-full mb-6" />
      </div>

      {/* Experience */}
      <div>
        <div className="flex items-center gap-2 md:gap-3 mb-6">
          <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          <h3 className={cn(
            'text-xl md:text-2xl font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            경력
          </h3>
        </div>
        <div className="space-y-4">
          {data.experience.map((item, index) => (
            <div
              key={index}
              className={cn(
                'relative pl-5 md:pl-6 pb-6 border-l-2 last:pb-0',
                isDark ? 'border-zinc-700' : 'border-zinc-300'
              )}
            >
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent" />
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-2">
                <h4 className={cn(
                  'text-base md:text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900'
                )}>
                  {item.title}
                </h4>
                <div className="flex items-center gap-2">
                  <Building2 className={cn(
                    'w-3.5 h-3.5',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )} />
                  <span className={cn(
                    'text-sm',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    {item.company}
                  </span>
                </div>
              </div>
              <p className="text-xs md:text-sm text-accent mb-2">{item.period}</p>
              <p className={cn(
                'text-xs md:text-sm leading-relaxed',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div>
        <div className="flex items-center gap-2 md:gap-3 mb-6">
          <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          <h3 className={cn(
            'text-xl md:text-2xl font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            학력
          </h3>
        </div>
        <div className="space-y-4">
          {data.education.map((item, index) => (
            <div
              key={index}
              className={cn(
                'relative pl-5 md:pl-6 pb-6 border-l-2 last:pb-0',
                isDark ? 'border-zinc-700' : 'border-zinc-300'
              )}
            >
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent" />
              <h4 className={cn(
                'text-base md:text-lg font-semibold mb-2',
                isDark ? 'text-white' : 'text-zinc-900'
              )}>
                {item.title}
              </h4>
              <p className="text-xs md:text-sm text-accent mb-2">{item.period}</p>
              <p className={cn(
                'text-xs md:text-sm leading-relaxed',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className={cn(
          'text-xl md:text-2xl font-bold mb-6',
          isDark ? 'text-white' : 'text-zinc-900'
        )}>
          핵심 역량
        </h3>
        <div className="space-y-5 md:space-y-6">
          {data.skills.map((skill, index) => (
            <div key={index}>
              <div className="flex justify-between mb-2">
                <span className={cn(
                  'text-xs md:text-sm font-medium',
                  isDark ? 'text-zinc-200' : 'text-zinc-700'
                )}>
                  {skill.name}
                </span>
                <span className={cn(
                  'text-xs md:text-sm',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {skill.level}%
                </span>
              </div>
              <div className={cn(
                'h-2 rounded-full overflow-hidden',
                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              )}>
                <div
                  className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${skill.level}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { ProfileSidebar, PortfolioSection } from '@/components/mypage'
import { profileData, portfolioData } from '@/lib/mypage-data'

export default function PortfolioPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
      <div className="w-full lg:w-[35%] lg:min-w-[320px] lg:max-w-[400px]">
        <ProfileSidebar data={profileData} className="lg:h-full" />
      </div>

      <main className={cn(
        'flex-1 rounded-xl md:rounded-2xl border overflow-hidden',
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
      )}>
        <div className="p-6 md:p-8">
          <PortfolioSection data={portfolioData} />
        </div>
      </main>
    </div>
  )
}

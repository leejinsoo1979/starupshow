'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { ProfileSidebar, PortfolioSection, ProfileEditModal } from '@/components/mypage'
import { profileData, portfolioData } from '@/lib/mypage-data'
import { useProfile } from '@/hooks/useProfile'

export default function PortfolioPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const { data: profile } = useProfile()
  const [editSection, setEditSection] = useState<'profile' | 'portfolio' | null>(null)

  const mergedProfileData = {
    ...profileData,
    title: profile?.title || profileData.title,
    birthday: profile?.birthday ? new Date(profile.birthday).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : profileData.birthday,
    location: profile?.location || profileData.location,
    social: {
      github: profile?.github_url || profileData.social.github,
      twitter: profile?.twitter_url || profileData.social.twitter,
      linkedin: profile?.linkedin_url || profileData.social.linkedin,
    },
  }

  // 포트폴리오 데이터에서 카테고리 추출
  const portfolioProjects = profile?.portfolio?.length
    ? profile.portfolio.map(p => ({ ...p, image: p.image || '' }))
    : portfolioData.projects
  const categorySet = new Set(portfolioProjects.map(p => p.category))
  const categories = ['전체', ...Array.from(categorySet)]

  const mergedPortfolioData = {
    categories,
    projects: portfolioProjects,
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
      <div className="w-full lg:w-[35%] lg:min-w-[320px] lg:max-w-[400px]">
        <ProfileSidebar
          data={mergedProfileData}
          className="lg:h-full"
          onEdit={() => setEditSection('profile')}
        />
      </div>

      <main className={cn(
        'flex-1 rounded-xl md:rounded-2xl border overflow-hidden',
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
      )}>
        <div className="p-6 md:p-8">
          <PortfolioSection data={mergedPortfolioData} onEdit={() => setEditSection('portfolio')} />
        </div>
      </main>

      {editSection && (
        <ProfileEditModal
          section={editSection}
          isOpen={true}
          onClose={() => setEditSection(null)}
        />
      )}
    </div>
  )
}

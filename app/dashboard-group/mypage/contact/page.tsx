'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { ProfileSidebar, ContactSection, ProfileEditModal } from '@/components/mypage'
import { profileData, contactData } from '@/lib/mypage-data'
import { useProfile } from '@/hooks/useProfile'

export default function ContactPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const { data: profile } = useProfile()
  const [editSection, setEditSection] = useState<'profile' | 'contact' | null>(null)

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

  const mergedContactData = {
    ...contactData,
    email: profile?.contact_email || contactData.email,
    phone: profile?.contact_phone || contactData.phone,
    location: profile?.contact_address || contactData.location,
    calendlyUrl: profile?.calendly_url || contactData.calendlyUrl,
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
          <ContactSection data={mergedContactData} onEdit={() => setEditSection('contact')} />
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

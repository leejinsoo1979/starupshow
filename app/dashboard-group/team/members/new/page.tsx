'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/stores/themeStore'
import { ArrowLeft, UserPlus, Mail, Briefcase, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NewTeamMemberPage() {
  const router = useRouter()
  const { accentColor } = useThemeStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member',
    position: '',
  })

  const getAccentBg = () => {
    switch (accentColor) {
      case 'purple': return 'bg-purple-500'
      case 'blue': return 'bg-blue-500'
      case 'green': return 'bg-green-500'
      case 'orange': return 'bg-orange-500'
      case 'pink': return 'bg-pink-500'
      case 'red': return 'bg-red-500'
      case 'yellow': return 'bg-yellow-500'
      case 'cyan': return 'bg-cyan-500'
      default: return 'bg-blue-500'
    }
  }

  const getAccentText = () => {
    switch (accentColor) {
      case 'purple': return 'text-purple-600 dark:text-purple-400'
      case 'blue': return 'text-blue-600 dark:text-blue-400'
      case 'green': return 'text-green-600 dark:text-green-400'
      case 'orange': return 'text-orange-600 dark:text-orange-400'
      case 'pink': return 'text-pink-600 dark:text-pink-400'
      case 'red': return 'text-red-600 dark:text-red-400'
      case 'yellow': return 'text-yellow-600 dark:text-yellow-400'
      case 'cyan': return 'text-cyan-600 dark:text-cyan-400'
      default: return 'text-blue-600 dark:text-blue-400'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // TODO: API 연동
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    router.push('/dashboard-group/team/members')
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-500 dark:text-white/50 hover:text-zinc-700 dark:hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">뒤로가기</span>
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          팀원 추가
        </h1>
        <p className="text-zinc-500 dark:text-white/50 mt-2">
          새로운 팀원을 초대하여 프로젝트에 참여시키세요
        </p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-xl"
      >
        <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/70 mb-2">
                이름
              </label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-white/30" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="팀원 이름"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/70 mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-white/30" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/70 mb-2">
                직책
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-white/30" />
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="예: 프론트엔드 개발자"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/70 mb-2">
                역할
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-white/30" />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="member">멤버</option>
                  <option value="admin">관리자</option>
                  <option value="viewer">뷰어</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-3 rounded-xl font-medium text-white transition-all",
                  "flex items-center justify-center gap-2",
                  getAccentBg(),
                  "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    초대 중...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    팀원 초대하기
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info */}
        <p className="mt-4 text-sm text-zinc-500 dark:text-white/40 text-center">
          초대된 팀원은 이메일로 초대 링크를 받게 됩니다
        </p>
      </motion.div>
    </div>
  )
}

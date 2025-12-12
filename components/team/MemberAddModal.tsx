'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Mail, Briefcase, Shield, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'

interface MemberAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (member: MemberFormData) => void
}

export interface MemberFormData {
  name: string
  email: string
  role: string
  position: string
}

export function MemberAddModal({ isOpen, onClose, onSubmit }: MemberAddModalProps) {
  const { accentColor } = useThemeStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    email: '',
    role: 'member',
    position: '',
  })

  const getAccentClasses = () => {
    switch (accentColor) {
      case 'purple': return { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', light: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' }
      case 'blue': return { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' }
      case 'green': return { bg: 'bg-green-500', hover: 'hover:bg-green-600', light: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400' }
      case 'orange': return { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', light: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' }
      case 'pink': return { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', light: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' }
      case 'red': return { bg: 'bg-red-500', hover: 'hover:bg-red-600', light: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' }
      case 'yellow': return { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', light: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' }
      case 'cyan': return { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', light: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' }
      default: return { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' }
    }
  }

  const accent = getAccentClasses()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) return

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))

    onSubmit(formData)
    setIsSubmitting(false)
    setFormData({ name: '', email: '', role: 'member', position: '' })
    onClose()
  }

  const handleClose = () => {
    setFormData({ name: '', email: '', role: 'member', position: '' })
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", accent.light)}>
                    <UserPlus className={cn("w-6 h-6", accent.text)} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      팀원 추가
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      새로운 팀원을 초대하세요
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 -m-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="팀원 이름"
                      required
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all"
                    />
                  </div>
                </div>

                {/* Position & Role - 2 Column */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">
                      직책
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="예: 개발자"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">
                      역할
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all appearance-none cursor-pointer"
                      >
                        <option value="member">멤버</option>
                        <option value="admin">관리자</option>
                        <option value="viewer">뷰어</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-5 mt-2 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  초대 링크가 이메일로 전송됩니다
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim() || !formData.email.trim()}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-medium text-white transition-all",
                      "flex items-center justify-center gap-2 min-w-[100px]",
                      accent.bg, accent.hover,
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      '초대'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

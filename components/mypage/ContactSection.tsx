'use client'

import { Mail, Phone, MapPin, Send, Calendar, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { contactData } from '@/lib/mypage-data'

interface ContactSectionProps {
  data?: typeof contactData
  onEdit?: () => void
}

export function ContactSection({ data = contactData, onEdit }: ContactSectionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    // TODO: Implement form submission
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn(
            'text-2xl md:text-3xl font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            연락하기
          </h2>
          {onEdit && (
            <button
              onClick={onEdit}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              )}
              title="연락처 편집"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="w-10 h-1 bg-accent rounded-full mb-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className={cn(
          'flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-xl md:rounded-2xl border transition-colors group',
          isDark
            ? 'bg-zinc-800/50 border-zinc-800 hover:border-accent'
            : 'bg-zinc-50 border-zinc-200 hover:border-accent'
        )}>
          <div className={cn(
            'w-12 h-12 md:w-14 md:h-14 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors'
          )}>
            <Mail className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className={cn(
              'text-xs md:text-sm font-medium mb-1',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              이메일
            </h3>
            <a
              href={`mailto:${data.email}`}
              className={cn(
                'text-sm md:text-base font-medium truncate block hover:text-accent transition-colors',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {data.email}
            </a>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-xl md:rounded-2xl border transition-colors group',
          isDark
            ? 'bg-zinc-800/50 border-zinc-800 hover:border-accent'
            : 'bg-zinc-50 border-zinc-200 hover:border-accent'
        )}>
          <div className={cn(
            'w-12 h-12 md:w-14 md:h-14 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors'
          )}>
            <Phone className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          </div>
          <div>
            <h3 className={cn(
              'text-xs md:text-sm font-medium mb-1',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              전화
            </h3>
            <a
              href={`tel:${data.phone.replace(/\s/g, '')}`}
              className={cn(
                'text-sm md:text-base font-medium hover:text-accent transition-colors',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {data.phone}
            </a>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-xl md:rounded-2xl border transition-colors group',
          isDark
            ? 'bg-zinc-800/50 border-zinc-800 hover:border-accent'
            : 'bg-zinc-50 border-zinc-200 hover:border-accent'
        )}>
          <div className={cn(
            'w-12 h-12 md:w-14 md:h-14 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors'
          )}>
            <MapPin className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          </div>
          <div>
            <h3 className={cn(
              'text-xs md:text-sm font-medium mb-1',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              위치
            </h3>
            <p className={cn(
              'text-sm md:text-base font-medium',
              isDark ? 'text-white' : 'text-zinc-900'
            )}>
              {data.location}
            </p>
          </div>
        </div>
      </div>

      {/* Schedule Meeting Button */}
      <a
        href={data.calendlyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center justify-center gap-3 w-full p-4 rounded-xl md:rounded-2xl border transition-colors',
          isDark
            ? 'bg-accent/10 border-accent/30 hover:bg-accent/20 text-accent'
            : 'bg-accent/5 border-accent/20 hover:bg-accent/10 text-accent'
        )}
      >
        <Calendar className="w-5 h-5" />
        <span className="font-medium">미팅 예약하기</span>
      </a>

      <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <div>
            <label
              htmlFor="name"
              className={cn(
                'block text-sm font-medium mb-2',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              이름
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(
                'w-full px-4 md:px-5 py-3 md:py-3.5 rounded-xl border text-sm md:text-base focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              )}
              placeholder="홍길동"
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className={cn(
                'block text-sm font-medium mb-2',
                isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              이메일
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={cn(
                'w-full px-4 md:px-5 py-3 md:py-3.5 rounded-xl border text-sm md:text-base focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all',
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
              )}
              placeholder="email@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="message"
            className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white' : 'text-zinc-900'
            )}
          >
            메시지
          </label>
          <textarea
            id="message"
            rows={6}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className={cn(
              'w-full px-4 md:px-5 py-3 md:py-3.5 rounded-xl border text-sm md:text-base focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all resize-none',
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
                : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
            )}
            placeholder="메시지를 입력해주세요..."
            required
          />
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full md:w-auto px-6 md:px-8 py-3 md:py-3.5 bg-accent text-white rounded-xl font-medium hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 transition-all text-sm md:text-base"
        >
          <Send className="w-4 h-4" />
          메시지 보내기
        </button>
      </form>
    </div>
  )
}

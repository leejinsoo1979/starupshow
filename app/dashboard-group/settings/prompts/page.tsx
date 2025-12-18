'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Briefcase,
  Users,
  Shield,
  FileText,
  Target,
  Send,
  ArrowLeft,
  Save,
  RotateCcw,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface PromptSection {
  key: string
  title: string
  description: string
  icon: any
  color: string
}

const PROMPT_SECTIONS: PromptSection[] = [
  {
    key: 'work_operating_model',
    title: '1. 업무 운영 방식',
    description: 'Work Operating Model - 요청→이해→확인→실행→보고 프로세스',
    icon: Briefcase,
    color: 'text-blue-500',
  },
  {
    key: 'human_communication',
    title: '2. 사람형 커뮤니케이션',
    description: 'Human-like Communication - 말투, 직급별 대응, 감정 표현',
    icon: MessageSquare,
    color: 'text-green-500',
  },
  {
    key: 'professional_habits',
    title: '3. 직원다운 업무 습관',
    description: 'Professional Habits - 시간 관념, 책임감, 팀워크, 주도성',
    icon: Users,
    color: 'text-purple-500',
  },
  {
    key: 'no_hallucination',
    title: '4. 할루시네이션 방지',
    description: 'No-Hallucination Policy - 사실성, 정확성, 자기 정체성',
    icon: Shield,
    color: 'text-red-500',
  },
  {
    key: 'collaboration_conflict',
    title: '5. 협업 및 충돌 처리',
    description: 'Collaboration & Conflict - 의견 충돌, 피드백, 갈등 해소',
    icon: Users,
    color: 'text-orange-500',
  },
  {
    key: 'deliverable_templates',
    title: '6. 산출물 기본 포맷',
    description: 'Deliverable Templates - 보고서, 기획서, 코드 문서, 회의록',
    icon: FileText,
    color: 'text-cyan-500',
  },
  {
    key: 'context_anchor',
    title: '7. 맥락 고정',
    description: 'Context Anchor - 기본 맥락, 상황 인식, 일관성 유지',
    icon: Target,
    color: 'text-yellow-500',
  },
  {
    key: 'response_format',
    title: '8. 출력 형식 강제',
    description: 'Response Format - 응답 길이, 금지 패턴, 시작/종료 패턴',
    icon: Send,
    color: 'text-pink-500',
  },
  {
    key: 'messenger_rules',
    title: '메신저 토론 규칙',
    description: 'Messenger Rules - 멀티에이전트 토론 전용 규칙',
    icon: MessageSquare,
    color: 'text-indigo-500',
  },
]

export default function PromptSettingsPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // 프롬프트 불러오기
  useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/settings/prompts')
      if (res.ok) {
        const data = await res.json()
        setPrompts(data)
        // 모든 섹션 펼치기
        const expanded: Record<string, boolean> = {}
        PROMPT_SECTIONS.forEach(s => expanded[s.key] = true)
        setExpandedSections(expanded)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  // 저장
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Error saving prompts:', error)
    } finally {
      setSaving(false)
    }
  }

  // 기본값으로 초기화
  const handleReset = async () => {
    if (!confirm('모든 프롬프트를 기본값으로 초기화하시겠습니까?')) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings/prompts', {
        method: 'POST',
      })
      if (res.ok) {
        await fetchPrompts()
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Error resetting prompts:', error)
    } finally {
      setSaving(false)
    }
  }

  // 섹션 토글
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 프롬프트 수정
  const updatePrompt = (key: string, value: string) => {
    setPrompts(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className={`flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg transition ${
            isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">돌아가기</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              에이전트 프롬프트 설정
            </h1>
            <p className={`mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              8-섹션 시스템 프롬프트를 수정하여 에이전트 행동을 커스터마이즈
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>기본값 복원</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-accent hover:bg-accent/90 text-white'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saved ? '저장됨' : '저장'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prompt Sections */}
      <div className="space-y-4">
        {PROMPT_SECTIONS.map((section, idx) => (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-xl border overflow-hidden ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.key)}
              className={`w-full flex items-center justify-between p-4 transition ${
                isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <div className="text-left">
                  <h3 className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {section.description}
                  </p>
                </div>
              </div>
              {expandedSections[section.key] ? (
                <ChevronUp className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              )}
            </button>

            {/* Section Content */}
            {expandedSections[section.key] && (
              <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <textarea
                  value={prompts[section.key] || ''}
                  onChange={(e) => updatePrompt(section.key, e.target.value)}
                  rows={15}
                  className={`w-full p-4 rounded-lg font-mono text-sm resize-y min-h-[200px] ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  } border focus:outline-none focus:ring-2 focus:ring-accent/50`}
                  placeholder={`${section.title} 프롬프트를 입력하세요...`}
                />
                <div className={`mt-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {prompts[section.key]?.length || 0} 자
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Bottom Save Button (Fixed) */}
      <div className={`fixed bottom-6 right-6 z-50`}>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg transition ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-accent hover:bg-accent/90 text-white'
          }`}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <Check className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span className="font-medium">{saved ? '저장 완료!' : '변경사항 저장'}</span>
        </button>
      </div>
    </div>
  )
}

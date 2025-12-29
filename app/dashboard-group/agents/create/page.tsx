'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  Bot,
  User,
  Sparkles,
  Mic,
  Palette,
  Zap,
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  Loader2,
  Brain,
  MessageSquare,
  Volume2,
  Image as ImageIcon,
  Plus,
  X,
  Settings,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useThemeStore, accentColors } from '@/stores/themeStore'

// ============================================
// Types
// ============================================

type CreationStep = 'profile' | 'personality' | 'skills' | 'voice' | 'appearance' | 'review'

interface StepConfig {
  id: CreationStep
  label: string
  icon: React.ElementType
  description: string
}

interface SkillItem {
  id: string
  name: string
  description?: string
  selected: boolean
}

interface SuperAgentData {
  // Profile
  name: string
  description: string
  avatar_url: string | null

  // Personality
  personality: string
  tone: string
  role: string

  // Skills
  skills: string[]
  capabilities: string[]

  // Voice
  voice_enabled: boolean
  voice_id: string
  voice_settings: {
    speed: number
    pitch: number
  }

  // Appearance
  chat_main_gif: string | null
  emotion_avatars: Record<string, string>
  theme_color: string
}

// ============================================
// Constants
// ============================================

const STEPS: StepConfig[] = [
  { id: 'profile', label: '기본 정보', icon: User, description: '이름과 설명' },
  { id: 'personality', label: '성격', icon: Brain, description: '성격과 말투' },
  { id: 'skills', label: '스킬', icon: Zap, description: '능력 선택' },
  { id: 'voice', label: '음성', icon: Volume2, description: '음성 설정' },
  { id: 'appearance', label: '외형', icon: Palette, description: '아바타와 테마' },
  { id: 'review', label: '완료', icon: Check, description: '최종 확인' },
]

const PERSONALITY_PRESETS = [
  { id: 'friendly', label: '친근한', emoji: '😊', description: '편안하고 친근한 대화 스타일' },
  { id: 'professional', label: '전문적인', emoji: '💼', description: '정확하고 전문적인 응답' },
  { id: 'creative', label: '창의적인', emoji: '🎨', description: '독창적이고 영감을 주는 스타일' },
  { id: 'analytical', label: '분석적인', emoji: '📊', description: '논리적이고 데이터 기반 접근' },
  { id: 'empathetic', label: '공감하는', emoji: '💝', description: '감정을 이해하고 공감하는 스타일' },
  { id: 'humorous', label: '유머러스', emoji: '😄', description: '위트있고 재미있는 대화' },
]

const TONE_PRESETS = [
  { id: 'formal', label: '격식체', description: '~합니다, ~입니다' },
  { id: 'casual', label: '반말', description: '~해, ~야' },
  { id: 'polite', label: '존댓말', description: '~해요, ~이에요' },
]

const ROLE_PRESETS = [
  { id: 'assistant', label: '개인 비서', icon: User, description: '일정 관리, 할일 추적' },
  { id: 'developer', label: '개발자', icon: Zap, description: '코딩, 디버깅, 코드 리뷰' },
  { id: 'analyst', label: '데이터 분석가', icon: Brain, description: '데이터 분석, 인사이트 도출' },
  { id: 'writer', label: '작가', icon: MessageSquare, description: '콘텐츠 작성, 편집' },
  { id: 'designer', label: '디자이너', icon: Palette, description: 'UI/UX, 디자인 피드백' },
  { id: 'custom', label: '직접 입력', icon: Settings, description: '커스텀 역할 정의' },
]

const VOICE_PRESETS = [
  { id: 'alloy', label: 'Alloy', description: '중성적이고 균형 잡힌 목소리' },
  { id: 'echo', label: 'Echo', description: '따뜻하고 자연스러운 남성 목소리' },
  { id: 'fable', label: 'Fable', description: '표현력 있는 영국식 억양' },
  { id: 'onyx', label: 'Onyx', description: '깊고 권위 있는 목소리' },
  { id: 'nova', label: 'Nova', description: '밝고 활기찬 여성 목소리' },
  { id: 'shimmer', label: 'Shimmer', description: '부드럽고 차분한 여성 목소리' },
]

const THEME_COLORS = [
  { id: 'violet', color: '#8b5cf6', label: '바이올렛' },
  { id: 'blue', color: '#3b82f6', label: '블루' },
  { id: 'green', color: '#22c55e', label: '그린' },
  { id: 'orange', color: '#f97316', label: '오렌지' },
  { id: 'pink', color: '#ec4899', label: '핑크' },
  { id: 'cyan', color: '#06b6d4', label: '시안' },
]

// ============================================
// Initial State
// ============================================

const initialAgentData: SuperAgentData = {
  name: '',
  description: '',
  avatar_url: null,
  personality: 'friendly',
  tone: 'polite',
  role: 'assistant',
  skills: [],
  capabilities: [],
  voice_enabled: false,
  voice_id: 'nova',
  voice_settings: { speed: 1.0, pitch: 1.0 },
  chat_main_gif: null,
  emotion_avatars: {},
  theme_color: '#8b5cf6',
}

// ============================================
// Main Component
// ============================================

export default function SuperAgentCreatorPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const { accentColor } = useThemeStore()
  const isDark = theme === 'dark'

  const [currentStep, setCurrentStep] = useState<CreationStep>('profile')
  const [agentData, setAgentData] = useState<SuperAgentData>(initialAgentData)
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [customRole, setCustomRole] = useState('')

  const currentAccent = accentColors.find((c) => c.id === accentColor) || accentColors[0]
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)

  // Fetch available skills from deployed agents
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch('/api/agents')
        if (res.ok) {
          const agents = await res.json()
          // Extract skills from workflow-based agents
          const skills: SkillItem[] = agents
            .filter((a: any) => a.workflow_nodes?.length > 0)
            .map((a: any) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              selected: false,
            }))
          setAvailableSkills(skills)
        }
      } catch (error) {
        console.error('Failed to fetch skills:', error)
      }
    }
    fetchSkills()
  }, [])

  const updateAgent = (updates: Partial<SuperAgentData>) => {
    setAgentData(prev => ({ ...prev, ...updates }))
  }

  const goToStep = (step: CreationStep) => {
    setCurrentStep(step)
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id)
    }
  }

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id)
    }
  }

  const handleSave = async () => {
    if (!agentData.name.trim()) {
      alert('에이전트 이름을 입력해주세요')
      setCurrentStep('profile')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentData.name,
          description: agentData.description,
          avatar_url: agentData.avatar_url,
          capabilities: [
            agentData.personality,
            agentData.tone,
            agentData.role === 'custom' ? customRole : agentData.role,
            ...agentData.capabilities,
          ],
          workflow_nodes: [], // Super Agent는 스킬 기반이므로 빈 워크플로우
          workflow_edges: [],
          voice_settings: agentData.voice_enabled ? {
            voice_id: agentData.voice_id,
            speed: agentData.voice_settings.speed,
            pitch: agentData.voice_settings.pitch,
          } : null,
          chat_main_gif: agentData.chat_main_gif,
          emotion_avatars: agentData.emotion_avatars,
          status: 'ACTIVE',
          // 연결된 스킬 IDs
          linked_skills: agentData.skills,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        router.push(`/dashboard-group/agents/${created.id}`)
      } else {
        throw new Error('저장 실패')
      }
    } catch (error) {
      console.error('Failed to save agent:', error)
      alert('저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSkill = (skillId: string) => {
    const newSkills = agentData.skills.includes(skillId)
      ? agentData.skills.filter(id => id !== skillId)
      : [...agentData.skills, skillId]
    updateAgent({ skills: newSkills })
  }

  // ============================================
  // Step Content Renderers
  // ============================================

  const renderProfileStep = () => (
    <div className="space-y-6">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            'w-32 h-32 rounded-3xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:scale-105',
            isDark ? 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'
          )}
          onClick={() => {/* TODO: 이미지 업로드 */}}
        >
          {agentData.avatar_url ? (
            <img src={agentData.avatar_url} alt="Avatar" className="w-full h-full rounded-3xl object-cover" />
          ) : (
            <div className="text-center">
              <Upload className={cn('w-8 h-8 mx-auto mb-2', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
              <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>아바타 업로드</span>
            </div>
          )}
        </div>
        <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          권장: 512x512px, PNG 또는 JPG
        </p>
      </div>

      {/* Name Input */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={agentData.name}
          onChange={(e) => updateAgent({ name: e.target.value })}
          placeholder="슈퍼 에이전트 이름"
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-lg font-medium transition-all',
            isDark
              ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-accent'
              : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-accent'
          )}
        />
      </div>

      {/* Description Input */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          설명
        </label>
        <textarea
          value={agentData.description}
          onChange={(e) => updateAgent({ description: e.target.value })}
          placeholder="이 에이전트가 어떤 역할을 하는지 설명해주세요"
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl border resize-none transition-all',
            isDark
              ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-accent'
              : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-accent'
          )}
        />
      </div>
    </div>
  )

  const renderPersonalityStep = () => (
    <div className="space-y-8">
      {/* Personality Selection */}
      <div>
        <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          성격
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PERSONALITY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => updateAgent({ personality: preset.id })}
              className={cn(
                'p-4 rounded-xl border text-left transition-all',
                agentData.personality === preset.id
                  ? 'border-accent bg-accent/10'
                  : isDark
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
              )}
            >
              <div className="text-2xl mb-2">{preset.emoji}</div>
              <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>{preset.label}</div>
              <div className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-500')}>{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tone Selection */}
      <div>
        <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          말투
        </label>
        <div className="flex gap-3">
          {TONE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => updateAgent({ tone: preset.id })}
              className={cn(
                'flex-1 p-4 rounded-xl border text-center transition-all',
                agentData.tone === preset.id
                  ? 'border-accent bg-accent/10'
                  : isDark
                    ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
              )}
            >
              <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>{preset.label}</div>
              <div className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-500')}>{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Role Selection */}
      <div>
        <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          역할
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ROLE_PRESETS.map((preset) => {
            const Icon = preset.icon
            return (
              <button
                key={preset.id}
                onClick={() => updateAgent({ role: preset.id })}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all',
                  agentData.role === preset.id
                    ? 'border-accent bg-accent/10'
                    : isDark
                      ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                )}
              >
                <Icon className={cn('w-5 h-5 mb-2', agentData.role === preset.id ? 'text-accent' : isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>{preset.label}</div>
                <div className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-zinc-500')}>{preset.description}</div>
              </button>
            )
          })}
        </div>

        {/* Custom Role Input */}
        {agentData.role === 'custom' && (
          <div className="mt-4">
            <input
              type="text"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="커스텀 역할을 입력하세요"
              className={cn(
                'w-full px-4 py-3 rounded-xl border transition-all',
                isDark
                  ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
              )}
            />
          </div>
        )}
      </div>
    </div>
  )

  const renderSkillsStep = () => (
    <div className="space-y-6">
      <div className={cn('p-4 rounded-xl', isDark ? 'bg-zinc-800/50' : 'bg-zinc-50')}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-accent" />
          <span className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
            스킬 연결
          </span>
        </div>
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          스킬 빌더에서 만든 스킬을 이 에이전트에 연결하세요. 연결된 스킬을 조합하여 다양한 작업을 수행할 수 있습니다.
        </p>
      </div>

      {availableSkills.length === 0 ? (
        <div className={cn('text-center py-12', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">아직 생성된 스킬이 없습니다</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard-group/neural-map')}
          >
            스킬 빌더로 이동
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableSkills.map((skill) => {
            const isSelected = agentData.skills.includes(skill.id)
            return (
              <button
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : isDark
                      ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isSelected ? 'bg-accent text-white' : isDark ? 'bg-zinc-700' : 'bg-zinc-100'
                    )}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                        {skill.name}
                      </div>
                      {skill.description && (
                        <div className={cn('text-xs mt-0.5 line-clamp-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                          {skill.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                    isSelected
                      ? 'bg-accent border-accent'
                      : isDark ? 'border-zinc-600' : 'border-zinc-300'
                  )}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        선택된 스킬: {agentData.skills.length}개
      </div>
    </div>
  )

  const renderVoiceStep = () => (
    <div className="space-y-6">
      {/* Voice Toggle */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-xl border',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <div className="flex items-center gap-3">
          <Volume2 className={cn('w-6 h-6', agentData.voice_enabled ? 'text-accent' : isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          <div>
            <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>음성 활성화</div>
            <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>에이전트가 음성으로 응답합니다</div>
          </div>
        </div>
        <button
          onClick={() => updateAgent({ voice_enabled: !agentData.voice_enabled })}
          className={cn(
            'w-14 h-8 rounded-full transition-colors relative',
            agentData.voice_enabled ? 'bg-accent' : isDark ? 'bg-zinc-700' : 'bg-zinc-200'
          )}
        >
          <div className={cn(
            'w-6 h-6 rounded-full bg-white absolute top-1 transition-all',
            agentData.voice_enabled ? 'right-1' : 'left-1'
          )} />
        </button>
      </div>

      {agentData.voice_enabled && (
        <>
          {/* Voice Selection */}
          <div>
            <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
              음성 선택
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VOICE_PRESETS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => updateAgent({ voice_id: voice.id })}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-all',
                    agentData.voice_id === voice.id
                      ? 'border-accent bg-accent/10'
                      : isDark
                        ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className={cn('w-4 h-4', agentData.voice_id === voice.id ? 'text-accent' : isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                    <span className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>{voice.label}</span>
                  </div>
                  <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>{voice.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                속도: {agentData.voice_settings.speed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={agentData.voice_settings.speed}
                onChange={(e) => updateAgent({
                  voice_settings: { ...agentData.voice_settings, speed: parseFloat(e.target.value) }
                })}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                피치: {agentData.voice_settings.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={agentData.voice_settings.pitch}
                onChange={(e) => updateAgent({
                  voice_settings: { ...agentData.voice_settings, pitch: parseFloat(e.target.value) }
                })}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )

  const renderAppearanceStep = () => (
    <div className="space-y-6">
      {/* Theme Color */}
      <div>
        <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          테마 색상
        </label>
        <div className="flex gap-3 flex-wrap">
          {THEME_COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => updateAgent({ theme_color: color.color })}
              className={cn(
                'w-12 h-12 rounded-xl transition-all',
                agentData.theme_color === color.color && 'ring-2 ring-offset-2 ring-offset-zinc-900'
              )}
              style={{
                backgroundColor: color.color,
                ringColor: color.color,
              }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Main GIF Upload */}
      <div>
        <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          메인 애니메이션 (GIF)
        </label>
        <div
          className={cn(
            'h-48 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02]',
            isDark ? 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'
          )}
          onClick={() => {/* TODO: GIF 업로드 */}}
        >
          {agentData.chat_main_gif ? (
            <img src={agentData.chat_main_gif} alt="Main GIF" className="h-full object-contain" />
          ) : (
            <div className="text-center">
              <ImageIcon className={cn('w-10 h-10 mx-auto mb-2', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
              <span className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>GIF 업로드</span>
              <p className={cn('text-xs mt-1', isDark ? 'text-zinc-600' : 'text-zinc-400')}>채팅 시 표시될 애니메이션</p>
            </div>
          )}
        </div>
      </div>

      {/* Emotion Avatars */}
      <div>
        <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
          감정별 아바타 (선택)
        </label>
        <div className="grid grid-cols-4 gap-3">
          {['happy', 'sad', 'angry', 'surprised'].map((emotion) => (
            <div
              key={emotion}
              className={cn(
                'aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105',
                isDark ? 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'
              )}
              onClick={() => {/* TODO: 감정별 아바타 업로드 */}}
            >
              <span className="text-2xl mb-1">
                {emotion === 'happy' && '😊'}
                {emotion === 'sad' && '😢'}
                {emotion === 'angry' && '😠'}
                {emotion === 'surprised' && '😮'}
              </span>
              <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                {emotion === 'happy' && '기쁨'}
                {emotion === 'sad' && '슬픔'}
                {emotion === 'angry' && '화남'}
                {emotion === 'surprised' && '놀람'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Preview Card */}
      <div className={cn(
        'p-6 rounded-2xl border',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: agentData.theme_color }}
          >
            {agentData.avatar_url ? (
              <img src={agentData.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              agentData.name.charAt(0).toUpperCase() || 'A'
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
              {agentData.name || '이름 없음'}
            </h2>
            <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              {agentData.description || '설명 없음'}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${agentData.theme_color}20`, color: agentData.theme_color }}>
                {PERSONALITY_PRESETS.find(p => p.id === agentData.personality)?.label || agentData.personality}
              </span>
              <span className={cn('text-xs px-2 py-1 rounded-full', isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600')}>
                {TONE_PRESETS.find(t => t.id === agentData.tone)?.label || agentData.tone}
              </span>
              <span className={cn('text-xs px-2 py-1 rounded-full', isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600')}>
                {agentData.role === 'custom' ? customRole : ROLE_PRESETS.find(r => r.id === agentData.role)?.label || agentData.role}
              </span>
              {agentData.voice_enabled && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  음성 활성화
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Skills Summary */}
      {agentData.skills.length > 0 && (
        <div className={cn(
          'p-4 rounded-xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
        )}>
          <h3 className={cn('font-medium mb-3', isDark ? 'text-white' : 'text-zinc-900')}>
            연결된 스킬 ({agentData.skills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {agentData.skills.map((skillId) => {
              const skill = availableSkills.find(s => s.id === skillId)
              return (
                <span
                  key={skillId}
                  className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent"
                >
                  {skill?.name || skillId}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Final Message */}
      <div className={cn(
        'p-4 rounded-xl text-center',
        isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-600'
      )}>
        <Sparkles className="w-8 h-8 mx-auto mb-2" />
        <p className="font-medium">모든 설정이 완료되었습니다!</p>
        <p className="text-sm opacity-80 mt-1">저장 버튼을 눌러 에이전트를 생성하세요</p>
      </div>
    </div>
  )

  // ============================================
  // Render
  // ============================================

  return (
    <div className={cn('min-h-screen', isDark ? 'bg-zinc-900' : 'bg-zinc-50')}>
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-xl',
        isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
      )}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">돌아가기</span>
              </Button>
              <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" />
              <div>
                <h1 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                  슈퍼 에이전트 생성
                </h1>
                <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  프로필 기반의 만능 AI 에이전트
                </p>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || !agentData.name.trim()}
              className="text-white"
              style={{ background: `linear-gradient(135deg, ${currentAccent.color}, ${currentAccent.hoverColor})` }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className={cn('border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isActive
                      ? 'bg-accent text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700'
                          : 'bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200'
                  )}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    'text-xs font-medium hidden md:block',
                    isActive
                      ? 'text-accent'
                      : isCompleted
                        ? 'text-green-500'
                        : isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    {step.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step Title */}
            <div className="mb-8">
              <h2 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                {STEPS[currentStepIndex].label}
              </h2>
              <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                {STEPS[currentStepIndex].description}
              </p>
            </div>

            {/* Step Content */}
            {currentStep === 'profile' && renderProfileStep()}
            {currentStep === 'personality' && renderPersonalityStep()}
            {currentStep === 'skills' && renderSkillsStep()}
            {currentStep === 'voice' && renderVoiceStep()}
            {currentStep === 'appearance' && renderAppearanceStep()}
            {currentStep === 'review' && renderReviewStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            이전
          </Button>

          {currentStepIndex < STEPS.length - 1 ? (
            <Button
              onClick={goNext}
              className="gap-2 text-white"
              style={{ background: `linear-gradient(135deg, ${currentAccent.color}, ${currentAccent.hoverColor})` }}
            >
              다음
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving || !agentData.name.trim()}
              className="gap-2 text-white"
              style={{ background: `linear-gradient(135deg, ${currentAccent.color}, ${currentAccent.hoverColor})` }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  생성 완료
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}

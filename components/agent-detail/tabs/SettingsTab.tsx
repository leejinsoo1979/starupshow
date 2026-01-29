'use client'

import { RefObject } from 'react'
import {
  Bot,
  Brain,
  Edit3,
  Save,
  Loader2,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  Upload,
  Trash2,
  Smile,
  Plus,
  Play,
  Square,
  Phone,
  Volume2,
  MessageSquare,
  UserCircle,
  Gauge,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROVIDER_INFO, LLMProvider, AVAILABLE_MODELS } from '@/lib/llm/models'
import {
  PROMPT_SECTIONS,
  DEFAULT_PROMPT_VALUES,
  VOICE_OPTIONS,
  CONVERSATION_STYLES,
  VAD_SENSITIVITY_OPTIONS,
} from '../constants'
import { formatDate, type CustomEmotion, type EmotionAvatars } from '../utils'

interface SettingsTabProps {
  agent: {
    id: string
    llm_provider?: string
    model?: string
    temperature?: number
    created_at?: string
    updated_at?: string
    last_active_at?: string
    prompt_sections?: Record<string, string>
    voice_settings?: {
      voice?: string
      conversation_style?: string
      vad_sensitivity?: string
    }
  }
  isDark: boolean
  mounted: boolean
  editingSection: string | null
  editForm: any
  setEditForm: (form: any) => void
  startEditing: (section: string, initialData: any) => void
  cancelEditing: () => void
  saveSection: (section: string) => Promise<void>
  saving: boolean
  providerInfo: { name: string } | null
  status: { label: string; color: string }
  expandedPromptSections: Record<string, boolean>
  setExpandedPromptSections: (sections: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
  // Chat main GIF
  chatMainGif: string | null
  uploadingChatMainGif: boolean
  chatMainGifInputRef: RefObject<HTMLInputElement>
  handleChatMainGifUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleChatMainGifDelete: () => void
  // Emotions
  allEmotions: CustomEmotion[]
  emotionAvatars: EmotionAvatars
  uploadingEmotion: string | null
  editingEmotion: Partial<CustomEmotion> | null
  setEditingEmotion: (emotion: Partial<CustomEmotion> | null) => void
  keywordInput: string
  setKeywordInput: (input: string) => void
  emotionFileInputRefs: RefObject<Record<string, HTMLInputElement | null>>
  handleEmotionImageUpload: (emotionId: string, e: React.ChangeEvent<HTMLInputElement>) => void
  handleDeleteCustomEmotion: (emotionId: string) => void
  handleUpdateEmotionKeywords: (emotionId: string, newKeywords: string[]) => void
  setShowAddEmotionModal: (show: boolean) => void
  // Voice settings
  previewingVoice: string | null
  previewVoice: (voiceId: string) => Promise<void>
}

export function SettingsTab({
  agent,
  isDark,
  mounted,
  editingSection,
  editForm,
  setEditForm,
  startEditing,
  cancelEditing,
  saveSection,
  saving,
  providerInfo,
  status,
  expandedPromptSections,
  setExpandedPromptSections,
  chatMainGif,
  uploadingChatMainGif,
  chatMainGifInputRef,
  handleChatMainGifUpload,
  handleChatMainGifDelete,
  allEmotions,
  emotionAvatars,
  uploadingEmotion,
  editingEmotion,
  setEditingEmotion,
  keywordInput,
  setKeywordInput,
  emotionFileInputRefs,
  handleEmotionImageUpload,
  handleDeleteCustomEmotion,
  handleUpdateEmotionKeywords,
  setShowAddEmotionModal,
  previewingVoice,
  previewVoice,
}: SettingsTabProps) {
  const voiceSettings = (agent as any).voice_settings || {}
  const selectedVoice = VOICE_OPTIONS.find(v => v.id === (voiceSettings.voice || 'sol'))
  const selectedStyle = CONVERSATION_STYLES.find(s => s.id === (voiceSettings.conversation_style || 'friendly'))
  const selectedVad = VAD_SENSITIVITY_OPTIONS.find(v => v.id === (voiceSettings.vad_sensitivity || 'medium'))

  return (
    <div className="space-y-8">
      <div>
        <h2 className={cn('text-2xl md:text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-zinc-900')}>
          설정
        </h2>
        <div className="w-10 h-1 bg-accent rounded-full mb-6" />
      </div>

      {/* LLM Settings - Editable */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
            <Bot className="w-5 h-5 text-blue-500" />
            LLM 설정
          </h3>
          {editingSection !== 'llm' && (
            <button
              onClick={() =>
                startEditing('llm', {
                  llm_provider: agent.llm_provider || 'ollama',
                  model: agent.model || 'qwen2.5:3b',
                  temperature: agent.temperature ?? 0.7,
                })
              }
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm',
                isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
              )}
            >
              <Edit3 className="w-4 h-4" />
              편집
            </button>
          )}
        </div>

        {editingSection === 'llm' ? (
          <div className="space-y-4">
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                Provider
              </label>
              <select
                value={editForm.llm_provider || 'ollama'}
                onChange={(e) => {
                  const newProvider = e.target.value as LLMProvider
                  const models = AVAILABLE_MODELS[newProvider]
                  setEditForm({
                    ...editForm,
                    llm_provider: newProvider,
                    model: models?.[0] || '',
                  })
                }}
                className={cn(
                  'w-full px-4 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-200 text-zinc-900'
                )}
              >
                {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                Model
              </label>
              <select
                value={editForm.model || ''}
                onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-200 text-zinc-900'
                )}
              >
                {(AVAILABLE_MODELS[editForm.llm_provider as LLMProvider] || []).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                Temperature: {editForm.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={editForm.temperature || 0.7}
                onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs mt-1">
                <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>정확한 (0)</span>
                <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>창의적 (2)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={cancelEditing}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
                )}
              >
                취소
              </button>
              <button
                onClick={() => saveSection('llm')}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Provider', value: providerInfo?.name || agent.llm_provider || 'Ollama' },
              { label: 'Model', value: agent.model || 'qwen2.5:3b' },
              { label: 'Temperature', value: agent.temperature ?? 0.7 },
              { label: '상태', value: status.label, color: status.color },
            ].map((item, idx) => (
              <div key={idx} className={cn('p-4 rounded-lg', isDark ? 'bg-zinc-900' : 'bg-white')}>
                <p className={cn('text-xs uppercase mb-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  {item.label}
                </p>
                <p
                  className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}
                  style={item.color ? { color: item.color } : undefined}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 에이전트 프롬프트 (8섹션) - Editable */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
            <Brain className="w-5 h-5 text-purple-500" />
            에이전트 행동 프롬프트 (8섹션)
          </h3>
          {editingSection !== 'prompt_sections' && (
            <button
              onClick={() => {
                const promptSections = (agent as any).prompt_sections || {}
                startEditing('prompt_sections', {
                  work_operating_model: promptSections.work_operating_model || DEFAULT_PROMPT_VALUES.work_operating_model,
                  human_communication: promptSections.human_communication || DEFAULT_PROMPT_VALUES.human_communication,
                  professional_habits: promptSections.professional_habits || DEFAULT_PROMPT_VALUES.professional_habits,
                  no_hallucination: promptSections.no_hallucination || DEFAULT_PROMPT_VALUES.no_hallucination,
                  collaboration_conflict: promptSections.collaboration_conflict || DEFAULT_PROMPT_VALUES.collaboration_conflict,
                  deliverable_templates: promptSections.deliverable_templates || DEFAULT_PROMPT_VALUES.deliverable_templates,
                  context_anchor: promptSections.context_anchor || DEFAULT_PROMPT_VALUES.context_anchor,
                  response_format: promptSections.response_format || DEFAULT_PROMPT_VALUES.response_format,
                  messenger_rules: promptSections.messenger_rules || DEFAULT_PROMPT_VALUES.messenger_rules,
                })
              }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm',
                isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
              )}
            >
              <Edit3 className="w-4 h-4" />
              편집
            </button>
          )}
        </div>

        <p className={cn('text-sm mb-4', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
          에이전트가 사람처럼 행동하도록 8개 영역의 프롬프트를 설정합니다.
        </p>

        {editingSection === 'prompt_sections' ? (
          <div className="space-y-3">
            {PROMPT_SECTIONS.map((section) => {
              const IconComponent = section.icon
              const isExpanded = expandedPromptSections[section.key]
              return (
                <div
                  key={section.key}
                  className={cn(
                    'rounded-lg border overflow-hidden',
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedPromptSections(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
                    className={cn(
                      'w-full flex items-center justify-between p-4 text-left',
                      isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 text-accent" />
                      <div>
                        <span className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                          {section.label}
                        </span>
                        <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                          {section.description}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className={cn('w-5 h-5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                    ) : (
                      <ChevronDown className={cn('w-5 h-5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <textarea
                        value={editForm[section.key] || ''}
                        onChange={(e) => setEditForm({ ...editForm, [section.key]: e.target.value })}
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border resize-none font-mono text-sm',
                          isDark
                            ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                        )}
                        rows={10}
                        placeholder={`${section.label} 관련 프롬프트를 입력하세요...`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={cancelEditing}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
                )}
              >
                취소
              </button>
              <button
                onClick={() => saveSection('prompt_sections')}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {PROMPT_SECTIONS.map((section) => {
              const IconComponent = section.icon
              const promptSections = (agent as any).prompt_sections || {}
              const hasCustomValue = promptSections[section.key] && promptSections[section.key].trim() !== ''
              return (
                <div
                  key={section.key}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg',
                    isDark ? 'bg-zinc-900' : 'bg-white'
                  )}
                >
                  <IconComponent className={cn('w-4 h-4', hasCustomValue ? 'text-green-500' : 'text-zinc-400')} />
                  <span className={cn('text-sm', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                    {section.label}
                  </span>
                  {hasCustomValue ? (
                    <span className="text-xs text-green-500 ml-auto">설정됨</span>
                  ) : (
                    <span className={cn('text-xs ml-auto', isDark ? 'text-zinc-500' : 'text-zinc-400')}>기본값</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 채팅 메인 이미지 설정 */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
            <ImagePlus className="w-5 h-5 text-cyan-500" />
            채팅 메인 이미지
          </h3>
        </div>
        <p className={cn('text-sm mb-4', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
          채팅 시작 화면에 표시될 대표 GIF/이미지를 설정하세요.
        </p>

        <div className="flex items-start gap-6">
          <div
            className={cn(
              'relative w-40 h-40 rounded-2xl overflow-hidden cursor-pointer group',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}
            onClick={() => chatMainGifInputRef.current?.click()}
          >
            {uploadingChatMainGif ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : chatMainGif ? (
              <>
                <img
                  src={chatMainGif}
                  alt="채팅 메인"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      chatMainGifInputRef.current?.click()
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30"
                    title="변경"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChatMainGifDelete()
                    }}
                    className="p-2 rounded-full bg-red-500/50 hover:bg-red-500/70"
                    title="삭제"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Upload className={cn('w-8 h-8', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                  클릭하여 업로드
                </span>
              </div>
            )}
          </div>
          <input
            ref={chatMainGifInputRef}
            type="file"
            accept="image/*"
            onChange={handleChatMainGifUpload}
            className="hidden"
          />
          <div className="flex-1">
            <div className={cn('text-sm space-y-2', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              <p>• 채팅을 시작하기 전 화면에 크게 표시됩니다</p>
              <p>• GIF 또는 이미지 파일을 업로드할 수 있습니다</p>
              <p>• 최대 10MB까지 지원됩니다</p>
              <p>• 미설정 시 기본 감정 아바타가 표시됩니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* 감정 아바타 설정 */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
            <Smile className="w-5 h-5 text-yellow-500" />
            감정 아바타
          </h3>
          <button
            onClick={() => setShowAddEmotionModal(true)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm',
              isDark ? 'bg-pink-600 hover:bg-pink-500 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'
            )}
          >
            <Plus className="w-4 h-4" />
            새 감정 추가
          </button>
        </div>
        <p className={cn('text-sm mb-4', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
          대화 중 에이전트의 감정에 따라 표시될 아바타 GIF를 설정하세요. 각 감정에 최대 4개의 이미지를 추가하면 랜덤으로 표시됩니다.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allEmotions.map((emotion) => (
            <div
              key={emotion.id}
              className={cn(
                'group relative p-3 rounded-xl border',
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              )}
            >
              {!emotion.isDefault && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    isDark ? 'bg-pink-600 text-white' : 'bg-pink-500 text-white'
                  )}>
                    커스텀
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emotion.emoji}</span>
                  <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                    {(emotion as any).label || emotion.id}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingEmotion({ ...emotion })
                      setKeywordInput('')
                    }}
                    className={cn(
                      'p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700',
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    )}
                    title="키워드 편집"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  {!emotion.isDefault && (
                    <button
                      onClick={() => handleDeleteCustomEmotion(emotion.id)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const avatarData = emotionAvatars[emotion.id]
                const imageUrls: string[] = avatarData
                  ? (Array.isArray(avatarData) ? avatarData : [avatarData])
                  : []
                return (
                  <div
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden cursor-pointer',
                      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                    )}
                    onClick={() => emotionFileInputRefs.current?.[emotion.id]?.click()}
                  >
                    {uploadingEmotion === emotion.id ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      </div>
                    ) : imageUrls.length > 0 ? (
                      <>
                        {imageUrls.length === 1 ? (
                          <img
                            src={imageUrls[0]}
                            alt={(emotion as any).label || emotion.id}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full p-0.5">
                            {imageUrls.slice(0, 4).map((url, idx) => (
                              <div key={idx} className="rounded-sm overflow-hidden">
                                <img src={url} alt={`${(emotion as any).label || emotion.id}-${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {imageUrls.length < 4 && Array.from({ length: 4 - imageUrls.length }).map((_, idx) => (
                              <div key={`empty-${idx}`} className={cn('rounded-sm', isDark ? 'bg-zinc-700/50' : 'bg-zinc-200/50')} />
                            ))}
                          </div>
                        )}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                          {imageUrls.length}/4
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              emotionFileInputRefs.current?.[emotion.id]?.click()
                            }}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30"
                            title={imageUrls.length < 4 ? "추가" : "변경"}
                          >
                            <Upload className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <Upload className={cn('w-6 h-6', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                        <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                          업로드
                        </span>
                      </div>
                    )}
                    <input
                      ref={(el) => { if (emotionFileInputRefs.current) emotionFileInputRefs.current[emotion.id] = el }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleEmotionImageUpload(emotion.id, e)}
                      className="hidden"
                    />
                  </div>
                )
              })()}

              {/* 키워드 편집 인라인 */}
              {editingEmotion?.id === emotion.id && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {(editingEmotion.keywords || []).map((kw, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                          isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
                        )}
                      >
                        {kw}
                        <button
                          onClick={() => {
                            const newKeywords = [...(editingEmotion.keywords || [])]
                            newKeywords.splice(idx, 1)
                            setEditingEmotion({ ...editingEmotion, keywords: newKeywords })
                          }}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && keywordInput.trim()) {
                          e.preventDefault()
                          setEditingEmotion({
                            ...editingEmotion,
                            keywords: [...(editingEmotion.keywords || []), keywordInput.trim()]
                          })
                          setKeywordInput('')
                        }
                      }}
                      placeholder="키워드 입력 후 Enter"
                      className={cn(
                        'flex-1 px-2 py-1 text-xs rounded border',
                        isDark ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'bg-white border-zinc-200'
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-1 mt-2">
                    <button
                      onClick={() => setEditingEmotion(null)}
                      className={cn(
                        'px-2 py-1 text-xs rounded',
                        isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
                      )}
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateEmotionKeywords(emotion.id, editingEmotion.keywords || [])
                        setEditingEmotion(null)
                      }}
                      className="px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent/90"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 음성 통화 설정 */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
            <Phone className="w-5 h-5 text-green-500" />
            음성 통화 설정
          </h3>
          {editingSection !== 'voice_settings' && (
            <button
              onClick={() => {
                startEditing('voice_settings', {
                  voice: voiceSettings.voice || 'sol',
                  conversation_style: voiceSettings.conversation_style || 'friendly',
                  vad_sensitivity: voiceSettings.vad_sensitivity || 'medium',
                })
              }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm',
                isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
              )}
            >
              <Edit3 className="w-4 h-4" />
              편집
            </button>
          )}
        </div>
        <p className={cn('text-sm mb-4', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
          음성 통화 시 에이전트의 목소리와 대화 스타일을 설정합니다.
        </p>

        {editingSection === 'voice_settings' ? (
          <div className="space-y-6">
            {/* 음성 선택 */}
            <div>
              <label className={cn('text-sm font-medium flex items-center gap-2 mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                <Volume2 className="w-4 h-4" />
                음성 선택
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {VOICE_OPTIONS.map((voice) => (
                  <div
                    key={voice.id}
                    className={cn(
                      'relative p-3 rounded-xl border-2 transition-all cursor-pointer',
                      editForm.voice === voice.id
                        ? 'border-accent bg-accent/10'
                        : isDark
                          ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    )}
                    onClick={() => setEditForm({ ...editForm, voice: voice.id })}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          voice.gender === 'female'
                            ? 'bg-pink-500/20 text-pink-500'
                            : voice.gender === 'male'
                              ? 'bg-blue-500/20 text-blue-500'
                              : 'bg-purple-500/20 text-purple-500'
                        )}>
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <span className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                          {voice.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          previewVoice(voice.id)
                        }}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                          previewingVoice === voice.id
                            ? 'bg-accent text-white'
                            : isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'
                        )}
                        title={previewingVoice === voice.id ? '정지' : '미리듣기'}
                      >
                        {previewingVoice === voice.id ? (
                          <Square className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3 ml-0.5" />
                        )}
                      </button>
                    </div>
                    <p className={cn('text-xs pl-10', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      {voice.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 대화 스타일 */}
            <div>
              <label className={cn('text-sm font-medium flex items-center gap-2 mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                <MessageSquare className="w-4 h-4" />
                대화 스타일
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CONVERSATION_STYLES.map((style) => (
                  <div
                    key={style.id}
                    className={cn(
                      'p-3 rounded-xl border-2 transition-all cursor-pointer text-center',
                      editForm.conversation_style === style.id
                        ? 'border-accent bg-accent/10'
                        : isDark
                          ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    )}
                    onClick={() => setEditForm({ ...editForm, conversation_style: style.id })}
                  >
                    <span className="text-2xl mb-1 block">{style.emoji}</span>
                    <span className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-zinc-900')}>
                      {style.name}
                    </span>
                    <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      {style.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* VAD 감도 */}
            <div>
              <label className={cn('text-sm font-medium flex items-center gap-2 mb-3', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                <Gauge className="w-4 h-4" />
                음성 인식 감도 (VAD)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {VAD_SENSITIVITY_OPTIONS.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      'p-3 rounded-xl border-2 transition-all cursor-pointer',
                      editForm.vad_sensitivity === option.id
                        ? 'border-accent bg-accent/10'
                        : isDark
                          ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    )}
                    onClick={() => setEditForm({ ...editForm, vad_sensitivity: option.id })}
                  >
                    <span className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                      {option.name}
                    </span>
                    <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      {option.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={cancelEditing}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
                )}
              >
                취소
              </button>
              <button
                onClick={() => saveSection('voice_settings')}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(() => {
              return (
                <>
                  <div className={cn('p-4 rounded-lg', isDark ? 'bg-zinc-900' : 'bg-white')}>
                    <p className={cn('text-xs uppercase mb-1 flex items-center gap-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      <Volume2 className="w-3 h-3" />
                      음성
                    </p>
                    <p className={cn('font-medium flex items-center gap-2', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center',
                        selectedVoice?.gender === 'female'
                          ? 'bg-pink-500/20 text-pink-500'
                          : selectedVoice?.gender === 'male'
                            ? 'bg-blue-500/20 text-blue-500'
                            : 'bg-purple-500/20 text-purple-500'
                      )}>
                        <UserCircle className="w-4 h-4" />
                      </div>
                      {selectedVoice?.name || 'Sol'}
                    </p>
                  </div>
                  <div className={cn('p-4 rounded-lg', isDark ? 'bg-zinc-900' : 'bg-white')}>
                    <p className={cn('text-xs uppercase mb-1 flex items-center gap-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      <MessageSquare className="w-3 h-3" />
                      대화 스타일
                    </p>
                    <p className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                      {selectedStyle?.name || '친근함'}
                    </p>
                  </div>
                  <div className={cn('p-4 rounded-lg', isDark ? 'bg-zinc-900' : 'bg-white')}>
                    <p className={cn('text-xs uppercase mb-1 flex items-center gap-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      <Gauge className="w-3 h-3" />
                      인식 감도
                    </p>
                    <p className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                      {selectedVad?.name || '보통'}
                    </p>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <h3 className={cn('font-semibold mb-4 flex items-center gap-2', isDark ? 'text-white' : 'text-zinc-900')}>
          <Briefcase className="w-5 h-5 text-zinc-500" />
          메타데이터
        </h3>
        <div className="space-y-3">
          {[
            { label: 'ID', value: agent.id },
            { label: '생성일', value: formatDate(agent.created_at || null, mounted) },
            { label: '마지막 수정', value: formatDate(agent.updated_at || null, mounted) },
            { label: '마지막 활동', value: formatDate(agent.last_active_at || null, mounted) },
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{item.label}</span>
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-zinc-300' : 'text-zinc-700',
                  item.label === 'ID' && 'font-mono text-xs'
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

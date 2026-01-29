// Agent Detail Utility Functions
// Extracted from app/dashboard-group/agents/[id]/page.tsx for better maintainability

import type { AgentStatus } from '@/types/database'

export type EmotionType = 'neutral' | 'happy' | 'sad' | 'excited' | 'thinking' | 'confused' | 'angry' | string

// Agent type with memory and additional fields
export interface AgentWithMemory {
  id: string
  name: string
  description?: string | null
  avatar_url?: string | null
  status: AgentStatus
  llm_provider?: string | null
  model?: string | null
  temperature?: number | null
  created_at: string
  last_active_at?: string | null
  updated_at?: string
  team?: { id: string; name: string } | null
  team_id?: string | null
  job_title?: string | null
  identity?: {
    core_values?: string[]
    personality_traits?: string[]
    communication_style?: string
    strengths?: string[]
    growth_areas?: string[]
    self_summary?: string
    working_style?: string
    recent_focus?: string
  }
  prompt_sections?: Record<string, string>
  capabilities?: string[]
  voice_settings?: {
    voice?: string
    conversation_style?: string
    vad_sensitivity?: string
  }
  integrations?: any
  custom_emotions?: CustomEmotion[]
  emotion_avatars?: EmotionAvatars
  system_prompt?: string
  // Memory related
  memories?: any[]
  stats?: {
    total_conversations?: number
    total_tasks_completed?: number
    streak_days?: number
  }
  // Workflow related
  workflow_nodes?: any[]
}

export interface CustomEmotion {
  id: string
  name: string
  label?: string
  emoji?: string
  keywords: string[]
  isDefault?: boolean
  description?: string
}

export interface EmotionAvatars {
  [key: string]: string | string[] | undefined
}

// 텍스트에서 감정 분석 (커스텀 감정 포함) - 단일 감정 반환 (호환성 유지)
export function detectEmotion(text: string, customEmotions: CustomEmotion[] = []): EmotionType {
  const emotions = detectEmotionsInOrder(text, customEmotions)
  return emotions.length > 0 ? emotions[0] : 'neutral'
}

// 텍스트에서 다중 감정 분석 (텍스트 등장 순서대로 반환)
export function detectEmotionsInOrder(text: string, customEmotions: CustomEmotion[] = []): EmotionType[] {
  const lowerText = text.toLowerCase()

  // 감정별 첫 등장 위치를 저장
  const emotionPositions: { emotion: EmotionType; position: number }[] = []

  // 커스텀 감정 체크 (위치 추적)
  for (const emotion of customEmotions) {
    if (!emotion.isDefault && emotion.keywords && emotion.keywords.length > 0) {
      let earliestPos = -1
      for (const keyword of emotion.keywords) {
        const keywordLower = keyword.toLowerCase()
        const pos = lowerText.indexOf(keywordLower)
        if (pos !== -1 && (earliestPos === -1 || pos < earliestPos)) {
          earliestPos = pos
        }
      }
      if (earliestPos !== -1) {
        emotionPositions.push({ emotion: emotion.id, position: earliestPos })
      }
    }
  }

  // 기본 감정 패턴과 키워드 (위치 추적을 위해 키워드도 포함)
  const emotionPatterns: { emotion: EmotionType; patterns: RegExp[]; keywords: string[] }[] = [
    {
      emotion: 'excited',
      patterns: [
        /대박|와[아~!]+|오[오~!]+|짱|최고|멋[지져]|굿|good|great|awesome|amazing/i,
        /축하|성공|완료|해냈|드디어|야호|신[나난]|기[대쁨]|흥분/i,
        /!{2,}|🎉|🎊|🥳|👏|✨|💪|🔥/,
      ],
      keywords: ['대박', '짱', '최고', '멋', '굿', 'good', 'great', 'awesome', 'amazing', '축하', '성공', '완료', '해냈', '드디어', '야호', '신나', '🎉', '🎊', '🥳', '👏', '✨', '💪', '🔥'],
    },
    {
      emotion: 'happy',
      patterns: [
        /좋[아은]|네[네~]|감사|고마[워요]|다행|반가[워요]|기[쁘뻐]|행복/i,
        /ㅎㅎ|ㅋㅋ|하하|히히|웃|재[미밌]|즐[거겁]|좋겠/i,
        /😊|😄|😃|🙂|☺️|😁|💕|❤️|👍/,
      ],
      keywords: ['좋아', '좋은', '감사', '고마워', '다행', '반가워', '기뻐', '행복', 'ㅎㅎ', 'ㅋㅋ', '하하', '히히', '재밌', '즐거', '😊', '😄', '😃', '🙂', '😁', '💕', '❤️', '👍'],
    },
    {
      emotion: 'thinking',
      patterns: [
        /음+[\.…~]|흠+|글쎄|잠[깐시만]|생각|고민|분석|검토|살펴/i,
        /아마|혹시|어떨까|일단|한번|보[자니면]|확인|조사|파악/i,
        /\.{3,}|…|🤔|💭|📊|📈/,
      ],
      keywords: ['음', '흠', '글쎄', '잠깐', '생각', '고민', '분석', '검토', '살펴', '아마', '혹시', '어떨까', '일단', '한번', '확인', '조사', '파악', '...', '…', '🤔', '💭', '📊', '📈'],
    },
    {
      emotion: 'confused',
      patterns: [
        /모르겠|이해가 안|잘 모|헷갈|어렵|복잡|난해|혼란/i,
        /뭐지|왜지|어떻게|뭔가|이상하|당황|황당|멘붕/i,
        /\?{2,}|😅|😓|🤷|😵|🫤|😕/,
      ],
      keywords: ['모르겠', '이해가 안', '잘 모', '헷갈', '복잡', '난해', '혼란', '뭐지', '왜지', '어떻게', '뭔가', '이상하', '당황', '황당', '멘붕', '??', '😅', '😓', '🤷', '😵', '😕'],
    },
    {
      emotion: 'sad',
      patterns: [
        /죄송|미안|안타깝|유감|실[망패]|아쉽|슬[프픔]|힘[들든]/i,
        /어렵|불가능|안 될|못 [하해]|포기|걱정|우울|속상/i,
        /ㅠ+|ㅜ+|😢|😭|😔|😞|💔|🥲/,
      ],
      keywords: ['죄송', '미안', '안타깝', '유감', '실망', '실패', '아쉽', '슬프', '힘들', '어렵', '불가능', '안 될', '포기', '걱정', '우울', '속상', 'ㅠㅠ', 'ㅜㅜ', '😢', '😭', '😔', '😞', '💔', '🥲'],
    },
    {
      emotion: 'angry',
      patterns: [
        /화[나남]|짜증|열[받뻗]|싫|별로|최악|나쁜|문제/i,
        /안[돼됨되요]|하지 마|그만|경고|위험|심각|주의/i,
        /!+\?|😤|😠|😡|🤬|💢|⚠️/,
      ],
      keywords: ['화나', '화남', '짜증', '열받', '싫', '별로', '최악', '나쁜', '문제', '안돼', '하지 마', '그만', '경고', '위험', '심각', '주의', '😤', '😠', '😡', '🤬', '💢', '⚠️'],
    },
  ]

  // 각 기본 감정 패턴 체크 (위치 추적 포함)
  for (const { emotion, patterns, keywords } of emotionPatterns) {
    // 먼저 패턴 매칭으로 감정이 있는지 확인
    let hasEmotion = false
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        hasEmotion = true
        break
      }
    }

    // 감정이 있으면 키워드로 위치 찾기
    if (hasEmotion) {
      let earliestPos = text.length // 못 찾으면 맨 뒤로
      for (const keyword of keywords) {
        const pos = lowerText.indexOf(keyword.toLowerCase())
        if (pos !== -1 && pos < earliestPos) {
          earliestPos = pos
        }
      }
      // 이미 같은 감정이 있는지 확인 (커스텀에서 추가됐을 수 있음)
      const alreadyExists = emotionPositions.some(ep => ep.emotion === emotion)
      if (!alreadyExists) {
        emotionPositions.push({ emotion, position: earliestPos })
      }
    }
  }

  // 위치 순서로 정렬
  emotionPositions.sort((a, b) => a.position - b.position)

  // 감정만 추출해서 반환 (중복 제거)
  const result: EmotionType[] = []
  for (const { emotion } of emotionPositions) {
    if (!result.includes(emotion)) {
      result.push(emotion)
    }
  }

  return result
}

export function formatDate(dateString: string | null, mounted: boolean = true): string {
  if (!dateString) return '-'
  if (!mounted) return '-' // Prevent hydration mismatch
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTimeAgo(dateString: string | null, mounted: boolean = true): string {
  if (!dateString) return ''
  if (!mounted) return '-' // Prevent hydration mismatch
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  return `${diffDay}일 전`
}

export function generateRobotAvatar(name: string): string {
  const seed = encodeURIComponent(name)
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=3B82F6,10B981,F59E0B,EF4444,8B5CF6,EC4899`
}

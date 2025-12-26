"use client"

/**
 * MeetingVoiceChat - 회의실 다자간 음성 채팅 (진짜 티키타카 버전)
 *
 * 🔥 새로운 아키텍처:
 * 1. 사용자 발화 → xAI Grok으로 STT (음성→텍스트)
 * 2. 각 에이전트별 개별 Chat API 호출 (완전한 페르소나 유지)
 * 3. 각 에이전트별 TTS로 음성 응답 (각자 다른 목소리)
 * 4. 순차적 응답으로 진짜 회의처럼 대화
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Loader2, Users, Hand, AlertCircle, MessageCircle, Eye, Upload, X, Image as ImageIcon, ChevronDown, ChevronUp, GripVertical, Globe } from "lucide-react"
import { AIViewfinder, ViewfinderCaptureResult } from "@/components/neural-map/viewfinder/AIViewfinder"

// 참여자 타입
interface VoiceParticipant {
  id: string
  name: string
  type: "user" | "agent"
  avatarUrl?: string
  voice?: "sol" | "tara" | "cove" | "puck" | "charon" | "vale" | "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"
  role?: string
  color?: string
  systemPrompt?: string  // 🔥 각 에이전트의 완전한 페르소나
}

// 음성 메시지
interface VoiceMessage {
  id: string
  participantId: string
  participantName: string
  participantType: "user" | "agent"
  text: string
  timestamp: Date
  isComplete: boolean
}

// 🔥 공유된 자료 (이미지, 문서 등)
interface SharedDocument {
  id: string
  name: string
  type: 'image' | 'pdf' | 'document' | 'url'
  content: string  // base64 또는 URL
  mimeType?: string
  analysis?: string  // AI가 분석한 내용
  timestamp: Date
}

interface MeetingVoiceChatProps {
  roomId: string
  participants: VoiceParticipant[]
  currentUserId: string
  currentUserName: string
  onMessage?: (message: VoiceMessage) => void
  onTranscript?: (text: string, participantId: string) => void
  meetingTopic?: string
  /** 🔥 공유된 자료들 (이미지, 문서 등) */
  sharedDocuments?: SharedDocument[]
  /** 🔥 자료 분석 완료 콜백 */
  onDocumentAnalyzed?: (docId: string, analysis: string) => void
  /** 🔭 파일 공유 콜백 (뷰파인더 캡처 또는 파일 업로드) */
  onShareFile?: (file: File | { dataUrl: string; name: string; type: string }) => void
  /** 🌐 브라우저 열기 콜백 */
  onOpenBrowser?: () => void
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"
type SpeakingStatus = "idle" | "listening" | "speaking" | "waiting"

// 역할별 기본 음성 매핑 (Grok 음성만 사용)
// Grok 음성: sol(차분 여성), tara(활기 여성), cove(따뜻 남성), puck(유쾌 남성), charon(깊은 남성), vale(중성)
const ROLE_VOICE_MAP: Record<string, string> = {
  strategist: "charon",
  analyst: "sol",
  executor: "cove",
  critic: "puck",
  mediator: "vale",
  default: "tara",
}

// 에이전트 이름별 음성 매핑 (Grok 음성만 사용)
const AGENT_NAME_VOICE_MAP: Record<string, string> = {
  // 여성 에이전트
  "에이미": "tara",
  "amy": "tara",
  "레이첼": "sol",
  "rachel": "sol",
  "소피아": "tara",
  "sophia": "tara",
  "애니": "vale",
  "ani": "vale",
  // 남성 에이전트
  "제레미": "charon",
  "jeremy": "charon",
  "마이클": "cove",
  "michael": "cove",
}

// 에이전트의 음성 결정 (이름 > 역할 > 기본값)
function getVoiceForAgent(agent: VoiceParticipant): string {
  // 1. 에이전트 props에 voice가 직접 설정되어 있으면 사용
  if (agent.voice) return agent.voice

  // 2. 에이전트 이름으로 매핑
  const nameLower = agent.name.toLowerCase()
  if (AGENT_NAME_VOICE_MAP[agent.name]) return AGENT_NAME_VOICE_MAP[agent.name]
  if (AGENT_NAME_VOICE_MAP[nameLower]) return AGENT_NAME_VOICE_MAP[nameLower]

  // 3. 역할로 매핑
  if (agent.role && ROLE_VOICE_MAP[agent.role]) return ROLE_VOICE_MAP[agent.role]

  // 4. 기본값
  return ROLE_VOICE_MAP.default
}

export function MeetingVoiceChat({
  roomId,
  participants,
  currentUserId,
  currentUserName,
  onMessage,
  onTranscript,
  meetingTopic = "회의",
  sharedDocuments = [],
  onDocumentAnalyzed,
  onShareFile,
  onOpenBrowser,
}: MeetingVoiceChatProps) {
  // 연결 상태
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)

  // 🔭 뷰파인더 상태
  const [showViewfinder, setShowViewfinder] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 📂 자료공유창 폴딩 상태
  const [isDocsCollapsed, setIsDocsCollapsed] = useState(false)

  // 📐 패널 리사이즈 상태
  const [panelWidth, setPanelWidth] = useState(320) // 기본 320px
  const isResizingRef = useRef(false)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)

  // 차례 관리
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null)
  const [speakingStatus, setSpeakingStatus] = useState<SpeakingStatus>("idle")
  const [turnQueue, setTurnQueue] = useState<string[]>([])
  const [handRaised, setHandRaised] = useState(false)

  // 메시지 및 트랜스크립트
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [currentTranscript, setCurrentTranscript] = useState<string>("")
  const [agentResponses, setAgentResponses] = useState<Map<string, string>>(new Map())

  // 오디오 관련 refs
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const turnLockRef = useRef(false)

  // AI 에이전트 응답 큐 (진짜 멀티 에이전트 턴)
  const agentResponseQueueRef = useRef<{ agentId: string; text: string; voice: string }[]>([])
  const isAgentSpeakingRef = useRef(false)
  const agentContextsRef = useRef<Map<string, { prompt: string; voice: string; chatHistory: any[] }>>(new Map())
  const isProcessingResponseRef = useRef(false)

  // 참여자 중 AI 에이전트만 필터링
  const agentParticipants = participants.filter(p => p.type === "agent")
  const userParticipants = participants.filter(p => p.type === "user")

  // 현재 사용자가 말할 차례인지 확인
  const isMyTurn = currentSpeaker === currentUserId || currentSpeaker === null

  // 🔥 회의 전용 API로 에이전트 응답 요청 (에이전트 간 대화 지원)
  const getAgentResponse = useCallback(async (
    agentId: string,
    agentName: string,
    lastMessage: string,
    lastSpeaker: string
  ): Promise<{ text: string; voice: string } | null> => {
    const agentContext = agentContextsRef.current.get(agentId)
    if (!agentContext) {
      console.warn(`[MeetingVoice] No context for agent: ${agentName}`)
      return null
    }

    try {
      // 🔥 회의 전용 Chat API 호출 (에이전트 간 대화 지원)
      const response = await fetch('/api/meeting/chat', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          agentName,
          systemPrompt: agentContext.prompt,
          lastSpeaker,                    // 🔥 마지막 발화자 (사용자 or 다른 에이전트)
          lastMessage,                    // 🔥 마지막 발화 내용
          conversationHistory: meetingHistoryRef.current,  // 🔥 전체 회의 대화
          meetingTopic,
          participants: [currentUserName, ...agentParticipants.map(a => a.name)],
          sharedDocuments,                // 🔭 공유된 문서들 (비전 분석 결과 포함)
        }),
      })

      if (!response.ok) {
        console.error(`[MeetingVoice] Meeting Chat API failed for ${agentName}`)
        return null
      }

      const data = await response.json()
      const agentText = data.response || ""

      console.log(`[MeetingVoice] 💬 ${agentName} responds to ${lastSpeaker}:`, agentText.substring(0, 50))

      return { text: agentText, voice: agentContext.voice }
    } catch (error) {
      console.error(`[MeetingVoice] Error getting response from ${agentName}:`, error)
      return null
    }
  }, [meetingTopic, currentUserName, agentParticipants, sharedDocuments])

  // 🔥 에이전트 응답을 TTS로 재생
  const playAgentResponse = useCallback(async (agentId: string, agentName: string, text: string, voice: string) => {
    if (!text || isSpeakerMuted) return

    try {
      console.log(`[MeetingVoice] 🔊 Playing TTS for ${agentName} with voice: ${voice}`)
      setCurrentSpeaker(agentId)
      setSpeakingStatus("listening")
      isAgentSpeakingRef.current = true

      // xAI Grok TTS API 호출
      const ttsResponse = await fetch("/api/voice/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      })

      if (!ttsResponse.ok) {
        console.error(`[MeetingVoice] TTS failed for ${agentName}`)
        return
      }

      // 오디오 재생
      const audioBlob = await ttsResponse.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.play().catch(() => resolve())
      })

      console.log(`[MeetingVoice] ✅ Finished playing ${agentName}'s response`)
    } catch (error) {
      console.error(`[MeetingVoice] TTS error for ${agentName}:`, error)
    } finally {
      isAgentSpeakingRef.current = false
    }
  }, [isSpeakerMuted])

  // 🔥 회의 대화 히스토리 (에이전트 간 대화 포함)
  const meetingHistoryRef = useRef<{ speaker: string; text: string }[]>([])

  // 🔥 사용자 발화 후 에이전트들이 서로 토론 (진짜 티키타카)
  const processAgentResponses = useCallback(async (userMessage: string) => {
    if (isProcessingResponseRef.current) return
    isProcessingResponseRef.current = true

    // 사용자 발화를 회의 히스토리에 추가
    meetingHistoryRef.current.push({ speaker: currentUserName, text: userMessage })

    console.log(`[MeetingVoice] 🎯 Starting real discussion for: "${userMessage}"`)

    // 🔭 공유된 문서 분석 내용 요약
    const sharedDocsContext = sharedDocuments
      .filter(doc => doc.analysis)
      .map(doc => `📄 ${doc.name}:\n${doc.analysis}`)
      .join('\n\n')

    // 🔥 대화 턴 시스템 - 에이전트들이 서로에게 말함
    const totalTurns = agentParticipants.length * 2  // 각 에이전트 2번씩

    for (let turn = 0; turn < totalTurns; turn++) {
      const agentIndex = turn % agentParticipants.length
      const agent = agentParticipants[agentIndex]
      const otherAgents = agentParticipants.filter(a => a.id !== agent.id)

      setCurrentSpeaker(agent.id)
      setSpeakingStatus("waiting")

      // 🔥 마지막 발화자 정보
      const lastMessage = meetingHistoryRef.current[meetingHistoryRef.current.length - 1]
      const lastSpeaker = lastMessage?.speaker || currentUserName
      const lastText = lastMessage?.text || userMessage

      // 🔥 대화 히스토리 (최근 5개만)
      const recentHistory = meetingHistoryRef.current.slice(-5)
        .map(h => `${h.speaker}: ${h.text}`)
        .join('\n')

      // 🔥 핵심: 이전 발화자에게 직접 응답하도록 지시
      const meetingContext = `## 회의: ${meetingTopic}
${sharedDocsContext ? `\n## 🔭 공유된 자료 (AI가 분석함):\n${sharedDocsContext}\n` : ''}
## 방금 ${lastSpeaker}이(가) 말함:
"${lastText}"

## 최근 대화:
${recentHistory}

## 🎯 당신의 차례입니다, ${agent.name}!
- **${lastSpeaker}이(가) 한 말에 직접 반응하세요**
${sharedDocsContext ? '- 공유된 자료 내용을 참고해서 말하세요\n' : ''}- ${otherAgents.map(a => a.name).join(', ')}에게 질문하거나 의견을 물어보세요
- 예: "${otherAgents[0]?.name || '레이첼'}, 넌 어떻게 생각해?"
- 예: "${lastSpeaker} 말에 동의해. 추가로..."
- 짧게 1-2문장으로 말하세요`

      // 🔥 에이전트 응답 생성 (이전 발화자에게 응답)
      const response = await getAgentResponse(agent.id, agent.name, lastText, lastSpeaker)

      if (response && response.text) {
        // 회의 히스토리에 추가
        meetingHistoryRef.current.push({ speaker: agent.name, text: response.text })

        // 메시지 저장
        const agentMsg: VoiceMessage = {
          id: `agent-${agent.id}-${Date.now()}`,
          participantId: agent.id,
          participantName: agent.name,
          participantType: "agent",
          text: response.text,
          timestamp: new Date(),
          isComplete: true,
        }
        setMessages(prev => [...prev, agentMsg])
        onMessage?.(agentMsg)
        onTranscript?.(response.text, agent.id)

        // TTS로 응답 재생
        await playAgentResponse(agent.id, agent.name, response.text, response.voice)

        // 다음 턴 전 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // 토론 완료 - 사용자에게 마이크 넘김
    setCurrentSpeaker(null)
    setSpeakingStatus("idle")
    turnLockRef.current = false
    isProcessingResponseRef.current = false

    console.log("[MeetingVoice] ✅ Discussion complete, your turn!")
  }, [meetingTopic, currentUserName, agentParticipants, getAgentResponse, playAgentResponse, onMessage, onTranscript, sharedDocuments])

  // 연결 사운드
  const playConnectionSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(523.25, ctx.currentTime)
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
      setTimeout(() => ctx.close(), 500)
    } catch (e) {
      console.log("[MeetingVoice] Sound skipped")
    }
  }, [])

  // 오디오 청크 재생
  const playAudioChunk = useCallback((base64Audio: string) => {
    if (!audioContextRef.current || isSpeakerMuted) return

    try {
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const pcm16 = new Int16Array(bytes.buffer)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0
      }

      audioQueueRef.current.push(float32)

      if (!isPlayingRef.current) {
        playNextChunk()
      }
    } catch (e) {
      console.error("[MeetingVoice] Audio decode error:", e)
    }
  }, [isSpeakerMuted])

  const playNextChunk = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      return
    }

    isPlayingRef.current = true
    const chunk = audioQueueRef.current.shift()!

    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000)
    buffer.getChannelData(0).set(chunk)

    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(audioContextRef.current.destination)
    source.onended = () => playNextChunk()
    source.start()
  }, [])

  // WebSocket 연결
  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return

    setStatus("connecting")
    setMessages([])
    setCurrentTranscript("")

    try {
      // 토큰 발급
      const tokenRes = await fetch("/api/grok-voice/token", { method: "POST" })
      if (!tokenRes.ok) throw new Error("Failed to get token")

      const tokenData = await tokenRes.json()
      const token = tokenData.client_secret

      if (!token) {
        console.error("[MeetingVoice] No token received")
        setStatus("error")
        return
      }

      // AudioContext 생성
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })

      // 🔥 회의 전용 컨텍스트 로드 (개인 채팅 메모리 제외!)
      agentContextsRef.current.clear()
      const otherAgentNames = agentParticipants.map(a => a.name)

      for (const agent of agentParticipants) {
        try {
          console.log("[MeetingVoice] Loading MEETING context for:", agent.name)
          // 🔥 회의 전용 API 사용 (개인 채팅 히스토리 제외)
          const otherParticipants = otherAgentNames.filter(n => n !== agent.name)
          const contextRes = await fetch(
            `/api/grok-voice/meeting-context?agentId=${agent.id}&topic=${encodeURIComponent(meetingTopic)}&participants=${encodeURIComponent(otherParticipants.join(','))}`
          )

          if (contextRes.ok) {
            const contextData = await contextRes.json()
            const voice = contextData.voiceSettings?.voice || getVoiceForAgent(agent)

            // 🔥 회의용 컨텍스트 저장 (개인 메모리 없음)
            agentContextsRef.current.set(agent.id, {
              prompt: contextData.systemPrompt || '',
              voice: voice,
              chatHistory: [],  // 회의 중 대화 히스토리
            })

            console.log("[MeetingVoice] ✅ Meeting context loaded for:", agent.name, {
              voice,
              isMeetingContext: contextData.isMeetingContext,
              otherParticipants: contextData.otherParticipants,
            })
          } else {
            // 기본 회의 컨텍스트
            agentContextsRef.current.set(agent.id, {
              prompt: `당신은 ${agent.name}입니다. "${meetingTopic}" 회의에 참여 중입니다. 다른 참여자: ${otherAgentNames.filter(n => n !== agent.name).join(', ')}`,
              voice: getVoiceForAgent(agent),
              chatHistory: [],
            })
            console.warn("[MeetingVoice] ⚠️ Using default meeting context for:", agent.name)
          }
        } catch (err) {
          console.error("[MeetingVoice] ❌ Meeting context load error for:", agent.name, err)
          agentContextsRef.current.set(agent.id, {
            prompt: `당신은 ${agent.name}입니다. 회의 참여 중.`,
            voice: getVoiceForAgent(agent),
            chatHistory: [],
          })
        }
      }

      // 🔥 STT 전용 시스템 프롬프트 (AI 응답 생성 안 함)
      const systemPrompt = `당신은 음성 인식(STT) 전용입니다.
사용자가 말하면 텍스트로 변환만 해주세요.
절대로 AI 응답을 생성하지 마세요.
회의 주제: ${meetingTopic}`

      // WebSocket 연결
      const ws = new WebSocket(
        "wss://api.x.ai/v1/realtime?model=grok-3-fast-realtime",
        ["realtime", `openai-insecure-api-key.${token}`, "openai-beta.realtime-v1"]
      )
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[MeetingVoice] Connected (STT-only mode)")

        // 🔥 STT 전용 세션 (AI 응답 생성 비활성화)
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["text"],  // 🔥 audio 제거 - STT만 사용
            instructions: systemPrompt,
            voice: "sol",  // 사용 안 함
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 200,
              silence_duration_ms: 600,
            },
          },
        }))

        setStatus("connected")
        playConnectionSound()

        // 마이크 시작
        setTimeout(() => startMicrophone(), 500)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleServerEvent(data)
        } catch (e) {
          console.error("[MeetingVoice] Parse error:", e)
        }
      }

      ws.onerror = (error) => {
        console.error("[MeetingVoice] Error:", error)
        setStatus("error")
      }

      ws.onclose = () => {
        console.log("[MeetingVoice] Disconnected")
        setStatus("disconnected")
        stopMicrophone()
      }

    } catch (error) {
      console.error("[MeetingVoice] Connection error:", error)
      setStatus("error")
    }
  }, [status, meetingTopic, currentUserName, agentParticipants, playConnectionSound])

  // 서버 이벤트 처리
  const handleServerEvent = useCallback((data: any) => {
    switch (data.type) {
      case "session.created":
        console.log("[MeetingVoice] Session created")
        break

      // 사용자 음성 감지 시작
      case "input_audio_buffer.speech_started":
        if (!turnLockRef.current) {
          setCurrentSpeaker(currentUserId)
          setSpeakingStatus("speaking")
          turnLockRef.current = true
          console.log("[MeetingVoice] 🎤 User speaking...")
        }
        break

      // 사용자 음성 감지 종료
      case "input_audio_buffer.speech_stopped":
        setSpeakingStatus("waiting")
        console.log("[MeetingVoice] 🔇 User stopped speaking, waiting for transcription...")
        break

      // 사용자 발언 트랜스크립션 완료
      case "conversation.item.input_audio_transcription.completed":
        const userText = data.transcript || ""
        setCurrentTranscript("")

        if (!userText.trim()) {
          // 빈 텍스트면 무시
          turnLockRef.current = false
          setSpeakingStatus("idle")
          break
        }

        // 메시지 저장
        const userMsg: VoiceMessage = {
          id: `user-${Date.now()}`,
          participantId: currentUserId,
          participantName: currentUserName,
          participantType: "user",
          text: userText,
          timestamp: new Date(),
          isComplete: true,
        }
        setMessages(prev => [...prev, userMsg])
        onMessage?.(userMsg)
        onTranscript?.(userText, currentUserId)

        console.log("[MeetingVoice] 📝 User said:", userText)

        // 🔥 각 에이전트가 순차적으로 응답하도록 트리거
        processAgentResponses(userText)
        break

      // 🔥 AI 응답은 사용 안 함 (STT 전용)
      case "response.output_audio.delta":
      case "response.output_audio_transcript.delta":
      case "response.output_audio_transcript.done":
      case "response.done":
        // STT 전용 모드에서는 무시
        console.log("[MeetingVoice] Ignoring AI response (STT-only mode)")
        break

      case "error":
        console.error("[MeetingVoice] Server error:", data.error)
        break
    }
  }, [currentUserId, currentUserName, onMessage, onTranscript, processAgentResponses])

  // 마이크 시작
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      mediaStreamRef.current = stream

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }

      const source = audioContextRef.current.createMediaStreamSource(stream)
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        // 음소거 상태거나 다른 사람이 말하고 있으면 전송 안함
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        if (currentSpeaker && currentSpeaker !== currentUserId && currentSpeaker !== null) return

        const inputData = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        const bytes = new Uint8Array(pcm16.buffer)
        let binary = ""
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)

        wsRef.current.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: base64,
        }))
      }

      source.connect(processor)
      processor.connect(audioContextRef.current.destination)

      console.log("[MeetingVoice] Microphone started")
    } catch (error) {
      console.error("[MeetingVoice] Microphone error:", error)
    }
  }, [isMuted, currentSpeaker, currentUserId])

  // 마이크 중지
  const stopMicrophone = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    console.log("[MeetingVoice] Microphone stopped")
  }, [])

  // 연결 해제
  const disconnect = useCallback(() => {
    stopMicrophone()

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    audioQueueRef.current = []
    isPlayingRef.current = false
    turnLockRef.current = false
    isProcessingResponseRef.current = false
    meetingHistoryRef.current = []  // 🔥 회의 히스토리 초기화
    agentContextsRef.current.clear()  // 🔥 에이전트 컨텍스트 초기화

    setStatus("disconnected")
    setCurrentSpeaker(null)
    setSpeakingStatus("idle")
    setMessages([])  // 🔥 메시지 초기화
  }, [stopMicrophone])

  // 손들기 (발언권 요청)
  const raiseHand = useCallback(() => {
    if (currentSpeaker && currentSpeaker !== currentUserId) {
      setHandRaised(true)
      setTurnQueue(prev => [...prev, currentUserId])
      console.log("[MeetingVoice] ✋ Hand raised")
    }
  }, [currentSpeaker, currentUserId])

  // 📐 리사이즈 핸들러
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = panelWidth
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return
    const deltaX = e.clientX - resizeStartXRef.current
    const newWidth = Math.max(200, Math.min(600, resizeStartWidthRef.current + deltaX))
    setPanelWidth(newWidth)
  }, [])

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // 리사이즈 이벤트 리스너
  useEffect(() => {
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [handleResizeMove, handleResizeEnd])

  // 🔭 뷰파인더 캡처 핸들러
  const handleViewfinderCapture = useCallback((result: ViewfinderCaptureResult) => {
    console.log("[MeetingVoice] 🔭 Viewfinder captured:", result.bounds)
    if (onShareFile) {
      onShareFile({
        dataUrl: result.imageDataUrl,
        name: `screen-capture-${Date.now()}.jpg`,
        type: 'image/jpeg'
      })
    }
    // 캡처 후 뷰파인더 닫기
    setShowViewfinder(false)
  }, [onShareFile])

  // 🔭 뷰파인더 AI 공유 핸들러
  const handleViewfinderShare = useCallback((imageDataUrl: string, timestamp: number) => {
    console.log("[MeetingVoice] 🔭 Viewfinder sharing to AI:", timestamp)
    if (onShareFile) {
      onShareFile({
        dataUrl: imageDataUrl,
        name: `screen-share-${timestamp}.jpg`,
        type: 'image/jpeg'
      })
    }
  }, [onShareFile])

  // 📁 파일 선택 핸들러
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onShareFile) {
      console.log("[MeetingVoice] 📁 File selected:", file.name)
      onShareFile(file)
    }
    // 입력 초기화 (같은 파일 다시 선택 가능)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onShareFile])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // UI 헬퍼
  const getParticipantById = (id: string) => participants.find(p => p.id === id)
  const getSpeakerInfo = () => {
    if (!currentSpeaker) return null
    // 에이전트 ID로 직접 찾기
    const agent = agentParticipants.find(a => a.id === currentSpeaker)
    if (agent) return agent
    // 사용자인 경우
    if (currentSpeaker === currentUserId) {
      return { id: currentUserId, name: currentUserName, type: "user" as const }
    }
    return null
  }

  const speakerInfo = getSpeakerInfo()

  // 현재 응답 중인 에이전트 컨텍스트 가져오기
  const getCurrentAgentVoice = () => {
    if (!currentSpeaker) return null
    const ctx = agentContextsRef.current.get(currentSpeaker)
    return ctx?.voice || null
  }

  // 🔥 컴팩트한 플로팅 음성 패널 (채팅창 가리지 않음)
  return (
    <>
      {/* 🔭 AIViewfinder 컴포넌트 */}
      {showViewfinder && (
        <AIViewfinder
          isActive={showViewfinder}
          onClose={() => setShowViewfinder(false)}
          onCapture={handleViewfinderCapture}
          onShareToAI={handleViewfinderShare}
          aiContextEnabled={true}
          mode="manual"
          initialBounds={{ x: 100, y: 100, width: 400, height: 300 }}
        />
      )}

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        ref={panelRef}
        className="bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-700 shadow-xl p-3 relative group"
        style={{ width: panelWidth }}
      >
        {/* 📐 좌측 리사이즈 핸들 */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-600/30 rounded-l-xl"
          title="드래그하여 크기 조절"
        >
          <GripVertical className="w-3 h-3 text-zinc-500" />
        </div>

        {/* 📐 우측 리사이즈 핸들 */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-600/30 rounded-r-xl"
          title="드래그하여 크기 조절"
        >
          <GripVertical className="w-3 h-3 text-zinc-500" />
        </div>

        {/* 🔭 공유된 자료 표시 (폴딩 가능) */}
        {sharedDocuments.length > 0 && (
          <div className="mb-2">
            {/* 폴딩 헤더 */}
            <button
              onClick={() => setIsDocsCollapsed(!isDocsCollapsed)}
              className="w-full flex items-center justify-between px-2 py-1 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors mb-1"
            >
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-zinc-400">공유 자료</span>
                <span className="text-[10px] text-zinc-500 bg-zinc-700 px-1.5 rounded-full">
                  {sharedDocuments.length}
                </span>
              </div>
              {isDocsCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>

            {/* 폴딩 컨텐츠 */}
            <AnimatePresence>
              {!isDocsCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 px-1">
                    {sharedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-md text-xs hover:bg-zinc-700 transition-colors cursor-pointer"
                        title={doc.analysis || doc.name}
                      >
                        <ImageIcon className="w-3 h-3 text-purple-400" />
                        <span className="text-zinc-400 truncate max-w-[80px]">{doc.name}</span>
                        {doc.analysis && <span className="text-green-400">✓</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 상태 + 컨트롤 한 줄 */}
        <div className="flex items-center justify-between gap-2">
          {/* 현재 상태 */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
          {status === "connected" ? (
            <AnimatePresence mode="wait">
              {speakingStatus === "speaking" && (
                <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex gap-0.5">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-emerald-500 rounded-full"
                        animate={{ height: [4, 12, 4] }}
                        transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-emerald-400 truncate">말하는 중...</span>
                </motion.div>
              )}
              {speakingStatus === "listening" && speakerInfo && (
                <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex gap-0.5">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-purple-500 rounded-full"
                        animate={{ height: [4, 10, 4] }}
                        transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-purple-400 truncate">{speakerInfo.name}</span>
                </motion.div>
              )}
              {speakingStatus === "waiting" && (
                <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />
                  <span className="text-xs text-cyan-400">처리중</span>
                </motion.div>
              )}
              {speakingStatus === "idle" && (
                <span className="text-xs text-zinc-500">{isMuted ? "🔇" : "🎤 대기"}</span>
              )}
            </AnimatePresence>
          ) : status === "connecting" ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />
              <span className="text-xs text-cyan-400">연결중</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">음성 대기</span>
          )}
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex items-center gap-1">
          {status === "connected" && (
            <>
              {/* 🌐 브라우저 버튼 */}
              {onOpenBrowser && (
                <button
                  onClick={onOpenBrowser}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-zinc-800 text-white hover:bg-zinc-700 hover:bg-blue-500/20 hover:text-blue-400"
                  title="웹 브라우저 열기"
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
              )}
              {/* 🔭 뷰파인더 버튼 */}
              <button
                onClick={() => setShowViewfinder(!showViewfinder)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  showViewfinder ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
                title="화면 캡처 (뷰파인더)"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              {/* 📁 파일 업로드 버튼 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-zinc-800 text-white hover:bg-zinc-700"
                title="파일 공유"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              {/* 🔇 마이크 음소거 */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              {/* 🔊 스피커 음소거 */}
              <button
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isSpeakerMuted ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                {isSpeakerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          {/* 연결/종료 */}
          {status === "disconnected" || status === "error" ? (
            <button
              onClick={connect}
              className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all"
            >
              <Phone className="w-4 h-4" />
            </button>
          ) : status === "connecting" ? (
            <button disabled className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  )
}

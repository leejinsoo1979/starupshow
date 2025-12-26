"use client"

/**
 * SpeakerMode - 회의/토론용 스피커 모드
 *
 * 🔊 새로운 심플한 방식:
 * 1. 기존 텍스트 채팅 그대로 유지
 * 2. 스피커 ON → 에이전트 메시지가 TTS로 읽혀짐
 * 3. 마이크 ON → 사용자 음성이 STT로 텍스트 변환되어 채팅에 입력
 *
 * 장점: 복잡한 턴 관리 없음, 기존 릴레이 로직 재사용
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { Volume2, VolumeX, Mic, MicOff, Loader2 } from "lucide-react"

// 에이전트별 음성 매핑 (OpenAI TTS voices: nova, shimmer, echo, onyx, fable, alloy, ash, sage, coral)
const AGENT_VOICES: Record<string, string> = {
  // 여성 (nova, shimmer, coral, sage)
  "레이첼": "nova",
  "rachel": "nova",
  "에이미": "shimmer",
  "amy": "shimmer",
  "소피아": "coral",
  "sophia": "coral",
  // 남성 (echo, onyx, fable, ash)
  "제레미": "echo",
  "jeremy": "echo",
  "마이클": "onyx",
  "michael": "onyx",
  // 기본
  "default": "alloy"
}

function getVoiceForAgent(name: string): string {
  const nameLower = name.toLowerCase()
  return AGENT_VOICES[name] || AGENT_VOICES[nameLower] || AGENT_VOICES.default
}

interface SpeakerModeProps {
  /** 스피커 모드 활성화 여부 */
  enabled: boolean
  /** 스피커 모드 토글 */
  onToggle: (enabled: boolean) => void
  /** 음성 입력 결과 (STT 완료 시) */
  onVoiceInput?: (text: string) => void
  /** 현재 재생 중인 에이전트 이름 */
  currentSpeaker?: string | null
}

export function SpeakerMode({
  enabled,
  onToggle,
  onVoiceInput,
  currentSpeaker,
}: SpeakerModeProps) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")

  // 마이크 관련
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // 🎤 음성 녹음 시작
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop())

        if (audioChunksRef.current.length === 0) return

        // STT 처리
        setIsProcessing(true)
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const response = await fetch('/api/voice/stt', {
            method: 'POST',
            body: formData,
          })

          if (response.ok) {
            const { text } = await response.json()
            if (text?.trim()) {
              setTranscript(text)
              onVoiceInput?.(text)
            }
          }
        } catch (error) {
          console.error('[SpeakerMode] STT error:', error)
        } finally {
          setIsProcessing(false)
          setTranscript("")
        }
      }

      mediaRecorder.start()
      setIsListening(true)
      console.log('[SpeakerMode] 🎤 Listening started')
    } catch (error) {
      console.error('[SpeakerMode] Mic access error:', error)
    }
  }, [onVoiceInput])

  // 🎤 음성 녹음 중지
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsListening(false)
      console.log('[SpeakerMode] 🎤 Listening stopped')
    }
  }, [isListening])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      {/* 🔊 스피커 토글 */}
      <button
        onClick={() => onToggle(!enabled)}
        className={`p-2 rounded-lg transition-all ${
          enabled
            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        }`}
        title={enabled ? "스피커 모드 끄기" : "스피커 모드 켜기"}
      >
        {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* 🎤 마이크 버튼 (스피커 모드일 때만) */}
      {enabled && (
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`p-2 rounded-lg transition-all ${
            isListening
              ? "bg-red-500/20 text-red-400 animate-pulse"
              : isProcessing
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
          title={isListening ? "녹음 중지" : "음성으로 말하기"}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>
      )}

      {/* 현재 말하는 에이전트 표시 */}
      {enabled && currentSpeaker && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 rounded-md">
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1 h-3 bg-purple-400 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-purple-300">{currentSpeaker}</span>
        </div>
      )}

      {/* 녹음 중 트랜스크립트 미리보기 */}
      {isListening && (
        <span className="text-xs text-zinc-500">녹음 중...</span>
      )}
    </div>
  )
}

/**
 * 🔊 에이전트 메시지 TTS 재생 훅
 *
 * 끊김 방지 모드:
 * - 현재 재생 끝날 때까지 기다림 (끊지 않음)
 * - 대기 중 새 메시지 오면 최신 것만 저장
 * - 재생 끝나면 저장된 최신 메시지 재생
 */
export function useSpeakerTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingRef = useRef(false)
  const pendingRef = useRef<{ text: string; agentName: string } | null>(null)

  // TTS 재생 (끊김 방지)
  const playTTS = useCallback(async (text: string, agentName: string) => {
    // 재생 중이면 대기열에 저장 (최신 것만)
    if (isPlayingRef.current) {
      pendingRef.current = { text, agentName }
      console.log('[TTS] ⏳ 대기:', agentName)
      return
    }

    const play = async (msg: { text: string; agentName: string }) => {
      const voice = getVoiceForAgent(msg.agentName)
      isPlayingRef.current = true
      setIsSpeaking(true)
      setCurrentSpeaker(msg.agentName)

      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg.text, voice, model: 'tts-1' }),
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          currentAudioRef.current = audio

          await new Promise<void>((resolve) => {
            audio.onended = () => { URL.revokeObjectURL(url); resolve() }
            audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
            audio.play().catch(resolve)
          })
        }
      } catch (e) {
        console.error('[TTS] Error:', e)
      }

      currentAudioRef.current = null
      isPlayingRef.current = false

      // 대기 메시지 있으면 재생
      if (pendingRef.current) {
        const next = pendingRef.current
        pendingRef.current = null
        console.log('[TTS] ▶️ 다음:', next.agentName)
        await play(next)
      } else {
        setIsSpeaking(false)
        setCurrentSpeaker(null)
      }
    }

    console.log('[TTS] ▶️ 재생:', agentName)
    await play({ text, agentName })
  }, [])

  // 중단
  const clearQueue = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.src = ''
      currentAudioRef.current = null
    }
    pendingRef.current = null
    isPlayingRef.current = false
    setIsSpeaking(false)
    setCurrentSpeaker(null)
  }, [])

  return {
    playTTS,
    clearQueue,
    isSpeaking,
    currentSpeaker,
  }
}

export default SpeakerMode

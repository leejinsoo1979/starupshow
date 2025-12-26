"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2, Sparkles } from "lucide-react"

interface GeminiVoiceChatProps {
  agentId: string
  agentName?: string
  avatarUrl?: string
  onTranscript?: (text: string, role: "user" | "assistant") => void
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export function GeminiVoiceChat({
  agentId,
  agentName = "레이첼",
  avatarUrl,
  onTranscript,
}: GeminiVoiceChatProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [isMuted, setIsMuted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<string>("")
  const [response, setResponse] = useState<string>("")

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const systemPromptRef = useRef<string>("")

  // 연결 사운드 재생
  const playConnectionSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // 상승하는 2음 멜로디
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4
      oscillator.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15) // C#5

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.4)

      setTimeout(() => ctx.close(), 500)
    } catch (e) {
      console.log('[GeminiVoice] Connection sound skipped')
    }
  }, [])

  // PCM 오디오 재생
  const playAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (!audioContextRef.current) return

    try {
      // PCM 16-bit to Float32
      const pcm16 = new Int16Array(audioData)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0
      }

      audioQueueRef.current.push(float32)

      if (!isPlayingRef.current) {
        playNextChunk()
      }
    } catch (e) {
      console.error("[GeminiVoice] Audio decode error:", e)
    }
  }, [])

  const playNextChunk = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      setIsSpeaking(false)
      return
    }

    isPlayingRef.current = true
    setIsSpeaking(true)
    const chunk = audioQueueRef.current.shift()!

    // Gemini Live는 24kHz로 출력
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
    setTranscript("")
    setResponse("")

    try {
      // 세션 정보 가져오기
      const sessionRes = await fetch(`/api/gemini-voice/session?agentId=${agentId}`)

      if (!sessionRes.ok) {
        const err = await sessionRes.json()
        throw new Error(err.error || "Failed to get session")
      }

      const sessionData = await sessionRes.json()
      const { wsUrl, systemPrompt, voiceSettings } = sessionData
      systemPromptRef.current = systemPrompt
      const voiceName = voiceSettings?.voice || "Puck"

      console.log("[GeminiVoice] Session received for:", sessionData.agent?.name, "voice:", voiceName)

      // AudioContext 생성
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })

      // WebSocket 연결
      const ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[GeminiVoice] WebSocket connected")

        // Gemini Live 세션 설정 메시지
        const setupMessage = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName  // Puck, Charon, Kore, Fenrir, Aoede 등
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: systemPromptRef.current }]
            }
          }
        }

        ws.send(JSON.stringify(setupMessage))
        console.log("[GeminiVoice] Setup message sent")
      }

      ws.onmessage = (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            // Binary audio data
            playAudioChunk(event.data)
          } else {
            // JSON message
            const data = JSON.parse(event.data)
            handleServerMessage(data)
          }
        } catch (e) {
          console.error("[GeminiVoice] Message parse error:", e)
        }
      }

      ws.onerror = (error) => {
        console.error("[GeminiVoice] WebSocket error:", error)
        setStatus("error")
      }

      ws.onclose = (event) => {
        console.log("[GeminiVoice] WebSocket closed:", event.code, event.reason)
        setStatus("disconnected")
        stopMicrophone()
      }

    } catch (error) {
      console.error("[GeminiVoice] Connection error:", error)
      setStatus("error")
    }
  }, [status, agentId, playAudioChunk])

  // 서버 메시지 처리
  const handleServerMessage = useCallback((data: any) => {
    console.log("[GeminiVoice] Server message:", data.type || Object.keys(data))

    // setupComplete 이벤트
    if (data.setupComplete) {
      console.log("[GeminiVoice] Setup complete!")
      setStatus("connected")
      playConnectionSound()

      // 마이크 시작
      setTimeout(() => startMicrophone(), 500)

      // 인사 요청
      setTimeout(() => {
        sendTextMessage("(통화가 연결되었습니다. 자연스럽게 인사해주세요.)")
      }, 800)
    }

    // 서버 컨텐츠 (텍스트/오디오)
    if (data.serverContent) {
      const content = data.serverContent

      // 모델 턴 시작
      if (content.modelTurn) {
        const parts = content.modelTurn.parts || []
        for (const part of parts) {
          if (part.text) {
            setResponse(prev => prev + part.text)
          }
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            // Base64 오디오 데이터
            const audioBytes = atob(part.inlineData.data)
            const buffer = new ArrayBuffer(audioBytes.length)
            const view = new Uint8Array(buffer)
            for (let i = 0; i < audioBytes.length; i++) {
              view[i] = audioBytes.charCodeAt(i)
            }
            playAudioChunk(buffer)
          }
        }
      }

      // 턴 완료
      if (content.turnComplete) {
        if (response) {
          onTranscript?.(response, "assistant")
          setResponse("")
        }
      }
    }

    // 사용자 입력 텍스트 변환
    if (data.toolCallCancellation || data.interruptedResponse) {
      // 인터럽트 처리
      audioQueueRef.current = []
      setIsSpeaking(false)
    }

  }, [response, onTranscript, playConnectionSound, playAudioChunk])

  // 텍스트 메시지 전송
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const message = {
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text }]
        }],
        turnComplete: true
      }
    }

    wsRef.current.send(JSON.stringify(message))
    console.log("[GeminiVoice] Text sent:", text)
  }, [])

  // 마이크 시작
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      mediaStreamRef.current = stream

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      }

      const source = audioContextRef.current.createMediaStreamSource(stream)

      // ScriptProcessor 사용 (AudioWorklet 대신 간단하게)
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        const inputData = e.inputBuffer.getChannelData(0)

        // Float32 to PCM16
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        // Base64 인코딩
        const bytes = new Uint8Array(pcm16.buffer)
        let binary = ""
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64Audio = btoa(binary)

        // Gemini Live 오디오 전송 형식
        const audioMessage = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: "audio/pcm;rate=16000",
              data: base64Audio
            }]
          }
        }

        wsRef.current.send(JSON.stringify(audioMessage))
        setIsListening(true)
      }

      source.connect(processor)
      processor.connect(audioContextRef.current.destination)

      console.log("[GeminiVoice] Microphone started")
    } catch (error) {
      console.error("[GeminiVoice] Microphone error:", error)
    }
  }, [isMuted])

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

    setIsListening(false)
    console.log("[GeminiVoice] Microphone stopped")
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
    setStatus("disconnected")
  }, [stopMicrophone])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const statusColors: Record<ConnectionStatus, string> = {
    disconnected: "bg-zinc-600",
    connecting: "bg-cyan-500 animate-pulse",
    connected: "bg-emerald-500",
    error: "bg-red-500",
  }

  const statusLabels: Record<ConnectionStatus, string> = {
    disconnected: "대기",
    connecting: "연결 중...",
    connected: "통화 중",
    error: "오류",
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Agent Avatar with Voice Waves */}
        <div className="relative mb-8">
          {/* Animated rings when connected */}
          {status === "connected" && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-500/30"
                animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                style={{ width: 160, height: 160, top: -20, left: -20 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-500/20"
                animate={{ scale: [1, 1.8, 1.8], opacity: [0.3, 0, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                style={{ width: 160, height: 160, top: -20, left: -20 }}
              />
            </>
          )}

          {/* Avatar */}
          <div className="relative w-[120px] h-[120px]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={agentName}
                className={`w-full h-full rounded-full object-cover shadow-2xl shadow-blue-500/25 ${status === "connected" ? "ring-4 ring-blue-500/50" : ""}`}
              />
            ) : (
              <div className={`w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-blue-500/25 ${status === "connected" ? "ring-4 ring-blue-500/50" : ""}`}>
                {agentName.charAt(0)}
              </div>
            )}

            {/* Status indicator */}
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-zinc-900 ${statusColors[status]}`} />

            {/* Gemini badge */}
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Agent Name & Status */}
        <h2 className="text-2xl font-bold text-white mb-1">{agentName}</h2>
        <p className={`text-sm mb-2 ${status === "connected" ? "text-blue-400" : "text-zinc-500"}`}>
          {statusLabels[status]}
        </p>
        <p className="text-xs text-zinc-600 mb-6">Gemini Live</p>

        {/* Voice Activity Visualization */}
        {status === "connected" && (
          <div className="flex items-center gap-1 mb-8 h-12">
            {[...Array(7)].map((_, i) => (
              <motion.div
                key={i}
                className={`w-1.5 rounded-full ${
                  isSpeaking ? "bg-blue-500" : isListening ? "bg-emerald-500" : "bg-zinc-700"
                }`}
                animate={(isSpeaking || isListening) ? {
                  height: [12, 28 + Math.random() * 12, 12],
                } : { height: 12 }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.08,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )}

        {/* Transcript Area */}
        <div className="w-full max-w-md min-h-[80px] mb-4">
          <AnimatePresence mode="wait">
            {transcript && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-right mb-3"
              >
                <span className="inline-block px-4 py-2 bg-emerald-600 rounded-2xl rounded-br-sm text-white text-sm">
                  {transcript}
                </span>
              </motion.div>
            )}

            {response && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-left"
              >
                <span className="inline-block px-4 py-2 bg-zinc-800 rounded-2xl rounded-bl-sm text-zinc-200 text-sm">
                  {response}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {status === "connected" && !transcript && !response && (
            <p className="text-center text-zinc-600 text-sm">말씀해 주세요...</p>
          )}

          {status === "disconnected" && (
            <p className="text-center text-zinc-600 text-sm">
              아래 버튼을 눌러 음성 대화를 시작하세요
            </p>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-zinc-900/80 backdrop-blur-lg border-t border-zinc-800">
        <div className="flex items-center justify-center gap-6">
          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={status !== "connected"}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              status !== "connected"
                ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                : isMuted
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Call button */}
          {status === "disconnected" || status === "error" ? (
            <button
              onClick={connect}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <Phone className="w-8 h-8" />
            </button>
          ) : status === "connecting" ? (
            <button
              disabled
              className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center"
            >
              <Loader2 className="w-8 h-8 animate-spin" />
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          )}

          {/* Speaker/Volume button */}
          <button
            disabled={status !== "connected"}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              status !== "connected"
                ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* Status text */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
          <span className="text-xs text-zinc-500">
            {status === "connected" ? "음성 통화 중 • ~$0.05/분" : "Gemini Live API"}
          </span>
        </div>
      </div>
    </div>
  )
}

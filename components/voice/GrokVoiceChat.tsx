"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface GrokVoiceChatProps {
  agentName?: string
  agentInstructions?: string
  voice?: "Sal" | "Rex" | "Eve" | "Leo" | "Mika" | "Valentin"
  onTranscript?: (text: string, role: "user" | "assistant") => void
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export function GrokVoiceChat({
  agentName = "에이미",
  agentInstructions = "You are Amy (에이미), a friendly Korean AI assistant. Speak naturally in Korean with a warm, cheerful tone. Keep responses concise and helpful.",
  voice = "Eve",
  onTranscript,
}: GrokVoiceChatProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [isMuted, setIsMuted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState<string>("")
  const [response, setResponse] = useState<string>("")

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)

  // 오디오 재생
  const playAudioChunk = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return

    try {
      // Base64 디코딩
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // PCM 16-bit to Float32
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
      console.error("[GrokVoice] Audio decode error:", e)
    }
  }, [])

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
    setTranscript("")
    setResponse("")

    try {
      // Ephemeral token 발급
      const tokenRes = await fetch("/api/grok-voice/token", { method: "POST" })

      if (!tokenRes.ok) {
        throw new Error("Failed to get token")
      }

      const tokenData = await tokenRes.json()
      const token = tokenData.client_secret?.value || tokenData.token

      if (!token) {
        // 직접 API 키 사용 (개발용)
        console.warn("[GrokVoice] No ephemeral token, using direct connection")
      }

      // AudioContext 생성
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })

      // WebSocket 연결
      const ws = new WebSocket("wss://api.x.ai/v1/realtime")
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[GrokVoice] Connected")

        // 세션 설정
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: agentInstructions,
            voice: voice.toLowerCase(),
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        }))

        setStatus("connected")
        startMicrophone()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleServerEvent(data)
        } catch (e) {
          console.error("[GrokVoice] Parse error:", e)
        }
      }

      ws.onerror = (error) => {
        console.error("[GrokVoice] WebSocket error:", error)
        setStatus("error")
      }

      ws.onclose = () => {
        console.log("[GrokVoice] Disconnected")
        setStatus("disconnected")
        stopMicrophone()
      }

    } catch (error) {
      console.error("[GrokVoice] Connection error:", error)
      setStatus("error")
    }
  }, [status, agentInstructions, voice])

  // 서버 이벤트 처리
  const handleServerEvent = useCallback((data: any) => {
    switch (data.type) {
      case "session.created":
        console.log("[GrokVoice] Session created:", data.session?.id)
        break

      case "input_audio_buffer.speech_started":
        setIsListening(true)
        break

      case "input_audio_buffer.speech_stopped":
        setIsListening(false)
        break

      case "conversation.item.input_audio_transcription.completed":
        const userText = data.transcript || ""
        setTranscript(userText)
        onTranscript?.(userText, "user")
        break

      case "response.audio.delta":
        if (data.delta) {
          playAudioChunk(data.delta)
        }
        break

      case "response.audio_transcript.delta":
        setResponse(prev => prev + (data.delta || ""))
        break

      case "response.audio_transcript.done":
        const fullText = data.transcript || response
        onTranscript?.(fullText, "assistant")
        setResponse("")
        break

      case "response.done":
        console.log("[GrokVoice] Response complete")
        break

      case "error":
        console.error("[GrokVoice] Server error:", data.error)
        break
    }
  }, [response, onTranscript, playAudioChunk])

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
        const base64 = btoa(binary)

        // 전송
        wsRef.current.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: base64,
        }))
      }

      source.connect(processor)
      processor.connect(audioContextRef.current.destination)

      console.log("[GrokVoice] Microphone started")
    } catch (error) {
      console.error("[GrokVoice] Microphone error:", error)
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

    console.log("[GrokVoice] Microphone stopped")
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
    connecting: "bg-amber-500 animate-pulse",
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
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              {agentName.charAt(0)}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-zinc-900 ${statusColors[status]}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{agentName}</h3>
            <p className="text-xs text-zinc-500">{statusLabels[status]}</p>
          </div>
        </div>

        {/* Voice indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full"
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400">듣는 중...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transcript display */}
      <div className="min-h-[100px] mb-6 space-y-3">
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <div className="max-w-[80%] px-4 py-2 bg-blue-600 rounded-2xl rounded-br-md">
              <p className="text-sm text-white">{transcript}</p>
            </div>
          </motion.div>
        )}

        {response && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] px-4 py-2 bg-zinc-800 rounded-2xl rounded-bl-md">
              <p className="text-sm text-zinc-200">{response}</p>
            </div>
          </motion.div>
        )}

        {status === "connected" && !transcript && !response && (
          <div className="flex items-center justify-center h-[100px]">
            <p className="text-zinc-600 text-sm">말씀해 주세요...</p>
          </div>
        )}

        {status === "disconnected" && (
          <div className="flex items-center justify-center h-[100px]">
            <p className="text-zinc-600 text-sm">통화 버튼을 눌러 {agentName}와 대화하세요</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Mute button */}
        <Button
          size="lg"
          variant="ghost"
          onClick={() => setIsMuted(!isMuted)}
          disabled={status !== "connected"}
          className={`w-14 h-14 rounded-full ${
            isMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        {/* Call button */}
        {status === "disconnected" || status === "error" ? (
          <Button
            size="lg"
            onClick={connect}
            className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Phone className="w-7 h-7" />
          </Button>
        ) : status === "connecting" ? (
          <Button
            size="lg"
            disabled
            className="w-16 h-16 rounded-full bg-amber-600 text-white"
          >
            <Loader2 className="w-7 h-7 animate-spin" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={disconnect}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white"
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        )}

        {/* Speaker indicator */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
          isPlayingRef.current ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800 text-zinc-600"
        }`}>
          <Volume2 className="w-6 h-6" />
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-xs text-zinc-500">
          {status === "connected" ? "Grok Voice API 연결됨 ($0.05/분)" : "음성 통화 준비"}
        </span>
      </div>
    </div>
  )
}

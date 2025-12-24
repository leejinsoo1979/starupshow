"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bell, AlertTriangle, CheckCircle, Sparkles, Send, Loader2, Mic, MicOff } from "lucide-react"
import { useAgentNotification, AgentNotification } from "@/lib/contexts/AgentNotificationContext"
import { useThemeStore, accentColors } from "@/stores/themeStore"

// Web Speech API 타입
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

const typeIcons = {
  info: Bell,
  alert: AlertTriangle,
  task: CheckCircle,
  greeting: Sparkles,
}

function NotificationItem({ notification, index }: { notification: AgentNotification; index: number }) {
  const { dismissNotification, showAgentNotification } = useAgentNotification()
  const { accentColor: themeAccent } = useThemeStore()
  const { agent, message, type, emotion, actions } = notification

  // 답장 모드 상태
  const [isReplyMode, setIsReplyMode] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentResponse, setAgentResponse] = useState<string | null>(null)

  // 음성 인식 상태
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognitionAPI) {
        setSpeechSupported(true)
        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = "ko-KR"

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = ""
          let interimTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            setReplyText(prev => prev + finalTranscript)
          } else if (interimTranscript) {
            // 실시간 미리보기 (선택적)
          }
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.onerror = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // 음성 인식 토글
  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setReplyText("") // 새로 시작할 때 초기화
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // 테마 색상 가져오기
  const themeColorData = accentColors.find(c => c.id === themeAccent)
  const themeColor = themeColorData?.color || "#3b82f6"

  // 아바타 URL 결정
  const avatarUrl = emotion && agent.emotion_avatars?.[emotion]
    ? agent.emotion_avatars[emotion]
    : agent.avatar_url || `https://api.dicebear.com/7.x/lorelei/svg?seed=${agent.name}`

  const Icon = typeIcons[type]
  // 테마 색상 사용 (에이전트 색상 대신)
  const accentColor = themeColor

  // 답장 전송 처리
  const handleSendReply = async () => {
    if (!replyText.trim() || isProcessing) return

    setIsProcessing(true)
    try {
      // 에이전트에게 메시지 전송
      const response = await fetch(`/api/agents/${agent.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyText,
          context: `사용자가 "${message}"에 대해 답장했습니다: "${replyText}"`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const agentReply = data.response || data.message || "알겠습니다. 처리하겠습니다."
        setAgentResponse(agentReply)

        // 2초 후 닫고 에이전트 응답 알림 표시
        setTimeout(() => {
          dismissNotification(notification.id)
          showAgentNotification(agent, agentReply, {
            type: "info",
            actions: [
              { label: "확인", onClick: () => {} },
            ],
          })
        }, 1500)
      } else {
        setAgentResponse("죄송합니다. 응답을 처리하는 중 오류가 발생했습니다.")
      }
    } catch (error) {
      console.error("Reply error:", error)
      setAgentResponse("네트워크 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* 배경 오버레이 + 중앙 정렬 컨테이너 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
        onClick={() => dismissNotification(notification.id)}
        style={{ zIndex: 100 + index }}
      >
        {/* 팝업 카드 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="w-[360px]"
          onClick={(e) => e.stopPropagation()}
        >
        {/* 메인 카드 */}
        <div
          className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-3xl overflow-hidden"
          style={{
            boxShadow: `0 0 80px ${accentColor}30, 0 0 120px ${accentColor}10, 0 25px 50px -12px rgba(0, 0, 0, 0.8)`,
          }}
        >
          {/* 상단 글로우 효과 */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-30"
            style={{ background: accentColor }}
          />

          {/* 닫기 버튼 */}
          <button
            onClick={() => dismissNotification(notification.id)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-all z-20 group"
          >
            <X className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
          </button>

          {/* 프로필 섹션 - 중앙 상단 */}
          <div className="relative pt-8 pb-4 flex flex-col items-center">
            {/* 아바타 링 애니메이션 */}
            <div className="relative">
              {/* 외부 글로우 링 */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, ${accentColor}, transparent, ${accentColor})`,
                  opacity: 0.5,
                }}
              />
              {/* 아바타 컨테이너 */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                className="relative w-24 h-24 rounded-full p-1"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}60)`,
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
                  <img
                    src={avatarUrl}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
              {/* 타입 배지 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-zinc-900"
                style={{ backgroundColor: accentColor }}
              >
                <Icon className="w-4 h-4 text-white" />
              </motion.div>
            </div>

            {/* 에이전트 이름 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-center"
            >
              <h3
                className="text-xl font-bold"
                style={{ color: accentColor }}
              >
                {agent.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {type === "greeting" ? "인사" : type === "alert" ? "알림" : type === "task" ? "태스크" : "정보"}
              </p>
            </motion.div>
          </div>

          {/* 메시지 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="px-6 pb-4"
          >
            <div className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50">
              <p className="text-sm text-zinc-200 leading-relaxed text-center">
                {message}
              </p>
            </div>

            {/* 에이전트 응답 표시 */}
            <AnimatePresence>
              {agentResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 rounded-2xl p-4 border"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}30`,
                  }}
                >
                  <p className="text-sm leading-relaxed text-center" style={{ color: accentColor }}>
                    {agentResponse}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 답장 입력 섹션 */}
          <AnimatePresence>
            {isReplyMode && !agentResponse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 pb-4"
              >
                {/* 음성 인식 중 표시 */}
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-3 flex items-center justify-center gap-2 py-2"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="text-sm" style={{ color: accentColor }}>
                      음성을 듣고 있습니다...
                    </span>
                  </motion.div>
                )}

                <div className="flex gap-2">
                  {/* 마이크 버튼 */}
                  {speechSupported && (
                    <button
                      onClick={toggleListening}
                      disabled={isProcessing}
                      className={`px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        isListening
                          ? "text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                      style={isListening ? {
                        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                        boxShadow: `0 0 20px ${accentColor}50`,
                      } : {}}
                    >
                      {isListening ? (
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                        >
                          <MicOff className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                    placeholder={isListening ? "말씀하세요..." : `${agent.name}에게 답장...`}
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    autoFocus={!isListening}
                    disabled={isProcessing || isListening}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isProcessing}
                    className="px-4 py-3 rounded-xl text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 액션 버튼 섹션 */}
          {!isReplyMode && !agentResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="px-6 pb-6"
            >
              <div className="flex gap-3">
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    boxShadow: `0 4px 20px ${accentColor}40`,
                  }}
                >
                  확인
                </button>
                <button
                  onClick={() => setIsReplyMode(true)}
                  className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"
                >
                  답장
                </button>
              </div>
            </motion.div>
          )}

          {/* 답장 모드에서 취소 버튼 */}
          {isReplyMode && !agentResponse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 pb-6"
            >
              <button
                onClick={() => {
                  setIsReplyMode(false)
                  setReplyText("")
                }}
                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                취소
              </button>
            </motion.div>
          )}

        </div>
        </motion.div>
      </motion.div>
    </>
  )
}

export function AgentNotificationPopup() {
  const { notifications } = useAgentNotification()

  return (
    <AnimatePresence mode="wait">
      {notifications.length > 0 && (
        <NotificationItem
          key={notifications[notifications.length - 1].id}
          notification={notifications[notifications.length - 1]}
          index={0}
        />
      )}
    </AnimatePresence>
  )
}

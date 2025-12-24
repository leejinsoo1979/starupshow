"use client"

import { useState, useEffect } from "react"
import { useAgentNotification, AgentInfo } from "@/lib/contexts/AgentNotificationContext"
import { Button } from "@/components/ui/Button"
import { Bot, Sparkles, Loader2 } from "lucide-react"
import { useThemeStore, accentColors } from "@/stores/themeStore"

// 샘플 메시지들
const sampleMessages = {
  greeting: [
    "반가워요! 오늘 하루도 화이팅이에요! 무엇을 도와드릴까요?",
    "안녕하세요! 좋은 하루 보내고 계신가요?",
    "오늘도 함께 일할 수 있어서 기뻐요!",
  ],
  info: [
    "오늘 오후 3시에 팀 미팅이 예정되어 있어요.",
    "새로운 메시지가 도착했습니다.",
    "프로젝트 진행률이 75%에 도달했어요!",
  ],
  alert: [
    "긴급: 투자자 미팅이 내일로 앞당겨졌습니다!",
    "마감 기한이 내일입니다. 확인해주세요!",
    "중요한 업데이트가 있습니다.",
  ],
  task: [
    "주간 리포트 작성이 완료되었습니다. 확인해주세요.",
    "코드 리뷰 요청이 대기 중입니다.",
    "새로운 태스크가 할당되었습니다.",
  ],
}

export function AgentNotificationDemo() {
  const { showAgentNotification } = useAgentNotification()
  const { accentColor } = useThemeStore()
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)

  // 테마 색상 가져오기
  const themeColorData = accentColors.find(c => c.id === accentColor)
  const themeColor = themeColorData?.color || "#3b82f6"

  // 에이전트 목록 가져오기
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents")
        if (res.ok) {
          const data = await res.json()
          // avatar_url이 있는 에이전트들만 필터링
          const agentsWithAvatar = data.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            avatar_url: agent.avatar_url,
            emotion_avatars: agent.emotion_avatars,
          }))
          setAgents(agentsWithAvatar)
        }
      } catch (err) {
        console.error("Failed to fetch agents:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const getRandomMessage = (type: keyof typeof sampleMessages) => {
    const messages = sampleMessages[type]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const getRandomAgent = (): AgentInfo => {
    if (agents.length > 0) {
      return agents[Math.floor(Math.random() * agents.length)]
    }
    // 폴백: 기본 에이전트
    return {
      id: "default",
      name: "AI 어시스턴트",
      avatar_url: null,
    }
  }

  const triggerRandomNotification = () => {
    const agent = getRandomAgent()
    const types: (keyof typeof sampleMessages)[] = ["info", "alert", "task"]
    const randomType = types[Math.floor(Math.random() * types.length)]
    const message = getRandomMessage(randomType)

    showAgentNotification(agent, message, {
      type: randomType,
      actions: [
        { label: "확인", onClick: () => console.log("확인 클릭") },
        { label: "나중에", onClick: () => console.log("나중에 클릭") },
      ],
    })
  }

  const triggerGreeting = () => {
    const agent = agents.length > 0 ? agents[0] : getRandomAgent()
    showAgentNotification(agent, getRandomMessage("greeting"), {
      type: "greeting",
      actions: [
        { label: "일정 확인", onClick: () => console.log("일정 확인") },
        { label: "할 일 보기", onClick: () => console.log("할 일 보기") },
      ],
    })
  }

  if (loading) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  const firstAgentName = agents.length > 0 ? agents[0].name : "에이전트"

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3">
      <Button
        onClick={triggerGreeting}
        size="sm"
        className="text-white shadow-lg rounded-full px-5"
        style={{
          background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
          boxShadow: `0 4px 20px ${themeColor}40`,
        }}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {firstAgentName} 인사
      </Button>
      <Button
        onClick={triggerRandomNotification}
        size="sm"
        variant="outline"
        className="bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white shadow-lg rounded-full px-5"
      >
        <Bot className="w-4 h-4 mr-2" />
        랜덤 알림
      </Button>
    </div>
  )
}

// 편의 훅: 앱 어디서든 에이전트 알림 보내기
export function useAgentNotificationHelper() {
  const { showAgentNotification } = useAgentNotification()
  const [agents, setAgents] = useState<AgentInfo[]>([])

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents")
        if (res.ok) {
          const data = await res.json()
          setAgents(data.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            avatar_url: agent.avatar_url,
            emotion_avatars: agent.emotion_avatars,
          })))
        }
      } catch (err) {
        console.error("Failed to fetch agents:", err)
      }
    }
    fetchAgents()
  }, [])

  const getAgent = (name?: string): AgentInfo => {
    if (name) {
      const found = agents.find(a => a.name.toLowerCase().includes(name.toLowerCase()))
      if (found) return found
    }
    return agents[0] || { id: "default", name: "AI", avatar_url: null }
  }

  return {
    greet: (agentName?: string, message?: string) => {
      const agent = getAgent(agentName)
      showAgentNotification(
        agent,
        message || "안녕하세요! 무엇을 도와드릴까요?",
        { type: "greeting" }
      )
    },
    info: (agentName: string | undefined, message: string) => {
      showAgentNotification(getAgent(agentName), message, { type: "info" })
    },
    alert: (agentName: string | undefined, message: string) => {
      showAgentNotification(getAgent(agentName), message, { type: "alert" })
    },
    task: (agentName: string | undefined, message: string, actions?: { label: string; onClick: () => void }[]) => {
      showAgentNotification(getAgent(agentName), message, { type: "task", actions })
    },
  }
}

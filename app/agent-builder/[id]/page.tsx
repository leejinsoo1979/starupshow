"use client"

import dynamic from "next/dynamic"
import { useParams } from "next/navigation"

// Dynamic import for SSR compatibility
const AgentBuilder = dynamic(
  () => import("@/components/agent/AgentBuilder").then((mod) => mod.AgentBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">에이전트 빌더 로딩 중...</span>
        </div>
      </div>
    )
  }
)

export default function AgentBuilderPage() {
  const params = useParams()
  const agentId = params.id as string

  // "new"인 경우 새 에이전트 생성 모드
  const isNewAgent = agentId === "new"

  return (
    <div className="h-screen w-screen overflow-hidden">
      <AgentBuilder agentId={isNewAgent ? undefined : agentId} />
    </div>
  )
}

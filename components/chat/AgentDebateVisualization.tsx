"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  MessageCircle,
  Crown,
  Zap,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react"
import type { DeployedAgent, InteractionMode } from "@/types/database"

interface AgentMessage {
  id: string
  agent_id: string
  content: string
  timestamp: string
  is_typing?: boolean
}

interface AgentDebateVisualizationProps {
  agents: DeployedAgent[]
  interactionMode: InteractionMode
  currentSpeakerId?: string
  messages: AgentMessage[]
  isDebating: boolean
}

const modeConfig: Record<InteractionMode, {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  description: string
}> = {
  solo: {
    label: '단독',
    icon: <MessageCircle className="w-4 h-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    description: '각 에이전트가 독립적으로 응답',
  },
  sequential: {
    label: '순차',
    icon: <ArrowRight className="w-4 h-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    description: '에이전트들이 순서대로 응답',
  },
  debate: {
    label: '토론',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    description: '에이전트들이 서로 토론',
  },
  collaborate: {
    label: '협업',
    icon: <Users className="w-4 h-4" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    description: '역할을 분담하여 협업',
  },
  supervisor: {
    label: '감독자',
    icon: <Crown className="w-4 h-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    description: '감독자가 다른 에이전트 조율',
  },
}

// Agent Avatar Component
function AgentAvatar({
  agent,
  isActive,
  isSupervisor,
  position,
  totalAgents,
  onClick,
}: {
  agent: DeployedAgent
  isActive: boolean
  isSupervisor: boolean
  position: number
  totalAgents: number
  onClick?: () => void
}) {
  // Calculate position in a circle
  const angle = (position * 360) / totalAgents - 90 // Start from top
  const radius = 120 // Distance from center
  const x = Math.cos((angle * Math.PI) / 180) * radius
  const y = Math.sin((angle * Math.PI) / 180) * radius

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isActive ? 1.1 : 1,
        opacity: 1,
      }}
      transition={{ delay: position * 0.1 }}
      onClick={onClick}
    >
      <div className={`relative ${isActive ? 'z-10' : ''}`}>
        {/* Pulse animation for active speaker */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/30"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Avatar */}
        <div className={`
          relative w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold
          ${isActive
            ? 'ring-4 ring-purple-500 ring-offset-2 ring-offset-zinc-900'
            : 'ring-2 ring-zinc-700'
          }
          ${isSupervisor
            ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
            : 'bg-gradient-to-br from-blue-500 to-purple-500'
          }
          transition-all duration-300
        `}>
          {agent.name.charAt(0)}

          {/* Supervisor Crown */}
          {isSupervisor && (
            <div className="absolute -top-2 -right-2">
              <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </div>
          )}

          {/* Speaking indicator */}
          {isActive && (
            <motion.div
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Volume2 className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </div>

        {/* Name */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className={`text-xs font-medium ${isActive ? 'text-purple-400' : 'text-zinc-400'}`}>
            {agent.name}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// Connection Line Component
function ConnectionLine({
  from,
  to,
  isActive,
  totalAgents,
}: {
  from: number
  to: number
  isActive: boolean
  totalAgents: number
}) {
  const radius = 120
  const fromAngle = (from * 360) / totalAgents - 90
  const toAngle = (to * 360) / totalAgents - 90

  const x1 = Math.cos((fromAngle * Math.PI) / 180) * radius + 160
  const y1 = Math.sin((fromAngle * Math.PI) / 180) * radius + 160
  const x2 = Math.cos((toAngle * Math.PI) / 180) * radius + 160
  const y2 = Math.sin((toAngle * Math.PI) / 180) * radius + 160

  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={isActive ? '#a855f7' : '#3f3f46'}
      strokeWidth={isActive ? 2 : 1}
      strokeDasharray={isActive ? '0' : '4 4'}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  )
}

// Message Bubble Component
function MessageBubble({ message, agent }: { message: AgentMessage; agent?: DeployedAgent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex gap-3 p-3 bg-zinc-800/50 rounded-lg"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {agent?.name.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">
            {agent?.name || '알 수 없음'}
          </span>
          <span className="text-xs text-zinc-500">
            {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        {message.is_typing ? (
          <div className="flex gap-1">
            <motion.div
              className="w-2 h-2 bg-zinc-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-zinc-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-zinc-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        ) : (
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
            {message.content}
          </p>
        )}
      </div>
    </motion.div>
  )
}

export function AgentDebateVisualization({
  agents,
  interactionMode,
  currentSpeakerId,
  messages,
  isDebating,
}: AgentDebateVisualizationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const config = modeConfig[interactionMode]

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get agent index by ID
  const getAgentIndex = (agentId: string) =>
    agents.findIndex(a => a.id === agentId)

  // Get previous speaker for connection line
  const getPreviousSpeaker = () => {
    const nonTypingMessages = messages.filter(m => !m.is_typing)
    if (nonTypingMessages.length < 2) return null
    return nonTypingMessages[nonTypingMessages.length - 2].agent_id
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center text-white`}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{config.label} 모드</h3>
            <p className="text-xs text-zinc-400">{config.description}</p>
          </div>
        </div>

        {isDebating && (
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm text-green-400">토론 중</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Visualization Panel */}
        <div className="w-80 p-4 border-r border-zinc-800">
          {/* Circular Agent Layout */}
          <div className="relative w-full aspect-square">
            {/* Center Icon */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              animate={{ rotate: isDebating ? 360 : 0 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            >
              <div className={`w-16 h-16 rounded-full ${config.bgColor}/20 flex items-center justify-center`}>
                <Sparkles className={`w-8 h-8 ${config.color}`} />
              </div>
            </motion.div>

            {/* Connection Lines SVG */}
            <svg className="absolute inset-0 w-full h-full" style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}>
              {/* Draw connections between agents */}
              {interactionMode === 'debate' && agents.map((_, i) =>
                agents.map((_, j) => {
                  if (i >= j) return null
                  const isActive =
                    (currentSpeakerId === agents[i].id && getPreviousSpeaker() === agents[j].id) ||
                    (currentSpeakerId === agents[j].id && getPreviousSpeaker() === agents[i].id)
                  return (
                    <ConnectionLine
                      key={`${i}-${j}`}
                      from={i}
                      to={j}
                      isActive={isActive}
                      totalAgents={agents.length}
                    />
                  )
                })
              )}

              {/* Sequential mode: draw chain */}
              {interactionMode === 'sequential' && agents.map((_, i) => {
                if (i === agents.length - 1) return null
                const isActive =
                  currentSpeakerId === agents[i].id || currentSpeakerId === agents[i + 1].id
                return (
                  <ConnectionLine
                    key={i}
                    from={i}
                    to={i + 1}
                    isActive={isActive}
                    totalAgents={agents.length}
                  />
                )
              })}
            </svg>

            {/* Agent Avatars */}
            {agents.map((agent, index) => (
              <AgentAvatar
                key={agent.id}
                agent={agent}
                isActive={currentSpeakerId === agent.id}
                isSupervisor={interactionMode === 'supervisor' && index === 0}
                position={index}
                totalAgents={agents.length}
              />
            ))}
          </div>

          {/* Agent List */}
          <div className="mt-8 space-y-2">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              참여 에이전트 ({agents.length})
            </h4>
            {agents.map((agent, index) => (
              <div
                key={agent.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  currentSpeakerId === agent.id
                    ? 'bg-purple-500/20 border border-purple-500/30'
                    : 'hover:bg-zinc-800'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {agent.name}
                    </span>
                    {interactionMode === 'supervisor' && index === 0 && (
                      <Crown className="w-3 h-3 text-yellow-500" />
                    )}
                    {interactionMode === 'sequential' && (
                      <span className="text-xs text-zinc-500">#{index + 1}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {agent.llm_provider}/{agent.llm_model}
                  </p>
                </div>
                {currentSpeakerId === agent.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-green-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  agent={agents.find(a => a.id === message.agent_id)}
                />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Status Bar */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-800/30">
            {isDebating ? (
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {currentSpeakerId
                  ? `${agents.find(a => a.id === currentSpeakerId)?.name || '에이전트'}가 응답 중...`
                  : '에이전트들이 토론 중입니다...'
                }
              </div>
            ) : (
              <div className="text-center text-sm text-zinc-500">
                메시지를 입력하여 토론을 시작하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

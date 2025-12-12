"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Users,
  Bot,
  Plus,
  Loader2,
  Check,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { AgentGroup, DeployedAgent, InteractionMode } from "@/types/database"

interface InviteGroupModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  onInvited?: (result: { added_count: number; group: { name: string; interaction_mode: InteractionMode } }) => void
}

const interactionModeLabels: Record<InteractionMode, { label: string; description: string; color: string }> = {
  solo: { label: '단독', description: '독립적으로 응답', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  sequential: { label: '순차', description: '순서대로 응답', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  debate: { label: '토론', description: '서로 토론', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  collaborate: { label: '협업', description: '역할 분담', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  supervisor: { label: '감독자', description: '감독자가 조율', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export function InviteGroupModal({
  isOpen,
  onClose,
  roomId,
  onInvited,
}: InviteGroupModalProps) {
  const [groups, setGroups] = useState<(AgentGroup & { members?: Array<{ agent: DeployedAgent; role: string; speak_order: number }> })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // 그룹 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadGroups()
    }
  }, [isOpen])

  const loadGroups = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/agent-groups')
      if (res.ok) {
        const data = await res.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('그룹 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!selectedGroupId) return

    setIsInviting(true)
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/invite-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: selectedGroupId }),
      })

      if (res.ok) {
        const result = await res.json()
        onInvited?.(result)
        onClose()
      } else {
        const error = await res.json()
        alert(error.error || '초대에 실패했습니다')
      }
    } catch (error) {
      console.error('그룹 초대 실패:', error)
      alert('그룹 초대에 실패했습니다')
    } finally {
      setIsInviting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  에이전트 그룹 초대
                </h2>
                <p className="text-sm text-zinc-500">
                  그룹의 모든 에이전트가 채팅에 참여합니다
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
                <p className="text-zinc-500 mb-4">생성된 그룹이 없습니다</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onClose()
                    window.location.href = '/dashboard/agents'
                  }}
                >
                  그룹 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const modeInfo = interactionModeLabels[group.interaction_mode]
                  const memberCount = group.members?.length || 0
                  const isSelected = selectedGroupId === group.id

                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(isSelected ? null : group.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/50'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Group Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                          <Users className="w-6 h-6" />
                        </div>

                        {/* Group Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                              {group.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${modeInfo.color}`}>
                              {modeInfo.label}
                            </span>
                          </div>

                          {group.description && (
                            <p className="text-sm text-zinc-500 truncate mb-2">
                              {group.description}
                            </p>
                          )}

                          {/* Members Preview */}
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {group.members?.slice(0, 4).map((m, i) => (
                                <div
                                  key={m.agent?.id || i}
                                  className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] text-white font-bold"
                                  title={m.agent?.name}
                                >
                                  {m.agent?.name?.charAt(0) || '?'}
                                </div>
                              ))}
                              {memberCount > 4 && (
                                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 font-medium">
                                  +{memberCount - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-zinc-400">
                              {memberCount}명의 에이전트
                            </span>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {/* Mode Description */}
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800"
                        >
                          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                            <Sparkles className="w-4 h-4" />
                            <span>{modeInfo.description} 모드로 대화가 진행됩니다</span>
                          </div>
                        </motion.div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" onClick={onClose} disabled={isInviting}>
              취소
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!selectedGroupId || isInviting}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isInviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  초대 중...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  그룹 초대하기
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

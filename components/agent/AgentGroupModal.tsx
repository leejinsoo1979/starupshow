"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  X,
  Users,
  Bot,
  Plus,
  Trash2,
  GripVertical,
  Crown,
  Loader2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { DeployedAgent, AgentGroup, InteractionMode } from "@/types/database"

interface AgentGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (group: Partial<AgentGroup> & { agent_ids?: string[] }) => Promise<void>
  group?: AgentGroup & { members?: Array<{ agent: DeployedAgent; role: string; speak_order: number }> }
  availableAgents: DeployedAgent[]
}

const interactionModes: { value: InteractionMode; label: string; description: string }[] = [
  { value: 'solo', label: '단독', description: '각 에이전트가 독립적으로 응답' },
  { value: 'sequential', label: '순차', description: '에이전트들이 순서대로 응답' },
  { value: 'debate', label: '토론', description: '에이전트들이 서로 토론' },
  { value: 'collaborate', label: '협업', description: '역할을 분담하여 협업' },
  { value: 'supervisor', label: '감독자', description: '감독자가 다른 에이전트 조율' },
]

// Sortable Agent Item Component
interface SortableAgentItemProps {
  agent: DeployedAgent
  index: number
  interactionMode: InteractionMode
  onRemove: (id: string) => void
}

function SortableAgentItem({ agent, index, interactionMode, onRemove }: SortableAgentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const showDragHandle = interactionMode === "sequential" || interactionMode === "supervisor"

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 ${
        isDragging ? "shadow-lg ring-2 ring-purple-500 opacity-90" : ""
      }`}
    >
      {showDragHandle && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
        </button>
      )}

      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
        {agent.name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
            {agent.name}
          </span>
          {index === 0 && interactionMode === "supervisor" && (
            <Crown className="w-4 h-4 text-yellow-500" />
          )}
          {(interactionMode === "sequential" || interactionMode === "supervisor") && (
            <span className="text-xs text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
              #{index + 1}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">
          {agent.llm_provider}/{agent.llm_model}
        </p>
      </div>

      <button
        onClick={() => onRemove(agent.id)}
        className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export function AgentGroupModal({
  isOpen,
  onClose,
  onSave,
  group,
  availableAgents,
}: AgentGroupModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("collaborate")
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize form when group changes
  useEffect(() => {
    if (group) {
      setName(group.name)
      setDescription(group.description || "")
      setInteractionMode(group.interaction_mode)
      setSelectedAgents(
        group.members
          ?.sort((a, b) => a.speak_order - b.speak_order)
          .map(m => m.agent.id) || []
      )
    } else {
      setName("")
      setDescription("")
      setInteractionMode("collaborate")
      setSelectedAgents([])
    }
  }, [group, isOpen])

  const handleAddAgent = (agentId: string) => {
    if (!selectedAgents.includes(agentId)) {
      setSelectedAgents([...selectedAgents, agentId])
    }
  }

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter(id => id !== agentId))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSelectedAgents((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        id: group?.id,
        name: name.trim(),
        description: description.trim() || null,
        interaction_mode: interactionMode,
        agent_ids: selectedAgents,
      })
      onClose()
    } catch (error) {
      console.error("그룹 저장 실패:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const unselectedAgents = availableAgents.filter(
    a => !selectedAgents.includes(a.id)
  )

  const selectedAgentObjects = selectedAgents
    .map(id => availableAgents.find(a => a.id === id))
    .filter((a): a is DeployedAgent => a !== undefined)

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
          className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {group ? "그룹 편집" : "새 에이전트 그룹"}
                </h2>
                <p className="text-sm text-zinc-500">
                  여러 에이전트를 그룹으로 묶어 협업하게 하세요
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
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  그룹 이름 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 마케팅 분석팀"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-purple-500/50"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  설명 (선택)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 그룹의 역할을 설명하세요"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-20"
                />
              </div>

              {/* Interaction Mode */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  상호작용 모드
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {interactionModes.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setInteractionMode(mode.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        interactionMode === mode.value
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            interactionMode === mode.value
                              ? "border-purple-500"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {interactionMode === mode.value && (
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          {mode.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 ml-6">
                        {mode.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Agents with Drag & Drop */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  그룹 멤버 ({selectedAgents.length})
                  {(interactionMode === "sequential" || interactionMode === "supervisor") && (
                    <span className="text-xs text-purple-500 ml-2">
                      ✨ 드래그하여 순서 변경 가능
                    </span>
                  )}
                </label>

                {selectedAgents.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-sm text-zinc-500">
                    아래에서 에이전트를 선택하세요
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedAgents}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {selectedAgentObjects.map((agent, index) => (
                          <SortableAgentItem
                            key={agent.id}
                            agent={agent}
                            index={index}
                            interactionMode={interactionMode}
                            onRemove={handleRemoveAgent}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Available Agents */}
              {unselectedAgents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    에이전트 추가
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {unselectedAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleAddAgent(agent.id)}
                        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                          {agent.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {agent.name}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {agent.description || "설명 없음"}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-zinc-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || selectedAgents.length === 0 || isSaving}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {group ? "저장" : "그룹 생성"}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

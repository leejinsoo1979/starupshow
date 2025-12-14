'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  X,
  Loader2,
  Lightbulb,
  Palette,
  Code,
  TestTube,
  FileText,
  Search,
  Database,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NodeAgentType, AutomationLevel } from '@/types/database'

interface AddNodeDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (node: any) => void
}

const agentTypes: { value: NodeAgentType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'planner', label: '기획', icon: Lightbulb, description: '요구사항 분석, 계획 수립' },
  { value: 'designer', label: '디자인', icon: Palette, description: 'UI/UX, 디자인 시스템' },
  { value: 'developer', label: '개발', icon: Code, description: '코드 구현, 기술 구현' },
  { value: 'qa', label: 'QA', icon: TestTube, description: '테스트, 품질 검증' },
  { value: 'content', label: '콘텐츠', icon: FileText, description: '콘텐츠 작성, 문서화' },
  { value: 'research', label: '리서치', icon: Search, description: '시장 조사, 경쟁 분석' },
  { value: 'data', label: '데이터', icon: Database, description: '데이터 분석, 인사이트' },
  { value: 'general', label: '일반', icon: Settings, description: '범용 업무' },
]

const automationLevels: { value: AutomationLevel; label: string; description: string }[] = [
  { value: 'full', label: '완전 자동', description: 'AI가 자동으로 실행하고 완료' },
  { value: 'assisted', label: 'AI 보조', description: 'AI가 추천하고 사용자가 승인' },
  { value: 'manual', label: '수동', description: '사용자가 직접 실행' },
]

export function AddNodeDialog({
  projectId,
  isOpen,
  onClose,
  onCreated,
}: AddNodeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const [agentType, setAgentType] = useState<NodeAgentType>('general')
  const [automationLevel, setAutomationLevel] = useState<AutomationLevel>('assisted')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [priority, setPriority] = useState('0')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/projects/${projectId}/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          goal: goal.trim() || null,
          agent_type: agentType,
          automation_level: automationLevel,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          priority: parseInt(priority) || 0,
          position_x: Math.random() * 400 + 100,
          position_y: Math.random() * 300 + 100,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create node')
      }

      const data = await response.json()
      onCreated(data.node)

      // Reset form
      setTitle('')
      setDescription('')
      setGoal('')
      setAgentType('general')
      setAutomationLevel('assisted')
      setEstimatedHours('')
      setPriority('0')
    } catch (error) {
      console.error('Failed to create node:', error)
      alert('노드 생성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">새 노드 추가</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              제목 <span className="text-red-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 사용자 인증 시스템 구현"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="노드에 대한 상세 설명..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              목표
            </label>
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="이 노드가 달성해야 할 목표"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Agent Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              에이전트 유형
            </label>
            <div className="grid grid-cols-4 gap-2">
              {agentTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setAgentType(type.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                      agentType === type.value
                        ? 'border-cyan-500 bg-cyan-950/30'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4',
                      agentType === type.value ? 'text-cyan-400' : 'text-gray-400'
                    )} />
                    <span className={cn(
                      'text-xs',
                      agentType === type.value ? 'text-cyan-400' : 'text-gray-400'
                    )}>
                      {type.label}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {agentTypes.find(t => t.value === agentType)?.description}
            </p>
          </div>

          {/* Automation Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              자동화 레벨
            </label>
            <div className="space-y-2">
              {automationLevels.map((level) => (
                <label
                  key={level.value}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    automationLevel === level.value
                      ? 'border-cyan-500 bg-cyan-950/30'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  )}
                >
                  <input
                    type="radio"
                    name="automationLevel"
                    value={level.value}
                    checked={automationLevel === level.value}
                    onChange={(e) => setAutomationLevel(e.target.value as AutomationLevel)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    automationLevel === level.value
                      ? 'border-cyan-500'
                      : 'border-gray-600'
                  )}>
                    {automationLevel === level.value && (
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    )}
                  </div>
                  <div>
                    <div className={cn(
                      'text-sm font-medium',
                      automationLevel === level.value ? 'text-cyan-400' : 'text-gray-300'
                    )}>
                      {level.label}
                    </div>
                    <div className="text-xs text-gray-500">{level.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Estimated Hours & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                예상 시간 (시간)
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="예: 4"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                우선순위 (0-10)
              </label>
              <Input
                type="number"
                min="0"
                max="10"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="0"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              생성
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

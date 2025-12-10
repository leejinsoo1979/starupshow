"use client"

import { memo, useCallback } from "react"
import { Node } from "reactflow"
import { motion, AnimatePresence } from "framer-motion"
import { X, Settings, Trash2 } from "lucide-react"
import type { NodeData } from "@/lib/workflow"
import { Button } from "@/components/ui/Button"

interface NodeConfigPanelProps {
  node: Node<NodeData> | null
  onClose: () => void
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void
  onDelete: (nodeId: string) => void
}

function NodeConfigPanelComponent({
  node,
  onClose,
  onUpdate,
  onDelete,
}: NodeConfigPanelProps) {
  const handleChange = useCallback(
    (field: keyof NodeData, value: string | number | boolean) => {
      if (!node) return
      onUpdate(node.id, { [field]: value })
    },
    [node, onUpdate]
  )

  const renderFields = () => {
    if (!node) return null

    switch (node.type) {
      case "trigger":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                트리거 타입
              </label>
              <select
                value={node.data.dataSource || "webhook"}
                onChange={(e) => handleChange("dataSource", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="webhook">웹훅</option>
                <option value="schedule">스케줄</option>
                <option value="manual">수동</option>
              </select>
            </div>
          </div>
        )

      case "input":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                데이터 소스
              </label>
              <select
                value={node.data.dataSource || "manual"}
                onChange={(e) => handleChange("dataSource", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="manual">수동 입력</option>
                <option value="api">API</option>
                <option value="database">데이터베이스</option>
                <option value="file">파일</option>
                <option value="webhook">웹훅</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                샘플 데이터 (JSON)
              </label>
              <textarea
                value={node.data.sampleData || ""}
                onChange={(e) => handleChange("sampleData", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono resize-none"
                placeholder='{ "key": "value" }'
              />
            </div>
          </div>
        )

      case "output":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                출력 대상
              </label>
              <select
                value={node.data.outputType || "console"}
                onChange={(e) => handleChange("outputType", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="console">콘솔</option>
                <option value="api">API</option>
                <option value="database">데이터베이스</option>
                <option value="file">파일</option>
                <option value="notification">알림</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                출력 포맷
              </label>
              <select
                value={node.data.outputFormat || "json"}
                onChange={(e) => handleChange("outputFormat", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xml">XML</option>
                <option value="text">텍스트</option>
              </select>
            </div>
          </div>
        )

      case "process":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                처리 타입
              </label>
              <select
                value={node.data.processType || "transform"}
                onChange={(e) => handleChange("processType", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="transform">변환</option>
                <option value="filter">필터</option>
                <option value="aggregate">집계</option>
                <option value="sort">정렬</option>
                <option value="merge">병합</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                설정 (JSON)
              </label>
              <textarea
                value={node.data.processConfig || ""}
                onChange={(e) => handleChange("processConfig", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono resize-none"
                placeholder='{ "operation": "map" }'
              />
            </div>
          </div>
        )

      case "conditional":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                조건식
              </label>
              <input
                type="text"
                value={node.data.condition || ""}
                onChange={(e) => handleChange("condition", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono"
                placeholder="data.value > 0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  True 라벨
                </label>
                <input
                  type="text"
                  value={node.data.trueLabel || "Yes"}
                  onChange={(e) => handleChange("trueLabel", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  False 라벨
                </label>
                <input
                  type="text"
                  value={node.data.falseLabel || "No"}
                  onChange={(e) => handleChange("falseLabel", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                />
              </div>
            </div>
          </div>
        )

      case "code":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                언어
              </label>
              <select
                value={node.data.codeLanguage || "javascript"}
                onChange={(e) => handleChange("codeLanguage", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                코드
              </label>
              <textarea
                value={node.data.code || ""}
                onChange={(e) => handleChange("code", e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono resize-none"
                placeholder="// 여기에 코드를 입력하세요"
              />
            </div>
          </div>
        )

      case "ai":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                AI 모델
              </label>
              <select
                value={node.data.aiModel || "gpt-4"}
                onChange={(e) => handleChange("aiModel", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5">GPT-3.5</option>
                <option value="claude">Claude</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                프롬프트
              </label>
              <textarea
                value={node.data.aiPrompt || ""}
                onChange={(e) => handleChange("aiPrompt", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 resize-none"
                placeholder="AI에게 보낼 프롬프트를 입력하세요. {{input}}으로 입력 데이터를 참조할 수 있습니다."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Temperature ({node.data.aiTemperature || 0.7})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={node.data.aiTemperature || 0.7}
                onChange={(e) => handleChange("aiTemperature", parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )

      case "delay":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  대기 시간
                </label>
                <input
                  type="number"
                  value={node.data.delayMs || 1000}
                  onChange={(e) => handleChange("delayMs", parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  단위
                </label>
                <select
                  value={node.data.delayUnit || "ms"}
                  onChange={(e) => handleChange("delayUnit", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                >
                  <option value="ms">밀리초 (ms)</option>
                  <option value="s">초 (s)</option>
                  <option value="m">분 (m)</option>
                  <option value="h">시간 (h)</option>
                </select>
              </div>
            </div>
          </div>
        )

      case "http":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  메서드
                </label>
                <select
                  value={node.data.httpMethod || "GET"}
                  onChange={(e) => handleChange("httpMethod", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={node.data.httpUrl || ""}
                  onChange={(e) => handleChange("httpUrl", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                  placeholder="https://api.example.com/data"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                헤더 (JSON)
              </label>
              <textarea
                value={node.data.httpHeaders || ""}
                onChange={(e) => handleChange("httpHeaders", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono resize-none"
                placeholder='{ "Content-Type": "application/json" }'
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                본문 (JSON)
              </label>
              <textarea
                value={node.data.httpBody || ""}
                onChange={(e) => handleChange("httpBody", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono resize-none"
                placeholder='{ "data": "value" }'
              />
            </div>
          </div>
        )

      case "notification":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                알림 타입
              </label>
              <select
                value={node.data.notificationType || "slack"}
                onChange={(e) => handleChange("notificationType", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
              >
                <option value="email">이메일</option>
                <option value="slack">Slack</option>
                <option value="webhook">웹훅</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                대상
              </label>
              <input
                type="text"
                value={node.data.notificationTarget || ""}
                onChange={(e) => handleChange("notificationTarget", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                placeholder={
                  node.data.notificationType === "email"
                    ? "email@example.com"
                    : node.data.notificationType === "slack"
                    ? "#channel"
                    : "https://webhook.url"
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                메시지
              </label>
              <textarea
                value={node.data.notificationMessage || ""}
                onChange={(e) => handleChange("notificationMessage", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 resize-none"
                placeholder="알림 메시지를 입력하세요"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center text-zinc-500 py-4">
            이 노드는 설정이 없습니다.
          </div>
        )
    }
  }

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-100">노드 설정</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Node Info */}
          <div className="p-4 border-b border-zinc-800">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  라벨
                </label>
                <input
                  type="text"
                  value={node.data.label}
                  onChange={(e) => handleChange("label", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  설명
                </label>
                <input
                  type="text"
                  value={node.data.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100"
                  placeholder="노드 설명"
                />
              </div>
            </div>
          </div>

          {/* Type-specific fields */}
          <div className="flex-1 overflow-y-auto p-4">{renderFields()}</div>

          {/* Actions */}
          <div className="p-4 border-t border-zinc-800">
            <Button
              variant="outline"
              className="w-full justify-center text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => {
                onDelete(node.id)
                onClose()
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              노드 삭제
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const NodeConfigPanel = memo(NodeConfigPanelComponent)

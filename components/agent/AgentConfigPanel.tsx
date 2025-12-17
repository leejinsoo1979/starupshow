"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Node } from "reactflow"
import { motion, AnimatePresence } from "framer-motion"
import { X, Trash2, Settings, Sparkles, Maximize2, Minimize2, RefreshCw, AlertCircle, CheckCircle, FileText, Table, Mail, Globe, Calculator, Package, Zap, ExternalLink, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { INTEGRATION_APPS, CATEGORIES, APP_ACTIONS, searchApps, getApp, getAppActions } from '@/lib/integrations/apps'
import { AppLogo, CategoryIcon } from '@/components/icons/AppLogo'
import type { IntegrationAction, IntegrationField } from '@/lib/integrations/apps'
import { Button } from "@/components/ui/Button"
import type { AgentNodeData, AgentType } from "@/lib/agent"
import { usePythonTools, type PythonTool } from "@/hooks/usePythonTools"

// Monaco Editor 동적 import (SSR 비활성화)
const MonacoCodeEditor = dynamic(
  () => import('@/components/editor/MonacoCodeEditor').then(mod => mod.MonacoCodeEditor),
  { ssr: false, loading: () => <div className="h-[300px] bg-zinc-800 animate-pulse rounded-lg" /> }
)

interface AgentConfigPanelProps {
  node: Node<AgentNodeData> | null
  onClose: () => void
  onUpdate: (nodeId: string, data: Partial<AgentNodeData>) => void
}

// Helper function to get tool icon
function getToolIcon(toolName: string) {
  if (toolName.startsWith('ai_docs')) return <FileText className="w-4 h-4" />
  if (toolName.startsWith('ai_sheet')) return <Table className="w-4 h-4" />
  if (toolName.startsWith('email')) return <Mail className="w-4 h-4" />
  if (toolName.startsWith('web_search')) return <Globe className="w-4 h-4" />
  if (toolName.startsWith('calculator')) return <Calculator className="w-4 h-4" />
  return <Package className="w-4 h-4" />
}

// Helper function to get tool category color
function getToolCategoryColor(toolName: string): string {
  if (toolName.startsWith('ai_docs')) return 'text-blue-500'
  if (toolName.startsWith('ai_sheet')) return 'text-green-500'
  if (toolName.startsWith('email')) return 'text-purple-500'
  if (toolName.startsWith('web_search')) return 'text-pink-500'
  if (toolName.startsWith('calculator')) return 'text-amber-500'
  return 'text-orange-500'
}

// Python Tool Configuration Component
function PythonToolConfig({
  node,
  onUpdate,
}: {
  node: Node<AgentNodeData>
  onUpdate: (nodeId: string, data: Partial<AgentNodeData>) => void
}) {
  const { tools, categorizedTools, isLoading, error, isConnected, fetchTools } = usePythonTools()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const selectedTool = tools.find(t => t.name === node.data.pythonToolName)

  const handleToolSelect = (tool: PythonTool) => {
    onUpdate(node.id, {
      pythonToolName: tool.name,
      pythonToolDescription: tool.description,
      pythonToolParameters: tool.parameters?.properties || {},
      pythonToolArgs: {},
      label: formatToolName(tool.name),
    })
  }

  const handleArgChange = (paramName: string, value: unknown) => {
    onUpdate(node.id, {
      pythonToolArgs: {
        ...(node.data.pythonToolArgs || {}),
        [paramName]: value,
      },
    })
  }

  // Format tool name for display
  function formatToolName(name: string): string {
    const parts = name.split('_')
    const cleanParts = parts.filter(p => !['ai', 'tool'].includes(p.toLowerCase()))
    return cleanParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {isConnected ? 'Python Backend 연결됨' : 'Python Backend 연결 안됨'}
          </span>
        </div>
        <button
          onClick={fetchTools}
          disabled={isLoading}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Tool Selection */}
      {isConnected && (
        <>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              도구 카테고리
            </label>
            <div className="flex flex-wrap gap-1">
              {categorizedTools.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.name ? null : category.name
                  )}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    selectedCategory === category.name
                      ? 'bg-violet-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {category.name} ({category.tools.length})
                </button>
              ))}
            </div>
          </div>

          {/* Tool List */}
          {selectedCategory && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                도구 선택
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1">
                {categorizedTools
                  .find(c => c.name === selectedCategory)
                  ?.tools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => handleToolSelect(tool)}
                      className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
                        node.data.pythonToolName === tool.name
                          ? 'bg-violet-500/20 border border-violet-500/50'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className={getToolCategoryColor(tool.name)}>
                        {getToolIcon(tool.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {formatToolName(tool.name)}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {tool.description}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Selected Tool Info */}
          {selectedTool && (
            <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-3">
              <div className="flex items-center gap-2">
                <span className={getToolCategoryColor(selectedTool.name)}>
                  {getToolIcon(selectedTool.name)}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatToolName(selectedTool.name)}
                </span>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedTool.description}
              </p>

              {/* Tool Parameters */}
              {selectedTool.parameters?.properties && Object.keys(selectedTool.parameters.properties).length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    파라미터
                  </label>
                  {Object.entries(selectedTool.parameters.properties).map(([paramName, paramDef]) => {
                    const isRequired = selectedTool.parameters?.required?.includes(paramName)
                    const currentValue = node.data.pythonToolArgs?.[paramName]

                    return (
                      <div key={paramName} className="space-y-1">
                        <label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          {paramName}
                          {isRequired && <span className="text-red-500 ml-1">*</span>}
                          {paramDef.description && (
                            <span className="text-zinc-400 dark:text-zinc-500 ml-1">
                              - {paramDef.description}
                            </span>
                          )}
                        </label>

                        {paramDef.enum ? (
                          <select
                            value={String(currentValue || paramDef.default || '')}
                            onChange={(e) => handleArgChange(paramName, e.target.value)}
                            className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          >
                            <option value="">선택...</option>
                            {paramDef.enum.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : paramDef.type === 'boolean' ? (
                          <select
                            value={String(currentValue ?? paramDef.default ?? '')}
                            onChange={(e) => handleArgChange(paramName, e.target.value === 'true')}
                            className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          >
                            <option value="">선택...</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : paramDef.type === 'integer' || paramDef.type === 'number' ? (
                          <input
                            type="number"
                            value={String(currentValue ?? paramDef.default ?? '')}
                            onChange={(e) => handleArgChange(paramName, parseFloat(e.target.value) || 0)}
                            placeholder={paramDef.default ? `기본값: ${paramDef.default}` : ''}
                            className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(currentValue ?? paramDef.default ?? '')}
                            onChange={(e) => handleArgChange(paramName, e.target.value)}
                            placeholder={paramDef.default ? `기본값: ${paramDef.default}` : '입력...'}
                            className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Clear Selection */}
              <button
                onClick={() => onUpdate(node.id, {
                  pythonToolName: undefined,
                  pythonToolDescription: undefined,
                  pythonToolParameters: undefined,
                  pythonToolArgs: undefined,
                  label: 'Tool',
                })}
                className="w-full mt-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                선택 해제
              </button>
            </div>
          )}
        </>
      )}

      {/* Fallback when not connected */}
      {!isConnected && !isLoading && (
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            💡 Python AI Backend가 실행되지 않았습니다.
            <br /><br />
            다음 명령으로 백엔드를 시작하세요:
            <code className="block mt-2 p-2 bg-zinc-200 dark:bg-zinc-700 rounded text-[10px] font-mono">
              cd ai-backend && ./run.sh
            </code>
          </p>
        </div>
      )}
    </div>
  )
}

// Integration Config Component - 새 디자인
function ActivepiecesConfig({
  node,
  onUpdate,
}: {
  node: Node<AgentNodeData>
  onUpdate: (nodeId: string, data: Partial<AgentNodeData>) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedApp, setSelectedApp] = useState<string | null>(node.data.integrationApp || null)
  const [selectedAction, setSelectedAction] = useState<string | null>(node.data.integrationAction || null)

  const filteredApps = searchApps(searchQuery, selectedCategory)
  const currentActions = selectedApp ? getAppActions(selectedApp) : []
  const currentAction = currentActions.find(a => a.id === selectedAction)
  const currentApp = selectedApp ? getApp(selectedApp) : null

  const handleAppSelect = (appId: string) => {
    const app = getApp(appId)
    setSelectedApp(appId)
    setSelectedAction(null)
    onUpdate(node.id, {
      integrationApp: appId,
      integrationAction: undefined,
      integrationConfig: {},
      label: app?.name || 'Integration',
    })
  }

  const handleActionSelect = (actionId: string) => {
    const action = currentActions.find(a => a.id === actionId)
    setSelectedAction(actionId)
    onUpdate(node.id, {
      integrationAction: actionId,
      label: `${currentApp?.name} → ${action?.name}`,
    })
  }

  const handleFieldChange = (fieldId: string, value: string) => {
    const currentConfig = (node.data.integrationConfig || {}) as Record<string, string>
    onUpdate(node.id, {
      integrationConfig: { ...currentConfig, [fieldId]: value }
    })
  }

  const handleBack = () => {
    if (selectedAction) {
      setSelectedAction(null)
      onUpdate(node.id, { integrationAction: undefined })
    } else if (selectedApp) {
      setSelectedApp(null)
      onUpdate(node.id, { integrationApp: undefined, label: 'Integration' })
    }
  }

  // Step 1: App Selection
  if (!selectedApp) {
    return (
      <div className="space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="100+ 앱 검색..."
            className="w-full px-3 py-2.5 pl-10 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.slice(0, 8).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-zinc-300'
              }`}
            >
              <CategoryIcon categoryId={cat.id} size={14} className={selectedCategory === cat.id ? 'text-white' : ''} />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* 앱 그리드 */}
        <div className="max-h-72 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2">
            {filteredApps.slice(0, 30).map(app => (
              <button
                key={app.id}
                onClick={() => handleAppSelect(app.id)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/50 hover:border-gray-300 dark:hover:border-zinc-600 transition-all text-left group"
              >
                <AppLogo appId={app.id} size={28} />
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-200 group-hover:text-gray-900 dark:group-hover:text-white truncate">{app.name}</span>
              </button>
            ))}
          </div>
          {filteredApps.length > 30 && (
            <p className="text-center text-xs text-gray-500 dark:text-zinc-500 mt-3">
              +{filteredApps.length - 30}개 더 있음
            </p>
          )}
        </div>

        {/* 하단 정보 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-zinc-800">
          <span className="text-xs text-gray-500 dark:text-zinc-500">
            {INTEGRATION_APPS.length}개 앱 연동 가능
          </span>
          <div className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
            <Sparkles className="w-3 h-3" />
            <span>Powered by Activepieces</span>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Action Selection
  if (!selectedAction) {
    return (
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 p-2.5 bg-gray-100 dark:bg-zinc-800/80 rounded-xl">
            {currentApp && <AppLogo appId={currentApp.id} size={28} />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{currentApp?.name}</p>
              <p className="text-[10px] text-gray-500 dark:text-zinc-500">액션을 선택하세요</p>
            </div>
          </div>
        </div>

        {/* 액션 목록 */}
        <div className="space-y-2">
          {currentActions.length > 0 ? (
            currentActions.map(action => (
              <button
                key={action.id}
                onClick={() => handleActionSelect(action.id)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/50 hover:border-indigo-500/50 transition-all text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-zinc-200 group-hover:text-gray-900 dark:group-hover:text-white">{action.name}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{action.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 flex-shrink-0 ml-2" />
              </button>
            ))
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-zinc-500">이 앱의 액션이 아직 정의되지 않았습니다.</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">곧 추가될 예정입니다.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 3: Configuration
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
        </button>
        <div className="flex items-center gap-2.5 flex-1 p-2.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-500/30 rounded-xl">
          {currentApp && <AppLogo appId={currentApp.id} size={28} />}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{currentApp?.name}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-300">{currentAction?.name}</p>
          </div>
        </div>
      </div>

      {/* 필드 입력 */}
      <div className="space-y-4">
        {currentAction?.fields.map(field => (
          <div key={field.id} className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-zinc-400">
              {field.name}
              {field.required && <span className="text-red-500 dark:text-red-400">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={(node.data.integrationConfig as Record<string, string>)?.[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none"
              />
            ) : field.type === 'select' ? (
              <select
                value={(node.data.integrationConfig as Record<string, string>)?.[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              >
                <option value="" className="text-gray-400 dark:text-zinc-500">선택...</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={(node.data.integrationConfig as Record<string, string>)?.[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            ) : (
              <input
                type="text"
                value={(node.data.integrationConfig as Record<string, string>)?.[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            )}
          </div>
        ))}
      </div>

      {/* 완료 표시 */}
      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
          </div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">설정 완료</p>
        </div>
        <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-1 ml-7">
          에이전트 실행 시 이 액션이 수행됩니다.
        </p>
      </div>
    </div>
  )
}

export function AgentConfigPanel({
  node,
  onClose,
  onUpdate,
}: AgentConfigPanelProps) {
  const [isCodeExpanded, setIsCodeExpanded] = useState(false)

  if (!node) return null

  const handleChange = (key: keyof AgentNodeData, value: unknown) => {
    onUpdate(node.id, { [key]: value })
  }

  const renderConfigFields = () => {
    const type = node.type as AgentType

    switch (type) {
      case "llm":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">모델</label>
              <select
                value={node.data.model || "gpt-4-turbo"}
                onChange={(e) => handleChange("model", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Temperature ({node.data.temperature || 0.7})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={node.data.temperature || 0.7}
                onChange={(e) =>
                  handleChange("temperature", parseFloat(e.target.value))
                }
                className="w-full accent-violet-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Max Tokens
              </label>
              <input
                type="number"
                value={node.data.maxTokens || 2048}
                onChange={(e) =>
                  handleChange("maxTokens", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                System Prompt
              </label>
              <textarea
                value={node.data.systemPrompt || ""}
                onChange={(e) => handleChange("systemPrompt", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                placeholder="시스템 프롬프트를 입력하세요..."
              />
            </div>
          </>
        )

      case "prompt":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              프롬프트 내용
            </label>
            <textarea
              value={node.data.prompt || ""}
              onChange={(e) => handleChange("prompt", e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
              placeholder="프롬프트를 입력하세요..."
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              $input1, $input2 등을 사용하여 연결된 노드의 출력을 참조하세요
            </p>
          </div>
        )

      case "memory":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                메모리 타입
              </label>
              <select
                value={node.data.memoryType || "buffer"}
                onChange={(e) => handleChange("memoryType", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="buffer">Buffer Memory</option>
                <option value="summary">Summary Memory</option>
                <option value="vector">Vector Memory</option>
                <option value="none">No Memory</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                메모리 한도 (대화 수)
              </label>
              <input
                type="number"
                value={node.data.memoryLimit || 10}
                onChange={(e) =>
                  handleChange("memoryLimit", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </>
        )

      case "rag":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                벡터 스토어
              </label>
              <select
                value={node.data.vectorStore || "supabase"}
                onChange={(e) => handleChange("vectorStore", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="supabase">Supabase</option>
                <option value="pinecone">Pinecone</option>
                <option value="weaviate">Weaviate</option>
                <option value="chroma">Chroma</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                임베딩 모델
              </label>
              <select
                value={node.data.embeddingModel || "text-embedding-3-small"}
                onChange={(e) =>
                  handleChange("embeddingModel", e.target.value)
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="text-embedding-3-small">
                  text-embedding-3-small
                </option>
                <option value="text-embedding-3-large">
                  text-embedding-3-large
                </option>
                <option value="text-embedding-ada-002">
                  text-embedding-ada-002
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                검색 결과 수
              </label>
              <input
                type="number"
                value={node.data.retrievalCount || 5}
                onChange={(e) =>
                  handleChange("retrievalCount", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </>
        )

      case "router":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                라우팅 로직
              </label>
              <select
                value={node.data.routingLogic || "conditional"}
                onChange={(e) => handleChange("routingLogic", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="conditional">조건부 분기</option>
                <option value="sequential">순차 실행</option>
                <option value="parallel">병렬 실행</option>
              </select>
            </div>

            {node.data.routingLogic === "conditional" && (
              <div className="space-y-2 mt-4">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  조건 코드 (JavaScript)
                </label>
                <textarea
                  value={node.data.code || "// return 'handle1' or 'handle2' based on input\nif (input.includes('hello')) return 'a';\nreturn 'b';"}
                  onChange={(e) => handleChange("code", e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  placeholder="// 조건 로직을 작성하세요"
                />
              </div>
            )}

            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg mt-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                💡 라우터는 입력에 따라 다른 경로로 대화를 분기합니다.
                조건부 분기 선택 시, 위 코드창에 반환할 핸들 ID('a', 'b' 등)를 결정하는 로직을 작성하세요.
              </p>
            </div>
          </>
        )

      case "evaluator":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                평가 타입
              </label>
              <select
                value={node.data.evaluationType || "quality"}
                onChange={(e) => handleChange("evaluationType", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="quality">품질 평가</option>
                <option value="relevance">관련성 평가</option>
                <option value="accuracy">정확도 평가</option>
                <option value="safety">안전성 평가</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                임계값 ({node.data.threshold || 0.8})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={node.data.threshold || 0.8}
                onChange={(e) =>
                  handleChange("threshold", parseFloat(e.target.value))
                }
                className="w-full accent-violet-500"
              />
            </div>
          </>
        )

      case "input":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                입력 타입
              </label>
              <select
                value={node.data.inputType || "text"}
                onChange={(e) => handleChange("inputType", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="text">텍스트</option>
                <option value="file">파일</option>
                <option value="api">API</option>
                <option value="webhook">웹훅</option>
                <option value="schedule">스케줄</option>
              </select>
            </div>
          </>
        )

      case "output":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                출력 타입
              </label>
              <select
                value={node.data.outputType || "text"}
                onChange={(e) => handleChange("outputType", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="text">텍스트</option>
                <option value="json">JSON</option>
                <option value="stream">스트림</option>
                <option value="file">파일</option>
              </select>
            </div>
          </>
        )

      case "function":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                함수 이름
              </label>
              <input
                type="text"
                value={node.data.functionName || ""}
                onChange={(e) => handleChange("functionName", e.target.value)}
                placeholder="함수 이름을 입력하세요"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                함수 인자 (JSON)
              </label>
              <textarea
                value={node.data.functionArgs || "{}"}
                onChange={(e) => handleChange("functionArgs", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                placeholder='{"param1": "value1"}'
              />
            </div>
          </>
        )

      case "javascript":
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                코드 (JavaScript):
              </label>
              <button
                onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                title={isCodeExpanded ? "축소" : "확대"}
              >
                {isCodeExpanded ? (
                  <Minimize2 className="w-4 h-4 text-zinc-500" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-zinc-500" />
                )}
              </button>
            </div>
            <MonacoCodeEditor
              value={node.data.code || "// Access inputs as input1, etc.\nreturn input1.toUpperCase()"}
              onChange={(value) => handleChange("code", value)}
              language="javascript"
              height={isCodeExpanded ? "400px" : "200px"}
              minimap={isCodeExpanded}
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              입력값은 input1, input2 등으로 접근합니다. 마지막 표현식이 반환됩니다.
            </p>
          </div>
        )

      case "custom_tool":
        return <PythonToolConfig node={node} onUpdate={onUpdate} />

      case "image_generation":
        return (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                모델
              </label>
              <select
                value={node.data.model || "dall-e-3"}
                onChange={(e) => handleChange("model", e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="dall-e-3">DALL·E 3</option>
                <option value="dall-e-2">DALL·E 2</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                이미지 크기
              </label>
              <select
                value={node.data.inputConfig?.size as string || "1024x1024"}
                onChange={(e) => handleChange("inputConfig", { ...node.data.inputConfig, size: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="1024x1024">1024x1024</option>
                <option value="512x512">512x512</option>
                <option value="256x256">256x256</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                품질
              </label>
              <select
                value={node.data.inputConfig?.quality as string || "standard"}
                onChange={(e) => handleChange("inputConfig", { ...node.data.inputConfig, quality: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="standard">Standard</option>
                <option value="hd">HD</option>
              </select>
            </div>
          </>
        )

      case "embedding":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              임베딩 모델
            </label>
            <select
              value={node.data.embeddingModel || "text-embedding-3-small"}
              onChange={(e) => handleChange("embeddingModel", e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="text-embedding-3-small">text-embedding-3-small</option>
              <option value="text-embedding-3-large">text-embedding-3-large</option>
              <option value="text-embedding-ada-002">text-embedding-ada-002</option>
            </select>
          </div>
        )

      case "activepieces":
        return (
          <ActivepiecesConfig node={node} onUpdate={onUpdate} />
        )

      case "tool":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              API URL
            </label>
            <input
              type="text"
              value={node.data.url || ""}
              onChange={(e) => handleChange("url", e.target.value)}
              placeholder="https://api.example.com/v1/..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        )
        return (
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              이 노드에 대한 추가 설정이 없습니다.
            </p>
          </div>
        )
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="w-80 bg-white dark:bg-zinc-900 border-l border-zinc-400 dark:border-zinc-500 flex flex-col overflow-hidden transition-colors duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-400 dark:border-zinc-500 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">노드 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Node Info */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">노드 이름</label>
            <input
              type="text"
              value={node.data.label || ""}
              onChange={(e) => handleChange("label", e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">설명</label>
            <textarea
              value={node.data.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
              placeholder="노드 설명을 입력하세요..."
            />
          </div>

          <div className="border-t border-zinc-400 dark:border-zinc-500 pt-4 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-300">
                상세 설정
              </span>
            </div>
            {renderConfigFields()}
          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  )
}

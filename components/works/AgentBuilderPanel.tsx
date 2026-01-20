'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Bot,
    Sparkles,
    Check,
    X,
    Loader2,
    Rocket,
    Settings,
    ChevronRight,
    ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomAgentConfig, AgentPreview } from '@/lib/agent-builder'
import { useRouter } from 'next/navigation'

interface AgentBuilderPanelProps {
    agent: CustomAgentConfig | null
    preview: AgentPreview | null
    isGenerating: boolean
    onClose: () => void
    onDeploy: () => void
    onEdit: () => void
    isDeploying: boolean
    deployedRoute?: string | null
}

export function AgentBuilderPanel({
    agent,
    preview,
    isGenerating,
    onClose,
    onDeploy,
    onEdit,
    isDeploying,
    deployedRoute
}: AgentBuilderPanelProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'preview' | 'config'>('preview')

    if (!agent && !isGenerating) return null

    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col bg-zinc-900 border-l border-zinc-700"
        >
            {/* Header */}
            <div className="flex items-center justify-between h-12 px-4 border-b border-zinc-700 bg-zinc-800/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-white">에이전트 빌더</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Tabs */}
                    <div className="flex bg-zinc-700/50 rounded-lg p-0.5">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                activeTab === 'preview'
                                    ? "bg-zinc-600 text-white"
                                    : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            미리보기
                        </button>
                        <button
                            onClick={() => setActiveTab('config')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                activeTab === 'config'
                                    ? "bg-zinc-600 text-white"
                                    : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            설정
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <Bot className="w-8 h-8 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                            </div>
                        </div>
                        <p className="mt-4 text-zinc-400 text-sm">에이전트를 생성하고 있습니다...</p>
                        <div className="mt-2 flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                ) : agent && (
                    <AnimatePresence mode="wait">
                        {activeTab === 'preview' ? (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                {/* Agent Card Preview */}
                                <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                                            agent.iconBg
                                        )}>
                                            <Bot className={cn("w-7 h-7", agent.iconColor)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-white truncate">
                                                {agent.name}
                                            </h3>
                                            <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                                                {agent.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                                                    {agent.category}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    v{agent.version}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Capabilities */}
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-300 mb-2">활성화된 기능</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {agent.capabilities.filter(c => c.enabled).map((cap) => (
                                            <span
                                                key={cap.id}
                                                className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-full"
                                            >
                                                <Check className="w-3 h-3" />
                                                {cap.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Sample Conversation */}
                                {preview && preview.sampleConversation.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-300 mb-2">샘플 대화</h4>
                                        <div className="space-y-3 bg-zinc-800/50 rounded-lg p-3">
                                            {preview.sampleConversation.map((msg, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex justify-end">
                                                        <span className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-xl rounded-br-none">
                                                            {msg.user}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-start">
                                                        <span className="bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-xl rounded-bl-none">
                                                            {msg.assistant}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Suggested Queries */}
                                {agent.suggestedQueries && agent.suggestedQueries.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-300 mb-2">추천 질문</h4>
                                        <div className="space-y-1">
                                            {agent.suggestedQueries.map((query, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg text-xs text-zinc-400"
                                                >
                                                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                                                    {query}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="config"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* System Prompt */}
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-300 mb-2">시스템 프롬프트</h4>
                                    <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-400 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                                        {agent.systemPrompt}
                                    </div>
                                </div>

                                {/* Personality */}
                                {agent.personality && (
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-300 mb-2">성격/말투</h4>
                                        <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-400">
                                            {agent.personality}
                                        </div>
                                    </div>
                                )}

                                {/* Tools */}
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-300 mb-2">도구 설정</h4>
                                    <div className="space-y-1">
                                        {agent.tools.map((tool) => (
                                            <div
                                                key={tool.id}
                                                className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        tool.enabled ? "bg-green-400" : "bg-zinc-500"
                                                    )} />
                                                    <span className="text-xs text-zinc-300">{tool.name}</span>
                                                </div>
                                                <span className="text-xs text-zinc-500">{tool.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="pt-4 border-t border-zinc-700">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-zinc-500">ID</div>
                                        <div className="text-zinc-400 font-mono truncate">{agent.id}</div>
                                        <div className="text-zinc-500">생성일</div>
                                        <div className="text-zinc-400">{agent.createdAt.toLocaleString()}</div>
                                        <div className="text-zinc-500">상태</div>
                                        <div className="text-zinc-400">{agent.status}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer Actions */}
            {agent && !isGenerating && (
                <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
                    {deployedRoute ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg">
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-green-300">Apps 메뉴에 배포 완료!</span>
                            </div>
                            <button
                                onClick={() => router.push(deployedRoute)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                에이전트 열기
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={onEdit}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                수정
                            </button>
                            <button
                                onClick={onDeploy}
                                disabled={isDeploying}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                            >
                                {isDeploying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Rocket className="w-4 h-4" />
                                )}
                                Apps에 배포
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    )
}

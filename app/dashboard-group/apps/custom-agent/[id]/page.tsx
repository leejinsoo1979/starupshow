'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft,
    Send,
    Loader2,
    Settings,
    Trash2,
    Sparkles,
    Bot
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { getCustomAgentById, deleteCustomAgent, CustomAgentConfig } from '@/lib/agent-builder'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function CustomAgentPage() {
    const params = useParams()
    const router = useRouter()
    const agentId = params.id as string

    const [agent, setAgent] = useState<CustomAgentConfig | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadedAgent = getCustomAgentById(agentId)
        if (loadedAgent) {
            setAgent(loadedAgent)
        } else {
            router.push('/dashboard-group/apps')
        }
    }, [agentId, router])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || isLoading || !agent) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            // 에이전트의 시스템 프롬프트를 사용하여 API 호출
            const response = await fetch('/api/agents/super/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
                    systemPrompt: agent.systemPrompt,
                    agentConfig: {
                        name: agent.name,
                        capabilities: agent.capabilities.map(c => c.id),
                        personality: agent.personality
                    }
                })
            })

            const data = await response.json()

            if (data.error) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `오류가 발생했습니다: ${data.error}`
                }])
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.response || data.content || '응답을 받지 못했습니다.'
                }])
            }
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '오류가 발생했습니다. 다시 시도해주세요.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = () => {
        if (confirm('이 에이전트를 삭제하시겠습니까?')) {
            deleteCustomAgent(agentId)
            router.push('/dashboard-group/apps')
        }
    }

    if (!agent) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] -m-8 bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="flex items-center gap-4 h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <button
                    onClick={() => router.push('/dashboard-group/apps')}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </button>

                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    agent.iconBg
                )}>
                    <Bot className={cn("w-5 h-5", agent.iconColor)} />
                </div>

                <div className="flex-1">
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-white">{agent.name}</h1>
                    <p className="text-xs text-zinc-500 line-clamp-1">{agent.description}</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <Settings className="w-5 h-5 text-zinc-500" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-6">
                        <div className={cn(
                            "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
                            agent.iconBg
                        )}>
                            <Bot className={cn("w-10 h-10", agent.iconColor)} />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white mb-2">
                            {agent.name}
                        </h2>
                        <p className="text-zinc-500 text-center max-w-md mb-8">
                            {agent.description}
                        </p>

                        {/* Suggested Queries */}
                        {agent.suggestedQueries && agent.suggestedQueries.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                                {agent.suggestedQueries.map((query, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setInput(query)
                                        }}
                                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-sm text-zinc-700 dark:text-zinc-300 transition-colors"
                                    >
                                        {query}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Capabilities */}
                        <div className="mt-8 flex flex-wrap justify-center gap-2">
                            {agent.capabilities.filter(c => c.enabled).map((cap) => (
                                <span
                                    key={cap.id}
                                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                                >
                                    {cap.name}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                        {messages.map((message, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex gap-4",
                                    message.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                {message.role === 'assistant' && (
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                        agent.iconBg
                                    )}>
                                        <Bot className={cn("w-4 h-4", agent.iconColor)} />
                                    </div>
                                )}

                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-3",
                                    message.role === 'user'
                                        ? "bg-blue-500 text-white"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                )}>
                                    {message.role === 'assistant' ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm">{message.content}</p>
                                    )}
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-4"
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                    agent.iconBg
                                )}>
                                    <Bot className={cn("w-4 h-4", agent.iconColor)} />
                                </div>
                                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                                </div>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder={agent.inputPlaceholder || `${agent.name}에게 메시지 보내기...`}
                            className="flex-1 bg-transparent text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className={cn(
                                "p-2 rounded-xl transition-colors",
                                input.trim() && !isLoading
                                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                                    : "text-zinc-400"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        className="fixed right-0 top-16 bottom-0 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 p-6 overflow-y-auto z-50"
                    >
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">에이전트 설정</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-zinc-500">이름</label>
                                <p className="text-zinc-800 dark:text-zinc-200">{agent.name}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-500">설명</label>
                                <p className="text-zinc-800 dark:text-zinc-200 text-sm">{agent.description}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-500">카테고리</label>
                                <p className="text-zinc-800 dark:text-zinc-200">{agent.category}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-500">시스템 프롬프트</label>
                                <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-1 whitespace-pre-wrap bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg max-h-40 overflow-y-auto">
                                    {agent.systemPrompt}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-500">활성화된 기능</label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {agent.capabilities.filter(c => c.enabled).map((cap) => (
                                        <span
                                            key={cap.id}
                                            className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs rounded"
                                        >
                                            {cap.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-500">버전</label>
                                <p className="text-zinc-800 dark:text-zinc-200">{agent.version}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-500">상태</label>
                                <span className={cn(
                                    "inline-block px-2 py-0.5 rounded text-xs",
                                    agent.status === 'active'
                                        ? "bg-green-100 text-green-600"
                                        : "bg-yellow-100 text-yellow-600"
                                )}>
                                    {agent.status === 'active' ? '활성' : '초안'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

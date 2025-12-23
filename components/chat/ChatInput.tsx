'use client'

import React, { useRef, useEffect } from 'react'
import { useChatStore, ChatModel } from '@/stores/chatStore'
import {
    Globe,
    Image as ImageIcon,
    Mic,
    ArrowUp,
    ChevronDown,
    Bot,
    Sparkles,
    Paperclip,
    AtSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const MODELS: { id: ChatModel; name: string; icon: any }[] = [
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', icon: Sparkles },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', icon: Sparkles },
    { id: 'gpt-4o', name: 'GPT-4o', icon: Sparkles },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', icon: Sparkles },
    { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast', icon: Sparkles },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash', icon: Sparkles },
]

export function ChatInput() {
    const { input, setInput, selectedModel, setSelectedModel, isAgentMode, toggleAgentMode, addMessage, setIsLoading } = useChatStore()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
        }
    }, [input])

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Prevent double submission during IME composition (Korean)
            if (e.nativeEvent.isComposing) return

            e.preventDefault()
            if (!input.trim()) return

            // Add user message
            addMessage({
                id: Date.now().toString(),
                role: 'user',
                content: input,
                timestamp: Date.now(),
                model: selectedModel
            })

            // Mock response removed
            // Real API integration
            setIsLoading(true)

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            ...useChatStore.getState().messages,
                            { role: 'user', content: input }
                        ],
                        model: selectedModel
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `HTTP Error ${response.status}`)
                }

                const data = await response.json()

                addMessage({
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.content,
                    timestamp: Date.now(),
                    model: selectedModel
                })
            } catch (error: any) {
                console.error('Chat error:', error)
                addMessage({
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
                    timestamp: Date.now(),
                    model: selectedModel
                })
            } finally {
                setIsLoading(false)
            }

            setInput('')
        }
    }

    const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0]

    return (
        <div className="relative bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-all duration-200">
            {/* Context & Input Area */}
            <div className="p-3">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Plan, @ for context, / for commands"
                    className="no-focus-ring w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 min-h-[40px] max-h-[200px]"
                    rows={1}
                />
            </div>

            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1">
                    {/* Agent/Model Toggle Group */}
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-0.5 mr-2">
                        <button
                            onClick={toggleAgentMode}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                                isAgentMode
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                        >
                            <Bot className="w-3.5 h-3.5" />
                            <span>Agent</span>
                        </button>

                        <div className="w-[1px] h-3 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                                    <span>{currentModel.name}</span>
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[200px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl">
                                {MODELS.map((model) => (
                                    <DropdownMenuItem
                                        key={model.id}
                                        onClick={() => setSelectedModel(model.id)}
                                        className="gap-2"
                                    >
                                        <model.icon className="w-4 h-4" />
                                        {model.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Quick Actions */}
                    <button className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" title="Read Context (@)">
                        <AtSign className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" title="Browse Web">
                        <Globe className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" title="Add Image">
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors" title="Voice Input">
                        <Mic className="w-4 h-4" />
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    className={cn(
                        "p-1.5 rounded-lg transition-all duration-200",
                        input.trim()
                            ? "bg-blue-500 text-white shadow-md hover:bg-blue-600"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    )}
                    disabled={!input.trim()}
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

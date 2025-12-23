'use client'

import { create } from 'zustand'

export type ChatModel = 'gpt-4o' | 'claude-3-opus' | 'claude-3.5-sonnet' | 'gemini-1.5-pro' | 'grok-4.1-fast' | 'gemini-3-flash'

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    model?: string
}

interface ChatState {
    messages: ChatMessage[]
    input: string
    isLoading: boolean
    selectedModel: ChatModel
    isAgentMode: boolean

    setInput: (input: string) => void
    setMessages: (messages: ChatMessage[]) => void
    addMessage: (message: ChatMessage) => void
    setIsLoading: (loading: boolean) => void
    setSelectedModel: (model: ChatModel) => void
    toggleAgentMode: () => void
    clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    input: '',
    isLoading: false,
    selectedModel: 'claude-3.5-sonnet',
    isAgentMode: false,

    setInput: (input) => set({ input }),
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setIsLoading: (isLoading) => set({ isLoading }),
    setSelectedModel: (selectedModel) => set({ selectedModel }),
    toggleAgentMode: () => set((state) => ({ isAgentMode: !state.isAgentMode })),
    clearMessages: () => set({ messages: [] })
}))

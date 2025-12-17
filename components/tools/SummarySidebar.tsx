"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Youtube, FileText, Globe, Type, Plus, Send, Bot, User, Loader2, Mic, MicOff, Clock, BookOpen, FileEdit, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
    { id: 'youtube', label: '유튜브', icon: Youtube },
    { id: 'document', label: '문서', icon: FileText },
    { id: 'website', label: '웹사이트', icon: Globe },
    { id: 'text', label: '텍스트', icon: Type },
]

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
}

interface TimelineItem {
    title: string
    timestamp: string
    content: string
    details?: string[]
}

interface Summary {
    threeLine: string[]
    tableOfContents: string[]
    timeline: TimelineItem[]
    keyPoints?: string[]  // 핵심요약 포인트
    blogPost?: string     // 블로그 글 (마크다운)
}

interface SummarySidebarProps {
    activeTab: string
    onTabChange: (tab: string) => void
    onYoutubeSubmit?: (url: string) => void
    summary?: Summary | null
    isLoading?: boolean
}

export function SummarySidebar({ activeTab, onTabChange, onYoutubeSubmit, summary, isLoading = false }: SummarySidebarProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [isChatLoading, setIsChatLoading] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [activeView, setActiveView] = useState<'timeline' | 'core' | 'blog'>('timeline')
    const [copiedSection, setCopiedSection] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const recognitionRef = useRef<any>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, summary])

    const handleCopy = (text: string, section: string) => {
        navigator.clipboard.writeText(text)
        setCopiedSection(section)
        setTimeout(() => setCopiedSection(null), 2000)
    }

    const getTabLabel = () => {
        switch (activeTab) {
            case 'youtube': return '유튜브 영상'
            case 'document': return '문서'
            case 'website': return '웹사이트'
            case 'text': return '텍스트'
            default: return '콘텐츠'
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isChatLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsChatLoading(true)

        // TODO: 실제 AI API 연동
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `요약 내용에 대해 답변드릴게요.\n\n"${userMessage}"에 대해서는 영상에서 다음과 같이 설명하고 있습니다...`
            }])
            setIsChatLoading(false)
        }, 1000)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const toggleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('음성 인식이 지원되지 않는 브라우저입니다.')
            return
        }

        if (isRecording) {
            recognitionRef.current?.stop()
            setIsRecording(false)
        } else {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
            const recognition = new SpeechRecognition()

            recognition.lang = 'ko-KR'
            recognition.continuous = true
            recognition.interimResults = true

            recognition.onresult = (event: any) => {
                let finalTranscript = ''
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript
                    }
                }
                if (finalTranscript) {
                    setInput(prev => prev + finalTranscript)
                }
            }

            recognition.onerror = () => setIsRecording(false)
            recognition.onend = () => setIsRecording(false)

            recognitionRef.current = recognition
            recognition.start()
            setIsRecording(true)
        }
    }

    const renderInputArea = () => {
        switch (activeTab) {
            case 'youtube':
                return (
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && youtubeUrl.trim()) {
                                            onYoutubeSubmit?.(youtubeUrl.trim())
                                        }
                                    }}
                                    placeholder="유튜브 링크를 입력하세요"
                                    className="w-full h-9 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-10 pr-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                                />
                            </div>
                            <button
                                onClick={() => youtubeUrl.trim() && onYoutubeSubmit?.(youtubeUrl.trim())}
                                disabled={isLoading}
                                className="px-3 h-9 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                {isLoading ? '요약 중...' : '요약'}
                            </button>
                        </div>
                    </div>
                )
            case 'document':
                return (
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 flex items-center text-xs text-zinc-500 h-9">
                                .pdf, .docx 파일 업로드
                            </div>
                            <button className="px-3 h-9 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" />
                                파일
                            </button>
                        </div>
                    </div>
                )
            case 'website':
                return (
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="웹사이트 URL을 입력하세요"
                                    className="w-full h-9 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-10 pr-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                                />
                            </div>
                            <button className="px-3 h-9 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-white text-xs font-medium rounded-lg transition-colors">
                                요약
                            </button>
                        </div>
                    </div>
                )
            case 'text':
                return (
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                        <textarea
                            placeholder="요약할 텍스트를 입력하세요..."
                            className="w-full h-16 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none"
                        />
                        <button className="w-full mt-2 h-8 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-white text-xs font-medium rounded-lg transition-colors">
                            요약
                        </button>
                    </div>
                )
            default:
                return null
        }
    }


    // 요약 결과 렌더링
    const renderSummaryContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full px-6">
                    <div className="w-10 h-10 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-300 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-4">AI 요약 생성 중</p>
                    <p className="text-xs text-zinc-500 mt-1">자막 분석 및 요약 작성에 시간이 걸립니다</p>
                </div>
            )
        }

        if (!summary) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                        <Bot className="w-7 h-7 text-zinc-500" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">AI 완벽요약</p>
                    <p className="text-xs text-zinc-500 mt-1">유튜브 링크를 입력하면<br />AI가 영상을 요약해드립니다</p>
                </div>
            )
        }

        return (
            <div className="p-4 space-y-6">
                {/* 3줄 요약 */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                            3줄 요약
                        </h3>
                        <button
                            onClick={() => handleCopy(summary.threeLine.join('\n\n'), 'threeLine')}
                            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            {copiedSection === 'threeLine' ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {summary.threeLine.map((line, index) => (
                            <div key={index} className="flex gap-3">
                                <span className="text-xs font-bold text-zinc-500 mt-0.5">{index + 1}.</span>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{line}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 요약 버튼들 */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveView('timeline')}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                            activeView === 'timeline'
                                ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        )}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        타임라인 요약
                    </button>
                    <button
                        onClick={() => setActiveView('core')}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                            activeView === 'core'
                                ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        )}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        핵심 요약
                    </button>
                    <button
                        onClick={() => setActiveView('blog')}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                            activeView === 'blog'
                                ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        )}
                    >
                        <FileEdit className="w-3.5 h-3.5" />
                        블로그로 쓰기
                    </button>
                </div>

                {/* 뷰에 따른 컨텐츠 */}
                {activeView === 'timeline' && (
                    <>
                        {/* 목차 */}
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
                                목차
                            </h3>
                            <div className="space-y-1">
                                {summary.tableOfContents.map((item, index) => (
                                    <button
                                        key={index}
                                        className="w-full text-left py-1.5 px-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded transition-colors"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 타임라인 */}
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
                                타임라인
                            </h3>
                            <div className="space-y-4">
                                {summary.timeline.map((item, index) => (
                                    <div key={index} className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">{item.title}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs text-red-500 font-mono bg-red-500/10 px-1.5 py-0.5 rounded">
                                                {item.timestamp}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-2">
                                            {item.content}
                                        </p>
                                        {item.details && item.details.length > 0 && (
                                            <div className="text-sm text-zinc-500 space-y-1">
                                                {item.details.map((detail, dIndex) => (
                                                    <p key={dIndex}>• {detail}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* 핵심 요약 */}
                {activeView === 'core' && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                                핵심 요약
                            </h3>
                            {summary.keyPoints && (
                                <button
                                    onClick={() => handleCopy(summary.keyPoints!.join('\n\n'), 'keyPoints')}
                                    className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                >
                                    {copiedSection === 'keyPoints' ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                        </div>
                        {summary.keyPoints && summary.keyPoints.length > 0 ? (
                            <div className="space-y-3">
                                {summary.keyPoints.map((point, index) => (
                                    <div key={index} className="flex gap-3 p-3 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg">
                                        <span className="text-xs font-bold text-zinc-500 mt-0.5">{index + 1}.</span>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{point}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 text-center py-8">핵심 요약을 생성할 수 없습니다</p>
                        )}
                    </div>
                )}

                {/* 블로그로 쓰기 */}
                {activeView === 'blog' && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                                블로그 글
                            </h3>
                            {summary.blogPost && (
                                <button
                                    onClick={() => handleCopy(summary.blogPost!, 'blogPost')}
                                    className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                >
                                    {copiedSection === 'blogPost' ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                        </div>
                        {summary.blogPost ? (
                            <div className="bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg p-4 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                {summary.blogPost.split('\n').map((line, index) => {
                                    // 마크다운 헤딩 처리
                                    if (line.startsWith('# ')) {
                                        return <h1 key={index} className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{line.slice(2)}</h1>
                                    }
                                    if (line.startsWith('## ')) {
                                        return <h2 key={index} className="text-lg font-bold text-zinc-900 dark:text-white mt-4 mb-2">{line.slice(3)}</h2>
                                    }
                                    if (line.startsWith('### ')) {
                                        return <h3 key={index} className="text-base font-semibold text-zinc-700 dark:text-zinc-200 mt-3 mb-2">{line.slice(4)}</h3>
                                    }
                                    if (line.startsWith('---')) {
                                        return <hr key={index} className="border-zinc-300 dark:border-zinc-700 my-4" />
                                    }
                                    if (line.startsWith('*') && line.endsWith('*')) {
                                        return <p key={index} className="text-xs text-zinc-500 italic">{line.slice(1, -1)}</p>
                                    }
                                    if (line.trim() === '') {
                                        return <div key={index} className="h-2" />
                                    }
                                    return <p key={index} className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{line}</p>
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 text-center py-8">블로그 글을 생성할 수 없습니다</p>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-[480px] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full flex-shrink-0 overflow-hidden">
            {/* Header */}
            <div className="p-4 pb-0 flex-shrink-0">
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white">AI 완벽요약</h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex w-full border-b border-zinc-200 dark:border-zinc-800 px-4 mt-3 flex-shrink-0">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            "flex-1 pb-2.5 text-sm font-medium transition-all relative text-center",
                            activeTab === tab.id
                                ? "text-zinc-900 dark:text-white"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-900 dark:bg-white rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Input Area per Tab */}
            <div className="flex-shrink-0">
                {renderInputArea()}
            </div>

            {/* Summary Content or Chat */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {summary || isLoading ? (
                    renderSummaryContent()
                ) : (
                    // 기본 채팅 인터페이스
                    <div className="p-4 space-y-3 h-full">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                                    <Bot className="w-7 h-7 text-zinc-500" />
                                </div>
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">무엇이든 물어보세요</p>
                                <p className="text-xs text-zinc-500 mt-1">요약 내용에 대해 추가 질문할 수 있어요</p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, i) => (
                                    <div key={i} className={cn("flex gap-2", msg.role === 'user' && "flex-row-reverse")}>
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                            msg.role === 'user' ? "bg-accent" : "bg-zinc-200 dark:bg-zinc-800"
                                        )}>
                                            {msg.role === 'user' ? (
                                                <User className="w-3.5 h-3.5 text-white" />
                                            ) : (
                                                <Bot className="w-3.5 h-3.5 text-zinc-600 dark:text-white" />
                                            )}
                                        </div>
                                        <div className={cn(
                                            "rounded-2xl px-3 py-2 text-xs max-w-[80%]",
                                            msg.role === 'user'
                                                ? "bg-accent text-white"
                                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                                        )}>
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && (
                                    <div className="flex gap-2">
                                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                            <Bot className="w-3.5 h-3.5 text-zinc-600 dark:text-white" />
                                        </div>
                                        <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl px-3 py-2">
                                            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Chat Input - 항상 표시 */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleVoiceInput}
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                            isRecording
                                ? "bg-red-500 text-white"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        )}
                    >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="요약에 대해 질문하세요..."
                            className="w-full h-9 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 pr-10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isChatLoading}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        >
                            <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

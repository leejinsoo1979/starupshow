"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Send,
    Bot,
    User,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Code,
    Brain,
    Check,
    Circle,
    Play,
    MoreHorizontal,
    Mic,
    Paperclip,
    Share2,
    Plus,
    FileText
} from "lucide-react"
import { cn } from "@/lib/utils"

// Slide Types
interface SlideContent {
    id: string
    type: 'cover' | 'problem' | 'solution' | 'market' | 'business-model' | 'product' | 'competition' | 'gtm' | 'marketing' | 'team' | 'roadmap' | 'revenue' | 'financials' | 'investment' | 'contact'
    title: string
    subtitle?: string
    content: any
}

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
    type?: 'question' | 'progress' | 'complete'
    slides?: SlideContent[]
}

interface TodoItem {
    id: string
    text: string
    status: 'pending' | 'in_progress' | 'completed'
}

// Sample Slide Templates
const createSampleSlides = (): SlideContent[] => [
    {
        id: '1',
        type: 'cover',
        title: '[회사명]',
        subtitle: 'AI 기반 워크플로우 자동화 플랫폼',
        content: {
            tagline: '복잡한 업무를 단순하게',
            presenter: '홍길동 | CEO',
            date: '2025.01'
        }
    },
    {
        id: '2',
        type: 'problem',
        title: '문제 정의',
        subtitle: '기업 성장의 핵심적인 병목 현상',
        content: {
            issues: [
                { icon: '📊', title: '극심한 업무 비효율', desc: '수작업에 의존하는 워크플로우로 인해 데이터 처리 시간이 과도하게 소요' },
                { icon: '💰', title: '높은 운영 비용', desc: '복잡한 레거시 시스템 유지보수 비용과 불필요한 SaaS 구독료가 중복 지출' },
                { icon: '🔗', title: '데이터 단절 (Silos)', desc: '부서 간 데이터가 통합되지 않아 실시간 의사결정이 불가능' }
            ],
            targetCustomer: '연 매출 100억 이상의 제조 및 물류 스타트업 & 중견기업',
            opportunity: '이 문제를 해결할 경우 30% 이상의 생산성 향상 기대'
        }
    },
    {
        id: '3',
        type: 'solution',
        title: '솔루션 개요',
        subtitle: 'AI 기반의 지능형 워크플로우 자동화 플랫폼',
        content: {
            mainDesc: '복잡한 수작업 프로세스를 제거하고 데이터 기반 의사결정을 지원합니다.',
            features: [
                { icon: '⚡', title: '하이퍼 오토메이션', desc: '반복 업무 90% 자동화' },
                { icon: '🔄', title: '실시간 데이터 동기화', desc: '모든 시스템 연동' },
                { icon: '📈', title: '예측형 인사이트', desc: 'AI 기반 분석 리포트' }
            ]
        }
    },
    {
        id: '4',
        type: 'market',
        title: '시장 기회',
        subtitle: 'TAM · SAM · SOM',
        content: {
            tam: { value: '150조원', label: 'Total Addressable Market', desc: '글로벌 워크플로우 자동화 시장' },
            sam: { value: '15조원', label: 'Serviceable Addressable Market', desc: '국내 기업용 자동화 시장' },
            som: { value: '3,000억원', label: 'Serviceable Obtainable Market', desc: '24-36개월 목표 시장' },
            cagr: '연평균 성장률 25%'
        }
    },
    {
        id: '5',
        type: 'business-model',
        title: '비즈니스 모델',
        subtitle: '수익 구조',
        content: {
            model: 'SaaS 구독 모델',
            pricing: [
                { tier: 'Starter', price: '월 99만원', features: ['기본 자동화', '5명 사용자'] },
                { tier: 'Business', price: '월 299만원', features: ['고급 분석', '무제한 사용자'] },
                { tier: 'Enterprise', price: '맞춤 견적', features: ['전용 지원', 'On-premise 옵션'] }
            ],
            metrics: { arpu: '월 200만원', ltv: '2,400만원', cac: '400만원' }
        }
    }
]

// Slide Preview Components
const CoverSlide = ({ content, title, subtitle }: { content: any, title: string, subtitle?: string }) => (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-12">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
        >
            <div className="w-20 h-20 bg-accent rounded-2xl mx-auto mb-8 flex items-center justify-center">
                <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4">{title}</h1>
            <p className="text-2xl text-zinc-400 mb-8">{subtitle}</p>
            <p className="text-lg text-accent mb-12">{content?.tagline}</p>
            <div className="text-sm text-zinc-500">
                <p>{content?.presenter}</p>
                <p>{content?.date}</p>
            </div>
        </motion.div>
    </div>
)

const ProblemSlide = ({ content, title, subtitle }: { content: any, title: string, subtitle?: string }) => (
    <div className="h-full bg-zinc-900 text-white p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
            <p className="text-accent text-sm font-medium mb-2">— PROBLEM DEFINITION</p>
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            <p className="text-zinc-400 mb-8">{subtitle}</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
                {content?.issues?.map((issue: any, i: number) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            "p-6 rounded-xl",
                            i === 0 ? "bg-red-500/20 border border-red-500/30" :
                            i === 1 ? "bg-orange-500/20 border border-orange-500/30" :
                            "bg-purple-500/20 border border-purple-500/30"
                        )}
                    >
                        <div className="text-xs text-zinc-400 mb-2">ISSUE #{i + 1}</div>
                        <div className="text-3xl mb-3">{issue.icon}</div>
                        <h3 className="text-lg font-bold mb-2">{issue.title}</h3>
                        <p className="text-sm text-zinc-400">{issue.desc}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800 rounded-xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                        <span className="text-accent text-xl">🎯</span>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">TARGET CUSTOMER (ICP)</p>
                        <p className="text-sm">{content?.targetCustomer}</p>
                    </div>
                </div>
                <div className="bg-zinc-800 rounded-xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                        <span className="text-green-400 text-xl">📈</span>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">MARKET OPPORTUNITY</p>
                        <p className="text-sm">{content?.opportunity}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
)

const SolutionSlide = ({ content, title, subtitle }: { content: any, title: string, subtitle?: string }) => (
    <div className="h-full bg-zinc-900 text-white p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
            <p className="text-accent text-sm font-medium mb-2">— SOLUTION OVERVIEW</p>
            <h2 className="text-3xl font-bold mb-2">
                {subtitle?.split(' ').map((word, i) => (
                    <span key={i} className={word.includes('AI') || word.includes('자동화') ? 'text-accent' : ''}>
                        {word}{' '}
                    </span>
                ))}
            </h2>
            <p className="text-zinc-400 mb-12">{content?.mainDesc}</p>

            <div className="grid grid-cols-3 gap-6">
                {content?.features?.map((feature: any, i: number) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-800 rounded-xl p-6 text-center"
                    >
                        <div className="w-16 h-16 bg-accent/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                            <span className="text-3xl">{feature.icon}</span>
                        </div>
                        <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                        <p className="text-sm text-zinc-400">{feature.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    </div>
)

const MarketSlide = ({ content, title, subtitle }: { content: any, title: string, subtitle?: string }) => (
    <div className="h-full bg-zinc-900 text-white p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
            <p className="text-accent text-sm font-medium mb-2">— MARKET OPPORTUNITY</p>
            <h2 className="text-3xl font-bold mb-8">{title} <span className="text-zinc-500 font-normal">{subtitle}</span></h2>

            <div className="flex items-end justify-center gap-8 mb-8">
                {[
                    { ...content?.tam, color: 'bg-blue-500', height: 'h-64' },
                    { ...content?.sam, color: 'bg-green-500', height: 'h-48' },
                    { ...content?.som, color: 'bg-accent', height: 'h-32' }
                ].map((market, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: i * 0.2 }}
                        className="text-center origin-bottom"
                    >
                        <div className={cn("w-32 rounded-t-xl", market.height, market.color, "flex items-center justify-center")}>
                            <span className="text-2xl font-bold">{market.value}</span>
                        </div>
                        <div className="bg-zinc-800 p-4 rounded-b-xl">
                            <p className="text-xs text-zinc-500">{market.label}</p>
                            <p className="text-xs text-zinc-400 mt-1">{market.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="text-center">
                <span className="inline-block bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm">
                    {content?.cagr}
                </span>
            </div>
        </div>
    </div>
)

const BusinessModelSlide = ({ content, title, subtitle }: { content: any, title: string, subtitle?: string }) => (
    <div className="h-full bg-zinc-900 text-white p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
            <p className="text-accent text-sm font-medium mb-2">— BUSINESS MODEL</p>
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            <p className="text-zinc-400 mb-8">{content?.model}</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
                {content?.pricing?.map((tier: any, i: number) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            "p-6 rounded-xl border",
                            i === 1 ? "bg-accent/10 border-accent" : "bg-zinc-800 border-zinc-700"
                        )}
                    >
                        <h3 className="text-lg font-bold mb-2">{tier.tier}</h3>
                        <p className="text-2xl font-bold text-accent mb-4">{tier.price}</p>
                        <ul className="space-y-2">
                            {tier.features.map((f: string, j: number) => (
                                <li key={j} className="text-sm text-zinc-400 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-400" /> {f}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
                {Object.entries(content?.metrics || {}).map(([key, value], i) => (
                    <div key={i} className="bg-zinc-800 rounded-xl p-4 text-center">
                        <p className="text-xs text-zinc-500 uppercase mb-1">{key}</p>
                        <p className="text-xl font-bold">{value as string}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
)

// Main Slide Renderer
const SlideRenderer = ({ slide }: { slide: SlideContent }) => {
    switch (slide.type) {
        case 'cover':
            return <CoverSlide {...slide} />
        case 'problem':
            return <ProblemSlide {...slide} />
        case 'solution':
            return <SolutionSlide {...slide} />
        case 'market':
            return <MarketSlide {...slide} />
        case 'business-model':
            return <BusinessModelSlide {...slide} />
        default:
            return (
                <div className="h-full bg-zinc-900 text-white flex items-center justify-center">
                    <p className="text-zinc-500">슬라이드 준비 중...</p>
                </div>
            )
    }
}

export default function AISlidesPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: '안녕하세요! 사업계획서 슬라이드를 제작해드리겠습니다.\n\n먼저 몇 가지 정보가 필요합니다:\n\n1. **사업 분야** 또는 업종은 무엇인가요?\n2. **사업계획서의 목적**은 무엇인가요? (투자 유치, 은행 대출 등)\n3. **주요 포함 내용**이 있나요?\n4. **대략적인 슬라이드 분량**은? (10-15장, 20장 이상 등)',
            type: 'question'
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [slides, setSlides] = useState<SlideContent[]>([])
    const [currentSlide, setCurrentSlide] = useState(0)
    const [todos, setTodos] = useState<TodoItem[]>([])
    const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'thinking'>('preview')
    const [chatTab, setChatTab] = useState<'ai' | 'team'>('ai')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const generateSlides = useCallback(async (prompt: string) => {
        setIsLoading(true)

        // Create todos for slide generation
        const slideTodos: TodoItem[] = [
            { id: '1', text: '슬라이드 시스템 초기화', status: 'completed' },
            { id: '2', text: '관련 정보 조사 (트렌드, 투자자 관심사)', status: 'in_progress' },
            { id: '3', text: '슬라이드 구성 아웃라인 생성', status: 'pending' },
            { id: '4', text: '페이지 1: 표지 슬라이드 제작', status: 'pending' },
            { id: '5', text: '페이지 2: 문제 정의 슬라이드 제작', status: 'pending' },
            { id: '6', text: '페이지 3: 솔루션 개요 슬라이드 제작', status: 'pending' },
            { id: '7', text: '페이지 4: 시장 기회 슬라이드 제작', status: 'pending' },
            { id: '8', text: '페이지 5: 비즈니스 모델 슬라이드 제작', status: 'pending' },
        ]
        setTodos(slideTodos)

        // Simulate progress updates
        for (let i = 0; i < slideTodos.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 800))
            setTodos(prev => prev.map((todo, idx) => ({
                ...todo,
                status: idx < i + 1 ? 'completed' : idx === i + 1 ? 'in_progress' : 'pending'
            })))

            // Add slides progressively
            if (i >= 3) {
                const sampleSlides = createSampleSlides()
                setSlides(sampleSlides.slice(0, i - 2))
            }
        }

        // Final slides
        const finalSlides = createSampleSlides()
        setSlides(finalSlides)
        setTodos(prev => prev.map(todo => ({ ...todo, status: 'completed' })))

        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `IT 스타트업 투자 유치용 사업계획서 ${finalSlides.length}장을 제작했습니다.\n\n우측 미리보기에서 각 슬라이드를 확인하실 수 있습니다. 수정이 필요하시면 말씀해주세요!`,
            type: 'complete',
            slides: finalSlides
        }])

        setIsLoading(false)
    }, [])

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])

        // Check if it's a slide generation request
        if (userMessage.includes('사업계획서') || userMessage.includes('슬라이드') || userMessage.includes('피치덱')) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `${userMessage.includes('IT') ? 'IT 스타트업' : '스타트업'} 투자 유치용 사업계획서를 제작하겠습니다.`,
                type: 'progress'
            }])
            await generateSlides(userMessage)
        } else {
            // Regular chat response
            setIsLoading(true)
            await new Promise(resolve => setTimeout(resolve, 1000))
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '네, 알겠습니다. 어떤 형태의 슬라이드를 원하시나요? 예를 들어:\n\n• "IT 스타트업 투자 유치용 사업계획서 15장으로 만들어줘"\n• "카페 창업 사업계획서를 은행 대출용으로 만들어줘"\n• "표준 사업계획서 템플릿 20장으로 만들어줘"'
            }])
            setIsLoading(false)
        }
    }

    return (
        <div className="h-screen flex bg-zinc-950">
            {/* Left Panel - Chat */}
            <div className="w-[480px] flex flex-col border-r border-zinc-800">
                {/* Chat Tabs */}
                <div className="flex items-center gap-2 p-4 border-b border-zinc-800">
                    <button
                        onClick={() => setChatTab('ai')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            chatTab === 'ai' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        <Bot className="w-4 h-4" />
                        AI 슬라이드
                    </button>
                    <button
                        onClick={() => setChatTab('team')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            chatTab === 'team' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        <User className="w-4 h-4" />
                        팀 채팅
                    </button>
                </div>

                {/* Todo Progress */}
                {todos.length > 0 && (
                    <div className="p-4 border-b border-zinc-800 max-h-[300px] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-zinc-500">
                                총: {todos.length}개의 할 일
                            </span>
                            <span className="text-xs text-zinc-500">
                                남은 할 일 {todos.filter(t => t.status !== 'completed').length}개
                            </span>
                        </div>
                        <div className="space-y-2">
                            {todos.map(todo => (
                                <div
                                    key={todo.id}
                                    className={cn(
                                        "flex items-center gap-2 text-sm",
                                        todo.status === 'completed' ? 'text-zinc-600 line-through' :
                                        todo.status === 'in_progress' ? 'text-white' : 'text-zinc-500'
                                    )}
                                >
                                    {todo.status === 'completed' ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : todo.status === 'in_progress' ? (
                                        <Loader2 className="w-4 h-4 text-accent animate-spin" />
                                    ) : (
                                        <Circle className="w-4 h-4" />
                                    )}
                                    {todo.text}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={cn("flex gap-3", msg.role === 'user' && "flex-row-reverse")}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                msg.role === 'user' ? "bg-accent" : "bg-zinc-800"
                            )}>
                                {msg.role === 'user' ? (
                                    <User className="w-4 h-4 text-white" />
                                ) : (
                                    <Bot className="w-4 h-4 text-white" />
                                )}
                            </div>
                            <div className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                                msg.role === 'user'
                                    ? "bg-accent text-white"
                                    : "bg-zinc-800 text-zinc-200"
                            )}>
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-zinc-800">
                    <div className="bg-zinc-800 rounded-xl">
                        <div className="px-4 py-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="슬라이드 요청을 여기에 입력하세요"
                                className="w-full bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-700">
                            <div className="flex items-center gap-1">
                                <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                                    <MoreHorizontal className="w-5 h-5 text-zinc-500" />
                                </button>
                                <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                                    <Paperclip className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                                    <Mic className="w-5 h-5 text-zinc-500" />
                                </button>
                                <button
                                    onClick={sendMessage}
                                    disabled={isLoading || !input.trim()}
                                    className="p-2 bg-accent hover:bg-accent/90 disabled:bg-zinc-600 rounded-lg transition-colors"
                                >
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-zinc-500" />
                        <span className="text-white font-medium">
                            {slides.length > 0 ? 'IT 스타트업 투자 유치 사업계획서' : '새 프레젠테이션'}
                        </span>
                        {slides.length > 0 && (
                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                                저장 자동-{slides.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
                            <Share2 className="w-4 h-4" />
                            공유
                        </button>
                        <button className="flex items-center gap-2 px-4 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
                            <Download className="w-4 h-4" />
                            보기 및 내보내기
                        </button>
                    </div>
                </div>

                {/* Preview Tabs */}
                <div className="flex items-center gap-4 px-6 py-2 border-b border-zinc-800">
                    {[
                        { id: 'preview', label: '미리보기', icon: Eye },
                        { id: 'code', label: '코드', icon: Code },
                        { id: 'thinking', label: '생각 중', icon: Brain }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                                activeTab === tab.id
                                    ? "bg-zinc-800 text-white"
                                    : "text-zinc-500 hover:text-white"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                    {slides.length > 0 && (
                        <span className="ml-auto text-sm text-zinc-500">
                            {currentSlide + 1} / {slides.length}
                        </span>
                    )}
                </div>

                {/* Slide Preview */}
                <div className="flex-1 p-6 overflow-hidden">
                    {slides.length > 0 ? (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden shadow-2xl">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentSlide}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="h-full"
                                    >
                                        <SlideRenderer slide={slides[currentSlide]} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <button
                                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                                    disabled={currentSlide === 0}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                                <div className="flex items-center gap-2">
                                    {slides.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentSlide(i)}
                                            className={cn(
                                                "w-2 h-2 rounded-full transition-colors",
                                                i === currentSlide ? "bg-accent" : "bg-zinc-700 hover:bg-zinc-600"
                                            )}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                                    disabled={currentSlide === slides.length - 1}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-zinc-800 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                    <FileText className="w-10 h-10 text-zinc-600" />
                                </div>
                                <h3 className="text-xl font-medium text-white mb-2">슬라이드 미리보기</h3>
                                <p className="text-zinc-500 text-sm">
                                    왼쪽 채팅창에서 슬라이드 생성을 요청하세요
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    Plus,
    Send,
    ArrowLeft,
    Loader2,
    Mail,
    Sparkles,
    Globe,
    FileText,
    FolderOpen,
    X,
    Image,
    Paperclip,
    Bot
} from 'lucide-react'
import { FaRegFileCode } from 'react-icons/fa6'
import { cn } from '@/lib/utils'
import { BrowserPanel } from './BrowserPanel'
import { GensparkResultView } from './GensparkResultView'
import { CodeArtifactPanel, CodeArtifact } from './CodeArtifactPanel'
import { AgentBuilderPanel } from './AgentBuilderPanel'
import { CustomAgentConfig, AgentPreview } from '@/lib/agent-builder'

interface Message {
    role: 'user' | 'assistant'
    content: string
    screenshot?: string
    browserAction?: boolean
}

interface CodingContext {
    projectType: string
    title: string
    systemPrompt: string
}

interface ChatViewProps {
    onBack: () => void
    initialQuery?: string
    codingContext?: CodingContext | null
}

export function ChatView({ onBack, initialQuery, codingContext }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [thinkingSteps, setThinkingSteps] = useState<string[]>([])
    const [currentThinkingStep, setCurrentThinkingStep] = useState('')
    const [currentQuery, setCurrentQuery] = useState('')
    const [currentResponse, setCurrentResponse] = useState('')
    const [toolsUsed, setToolsUsed] = useState<string[]>([])
    const hasSentInitialRef = useRef(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // 브라우저 패널 상태
    const [browserOpen, setBrowserOpen] = useState(false)
    const [browserUrl, setBrowserUrl] = useState('')
    const [browserLoading, setBrowserLoading] = useState(false)
    const [browserExpanded, setBrowserExpanded] = useState(false)

    // 파일 첨부 상태
    const [attachedFiles, setAttachedFiles] = useState<File[]>([])
    const [showToolsMenu, setShowToolsMenu] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 코드 아티팩트 상태
    const [codeArtifact, setCodeArtifact] = useState<CodeArtifact | null>(null)
    const [artifactExpanded, setArtifactExpanded] = useState(false)
    const [artifactWidth, setArtifactWidth] = useState(50)
    const [isArtifactResizing, setIsArtifactResizing] = useState(false)

    // 에이전트 빌더 상태
    const [agentBuilderOpen, setAgentBuilderOpen] = useState(false)
    const [generatedAgent, setGeneratedAgent] = useState<CustomAgentConfig | null>(null)
    const [agentPreview, setAgentPreview] = useState<AgentPreview | null>(null)
    const [isGeneratingAgent, setIsGeneratingAgent] = useState(false)
    const [isDeployingAgent, setIsDeployingAgent] = useState(false)
    const [deployedAgentRoute, setDeployedAgentRoute] = useState<string | null>(null)
    const [agentBuilderWidth, setAgentBuilderWidth] = useState(40)
    const [isAgentBuilderResizing, setIsAgentBuilderResizing] = useState(false)

    // 리사이즈 상태
    const [browserWidth, setBrowserWidth] = useState(50)
    const [isResizing, setIsResizing] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // 리사이즈 핸들러
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return
            e.preventDefault()

            const containerRect = containerRef.current.getBoundingClientRect()

            if (isResizing) {
                const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
                const clampedWidth = Math.min(75, Math.max(25, newWidth))
                setBrowserWidth(clampedWidth)
            }

            if (isArtifactResizing) {
                const newWidth = 100 - ((e.clientX - containerRect.left) / containerRect.width) * 100
                const clampedWidth = Math.min(70, Math.max(30, newWidth))
                setArtifactWidth(clampedWidth)
            }

            if (isAgentBuilderResizing) {
                const newWidth = 100 - ((e.clientX - containerRect.left) / containerRect.width) * 100
                const clampedWidth = Math.min(60, Math.max(25, newWidth))
                setAgentBuilderWidth(clampedWidth)
            }
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            setIsArtifactResizing(false)
            setIsAgentBuilderResizing(false)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
    }, [isResizing, isArtifactResizing, isAgentBuilderResizing])

    // 에이전트 빌더 요청 감지
    const isAgentBuilderRequest = (text: string): boolean => {
        const agentKeywords = [
            '에이전트 만들어', '에이전트 생성', '에이전트 빌드',
            '봇 만들어', '챗봇 만들어', 'AI 만들어',
            '에이전트를 만들어', '에이전트를 생성',
            'create agent', 'build agent', 'make agent',
            '에이전트 개발', '새로운 에이전트',
            '커스텀 에이전트', '맞춤 에이전트',
            '비서 만들어', '어시스턴트 만들어',
            '도우미 만들어', '조수 만들어'
        ]
        const lowerText = text.toLowerCase()
        return agentKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
    }

    // 에이전트 빌더 리사이즈 핸들러
    const handleAgentBuilderResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsAgentBuilderResizing(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }

    // 에이전트 생성 핸들러
    const handleGenerateAgent = async (prompt: string) => {
        setAgentBuilderOpen(true)
        setIsGeneratingAgent(true)
        setGeneratedAgent(null)
        setAgentPreview(null)
        setDeployedAgentRoute(null)

        try {
            const response = await fetch('/api/agent-builder/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userPrompt: prompt })
            })

            const data = await response.json()

            if (data.success && data.agent) {
                setGeneratedAgent(data.agent)
                setAgentPreview(data.preview || null)
            } else {
                console.error('Agent generation failed:', data.error)
            }
        } catch (error) {
            console.error('Agent generation error:', error)
        } finally {
            setIsGeneratingAgent(false)
        }
    }

    // 에이전트 배포 핸들러
    const handleDeployAgent = async () => {
        if (!generatedAgent) return

        setIsDeployingAgent(true)
        try {
            const response = await fetch('/api/agent-builder/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent: generatedAgent })
            })

            const data = await response.json()

            if (data.success && data.route) {
                setDeployedAgentRoute(data.route)
            } else {
                console.error('Agent deployment failed:', data.error)
            }
        } catch (error) {
            console.error('Agent deployment error:', error)
        } finally {
            setIsDeployingAgent(false)
        }
    }

    // 에이전트 빌더 패널 닫기
    const handleCloseAgentBuilder = () => {
        setAgentBuilderOpen(false)
        setGeneratedAgent(null)
        setAgentPreview(null)
        setIsGeneratingAgent(false)
        setDeployedAgentRoute(null)
    }

    // 코딩 요청 감지
    const isCodingRequest = (text: string): boolean => {
        const codingKeywords = [
            '코드', '코딩', '프로그램', '개발', '만들어', '작성해', '구현해',
            'html', 'css', 'javascript', 'react', 'python', 'java', 'typescript',
            '웹페이지', '웹사이트', '컴포넌트', '함수', '클래스', '버튼', '폼',
            '게임', '계산기', '투두', '리스트', '테이블', '차트', '그래프',
            'code', 'program', 'function', 'component', 'script'
        ]
        const lowerText = text.toLowerCase()
        return codingKeywords.some(keyword => lowerText.includes(keyword))
    }

    // 응답에서 코드 블록 추출 (더 유연한 정규식 사용)
    const extractCodeFromResponse = (response: string): { code: string; language: string } | null => {
        // 다양한 코드 블록 형식 지원
        const codeBlockPatterns = [
            /```(\w+)\s*\n([\s\S]*?)```/,
            /```(\w+)\s+([\s\S]*?)```/,
        ]

        for (const pattern of codeBlockPatterns) {
            const match = response.match(pattern)
            if (match && match.length >= 3) {
                const lang = match[1] || 'html'
                const code = match[2].trim()
                console.log('[ChatView] Code block extracted:', lang, 'length:', code.length)
                return { language: lang, code }
            }
        }

        // 언어 없는 코드 블록 처리
        const simpleMatch = response.match(/```\s*\n?([\s\S]*?)```/)
        if (simpleMatch && simpleMatch[1]) {
            const code = simpleMatch[1].trim()
            console.log('[ChatView] Code block extracted (no lang), length:', code.length)
            return { language: 'html', code }
        }

        console.log('[ChatView] No code block found. Response preview:', response.slice(0, 200))
        return null
    }

    // 아티팩트 리사이즈 핸들러
    const handleArtifactResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsArtifactResizing(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleBrowserClose = () => {
        setBrowserOpen(false)
        setBrowserUrl('')
    }

    // 브라우저 제어가 필요한 요청인지 감지
    const isBrowserTask = (text: string): boolean => {
        const browserKeywords = [
            '브라우저 열어', '브라우저 켜',
            '접속해', '들어가', '열어줘', '가줘',
            '로그인', '회원가입', '댓글 달', '좋아요 눌러',
            '클릭해', '클릭해줘', '눌러줘',
            '스크롤', '내려줘', '올려줘',
            '크롤링', '스크래핑', '데이터 수집',
            '예약해', '예약해줘',
            'http://', 'https://', 'www.',
        ]
        const lowerText = text.toLowerCase()
        return browserKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
    }

    // URL 추출 함수
    const extractUrlFromContent = (text: string): string | null => {
        const lowerText = text.toLowerCase()

        const urlMatch = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i)
        if (urlMatch) {
            let url = urlMatch[0]
            if (!url.startsWith('http')) url = 'https://' + url
            return url
        }

        // 사이트명으로 URL 추론
        if (lowerText.includes('네이버')) return 'https://www.naver.com'
        if (lowerText.includes('구글') || lowerText.includes('google')) return 'https://www.google.com'
        if (lowerText.includes('유튜브') || lowerText.includes('youtube')) return 'https://www.youtube.com'
        if (lowerText.includes('다음') || lowerText.includes('daum')) return 'https://www.daum.net'

        const searchIntentKeywords = ['맛집', '추천', '날씨', '뉴스', '영화', '카페']
        const actionKeywords = ['해줘', '해주세요', '알려줘', '알려주세요', '찾아줘']

        const hasSearchIntent = searchIntentKeywords.some(k => lowerText.includes(k))
        const hasActionWord = actionKeywords.some(k => lowerText.includes(k))

        if (hasSearchIntent || hasActionWord) {
            let query = text
                .replace(/해줘|해주세요|알려줘|알려주세요|찾아줘|찾아주세요|보여줘|보여주세요|추천|좀|좀요|요/g, '')
                .trim()
            if (query.length > 1) {
                return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`
            }
        }

        return null
    }

    const sendMessageWithContent = async (content: string, currentMessages: Message[] = []) => {
        if (!content.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: content.trim() }
        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)

        setCurrentQuery(content.trim())
        setCurrentResponse('')
        setThinkingSteps([])
        setToolsUsed([])

        try {
            // 에이전트 빌더 요청 처리
            if (isAgentBuilderRequest(content)) {
                setCurrentThinkingStep('에이전트 요청 분석 중...')
                await new Promise(r => setTimeout(r, 300))
                setThinkingSteps(prev => [...prev, '에이전트 요청 분석 완료'])

                setCurrentThinkingStep('AI 에이전트 설계 중...')
                handleGenerateAgent(content)

                setThinkingSteps(prev => [...prev, '에이전트 생성 시작'])
                setCurrentThinkingStep('')

                setCurrentResponse('에이전트 빌더가 요청을 처리하고 있습니다. 오른쪽 패널에서 진행 상황을 확인하세요.')
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '에이전트 빌더가 요청을 처리하고 있습니다. 오른쪽 패널에서 생성되는 에이전트의 미리보기를 확인하고, 완성되면 Apps 메뉴로 배포할 수 있습니다.'
                }])

                setIsLoading(false)
                setCurrentThinkingStep('')
                return
            }

            if (isBrowserTask(content)) {
                setCurrentThinkingStep('브라우저 작업 분석 중...')
                await new Promise(r => setTimeout(r, 300))
                setThinkingSteps(prev => [...prev, '브라우저 작업 분석 완료'])

                const initialUrl = extractUrlFromContent(content)
                if (initialUrl) {
                    setCurrentThinkingStep('브라우저 열기...')
                    setBrowserOpen(true)
                    setBrowserUrl(initialUrl)
                    await new Promise(r => setTimeout(r, 300))
                    setThinkingSteps(prev => [...prev, '브라우저 열기 완료'])
                }

                setCurrentThinkingStep('웹 페이지 제어 중...')

                const response = await fetch('/api/agents/super/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: content,
                        chatHistory: currentMessages.map(m => ({ role: m.role, content: m.content })),
                    })
                })

                const data = await response.json()

                setThinkingSteps(prev => [...prev, '웹 페이지 제어 완료'])
                setCurrentThinkingStep('')

                if (data.browserUrl) {
                    setBrowserUrl(data.browserUrl)
                } else if (data.toolResults) {
                    const browserResult = data.toolResults?.find((t: any) =>
                        t.type === 'browser_automation' || t.currentUrl
                    )
                    if (browserResult?.currentUrl) {
                        setBrowserUrl(browserResult.currentUrl)
                    }
                }

                if (data.toolsUsed) {
                    setToolsUsed(data.toolsUsed)
                }

                if (data.error) {
                    setCurrentResponse(`오류: ${data.error}`)
                    setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${data.error}` }])
                } else if (data.response) {
                    setCurrentResponse(data.response)
                    setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
                } else {
                    setCurrentResponse('응답을 받지 못했습니다.')
                    setMessages(prev => [...prev, { role: 'assistant', content: '응답을 받지 못했습니다.' }])
                }
            } else {
                setCurrentThinkingStep('요청 분석 중...')
                await new Promise(r => setTimeout(r, 200))
                setThinkingSteps(prev => [...prev, '요청 분석 완료'])

                // 코딩 요청이면 즉시 코드 패널 열기 (스트리밍 상태로)
                if (isCodingRequest(content)) {
                    setCurrentThinkingStep('코드 생성 준비 중...')
                    setCodeArtifact({
                        id: Date.now().toString(),
                        language: 'html',
                        code: '// 코드를 생성하고 있습니다...\n// 잠시만 기다려주세요.',
                        title: '코드 생성 중',
                        isStreaming: true,
                        createdAt: new Date()
                    })
                    await new Promise(r => setTimeout(r, 300))
                    setThinkingSteps(prev => [...prev, '코드 패널 열림'])
                }

                setCurrentThinkingStep('정보 검색 중...')

                const response = await fetch('/api/agents/super/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: content,
                        chatHistory: currentMessages.map(m => ({
                            role: m.role,
                            content: m.content
                        })),
                    })
                })

                const data = await response.json()

                if (data.toolsUsed && data.toolsUsed.length > 0) {
                    setToolsUsed(data.toolsUsed)
                    for (const tool of data.toolsUsed) {
                        if (tool === 'web_search') {
                            setThinkingSteps(prev => [...prev, '웹 검색 완료'])
                        } else if (tool === 'browser_automation') {
                            setThinkingSteps(prev => [...prev, '브라우저 작업 완료'])
                        } else {
                            setThinkingSteps(prev => [...prev, `${tool} 실행 완료`])
                        }
                    }
                } else {
                    setThinkingSteps(prev => [...prev, '정보 검색 완료'])
                }

                setCurrentThinkingStep('응답 생성 중...')
                await new Promise(r => setTimeout(r, 200))
                setThinkingSteps(prev => [...prev, '응답 생성 완료'])
                setCurrentThinkingStep('')

                if (data.error) {
                    console.error('API Error:', data.error)
                    setCurrentResponse(`오류: ${data.error}`)
                    setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${data.error}` }])
                    // 코딩 요청이었지만 에러 발생 시 패널 닫기
                    if (isCodingRequest(content)) {
                        setCodeArtifact(null)
                    }
                } else if (data.response) {
                    setCurrentResponse(data.response)
                    setMessages(prev => [...prev, { role: 'assistant', content: data.response }])

                    // 코드 블록이 있으면 아티팩트 업데이트
                    const codeBlock = extractCodeFromResponse(data.response)
                    if (isCodingRequest(content)) {
                        if (codeBlock) {
                            setCodeArtifact({
                                id: Date.now().toString(),
                                language: codeBlock.language,
                                code: codeBlock.code,
                                title: '생성된 코드',
                                isStreaming: false,
                                createdAt: new Date()
                            })
                        } else {
                            // 코드 블록 없으면 응답 내용을 코드로 표시
                            setCodeArtifact({
                                id: Date.now().toString(),
                                language: 'plaintext',
                                code: '// 코드 블록을 찾을 수 없습니다.\n// 다시 요청해주세요. 예: "HTML로 버튼 만들어줘"',
                                title: '코드 없음',
                                isStreaming: false,
                                createdAt: new Date()
                            })
                        }
                    }
                } else if (data.content) {
                    setCurrentResponse(data.content)
                    setMessages(prev => [...prev, { role: 'assistant', content: data.content }])

                    const codeBlock = extractCodeFromResponse(data.content)
                    if (isCodingRequest(content)) {
                        if (codeBlock) {
                            setCodeArtifact({
                                id: Date.now().toString(),
                                language: codeBlock.language,
                                code: codeBlock.code,
                                title: '생성된 코드',
                                isStreaming: false,
                                createdAt: new Date()
                            })
                        } else {
                            setCodeArtifact({
                                id: Date.now().toString(),
                                language: 'plaintext',
                                code: '// 코드 블록을 찾을 수 없습니다.\n// 다시 요청해주세요.',
                                title: '코드 없음',
                                isStreaming: false,
                                createdAt: new Date()
                            })
                        }
                    }
                } else {
                    setCurrentResponse('응답을 받지 못했습니다.')
                    setMessages(prev => [...prev, { role: 'assistant', content: '응답을 받지 못했습니다.' }])
                    if (isCodingRequest(content)) {
                        setCodeArtifact(null)
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error)
            setCurrentResponse('오류가 발생했습니다. 다시 시도해주세요.')
            setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' }])
        } finally {
            setIsLoading(false)
            setCurrentThinkingStep('')
        }
    }

    const handleNewSearch = () => {
        setCurrentQuery('')
        setCurrentResponse('')
        setThinkingSteps([])
        setToolsUsed([])
    }

    useEffect(() => {
        if (initialQuery && !hasSentInitialRef.current) {
            hasSentInitialRef.current = true

            // 코딩 컨텍스트가 있으면 해당 프로젝트 시작 메시지 전송
            if (codingContext) {
                const codingStartMessage = `${codingContext.title} 프로젝트를 시작하겠습니다. 무엇을 만들고 싶으신가요?`
                sendMessageWithContent(codingStartMessage, [])
            } else {
                sendMessageWithContent(initialQuery, [])
            }
        }
    }, [initialQuery, codingContext])

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return
        const content = input.trim()
        setInput('')
        await sendMessageWithContent(content, messages)
    }

    return (
        <div ref={containerRef} className={cn("flex h-[calc(100vh-120px)]", (isResizing || isArtifactResizing || isAgentBuilderResizing) && "select-none cursor-col-resize [&_webview]:pointer-events-none [&_iframe]:pointer-events-none")}>
            {/* Browser Panel (Left) */}
            <AnimatePresence>
                {browserOpen && !codeArtifact && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: `${browserWidth}%`, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{
                            duration: isResizing ? 0 : 0.2,
                            ease: "easeOut"
                        }}
                        className="h-full relative flex-shrink-0 overflow-hidden"
                        style={{ minWidth: '300px' }}
                    >
                        <BrowserPanel
                            currentUrl={browserUrl}
                            isLoading={browserLoading}
                            onClose={handleBrowserClose}
                            onUrlChange={setBrowserUrl}
                            isExpanded={browserExpanded}
                            onToggleExpand={() => setBrowserExpanded(!browserExpanded)}
                            onNavigate={(url) => setBrowserUrl(url)}
                        />
                        {isResizing && (
                            <div className="absolute inset-0 bg-transparent z-40 cursor-col-resize" />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resize Handle for Browser */}
            {browserOpen && !codeArtifact && (
                <div
                    className="w-0 flex-shrink-0 cursor-col-resize relative group z-50"
                    onMouseDown={handleMouseDown}
                    style={{ touchAction: 'none' }}
                >
                    <div
                        className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize z-50"
                        onMouseDown={handleMouseDown}
                    />
                    <div className={cn(
                        "absolute inset-y-0 -left-px w-0.5 transition-all duration-150",
                        isResizing
                            ? "bg-blue-500 w-1"
                            : "bg-transparent group-hover:bg-blue-500/70"
                    )} />
                </div>
            )}

            {/* Chat Area (Center) */}
            <div className="flex-1 flex flex-col min-w-0" style={{ minWidth: '350px' }}>
                {/* Chat Header */}
                <header className="flex items-center gap-4 h-16 px-4 border-b border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">GlowUS AI Chat</h2>
                    {!browserOpen && !codeArtifact && (
                        <button
                            onClick={() => setBrowserOpen(true)}
                            className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            <Globe className="w-4 h-4" />
                            브라우저 열기
                        </button>
                    )}
                </header>

                {/* Result View or Empty State */}
                {currentQuery ? (
                    <GensparkResultView
                        query={currentQuery}
                        response={currentResponse}
                        toolsUsed={toolsUsed}
                        isLoading={isLoading}
                        thinkingSteps={thinkingSteps}
                        currentThinkingStep={currentThinkingStep}
                        onNewSearch={handleNewSearch}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center px-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white mb-2">
                            무엇을 도와드릴까요?
                        </h2>
                        <p className="text-zinc-500 text-center max-w-md mb-8">
                            웹 검색, 정보 분석, 브라우저 자동화, 코드 생성 등<br />
                            다양한 작업을 도와드립니다.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                            {['고객 지원 에이전트 만들어줘', '오늘 주요 뉴스 알려줘', '강남역 맛집 추천해줘', 'HTML로 간단한 계산기 만들어줘'].map((example, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setInput(example)
                                        sendMessageWithContent(example, messages)
                                    }}
                                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-sm text-zinc-700 dark:text-zinc-300 transition-colors"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                            {/* Tabs */}
                            <div className="flex border-b border-zinc-200 dark:border-zinc-700">
                                <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white border-r border-zinc-200 dark:border-zinc-600">
                                    <Sparkles className="w-4 h-4" />
                                    슈퍼 에이전트
                                </button>
                                <button
                                    onClick={() => setBrowserOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                >
                                    <Globe className="w-4 h-4" />
                                    웹 브라우저
                                </button>
                            </div>

                            {/* Input Field */}
                            <div className="p-4">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                    placeholder="무엇이든 물어보고 만들어보세요 (예: React 버튼 컴포넌트 만들어줘)"
                                    className="w-full bg-transparent text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 text-base focus:outline-none"
                                />
                            </div>

                            {/* Attached Files */}
                            {attachedFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-zinc-100 dark:border-zinc-700">
                                    {attachedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-sm">
                                            <FileText className="w-4 h-4 text-zinc-500" />
                                            <span className="text-zinc-700 dark:text-zinc-300 max-w-[150px] truncate">{file.name}</span>
                                            <button
                                                onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Bottom Actions */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-700">
                                <div className="flex items-center gap-1">
                                    {/* Tools Menu */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowToolsMenu(!showToolsMenu)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            도구
                                        </button>
                                        {showToolsMenu && (
                                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-2 z-50">
                                                <div className="px-3 py-1.5 text-xs font-medium text-zinc-400 uppercase">외부 도구</div>
                                                <button
                                                    onClick={() => { setBrowserOpen(true); setShowToolsMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <Globe className="w-4 h-4 text-blue-500" />
                                                    웹 브라우저 열기
                                                </button>
                                                <button
                                                    onClick={() => { setInput(input + ' [웹 검색 요청]'); setShowToolsMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <Search className="w-4 h-4 text-green-500" />
                                                    웹 검색
                                                </button>
                                                <button
                                                    onClick={() => { setInput('이미지 생성해줘: '); setShowToolsMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <Image className="w-4 h-4 text-pink-500" />
                                                    이미지 생성
                                                </button>
                                                <button
                                                    onClick={() => { setInput('코드 작성해줘: '); setShowToolsMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <FaRegFileCode className="w-4 h-4 text-cyan-500" />
                                                    코드 생성
                                                </button>
                                                <button
                                                    onClick={() => { setInput('AI 에이전트 만들어줘: '); setShowToolsMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <Bot className="w-4 h-4 text-violet-500" />
                                                    에이전트 빌더
                                                </button>
                                                <div className="border-t border-zinc-200 dark:border-zinc-700 my-1.5" />
                                                <div className="px-3 py-1.5 text-xs font-medium text-zinc-400 uppercase">내부 도구</div>
                                                <button
                                                    onClick={() => { setInput('이메일 확인해줘'); setShowToolsMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <Mail className="w-4 h-4 text-red-500" />
                                                    이메일 조회
                                                </button>
                                                <button
                                                    onClick={() => { setInput('프로젝트 목록 보여줘'); setShowToolsMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                >
                                                    <FolderOpen className="w-4 h-4 text-yellow-500" />
                                                    프로젝트 목록
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* File Attachment */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                        title="파일 첨부"
                                    >
                                        <Paperclip className="w-5 h-5 text-zinc-500" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400">
                                        {attachedFiles.length > 0 && `${attachedFiles.length}개 파일`}
                                    </span>
                                    <button
                                        onClick={sendMessage}
                                        disabled={isLoading || !input.trim()}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            input.trim() && !isLoading
                                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                                : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500"
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
                    </div>
                </div>
            </div>

            {/* Code Artifact Panel (Right) */}
            <AnimatePresence>
                {codeArtifact && !agentBuilderOpen && (
                    <>
                        {/* Resize Handle for Artifact */}
                        <div
                            className="w-0 flex-shrink-0 cursor-col-resize relative group z-50"
                            onMouseDown={handleArtifactResizeMouseDown}
                            style={{ touchAction: 'none' }}
                        >
                            <div
                                className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize z-50"
                                onMouseDown={handleArtifactResizeMouseDown}
                            />
                            <div className={cn(
                                "absolute inset-y-0 -left-px w-0.5 transition-all duration-150",
                                isArtifactResizing
                                    ? "bg-blue-500 w-1"
                                    : "bg-transparent group-hover:bg-blue-500/70"
                            )} />
                        </div>

                        {/* Artifact Panel */}
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: `${artifactWidth}%`, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{
                                duration: isArtifactResizing ? 0 : 0.2,
                                ease: "easeOut"
                            }}
                            className="h-full flex-shrink-0 overflow-hidden"
                            style={{ minWidth: '350px' }}
                        >
                            <CodeArtifactPanel
                                artifact={codeArtifact}
                                onClose={() => setCodeArtifact(null)}
                                isExpanded={artifactExpanded}
                                onToggleExpand={() => setArtifactExpanded(!artifactExpanded)}
                                isDark={true}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Agent Builder Panel (Right) */}
            <AnimatePresence>
                {agentBuilderOpen && (
                    <>
                        {/* Resize Handle for Agent Builder */}
                        <div
                            className="w-0 flex-shrink-0 cursor-col-resize relative group z-50"
                            onMouseDown={handleAgentBuilderResizeMouseDown}
                            style={{ touchAction: 'none' }}
                        >
                            <div
                                className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize z-50"
                                onMouseDown={handleAgentBuilderResizeMouseDown}
                            />
                            <div className={cn(
                                "absolute inset-y-0 -left-px w-0.5 transition-all duration-150",
                                isAgentBuilderResizing
                                    ? "bg-violet-500 w-1"
                                    : "bg-transparent group-hover:bg-violet-500/70"
                            )} />
                        </div>

                        {/* Agent Builder Panel */}
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: `${agentBuilderWidth}%`, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{
                                duration: isAgentBuilderResizing ? 0 : 0.2,
                                ease: "easeOut"
                            }}
                            className="h-full flex-shrink-0 overflow-hidden"
                            style={{ minWidth: '320px' }}
                        >
                            <AgentBuilderPanel
                                agent={generatedAgent}
                                preview={agentPreview}
                                isGenerating={isGeneratingAgent}
                                onClose={handleCloseAgentBuilder}
                                onDeploy={handleDeployAgent}
                                onEdit={() => {
                                    // 수정 기능은 추후 구현
                                    console.log('Edit agent')
                                }}
                                isDeploying={isDeployingAgent}
                                deployedRoute={deployedAgentRoute}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

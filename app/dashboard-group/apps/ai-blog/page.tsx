"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Send,
    Bot,
    Loader2,
    Settings,
    Save,
    Eye,
    Edit3,
    Upload,
    FileText,
    Image as ImageIcon,
    Tag,
    Globe,
    Check,
    AlertCircle,
    RefreshCw,
    Copy,
    ExternalLink,
    Key,
    User,
    Lock,
    Trash2,
    Plus,
    BookOpen,
    Sparkles,
    ChevronDown,
    Search,
    TrendingUp,
    Users,
    MessageCircle,
    Heart,
    Download,
    Play,
    Pause,
    BarChart3,
    Target,
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    ArrowRight,
    Filter,
    SortAsc,
    Chrome,
    MonitorPlay,
    Power
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useThemeStore, accentColors } from "@/stores/themeStore"

// 블로그 플랫폼 타입
type BlogPlatform = 'tistory' | 'naver'
type ActiveTab = 'write' | 'keywords' | 'neighbors' | 'comments' | 'settings'

// 블로그 설정 타입
interface BlogSettings {
    tistory?: {
        apiKey: string
        blogName: string
        kakaoEmail?: string
        kakaoPassword?: string
        accessToken?: string
        connected: boolean
    }
    naver?: {
        username: string
        password: string
        blogId: string
        connected: boolean
        sessionCookie?: string
        apiClientId?: string
        apiClientSecret?: string
    }
}

// 블로그 포스트 타입
interface BlogPost {
    id?: string
    title: string
    content: string
    tags: string[]
    category?: string
    thumbnail?: string
    platform: BlogPlatform
    status: 'draft' | 'published' | 'scheduled'
    createdAt: Date
    publishedAt?: Date
}

// 키워드 타입
interface KeywordData {
    keyword: string
    pcSearch: number
    mobileSearch: number
    totalSearch: number
    docCount: number
    competition: number // 경쟁률 (낮을수록 좋음)
    isGolden: boolean // 황금 키워드 여부
}

// 이웃 타입
interface NeighborBlog {
    blogId: string
    blogName: string
    lastPost: string
    addedAt?: Date
    status: 'pending' | 'added' | 'failed'
}

// 댓글 타입
interface CommentTask {
    blogId: string
    blogName: string
    postTitle: string
    postUrl: string
    comment: string
    status: 'pending' | 'completed' | 'failed'
    completedAt?: Date
}

// 생성 단계
type GenerationStep = 'idle' | 'generating' | 'preview' | 'saving' | 'saved'

export default function AIBlogPage() {
    // 테마 설정
    const { accentColor } = useThemeStore()
    const themeColor = accentColors.find(c => c.id === accentColor)?.color || '#3b82f6'

    // 탭 상태
    const [activeTab, setActiveTab] = useState<ActiveTab>('write')
    const [platform, setPlatform] = useState<BlogPlatform>('naver')
    const [settings, setSettings] = useState<BlogSettings>({})
    const [settingsLoading, setSettingsLoading] = useState(true)

    // === 글 작성 관련 ===
    const [keyword, setKeyword] = useState('')
    const [generationStep, setGenerationStep] = useState<GenerationStep>('idle')
    const [generatedPost, setGeneratedPost] = useState<BlogPost | null>(null)
    const [editMode, setEditMode] = useState(false)
    const [editTitle, setEditTitle] = useState('')
    const [editContent, setEditContent] = useState('')
    const [editTags, setEditTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState('')
    const [bulkKeywords, setBulkKeywords] = useState<string[]>([])
    const [bulkProgress, setBulkProgress] = useState(0)
    const [isBulkMode, setIsBulkMode] = useState(false)
    const [writingStyle, setWritingStyle] = useState<'info' | 'review' | 'story' | 'list'>('info')
    const [toneStyle, setToneStyle] = useState<'haeyo' | 'formal' | 'casual'>('haeyo')
    const [includeImages, setIncludeImages] = useState(true)
    const [imageStyle, setImageStyle] = useState<'photography' | 'artistic' | 'digital_art' | 'realistic'>('photography')

    // === 키워드 채굴 관련 ===
    const [seedKeyword, setSeedKeyword] = useState('')
    const [keywordCount, setKeywordCount] = useState(100)
    const [keywords, setKeywords] = useState<KeywordData[]>([])
    const [keywordLoading, setKeywordLoading] = useState(false)
    const [keywordProgress, setKeywordProgress] = useState(0)
    const [minSearch, setMinSearch] = useState(100)
    const [maxCompetition, setMaxCompetition] = useState(0.5)

    // === 서로이웃 관련 ===
    const [neighborKeyword, setNeighborKeyword] = useState('')
    const [neighborMessage, setNeighborMessage] = useState('안녕하세요! 좋은 글 잘 보고 갑니다. 서로이웃 신청드려요 :)')
    const [neighborCount, setNeighborCount] = useState(100)
    const [neighbors, setNeighbors] = useState<NeighborBlog[]>([])
    const [neighborLoading, setNeighborLoading] = useState(false)
    const [neighborProgress, setNeighborProgress] = useState(0)
    const [dailyNeighborCount, setDailyNeighborCount] = useState(0)

    // === AI 댓글 관련 ===
    const [commentLoading, setCommentLoading] = useState(false)
    const [commentTasks, setCommentTasks] = useState<CommentTask[]>([])
    const [commentProgress, setCommentProgress] = useState(0)
    const [autoCommentEnabled, setAutoCommentEnabled] = useState(false)
    const [commentCount, setCommentCount] = useState(30)

    // 설정 입력 상태
    const [tistoryApiKey, setTistoryApiKey] = useState('')
    const [tistoryBlogName, setTistoryBlogName] = useState('')
    const [tistoryKakaoEmail, setTistoryKakaoEmail] = useState('')
    const [tistoryKakaoPassword, setTistoryKakaoPassword] = useState('')
    const [naverUsername, setNaverUsername] = useState('')
    const [naverPassword, setNaverPassword] = useState('')
    const [naverBlogId, setNaverBlogId] = useState('')
    const [naverApiClientId, setNaverApiClientId] = useState('')
    const [naverApiClientSecret, setNaverApiClientSecret] = useState('')

    // === Chrome 브라우저 자동화 상태 (네이버) ===
    const [chromeConnected, setChromeConnected] = useState(false)
    const [naverLoggedIn, setNaverLoggedIn] = useState(false)
    const [chromeLoading, setChromeLoading] = useState(false)
    const [loginLoading, setLoginLoading] = useState(false)
    const [postLoading, setPostLoading] = useState(false)
    const [automationMessage, setAutomationMessage] = useState('')

    // === 티스토리 상태 ===
    const [tistoryAccessToken, setTistoryAccessToken] = useState('')
    const [tistoryLoggedIn, setTistoryLoggedIn] = useState(false)
    const [tistoryLoading, setTistoryLoading] = useState(false)

    // 설정 로드
    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setSettingsLoading(true)
        try {
            const saved = localStorage.getItem('glowus_blog_settings')
            if (saved) {
                const parsed = JSON.parse(saved)
                setSettings(parsed)
                if (parsed.tistory) {
                    setTistoryApiKey(parsed.tistory.apiKey || '')
                    setTistoryBlogName(parsed.tistory.blogName || '')
                    setTistoryKakaoEmail(parsed.tistory.kakaoEmail || '')
                    setTistoryKakaoPassword(parsed.tistory.kakaoPassword || '')
                }
                if (parsed.naver) {
                    setNaverUsername(parsed.naver.username || '')
                    setNaverBlogId(parsed.naver.blogId || '')
                    setNaverApiClientId(parsed.naver.apiClientId || '')
                    setNaverApiClientSecret(parsed.naver.apiClientSecret || '')
                }
            }
        } catch (e) {
            console.error('설정 로드 실패:', e)
        } finally {
            setSettingsLoading(false)
        }
    }

    const saveSettings = async () => {
        const newSettings: BlogSettings = {
            tistory: {
                apiKey: tistoryApiKey,
                blogName: tistoryBlogName,
                kakaoEmail: tistoryKakaoEmail,
                kakaoPassword: tistoryKakaoPassword,
                connected: !!tistoryBlogName && (!!tistoryKakaoEmail || !!tistoryApiKey)
            },
            naver: {
                username: naverUsername,
                password: naverPassword,
                blogId: naverBlogId,
                apiClientId: naverApiClientId,
                apiClientSecret: naverApiClientSecret,
                connected: !!naverUsername && !!naverPassword
            }
        }
        setSettings(newSettings)
        localStorage.setItem('glowus_blog_settings', JSON.stringify(newSettings))
        alert('설정이 저장되었습니다!')
    }

    // === Chrome 브라우저 자동화 함수 ===
    const connectToChrome = async () => {
        setChromeLoading(true)
        setAutomationMessage('')
        try {
            const response = await fetch('/api/skills/blog-writer/post-naver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            })
            const data = await response.json()
            if (data.success) {
                setChromeConnected(true)
                setAutomationMessage(data.message)
            } else {
                setAutomationMessage(data.message)
            }
        } catch (error: any) {
            setAutomationMessage(`오류: ${error.message}`)
        } finally {
            setChromeLoading(false)
        }
    }

    // 네이버: Chrome 연결 + 자동 로그인 (통합)
    const connectAndCheckNaver = async () => {
        setChromeLoading(true)
        setAutomationMessage('브라우저 연결 중...')
        try {
            // 1. Chrome 연결
            const connectRes = await fetch('/api/skills/blog-writer/post-naver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            })
            const connectData = await connectRes.json()
            if (!connectData.success) {
                setAutomationMessage('Chrome 연결 실패. 아래 안내를 확인하세요.')
                return
            }
            setChromeConnected(true)

            // 2. 로그인 상태 확인
            setAutomationMessage('로그인 상태 확인 중...')
            const checkRes = await fetch('/api/skills/blog-writer/post-naver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkLogin' })
            })
            const checkData = await checkRes.json()

            if (checkData.loggedIn) {
                setNaverLoggedIn(true)
                setAutomationMessage('')
                return
            }

            // 3. 로그인 안되어 있으면 자동 로그인 시도
            if (!naverUsername || !naverPassword) {
                setAutomationMessage('설정에서 네이버 아이디/비밀번호를 입력해주세요')
                return
            }

            setAutomationMessage('네이버 로그인 중...')
            const loginRes = await fetch('/api/skills/blog-writer/post-naver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    credentials: { username: naverUsername, password: naverPassword }
                })
            })
            const loginData = await loginRes.json()

            if (loginData.success) {
                setNaverLoggedIn(true)
                setAutomationMessage('')
            } else {
                setAutomationMessage(loginData.message || '로그인 실패')
            }
        } catch (error: any) {
            setAutomationMessage('연결 실패. Chrome이 디버깅 모드로 실행 중인지 확인하세요.')
        } finally {
            setChromeLoading(false)
        }
    }

    const loginToNaver = async () => {
        if (!naverUsername || !naverPassword) {
            setAutomationMessage('네이버 아이디와 비밀번호를 설정에서 입력해주세요.')
            return
        }
        setLoginLoading(true)
        setAutomationMessage('')
        try {
            const response = await fetch('/api/skills/blog-writer/post-naver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    credentials: {
                        username: naverUsername,
                        password: naverPassword
                    }
                })
            })
            const data = await response.json()
            if (data.success) {
                setNaverLoggedIn(true)
                setAutomationMessage(data.message)
            } else {
                setAutomationMessage(data.message)
            }
        } catch (error: any) {
            setAutomationMessage(`오류: ${error.message}`)
        } finally {
            setLoginLoading(false)
        }
    }

    const postToNaverBlog = async () => {
        if (!editTitle || !editContent) {
            setAutomationMessage('제목과 본문이 필요합니다.')
            return
        }
        setPostLoading(true)
        setAutomationMessage('')
        try {
            const response = await fetch('/api/skills/blog-writer/post-naver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'post',
                    post: {
                        title: editTitle,
                        content: editContent,
                        tags: editTags
                    }
                })
            })
            const data = await response.json()
            setAutomationMessage(data.message)
            if (data.success) {
                setGenerationStep('saved')
            }
        } catch (error: any) {
            setAutomationMessage(`오류: ${error.message}`)
        } finally {
            setPostLoading(false)
        }
    }

    const checkAutomationStatus = async () => {
        try {
            const response = await fetch('/api/skills/blog-writer/post-naver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'status' })
            })
            const data = await response.json()
            if (data.success) {
                setChromeConnected(data.connected)
                setNaverLoggedIn(data.loggedIn)
            }
        } catch (error) {
            console.error('상태 확인 실패:', error)
        }
    }

    // === 티스토리 Chrome 자동화 함수 ===
    const connectTistoryChrome = async () => {
        setTistoryLoading(true)
        setAutomationMessage('브라우저 연결 중...')
        try {
            // 1. Chrome 연결
            const connectRes = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            })
            const connectData = await connectRes.json()
            if (!connectData.success) {
                setAutomationMessage('Chrome 연결 실패. 아래 안내를 확인하세요.')
                return
            }
            setTistoryAccessToken('connected')

            // 2. 로그인 상태 확인
            setAutomationMessage('로그인 상태 확인 중...')
            const checkRes = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkLogin' })
            })
            const checkData = await checkRes.json()

            if (checkData.loggedIn) {
                setTistoryLoggedIn(true)
                setAutomationMessage('')
                return
            }

            // 3. 로그인 안되어 있으면 자동 로그인 시도
            if (!tistoryKakaoEmail || !tistoryKakaoPassword) {
                setAutomationMessage('설정에서 카카오 이메일/비밀번호를 입력해주세요')
                return
            }

            setAutomationMessage('티스토리 로그인 중...')
            const loginRes = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    credentials: { email: tistoryKakaoEmail, password: tistoryKakaoPassword }
                })
            })
            const loginData = await loginRes.json()

            if (loginData.success) {
                setTistoryLoggedIn(true)
                setAutomationMessage('')
            } else {
                setAutomationMessage(loginData.message || '로그인 실패')
            }
        } catch (error: any) {
            setAutomationMessage('연결 실패. Chrome이 디버깅 모드로 실행 중인지 확인하세요.')
        } finally {
            setTistoryLoading(false)
        }
    }

    const loginTistory = async () => {
        setTistoryLoading(true)
        setAutomationMessage('Chrome 연결 확인 중...')
        try {
            // 1. Chrome 재연결 시도
            const connectRes = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' })
            })
            const connectData = await connectRes.json()
            if (!connectData.success) {
                setAutomationMessage(`Chrome 연결 실패: ${connectData.message}`)
                return
            }

            // 2. 이미 로그인되어 있는지 확인
            setAutomationMessage('로그인 상태 확인 중...')
            const checkRes = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkLogin' })
            })
            const checkData = await checkRes.json()

            if (checkData.loggedIn) {
                setAutomationMessage('이미 로그인되어 있습니다!')
                setTistoryLoggedIn(true)
                return
            }

            // 3. 로그인 필요 - 자격증명 확인
            if (!tistoryKakaoEmail || !tistoryKakaoPassword) {
                setAutomationMessage('Chrome에서 직접 티스토리에 로그인해주세요.')
                return
            }

            // 4. 자동 로그인 시도
            setAutomationMessage('로그인 시도 중...')
            const loginRes = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    credentials: {
                        email: tistoryKakaoEmail,
                        password: tistoryKakaoPassword
                    }
                })
            })
            const loginData = await loginRes.json()
            setAutomationMessage(loginData.message)
            if (loginData.success) {
                setTistoryLoggedIn(true)
            }
        } catch (error: any) {
            setAutomationMessage(`오류: ${error.message}`)
        } finally {
            setTistoryLoading(false)
        }
    }

    const postToTistory = async () => {
        if (!editTitle || !editContent) {
            setAutomationMessage('제목과 본문이 필요합니다.')
            return
        }
        if (!tistoryBlogName) {
            setAutomationMessage('설정에서 티스토리 블로그명을 입력해주세요.')
            return
        }
        const blogName = tistoryBlogName
        setPostLoading(true)
        setAutomationMessage('')
        try {
            const response = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'post',
                    post: {
                        blogName: blogName,
                        title: editTitle,
                        content: editContent,
                        tags: editTags
                    }
                })
            })
            const data = await response.json()
            setAutomationMessage(data.message)
            if (data.success) {
                setGenerationStep('saved')
            }
        } catch (error: any) {
            setAutomationMessage(`오류: ${error.message}`)
        } finally {
            setPostLoading(false)
        }
    }

    const checkTistoryStatus = async () => {
        try {
            const response = await fetch('/api/skills/blog-writer/post-tistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'status' })
            })
            const data = await response.json()
            if (data.success) {
                setTistoryLoggedIn(data.loggedIn)
                // Chrome 연결 상태도 확인
                if (data.connected) {
                    setTistoryAccessToken('connected')
                }
            }
        } catch (error) {
            console.error('티스토리 상태 확인 실패:', error)
        }
    }

    // 티스토리 상태 주기적 확인
    useEffect(() => {
        checkTistoryStatus()
        const interval = setInterval(checkTistoryStatus, 30000)
        return () => clearInterval(interval)
    }, [])

    // 상태 주기적 확인
    useEffect(() => {
        checkAutomationStatus()
        const interval = setInterval(checkAutomationStatus, 30000) // 30초마다
        return () => clearInterval(interval)
    }, [])

    // === 글 생성 함수 ===
    const generatePost = async () => {
        if (!keyword.trim()) return
        setGenerationStep('generating')

        try {
            const response = await fetch('/api/skills/blog-writer/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: keyword.trim(),
                    platform,
                    style: writingStyle,
                    toneStyle, // 말투 스타일
                    collectTop3: true, // 상위 3개 글 수집 후 조합
                    includeImages,
                    imageCount: 3,
                    imageStyle
                })
            })

            const data = await response.json()
            if (data.success) {
                const post: BlogPost = {
                    title: data.title,
                    content: data.content,
                    tags: data.tags || [],
                    platform,
                    status: 'draft',
                    createdAt: new Date()
                }
                setGeneratedPost(post)
                setEditTitle(post.title)
                setEditContent(post.content)
                setEditTags(post.tags)
                setGenerationStep('preview')
            } else {
                throw new Error(data.error || '글 생성 실패')
            }
        } catch (error) {
            console.error('글 생성 오류:', error)
            alert('글 생성 중 오류가 발생했습니다.')
            setGenerationStep('idle')
        }
    }

    // 임시저장
    const saveDraft = async () => {
        if (!generatedPost) return
        setGenerationStep('saving')

        try {
            const updatedPost: BlogPost = {
                ...generatedPost,
                title: editTitle,
                content: editContent,
                tags: editTags,
                status: 'draft'
            }

            const response = await fetch('/api/skills/blog-writer/save-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post: updatedPost,
                    platform,
                    credentials: platform === 'tistory' ? settings.tistory : settings.naver
                })
            })

            const data = await response.json()
            if (data.success) {
                setGenerationStep('saved')
                alert(`${platform === 'tistory' ? '티스토리' : '네이버 블로그'}에 임시저장되었습니다!`)
            } else {
                throw new Error(data.error || '임시저장 실패')
            }
        } catch (error) {
            console.error('임시저장 오류:', error)
            alert('임시저장 중 오류가 발생했습니다.')
            setGenerationStep('preview')
        }
    }

    // === 키워드 채굴 함수 ===
    const mineKeywords = async () => {
        if (!seedKeyword.trim()) return
        setKeywordLoading(true)
        setKeywordProgress(0)
        setKeywords([])

        try {
            const response = await fetch('/api/skills/blog-writer/mine-keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seedKeyword: seedKeyword.trim(),
                    count: keywordCount,
                    credentials: settings.naver
                })
            })

            const reader = response.body?.getReader()
            if (!reader) throw new Error('스트림 읽기 실패')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.progress) {
                                setKeywordProgress(data.progress)
                            }
                            if (data.keyword) {
                                setKeywords(prev => [...prev, data.keyword])
                            }
                            if (data.complete) {
                                setKeywordLoading(false)
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (error) {
            console.error('키워드 채굴 오류:', error)
            alert('키워드 채굴 중 오류가 발생했습니다.')
        } finally {
            setKeywordLoading(false)
        }
    }

    // 키워드 엑셀 다운로드
    const downloadKeywordsExcel = () => {
        if (keywords.length === 0) return

        const header = '키워드,PC검색량,모바일검색량,총검색량,문서수,경쟁률,황금키워드\n'
        const rows = keywords.map(k =>
            `${k.keyword},${k.pcSearch},${k.mobileSearch},${k.totalSearch},${k.docCount},${k.competition.toFixed(2)},${k.isGolden ? 'O' : 'X'}`
        ).join('\n')

        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `keywords_${seedKeyword}_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // === 서로이웃 자동화 함수 ===
    const startNeighborAutomation = async () => {
        if (!neighborKeyword.trim()) return
        setNeighborLoading(true)
        setNeighborProgress(0)

        try {
            const response = await fetch('/api/skills/blog-writer/add-neighbors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: neighborKeyword.trim(),
                    message: neighborMessage,
                    count: neighborCount,
                    credentials: settings.naver
                })
            })

            const reader = response.body?.getReader()
            if (!reader) throw new Error('스트림 읽기 실패')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.progress) {
                                setNeighborProgress(data.progress)
                                setDailyNeighborCount(data.dailyCount || 0)
                            }
                            if (data.neighbor) {
                                setNeighbors(prev => [...prev, data.neighbor])
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (error) {
            console.error('이웃 추가 오류:', error)
            alert('이웃 추가 중 오류가 발생했습니다.')
        } finally {
            setNeighborLoading(false)
        }
    }

    // === AI 댓글 자동화 함수 ===
    const startCommentAutomation = async () => {
        setCommentLoading(true)
        setCommentProgress(0)

        try {
            const response = await fetch('/api/skills/blog-writer/auto-comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    count: commentCount,
                    credentials: settings.naver
                })
            })

            const reader = response.body?.getReader()
            if (!reader) throw new Error('스트림 읽기 실패')

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.progress) {
                                setCommentProgress(data.progress)
                            }
                            if (data.task) {
                                setCommentTasks(prev => [...prev, data.task])
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (error) {
            console.error('댓글 자동화 오류:', error)
            alert('댓글 자동화 중 오류가 발생했습니다.')
        } finally {
            setCommentLoading(false)
        }
    }

    // 태그 관리
    const addTag = () => {
        if (newTag.trim() && !editTags.includes(newTag.trim())) {
            setEditTags([...editTags, newTag.trim()])
            setNewTag('')
        }
    }
    const removeTag = (tag: string) => setEditTags(editTags.filter(t => t !== tag))

    const resetToNew = () => {
        setKeyword('')
        setGeneratedPost(null)
        setEditTitle('')
        setEditContent('')
        setEditTags([])
        setGenerationStep('idle')
        setEditMode(false)
    }

    // 황금 키워드 필터
    const goldenKeywords = keywords.filter(k => k.isGolden)

    return (
        <div className="h-full flex flex-col bg-zinc-950">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: themeColor }}>
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">AI 블로그 자동화</h1>
                    <p className="text-xs text-zinc-500">글쓰기 · 키워드 · 이웃 · 댓글 올인원</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1">
                    {[
                        { id: 'write', label: '글 작성', icon: Edit3 },
                        { id: 'keywords', label: '키워드 채굴', icon: Search },
                        { id: 'neighbors', label: '서로이웃', icon: Users },
                        { id: 'comments', label: 'AI 댓글', icon: MessageCircle },
                        { id: 'settings', label: '설정', icon: Settings }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ActiveTab)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "text-white shadow-lg"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                            style={activeTab === tab.id ? { backgroundColor: themeColor } : undefined}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {/* ==================== 글 작성 탭 ==================== */}
                {activeTab === 'write' && (
                    <div className="h-full flex">
                        {/* 왼쪽: 입력 영역 */}
                        <div className="w-1/3 border-r border-zinc-800 p-6 flex flex-col overflow-auto">
                            {/* 자동 포스팅 상태 - 통합된 단순 UI */}
                            <div
                                className="mb-6 p-4 rounded-xl border"
                                style={{
                                    background: `linear-gradient(to bottom right, ${themeColor}15, ${themeColor}08)`,
                                    borderColor: `${themeColor}33`
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold text-white">자동 포스팅</span>
                                    <div className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        (platform === 'naver' ? naverLoggedIn : tistoryLoggedIn)
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-yellow-500/20 text-yellow-400"
                                    )}>
                                        {(platform === 'naver' ? naverLoggedIn : tistoryLoggedIn) ? '준비됨' : '설정 필요'}
                                    </div>
                                </div>

                                {/* 상태 메시지 */}
                                {automationMessage && (
                                    <p className="text-xs text-zinc-400 mb-3">{automationMessage}</p>
                                )}

                                {/* 준비 안됨 → 설정 버튼 */}
                                {!(platform === 'naver' ? naverLoggedIn : tistoryLoggedIn) && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-zinc-500">
                                            {platform === 'naver'
                                                ? 'Chrome에서 네이버에 로그인한 상태로 연결하세요'
                                                : 'Chrome에서 티스토리에 로그인한 상태로 연결하세요'
                                            }
                                        </p>
                                        <button
                                            onClick={platform === 'naver' ? connectAndCheckNaver : connectTistoryChrome}
                                            disabled={chromeLoading || tistoryLoading}
                                            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all text-white hover:opacity-90"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            {(chromeLoading || tistoryLoading) ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> 연결 중...</>
                                            ) : (
                                                <><Chrome className="w-4 h-4" /> 브라우저 연결</>
                                            )}
                                        </button>

                                        {/* Chrome 실행 안내 - 접이식 */}
                                        <details className="text-xs">
                                            <summary className="text-zinc-500 cursor-pointer hover:text-zinc-400">
                                                Chrome이 연결되지 않나요?
                                            </summary>
                                            <div className="mt-2 p-2 bg-zinc-900/50 rounded-lg">
                                                <p className="text-zinc-500 mb-1">터미널에서 실행:</p>
                                                <code className="text-green-400 block break-all">
                                                    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
                                                </code>
                                            </div>
                                        </details>
                                    </div>
                                )}

                                {/* 준비됨 → 블로그명 입력 (티스토리만) */}
                                {platform === 'tistory' && tistoryLoggedIn && (
                                    <div className="mt-2">
                                        <label className="text-xs text-zinc-400 block mb-1">블로그 주소</label>
                                        <div className="flex items-center gap-1 text-sm">
                                            <span className="text-zinc-500">https://</span>
                                            <input
                                                type="text"
                                                value={tistoryBlogName}
                                                onChange={(e) => setTistoryBlogName(e.target.value)}
                                                placeholder="블로그명"
                                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                            />
                                            <span className="text-zinc-500">.tistory.com</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 플랫폼 선택 */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">블로그 플랫폼</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPlatform('naver')}
                                        className={cn(
                                            "flex-1 py-3 rounded-lg font-medium transition-all",
                                            platform === 'naver'
                                                ? "text-white shadow-lg"
                                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        )}
                                        style={platform === 'naver' ? { backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` } : undefined}
                                    >
                                        네이버
                                    </button>
                                    <button
                                        onClick={() => setPlatform('tistory')}
                                        className={cn(
                                            "flex-1 py-3 rounded-lg font-medium transition-all",
                                            platform === 'tistory'
                                                ? "text-white shadow-lg"
                                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        )}
                                        style={platform === 'tistory' ? { backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` } : undefined}
                                    >
                                        티스토리
                                    </button>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                    {(platform === 'naver' ? settings.naver?.connected : settings.tistory?.connected) ? (
                                        <>
                                            <Check className="w-3 h-3 text-green-500" />
                                            <span className="text-green-500">연결됨</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                                            <span className="text-yellow-500">설정 필요</span>
                                            <button onClick={() => setActiveTab('settings')} className="text-blue-400 hover:underline ml-1">
                                                설정하기
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 키워드 입력 */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">키워드/주제</label>
                                <textarea
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="글을 작성할 키워드를 입력하세요&#10;예: 2024 여름 여행지 추천"
                                    className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
                                    disabled={generationStep === 'generating'}
                                />
                            </div>

                            {/* 작성 스타일 선택 */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-3 block">작성 스타일</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'info', label: '정보 전달', desc: '깔끔하게 정보 위주로' },
                                        { id: 'review', label: '후기/리뷰', desc: '실제 경험담처럼' },
                                        { id: 'story', label: '스토리텔링', desc: '에세이 느낌으로' },
                                        { id: 'list', label: '리스트형', desc: '항목별 정리' },
                                    ].map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => setWritingStyle(style.id as any)}
                                            className={cn(
                                                "p-3 rounded-lg text-left transition-all border",
                                                writingStyle === style.id
                                                    ? "text-white"
                                                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                            )}
                                            style={writingStyle === style.id ? {
                                                backgroundColor: `${themeColor}33`,
                                                borderColor: themeColor
                                            } : undefined}
                                        >
                                            <div className="font-medium text-sm">{style.label}</div>
                                            <div className="text-xs opacity-70">{style.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 말투 선택 */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-3 block">
                                    말투 <span style={{ color: themeColor }}>*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'haeyo', label: '~해요체' },
                                        { id: 'formal', label: '~습니다체' },
                                        { id: 'casual', label: '반말' },
                                    ].map((tone) => (
                                        <button
                                            key={tone.id}
                                            onClick={() => setToneStyle(tone.id as any)}
                                            className={cn(
                                                "py-3 rounded-lg text-sm font-medium transition-all border",
                                                toneStyle === tone.id
                                                    ? "text-white"
                                                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                            )}
                                            style={toneStyle === tone.id ? {
                                                backgroundColor: `${themeColor}33`,
                                                borderColor: themeColor
                                            } : undefined}
                                        >
                                            {tone.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI 이미지 생성 옵션 */}
                            <div
                                className="mb-6 p-4 rounded-xl border"
                                style={{
                                    background: `linear-gradient(to bottom right, ${themeColor}15, ${themeColor}08)`,
                                    borderColor: `${themeColor}33`
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" style={{ color: themeColor }} />
                                        <span className="text-sm font-medium text-white">AI 이미지 생성</span>
                                    </div>
                                    <button
                                        onClick={() => setIncludeImages(!includeImages)}
                                        className="relative w-12 h-6 rounded-full transition-colors"
                                        style={{ backgroundColor: includeImages ? themeColor : '#3f3f46' }}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                            includeImages ? "right-1" : "left-1"
                                        )} />
                                    </button>
                                </div>
                                {includeImages && (
                                    <>
                                        <p className="text-xs text-zinc-400 mb-3">
                                            나노바나나 AI로 3개의 관련 이미지를 자동 생성하여 본문에 삽입합니다.
                                        </p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { id: 'photography', label: '사진' },
                                                { id: 'artistic', label: '아트' },
                                                { id: 'digital_art', label: '디지털' },
                                                { id: 'realistic', label: '실사' },
                                            ].map((style) => (
                                                <button
                                                    key={style.id}
                                                    onClick={() => setImageStyle(style.id as any)}
                                                    className={cn(
                                                        "py-2 rounded-lg text-xs font-medium transition-all",
                                                        imageStyle === style.id
                                                            ? "text-white"
                                                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                    )}
                                                    style={imageStyle === style.id ? { backgroundColor: themeColor } : undefined}
                                                >
                                                    {style.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* 상위 글 수집 옵션 */}
                            <div className="mb-6 p-4 bg-zinc-900 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4" style={{ color: themeColor }} />
                                    <span className="text-sm font-medium text-white">상위 노출 글 분석</span>
                                </div>
                                <p className="text-xs text-zinc-500">
                                    해당 키워드로 상위 노출된 3개의 글을 수집하고 AI가 분석하여 SEO 최적화된 글을 작성합니다.
                                </p>
                            </div>

                            {/* 생성 버튼 */}
                            <button
                                onClick={generatePost}
                                disabled={!keyword.trim() || generationStep === 'generating'}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90",
                                    generationStep === 'generating' && "bg-zinc-700 cursor-not-allowed"
                                )}
                                style={generationStep !== 'generating' ? {
                                    backgroundColor: themeColor,
                                    boxShadow: `0 10px 15px -3px ${themeColor}40`
                                } : undefined}
                            >
                                {generationStep === 'generating' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        AI가 글을 작성 중...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        AI 글 생성하기
                                    </>
                                )}
                            </button>

                            {generationStep !== 'idle' && (
                                <button
                                    onClick={resetToNew}
                                    className="mt-3 w-full py-3 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    새 글 작성
                                </button>
                            )}
                        </div>

                        {/* 오른쪽: 미리보기/에디터 */}
                        <div className="flex-1 p-6 flex flex-col">
                            {generatedPost ? (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditMode(false)}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                                    !editMode ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                )}
                                            >
                                                <Eye className="w-4 h-4" />
                                                미리보기
                                            </button>
                                            <button
                                                onClick={() => setEditMode(true)}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                                    editMode ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                                )}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                수정
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigator.clipboard.writeText(editContent)}
                                                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-2 text-sm"
                                            >
                                                <Copy className="w-4 h-4" />
                                                복사
                                            </button>
                                            <button
                                                onClick={saveDraft}
                                                disabled={generationStep === 'saving'}
                                                className="px-4 py-2 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                                            >
                                                {generationStep === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                임시저장
                                            </button>
                                            {/* 자동 포스팅 버튼 - 단순화 */}
                                            <button
                                                onClick={platform === 'naver' ? postToNaverBlog : postToTistory}
                                                disabled={postLoading || !(platform === 'naver' ? naverLoggedIn : tistoryLoggedIn)}
                                                className={cn(
                                                    "px-6 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-all hover:opacity-90",
                                                    !(platform === 'naver' ? naverLoggedIn : tistoryLoggedIn) && "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                                )}
                                                style={(platform === 'naver' ? naverLoggedIn : tistoryLoggedIn) ? {
                                                    backgroundColor: themeColor,
                                                    color: 'white',
                                                    boxShadow: `0 10px 15px -3px ${themeColor}40`
                                                } : undefined}
                                                title={!(platform === 'naver' ? naverLoggedIn : tistoryLoggedIn) ? '왼쪽 패널에서 브라우저 연결을 먼저 해주세요' : ''}
                                            >
                                                {postLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                {platform === 'naver' ? '네이버' : '티스토리'} 자동 포스팅
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden flex flex-col">
                                        {editMode ? (
                                            <div className="flex-1 flex flex-col p-6 overflow-auto">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="text-2xl font-bold bg-transparent text-white border-b border-zinc-700 pb-3 mb-4 focus:outline-none"
                                                    style={{ '--focus-color': themeColor } as React.CSSProperties}
                                                    placeholder="제목을 입력하세요"
                                                />
                                                <div className="mb-4">
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {editTags.map(tag => (
                                                            <span key={tag} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm flex items-center gap-1">
                                                                #{tag}
                                                                <button onClick={() => removeTag(tag)} className="hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newTag}
                                                            onChange={(e) => setNewTag(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                                            placeholder="태그 추가"
                                                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                                        />
                                                        <button onClick={addTag} className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"><Plus className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="flex-1 bg-transparent text-zinc-300 leading-relaxed resize-none focus:outline-none"
                                                    placeholder="본문 내용을 입력하세요"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 p-6 overflow-auto select-text">
                                                <h1 className="text-2xl font-bold text-white mb-4">{editTitle}</h1>
                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    {editTags.map(tag => (
                                                        <span key={tag} className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-sm">#{tag}</span>
                                                    ))}
                                                </div>
                                                <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed select-text">
                                                    {editContent.split('\n\n').map((paragraph, idx) => {
                                                        // [IMAGE:...] 패턴 확인
                                                        const imageMatch = paragraph.match(/\[IMAGE:(data:image\/[^;]+;base64,[^\]]+)\]/)
                                                        if (imageMatch) {
                                                            const imgSrc = imageMatch[1]
                                                            return (
                                                                <div key={idx} className="my-6 relative group">
                                                                    <img
                                                                        src={imgSrc}
                                                                        alt={`AI 생성 이미지 ${idx + 1}`}
                                                                        className="w-full rounded-xl shadow-lg"
                                                                    />
                                                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    const res = await fetch(imgSrc)
                                                                                    const blob = await res.blob()
                                                                                    await navigator.clipboard.write([
                                                                                        new ClipboardItem({ [blob.type]: blob })
                                                                                    ])
                                                                                    alert('이미지가 복사되었습니다!')
                                                                                } catch (e) {
                                                                                    // 폴백: 새 탭에서 열기
                                                                                    window.open(imgSrc, '_blank')
                                                                                }
                                                                            }}
                                                                            className="px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-lg flex items-center gap-1"
                                                                        >
                                                                            <Copy className="w-3 h-3" />
                                                                            복사
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                const a = document.createElement('a')
                                                                                a.href = imgSrc
                                                                                a.download = `image_${idx + 1}.png`
                                                                                a.click()
                                                                            }}
                                                                            className="px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-lg flex items-center gap-1"
                                                                        >
                                                                            <Download className="w-3 h-3" />
                                                                            저장
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        return paragraph.trim() ? (
                                                            <p key={idx} className="mb-4 whitespace-pre-wrap">{paragraph}</p>
                                                        ) : null
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Sparkles className="w-12 h-12 text-zinc-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-zinc-400 mb-2">AI 블로그 글 생성</h3>
                                        <p className="text-zinc-500 max-w-md">
                                            키워드를 입력하면 상위 노출 글을 분석하여<br />
                                            SEO 최적화된 글을 자동으로 작성합니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== 키워드 채굴 탭 ==================== */}
                {activeTab === 'keywords' && (
                    <div className="h-full flex">
                        {/* 왼쪽: 입력 */}
                        <div className="w-1/3 border-r border-zinc-800 p-6">
                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">시드 키워드</label>
                                <input
                                    type="text"
                                    value={seedKeyword}
                                    onChange={(e) => setSeedKeyword(e.target.value)}
                                    placeholder="예: 맛집, 여행, 육아"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">수집 개수</label>
                                <input
                                    type="number"
                                    value={keywordCount}
                                    onChange={(e) => setKeywordCount(Number(e.target.value))}
                                    min={10}
                                    max={10000}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
                                />
                                <p className="text-xs text-zinc-500 mt-1">최대 10,000개까지 수집 가능</p>
                            </div>

                            <div className="mb-6 p-4 bg-zinc-900 rounded-xl space-y-4">
                                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-blue-400" />
                                    황금 키워드 필터
                                </h4>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">최소 검색량</label>
                                    <input
                                        type="number"
                                        value={minSearch}
                                        onChange={(e) => setMinSearch(Number(e.target.value))}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">최대 경쟁률</label>
                                    <input
                                        type="number"
                                        value={maxCompetition}
                                        onChange={(e) => setMaxCompetition(Number(e.target.value))}
                                        step={0.1}
                                        min={0}
                                        max={1}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={mineKeywords}
                                disabled={!seedKeyword.trim() || keywordLoading}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90",
                                    keywordLoading && "bg-zinc-700 cursor-not-allowed"
                                )}
                                style={!keywordLoading ? {
                                    backgroundColor: themeColor,
                                    boxShadow: `0 10px 15px -3px ${themeColor}40`
                                } : undefined}
                            >
                                {keywordLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        채굴 중... {keywordProgress}%
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        키워드 채굴 시작
                                    </>
                                )}
                            </button>

                            {keywords.length > 0 && (
                                <button
                                    onClick={downloadKeywordsExcel}
                                    className="mt-3 w-full py-3 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    엑셀 다운로드 ({keywords.length}개)
                                </button>
                            )}
                        </div>

                        {/* 오른쪽: 결과 */}
                        <div className="flex-1 p-6 flex flex-col">
                            {/* 통계 */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-zinc-900 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-white">{keywords.length}</p>
                                    <p className="text-xs text-zinc-500">전체 키워드</p>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-yellow-400">{goldenKeywords.length}</p>
                                    <p className="text-xs text-yellow-500">황금 키워드</p>
                                </div>
                                <div className="bg-zinc-900 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-white">
                                        {keywords.length > 0 ? Math.round(keywords.reduce((a, k) => a + k.totalSearch, 0) / keywords.length) : 0}
                                    </p>
                                    <p className="text-xs text-zinc-500">평균 검색량</p>
                                </div>
                                <div className="bg-zinc-900 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-white">
                                        {keywords.length > 0 ? (keywords.reduce((a, k) => a + k.competition, 0) / keywords.length).toFixed(2) : 0}
                                    </p>
                                    <p className="text-xs text-zinc-500">평균 경쟁률</p>
                                </div>
                            </div>

                            {/* 키워드 테이블 */}
                            <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-zinc-800 text-xs font-medium text-zinc-400">
                                    <div className="col-span-2">키워드</div>
                                    <div className="text-right">PC</div>
                                    <div className="text-right">모바일</div>
                                    <div className="text-right">총검색량</div>
                                    <div className="text-right">문서수</div>
                                    <div className="text-right">경쟁률</div>
                                </div>
                                <div className="overflow-auto max-h-[calc(100vh-400px)]">
                                    {keywords.length > 0 ? (
                                        keywords.map((k, idx) => (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "grid grid-cols-7 gap-4 px-4 py-3 border-b border-zinc-800 text-sm",
                                                    k.isGolden && "bg-yellow-500/5"
                                                )}
                                            >
                                                <div className="col-span-2 flex items-center gap-2">
                                                    {k.isGolden && <Sparkles className="w-4 h-4 text-yellow-500" />}
                                                    <span className="text-white">{k.keyword}</span>
                                                </div>
                                                <div className="text-right text-zinc-400">{k.pcSearch.toLocaleString()}</div>
                                                <div className="text-right text-zinc-400">{k.mobileSearch.toLocaleString()}</div>
                                                <div className="text-right text-white font-medium">{k.totalSearch.toLocaleString()}</div>
                                                <div className="text-right text-zinc-400">{k.docCount.toLocaleString()}</div>
                                                <div className={cn("text-right font-medium", k.competition < 0.3 ? "text-green-400" : k.competition < 0.6 ? "text-yellow-400" : "text-red-400")}>
                                                    {k.competition.toFixed(2)}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center h-64 text-zinc-500">
                                            시드 키워드를 입력하고 채굴을 시작하세요
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== 서로이웃 탭 ==================== */}
                {activeTab === 'neighbors' && (
                    <div className="h-full flex">
                        <div className="w-1/3 border-r border-zinc-800 p-6">
                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">타겟 키워드</label>
                                <input
                                    type="text"
                                    value={neighborKeyword}
                                    onChange={(e) => setNeighborKeyword(e.target.value)}
                                    placeholder="해당 키워드로 글 쓴 블로거 찾기"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">이웃 신청 메시지</label>
                                <textarea
                                    value={neighborMessage}
                                    onChange={(e) => setNeighborMessage(e.target.value)}
                                    placeholder="이웃 신청 시 보낼 메시지"
                                    className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">신청 개수</label>
                                <input
                                    type="number"
                                    value={neighborCount}
                                    onChange={(e) => setNeighborCount(Number(e.target.value))}
                                    min={1}
                                    max={100}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
                                />
                                <p className="text-xs text-zinc-500 mt-1">하루 최대 100명까지 가능</p>
                            </div>

                            <div className="mb-6 p-4 bg-zinc-900 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-zinc-400">오늘 추가한 이웃</span>
                                    <span className="text-lg font-bold text-white">{dailyNeighborCount}/100</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full transition-all" style={{ width: `${dailyNeighborCount}%`, backgroundColor: themeColor }} />
                                </div>
                            </div>

                            <button
                                onClick={startNeighborAutomation}
                                disabled={!neighborKeyword.trim() || neighborLoading || dailyNeighborCount >= 100}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90",
                                    (neighborLoading || dailyNeighborCount >= 100) && "bg-zinc-700 cursor-not-allowed"
                                )}
                                style={!(neighborLoading || dailyNeighborCount >= 100) ? {
                                    backgroundColor: themeColor,
                                    boxShadow: `0 10px 15px -3px ${themeColor}40`
                                } : undefined}
                            >
                                {neighborLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        이웃 추가 중... {neighborProgress}%
                                    </>
                                ) : dailyNeighborCount >= 100 ? (
                                    <>
                                        <AlertCircle className="w-5 h-5" />
                                        오늘 한도 초과
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-5 h-5" />
                                        서로이웃 자동 추가
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex-1 p-6">
                            <h3 className="text-lg font-bold text-white mb-4">추가된 이웃 목록</h3>
                            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-auto">
                                {neighbors.length > 0 ? (
                                    neighbors.map((n, idx) => (
                                        <div key={idx} className="bg-zinc-900 rounded-xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium">{n.blogName}</p>
                                                <p className="text-xs text-zinc-500">{n.lastPost}</p>
                                            </div>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-medium",
                                                n.status === 'added' ? "bg-green-500/20 text-green-400" :
                                                    n.status === 'failed' ? "bg-red-500/20 text-red-400" :
                                                        "bg-zinc-700 text-zinc-400"
                                            )}>
                                                {n.status === 'added' ? '추가됨' : n.status === 'failed' ? '실패' : '대기중'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-zinc-500">
                                        키워드를 입력하고 이웃 추가를 시작하세요
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== AI 댓글 탭 ==================== */}
                {activeTab === 'comments' && (
                    <div className="h-full flex">
                        <div className="w-1/3 border-r border-zinc-800 p-6">
                            <div
                                className="mb-6 p-4 rounded-xl border"
                                style={{
                                    background: `linear-gradient(to bottom right, ${themeColor}15, ${themeColor}08)`,
                                    borderColor: `${themeColor}33`
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Bot className="w-5 h-5" style={{ color: themeColor }} />
                                    <span className="text-sm font-medium text-white">AI 자동 댓글</span>
                                </div>
                                <p className="text-xs text-zinc-400">
                                    서로이웃의 최근 글을 방문하여 AI가 글 내용을 분석하고 자연스러운 댓글을 자동으로 작성합니다.
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-medium text-zinc-400 mb-2 block">댓글 작성 개수</label>
                                <input
                                    type="number"
                                    value={commentCount}
                                    onChange={(e) => setCommentCount(Number(e.target.value))}
                                    min={1}
                                    max={100}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
                                />
                            </div>

                            <div className="mb-6 p-4 bg-zinc-900 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-zinc-400">완료된 댓글</span>
                                    <span className="text-lg font-bold text-white">{commentTasks.filter(t => t.status === 'completed').length}/{commentCount}</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full transition-all" style={{ width: `${commentProgress}%`, backgroundColor: themeColor }} />
                                </div>
                            </div>

                            <button
                                onClick={startCommentAutomation}
                                disabled={commentLoading}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90",
                                    commentLoading && "bg-zinc-700 cursor-not-allowed"
                                )}
                                style={!commentLoading ? {
                                    backgroundColor: themeColor,
                                    boxShadow: `0 10px 15px -3px ${themeColor}40`
                                } : undefined}
                            >
                                {commentLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        댓글 작성 중... {commentProgress}%
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-5 h-5" />
                                        AI 댓글 시작
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex-1 p-6">
                            <h3 className="text-lg font-bold text-white mb-4">댓글 작성 로그</h3>
                            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-auto">
                                {commentTasks.length > 0 ? (
                                    commentTasks.map((task, idx) => (
                                        <div key={idx} className="bg-zinc-900 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-white font-medium">{task.blogName}</p>
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-medium",
                                                    task.status === 'completed' ? "bg-green-500/20 text-green-400" :
                                                        task.status === 'failed' ? "bg-red-500/20 text-red-400" :
                                                            "bg-zinc-700 text-zinc-400"
                                                )}>
                                                    {task.status === 'completed' ? '완료' : task.status === 'failed' ? '실패' : '진행중'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-2">{task.postTitle}</p>
                                            <p className="text-xs text-zinc-500 italic">"{task.comment}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-zinc-500">
                                        AI 댓글 자동화를 시작하세요
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== 설정 탭 ==================== */}
                {activeTab === 'settings' && (
                    <div className="p-6 max-w-3xl mx-auto">
                        <h2 className="text-lg font-bold text-white mb-6">블로그 연동 설정</h2>

                        {/* 네이버 설정 */}
                        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: themeColor }}>
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">네이버 블로그</h3>
                                    <p className="text-xs text-zinc-500">로그인 + API 연동</p>
                                </div>
                                {settings.naver?.connected && (
                                    <span className="ml-auto px-2 py-1 rounded text-xs" style={{ backgroundColor: `${themeColor}33`, color: themeColor }}>연결됨</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">네이버 아이디</label>
                                    <input
                                        type="text"
                                        value={naverUsername}
                                        onChange={(e) => setNaverUsername(e.target.value)}
                                        placeholder="네이버 아이디"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">비밀번호</label>
                                    <input
                                        type="password"
                                        value={naverPassword}
                                        onChange={(e) => setNaverPassword(e.target.value)}
                                        placeholder="비밀번호"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">블로그 ID</label>
                                    <input
                                        type="text"
                                        value={naverBlogId}
                                        onChange={(e) => setNaverBlogId(e.target.value)}
                                        placeholder="blog.naver.com/xxx의 xxx"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">API Client ID (키워드용)</label>
                                    <input
                                        type="text"
                                        value={naverApiClientId}
                                        onChange={(e) => setNaverApiClientId(e.target.value)}
                                        placeholder="네이버 개발자센터 Client ID"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm text-zinc-400 mb-1 block">API Client Secret</label>
                                    <input
                                        type="password"
                                        value={naverApiClientSecret}
                                        onChange={(e) => setNaverApiClientSecret(e.target.value)}
                                        placeholder="네이버 개발자센터 Client Secret"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                    <p className="text-xs text-zinc-600 mt-1">
                                        <a href="https://developers.naver.com/apps/#/register" target="_blank" className="hover:underline" style={{ color: themeColor }}>
                                            네이버 개발자센터에서 API 키 발급받기 →
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 티스토리 설정 */}
                        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: themeColor }}>
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">티스토리</h3>
                                    <p className="text-xs text-zinc-500">Chrome 자동화 (카카오 로그인)</p>
                                </div>
                                {settings.tistory?.connected && (
                                    <span className="ml-auto px-2 py-1 rounded text-xs" style={{ backgroundColor: `${themeColor}33`, color: themeColor }}>연결됨</span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">블로그 이름</label>
                                    <input
                                        type="text"
                                        value={tistoryBlogName}
                                        onChange={(e) => setTistoryBlogName(e.target.value)}
                                        placeholder="xxx.tistory.com의 xxx"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">카카오 이메일</label>
                                    <input
                                        type="email"
                                        value={tistoryKakaoEmail}
                                        onChange={(e) => setTistoryKakaoEmail(e.target.value)}
                                        placeholder="카카오 로그인 이메일"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">카카오 비밀번호</label>
                                    <input
                                        type="password"
                                        value={tistoryKakaoPassword}
                                        onChange={(e) => setTistoryKakaoPassword(e.target.value)}
                                        placeholder="카카오 로그인 비밀번호"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={saveSettings}
                            className="w-full py-4 rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-2 hover:opacity-90"
                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` }}
                        >
                            <Save className="w-5 h-5" />
                            설정 저장
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

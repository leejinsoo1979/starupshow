// Agent Builder Types - 자연어로 에이전트를 생성하고 배포하는 시스템

export interface CustomAgentConfig {
    id: string
    name: string
    description: string
    icon: string // lucide icon name
    iconColor: string
    iconBg: string
    category: string

    // Agent Behavior
    systemPrompt: string
    personality?: string
    capabilities: AgentCapability[]

    // Tools & Integrations
    tools: AgentToolConfig[]
    integrations?: string[]

    // UI Config
    inputPlaceholder?: string
    suggestedQueries?: string[]

    // Metadata
    createdAt: Date
    updatedAt: Date
    createdBy: string
    status: 'draft' | 'active' | 'paused'
    version: string

    // Deployment
    deployedToApps: boolean
    appRoute?: string
    thumbnail?: string
}

export interface AgentCapability {
    id: string
    name: string
    description: string
    type: 'web_search' | 'code_generation' | 'image_generation' | 'file_analysis' | 'data_processing' | 'browser_automation' | 'api_call' | 'custom'
    enabled: boolean
    config?: Record<string, unknown>
}

export interface AgentToolConfig {
    id: string
    name: string
    description: string
    type: 'builtin' | 'mcp' | 'api' | 'function'
    enabled: boolean
    config?: Record<string, unknown>
}

// Agent Builder Request/Response
export interface AgentBuilderRequest {
    userPrompt: string // "이메일 자동 분류 에이전트 만들어줘"
    refinements?: string[] // 추가 요구사항
}

export interface AgentBuilderResponse {
    success: boolean
    agent?: CustomAgentConfig
    preview?: AgentPreview
    suggestions?: string[]
    error?: string
}

export interface AgentPreview {
    name: string
    description: string
    capabilities: string[]
    sampleConversation: {
        user: string
        assistant: string
    }[]
}

// Built-in Tool Types
export const BUILTIN_TOOLS = [
    { id: 'web_search', name: '웹 검색', description: '인터넷에서 정보를 검색합니다', icon: 'Search' },
    { id: 'code_execution', name: '코드 실행', description: 'Python/JavaScript 코드를 실행합니다', icon: 'Code' },
    { id: 'image_generation', name: '이미지 생성', description: 'AI로 이미지를 생성합니다', icon: 'Image' },
    { id: 'file_reader', name: '파일 읽기', description: '문서, PDF, 이미지 파일을 분석합니다', icon: 'FileText' },
    { id: 'browser_control', name: '브라우저 제어', description: '웹 브라우저를 자동으로 제어합니다', icon: 'Globe' },
    { id: 'email_send', name: '이메일 발송', description: '이메일을 자동으로 발송합니다', icon: 'Mail' },
    { id: 'calendar', name: '캘린더', description: '일정을 조회하고 관리합니다', icon: 'Calendar' },
    { id: 'database', name: '데이터베이스', description: '데이터를 저장하고 조회합니다', icon: 'Database' },
] as const

// Agent Categories
export const AGENT_CATEGORIES = [
    { id: 'productivity', name: '생산성', icon: 'Briefcase' },
    { id: 'marketing', name: '마케팅', icon: 'Megaphone' },
    { id: 'sales', name: '영업', icon: 'TrendingUp' },
    { id: 'support', name: '고객지원', icon: 'Headphones' },
    { id: 'development', name: '개발', icon: 'Code' },
    { id: 'data', name: '데이터', icon: 'BarChart' },
    { id: 'creative', name: '크리에이티브', icon: 'Palette' },
    { id: 'education', name: '교육', icon: 'GraduationCap' },
    { id: 'custom', name: '커스텀', icon: 'Sparkles' },
] as const

// Icon mappings for dynamic icon loading
export const ICON_MAP: Record<string, string> = {
    'Search': 'Search',
    'Code': 'Code',
    'Image': 'Image',
    'FileText': 'FileText',
    'Globe': 'Globe',
    'Mail': 'Mail',
    'Calendar': 'Calendar',
    'Database': 'Database',
    'Briefcase': 'Briefcase',
    'Megaphone': 'Megaphone',
    'TrendingUp': 'TrendingUp',
    'Headphones': 'Headphones',
    'BarChart': 'BarChart',
    'Palette': 'Palette',
    'GraduationCap': 'GraduationCap',
    'Sparkles': 'Sparkles',
    'Bot': 'Bot',
    'MessageSquare': 'MessageSquare',
    'Zap': 'Zap',
    'Shield': 'Shield',
    'Users': 'Users',
}

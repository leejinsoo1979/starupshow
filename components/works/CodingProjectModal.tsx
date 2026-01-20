'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Globe,
    Layers,
    Smartphone,
    Github,
    Server,
    Zap,
    Terminal,
    ArrowRight,
    Code2,
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CodingProjectType {
    id: string
    title: string
    description: string
    icon: React.ElementType
    iconBg: string
    iconColor: string
    badge?: string
    badgeColor?: string
    features: string[]
}

const projectTypes: CodingProjectType[] = [
    {
        id: 'simple-web',
        title: '간단한 웹사이트 또는 웹 앱',
        description: 'HTML, CSS, JavaScript로 빠르게 시작하세요. 포트폴리오, 랜딩 페이지, 간단한 앱에 적합합니다.',
        icon: Globe,
        iconBg: 'bg-zinc-800',
        iconColor: 'text-zinc-300',
        features: ['HTML/CSS/JS', 'React/Vue 선택 가능', '실시간 미리보기', '빠른 배포']
    },
    {
        id: 'fullstack',
        title: '풀스택 웹사이트 또는 앱',
        description: '프론트엔드와 백엔드를 함께 개발하세요. 데이터베이스 연동, API 개발이 포함됩니다.',
        icon: Layers,
        iconBg: 'bg-zinc-800',
        iconColor: 'text-zinc-300',
        badge: '인기',
        badgeColor: 'bg-zinc-600',
        features: ['Next.js/Express', 'PostgreSQL/MongoDB', 'REST API', 'OAuth 인증']
    },
    {
        id: 'native-app',
        title: '네이티브 앱 개발',
        description: 'iOS, Android 또는 크로스 플랫폼 앱을 만들어보세요. React Native, Flutter 지원.',
        icon: Smartphone,
        iconBg: 'bg-zinc-800',
        iconColor: 'text-zinc-300',
        features: ['React Native', 'Flutter', 'Expo', '앱스토어 배포 가이드']
    },
    {
        id: 'github-project',
        title: '기존 GitHub 프로젝트',
        description: 'GitHub 저장소를 연결하여 기존 프로젝트를 이어서 개발하세요.',
        icon: Github,
        iconBg: 'bg-zinc-800',
        iconColor: 'text-zinc-300',
        features: ['Git 연동', '브랜치 관리', 'PR 리뷰 지원', '코드 분석']
    },
    {
        id: 'high-performance',
        title: '고성능 샌드박스',
        description: '복잡한 연산, 머신러닝, 데이터 처리를 위한 고성능 환경을 제공합니다.',
        icon: Zap,
        iconBg: 'bg-zinc-800',
        iconColor: 'text-zinc-300',
        badge: 'Pro',
        badgeColor: 'bg-zinc-600',
        features: ['고성능 CPU/GPU', 'Python/Jupyter', 'Docker 지원', '대용량 메모리']
    },
    {
        id: 'ssh-server',
        title: '자체 SSH 서버 연결',
        description: '자체 개발 서버에 SSH로 연결하여 원격 개발 환경을 구축하세요.',
        icon: Terminal,
        iconBg: 'bg-zinc-800',
        iconColor: 'text-zinc-300',
        features: ['SSH 터널링', '포트 포워딩', '원격 디버깅', '보안 연결']
    }
]

interface CodingProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (projectType: CodingProjectType) => void
}

export function CodingProjectModal({ isOpen, onClose, onSelect }: CodingProjectModalProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    console.log('[CodingProjectModal] isOpen:', isOpen)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="relative px-8 py-6 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                                        <Code2 className="w-5 h-5 text-zinc-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                            시작점 선택
                                        </h2>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            어떤 프로젝트를 만들고 싶으신가요?
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="absolute top-6 right-6 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {projectTypes.map((project) => (
                                        <motion.button
                                            key={project.id}
                                            onClick={() => onSelect(project)}
                                            onMouseEnter={() => setHoveredId(project.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={cn(
                                                "relative group text-left p-5 rounded-xl border transition-all duration-200",
                                                hoveredId === project.id
                                                    ? "border-zinc-500 bg-zinc-800"
                                                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                                            )}
                                        >
                                            {/* Badge */}
                                            {project.badge && (
                                                <span className={cn(
                                                    "absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold rounded-full text-white",
                                                    project.badgeColor
                                                )}>
                                                    {project.badge}
                                                </span>
                                            )}

                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                                                    project.iconBg
                                                )}>
                                                    <project.icon className={cn("w-6 h-6", project.iconColor)} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                                                        {project.title}
                                                        <ArrowRight className={cn(
                                                            "w-4 h-4 transition-all duration-200",
                                                            hoveredId === project.id
                                                                ? "opacity-100 translate-x-0 text-zinc-400"
                                                                : "opacity-0 -translate-x-2"
                                                        )} />
                                                    </h3>
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2">
                                                        {project.description}
                                                    </p>

                                                    {/* Features */}
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {project.features.map((feature, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] rounded-full"
                                                            >
                                                                {feature}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Quick Start Section */}
                                <div className="mt-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                                            <Sparkles className="w-5 h-5 text-zinc-300" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-zinc-900 dark:text-white">
                                                무엇을 만들지 모르겠다면?
                                            </h4>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                자연어로 원하는 것을 설명해주세요. AI가 최적의 시작점을 추천해드립니다.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onSelect({
                                                id: 'ai-suggest',
                                                title: 'AI 추천',
                                                description: 'AI가 최적의 프로젝트 유형을 추천합니다.',
                                                icon: Sparkles,
                                                iconBg: 'bg-zinc-800',
                                                iconColor: 'text-zinc-300',
                                                features: []
                                            })}
                                            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            AI에게 물어보기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

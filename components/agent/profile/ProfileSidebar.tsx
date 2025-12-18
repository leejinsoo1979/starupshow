import {
    Settings,
    ArrowLeft,
    Bot
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { getAvatarUrl, formatTimeAgo, AGENT_STATUS_CONFIG } from '@/lib/agent/utils'
import { PROVIDER_INFO, LLMProvider } from '@/lib/llm/models'
import { useThemeStore, accentColors } from '@/stores/themeStore'
import { cn } from '@/lib/utils'
import type { DeployedAgent } from '@/types/database'

interface ProfileSidebarProps {
    agent: DeployedAgent
    isDark: boolean
    onEdit: () => void
}

export function ProfileSidebar({ agent, isDark, onEdit }: ProfileSidebarProps) {
    const router = useRouter()
    const { accentColor } = useThemeStore()
    const currentAccent = accentColors.find(c => c.id === accentColor) || accentColors[0]

    const status = AGENT_STATUS_CONFIG[agent.status] || AGENT_STATUS_CONFIG.INACTIVE
    const providerInfo = PROVIDER_INFO[(agent.llm_provider || 'ollama') as LLMProvider]

    return (
        <div className={cn(
            "w-full md:w-80 flex-shrink-0 flex flex-col h-full border-r",
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
        )}>
            {/* Header / Back Button */}
            <div className="p-4">
                <button
                    onClick={() => router.back()}
                    className={cn(
                        "flex items-center gap-2 text-sm font-medium transition-colors",
                        isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                    )}
                >
                    <ArrowLeft className="w-4 h-4" />
                    뒤로가기
                </button>
            </div>

            <div className="px-6 pb-6 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                    <div className={cn(
                        "w-32 h-32 rounded-full p-1 border-2",
                        isDark ? "border-zinc-800 bg-zinc-800" : "border-zinc-100 bg-white"
                    )}>
                        <img
                            src={getAvatarUrl(agent)}
                            alt={agent.name}
                            className="w-full h-full rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
                        />
                    </div>
                    <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-zinc-900 flex items-center justify-center"
                        style={{ backgroundColor: status.color, borderColor: isDark ? '#18181b' : '#ffffff' }}
                    >
                    </div>
                </div>

                {/* Name & Edit */}
                <div className="flex items-center gap-2 mb-2">
                    <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
                        {agent.name}
                    </h1>
                    <button
                        onClick={onEdit}
                        className={cn("p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500")}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>

                {/* Status Badge */}
                <div className="mb-8">
                    <span
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{ backgroundColor: status.bgColor, color: status.color }}
                    >
                        {status.label}
                    </span>
                </div>

                {/* Settings Info Table */}
                <div className="w-full space-y-4 mb-8">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">설정</span>
                    </div>

                    <div className={cn(
                        "rounded-xl p-4 space-y-3 text-sm",
                        isDark ? "bg-zinc-800/50" : "bg-zinc-50"
                    )}>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500">제공자</span>
                            <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>
                                {providerInfo?.name || agent.llm_provider || '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500">모델</span>
                            <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>
                                {agent.model || '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Temperature</span>
                            <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>
                                {agent.temperature || 0.7}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500">생성일</span>
                            <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>
                                {new Date(agent.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500">마지막 활동</span>
                            <span className={isDark ? "text-zinc-300" : "text-zinc-700"}>
                                {formatTimeAgo(agent.last_active_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Action - Start Chat */}
                <Button
                    className="w-full py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all mb-3"
                    style={{
                        backgroundColor: '#22c55e',
                        color: 'white',
                        boxShadow: `0 4px 14px 0 rgba(34, 197, 94, 0.39)`
                    }}
                >
                    <Bot className="w-5 h-5 mr-2" />
                    대화하기
                </Button>

                <div className="grid grid-cols-2 gap-3 w-full">
                    <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                        중지
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        onClick={onEdit}
                    >
                        편집
                    </Button>
                </div>
            </div>
        </div>
    )
}

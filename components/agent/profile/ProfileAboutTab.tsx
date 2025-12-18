import { FileText, Heart, User, Zap, MessageSquare, CheckCircle, Lightbulb, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployedAgent } from '@/types/database'
import { AGENT_STATUS_CONFIG } from '@/lib/agent/utils'

interface ProfileAboutTabProps {
    agent: DeployedAgent
    isDark: boolean
    onEdit: () => void
}

export function ProfileAboutTab({ agent, isDark, onEdit }: ProfileAboutTabProps) {
    // Mock data or extracted from agent structure if available
    // The provided agent type has specific fields we should check, especially `identity` if it was extended
    // For now, we will use the basic agent fields and safely fallback

    // Safe access to potential nested properties if user used the complex schema
    const identity = (agent as any).identity || {}
    const coreValues = identity.core_values || ['열정', '창의성', '유머']
    const personalityTraits = identity.personality_traits || ['활발함', '친근함', '긍정적', '호기심 많음']
    const strengths = identity.strengths || ['분위기 메이커', '아이디어 제안', '동기부여']
    const communicationStyle = identity.communication_style || '밝고 에너지 넘치는 톤, 이모티콘 사용, 친근한 반말 섞기'
    const selfSummary = identity.self_summary || agent.description || "저는 에이미예요! 항상 밝은 에너지로 팀에 활력을 불어넣는 걸 좋아해요. 새로운 아이디어를 던지고 토론하는 게 제일 재밌어요!"

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={cn("text-2xl font-bold mb-1", isDark ? "text-white" : "text-zinc-900")}>
                        프로필
                    </h2>
                    <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-zinc-500")}>
                        에이전트의 정체성과 성격
                    </p>
                </div>
                <button
                    onClick={onEdit}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                        isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                >
                    편집
                </button>
            </div>

            {/* 자기 소개 Card */}
            <div className={cn(
                "p-6 rounded-2xl border",
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            )}>
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-zinc-200" : "text-zinc-800")}>자기 소개</h3>
                        <p className={cn("text-base leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-600")}>
                            {selfSummary}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 핵심 가치 */}
                <div className={cn(
                    "p-6 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                )}>
                    <div className="flex items-center gap-2 mb-4">
                        <Heart className="w-5 h-5 text-pink-500" />
                        <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-200" : "text-zinc-800")}>핵심 가치</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {coreValues.map((val: string, idx: number) => (
                            <span key={idx} className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium",
                                isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"
                            )}>
                                {val}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 성격 특성 */}
                <div className={cn(
                    "p-6 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                )}>
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-purple-500" />
                        <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-200" : "text-zinc-800")}>성격 특성</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {personalityTraits.map((val: string, idx: number) => (
                            <span key={idx} className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium",
                                isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"
                            )}>
                                {val}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 강점 */}
                <div className={cn(
                    "p-6 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                )}>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-green-500" />
                        <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-200" : "text-zinc-800")}>강점</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {strengths.map((val: string, idx: number) => (
                            <span key={idx} className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium",
                                isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"
                            )}>
                                {val}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 소통 스타일 */}
                <div className={cn(
                    "p-6 rounded-2xl border",
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                )}>
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-200" : "text-zinc-800")}>소통 스타일</h3>
                    </div>
                    <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-zinc-600")}>
                        {communicationStyle}
                    </p>
                </div>
            </div>

            {/* 활동 통계 Section */}
            <div>
                <h2 className={cn("text-xl font-bold mb-1 mt-8", isDark ? "text-white" : "text-zinc-900")}>
                    활동 통계
                </h2>
                <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-zinc-500")}>
                    에이전트 활동 현황
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Stat Cards - Mocked or Real */}
                    <div className={cn("p-5 rounded-2xl border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                        <MessageSquare className="w-5 h-5 text-blue-500 mb-3" />
                        <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
                            {(agent as any).total_conversations || 128}
                        </div>
                        <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-400")}>총 대화 수</div>
                    </div>
                    <div className={cn("p-5 rounded-2xl border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                        <CheckCircle className="w-5 h-5 text-green-500 mb-3" />
                        <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
                            {(agent as any).total_tasks_completed || 42}
                        </div>
                        <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-400")}>완료한 업무</div>
                    </div>
                    <div className={cn("p-5 rounded-2xl border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                        <Lightbulb className="w-5 h-5 text-yellow-500 mb-3" />
                        <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
                            {(agent as any).total_decisions_made || 15}
                        </div>
                        <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-400")}>제안한 아이디어</div>
                    </div>
                    <div className={cn("p-5 rounded-2xl border", isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                        <Share2 className="w-5 h-5 text-purple-500 mb-3" />
                        <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
                            {(agent as any).team?.name || '-'}
                        </div>
                        <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-400")}>소속 팀</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

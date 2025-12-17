"use client"

import { memo } from "react"
import { NodeProps } from "reactflow"
import { Wrench, FileText, Table, Mail, Globe, Calculator, Package } from "lucide-react"
import { BaseAgentNode } from "./BaseAgentNode"
import type { AgentNodeData } from "@/lib/agent"

// Tool category icons
function getToolIcon(toolName: string | undefined) {
    if (!toolName) return <Wrench className="w-5 h-5" />

    if (toolName.startsWith('ai_docs')) {
        return <FileText className="w-5 h-5" />
    } else if (toolName.startsWith('ai_sheet')) {
        return <Table className="w-5 h-5" />
    } else if (toolName.startsWith('email')) {
        return <Mail className="w-5 h-5" />
    } else if (toolName.startsWith('web_search')) {
        return <Globe className="w-5 h-5" />
    } else if (toolName.startsWith('calculator')) {
        return <Calculator className="w-5 h-5" />
    }
    return <Package className="w-5 h-5" />
}

// Tool category colors
function getToolColor(toolName: string | undefined): { color: string; bgColor: string; borderColor: string } {
    if (!toolName) {
        return { color: "#f97316", bgColor: "#f9731610", borderColor: "#f9731640" }
    }

    if (toolName.startsWith('ai_docs')) {
        return { color: "#3b82f6", bgColor: "#3b82f610", borderColor: "#3b82f640" } // Blue
    } else if (toolName.startsWith('ai_sheet')) {
        return { color: "#22c55e", bgColor: "#22c55e10", borderColor: "#22c55e40" } // Green
    } else if (toolName.startsWith('email')) {
        return { color: "#8b5cf6", bgColor: "#8b5cf610", borderColor: "#8b5cf640" } // Purple
    } else if (toolName.startsWith('web_search')) {
        return { color: "#ec4899", bgColor: "#ec489910", borderColor: "#ec489940" } // Pink
    } else if (toolName.startsWith('calculator')) {
        return { color: "#f59e0b", bgColor: "#f59e0b10", borderColor: "#f59e0b40" } // Amber
    }
    return { color: "#f97316", bgColor: "#f9731610", borderColor: "#f9731640" } // Orange default
}

// Format tool name for display
function formatToolName(toolName: string | undefined): string {
    if (!toolName) return '도구 미선택'

    // Convert snake_case to Title Case and remove prefix
    const parts = toolName.split('_')

    // Remove common prefixes
    const cleanParts = parts.filter(p => !['ai', 'tool'].includes(p.toLowerCase()))

    return cleanParts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

// Get tool description preview
function getToolPreview(toolName: string | undefined, description: string | undefined): string {
    if (description) {
        // Truncate long descriptions
        return description.length > 60 ? description.slice(0, 57) + '...' : description
    }

    if (!toolName) return '설정에서 Python 도구를 선택하세요'

    // Default descriptions by category
    if (toolName.startsWith('ai_docs')) return '문서 관리 도구'
    if (toolName.startsWith('ai_sheet')) return '스프레드시트 도구'
    if (toolName.startsWith('email')) return '이메일 처리 도구'
    if (toolName.startsWith('web_search')) return '웹 검색 도구'
    if (toolName.startsWith('calculator')) return '계산기 도구'

    return 'Python 백엔드 도구'
}

function CustomToolNodeComponent(props: NodeProps<AgentNodeData>) {
    const toolName = props.data.pythonToolName
    const toolDescription = props.data.pythonToolDescription
    const colors = getToolColor(toolName)

    return (
        <BaseAgentNode
            {...props}
            icon={getToolIcon(toolName)}
            color={colors.color}
            bgColor={colors.bgColor}
            borderColor={colors.borderColor}
            inputHandles={1}
            outputHandles={1}
        >
            <div className="flex flex-col gap-1.5">
                {toolName ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: colors.color }}
                            />
                            <span className="text-[11px] font-medium text-zinc-300">
                                {formatToolName(toolName)}
                            </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 leading-tight">
                            {getToolPreview(toolName, toolDescription)}
                        </div>
                    </>
                ) : (
                    <div className="text-[11px] text-zinc-500 italic">
                        설정에서 도구를 선택하세요
                    </div>
                )}
            </div>
        </BaseAgentNode>
    )
}

export const CustomToolNode = memo(CustomToolNodeComponent)

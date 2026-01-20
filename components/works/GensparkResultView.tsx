'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight, ExternalLink } from 'lucide-react'

interface GensparkResultViewProps {
    query: string
    response: string
    toolsUsed?: string[]
    isLoading: boolean
    thinkingSteps: string[]
    currentThinkingStep: string
    onNewSearch: () => void
}

export function GensparkResultView({
    query,
    response,
    toolsUsed = [],
    isLoading,
    thinkingSteps,
    currentThinkingStep,
    onNewSearch
}: GensparkResultViewProps) {
    // 응답이 오면 자동으로 Thinking 섹션 접기
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(true)

    useEffect(() => {
        if (response && !isLoading) {
            // 응답 완료 시 0.5초 후 접기
            const timer = setTimeout(() => setIsThinkingExpanded(false), 500)
            return () => clearTimeout(timer)
        }
    }, [response, isLoading])

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-10">
                {/* 쿼리 표시 - 미니멀하게 */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8 leading-tight"
                >
                    {query}
                </motion.h1>

                {/* Thinking UI - 미니멀 스타일 */}
                {(isLoading || thinkingSteps.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-8"
                    >
                        {/* 토글 헤더 */}
                        <button
                            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors mb-3"
                        >
                            <motion.div
                                animate={{ rotate: isThinkingExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </motion.div>
                            <span className="font-medium">
                                {isLoading ? '분석 중' : '분석 완료'}
                            </span>
                            {isLoading && (
                                <span className="inline-flex">
                                    <span className="animate-pulse">•</span>
                                    <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>•</span>
                                    <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>•</span>
                                </span>
                            )}
                            {!isLoading && thinkingSteps.length > 0 && (
                                <span className="text-zinc-400">({thinkingSteps.length}단계)</span>
                            )}
                        </button>

                        {/* 단계 목록 */}
                        <AnimatePresence>
                            {isThinkingExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pl-6 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                                        {thinkingSteps.map((step, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="flex items-center gap-2 text-sm text-zinc-500"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span>{step}</span>
                                            </motion.div>
                                        ))}

                                        {/* 현재 진행 중인 단계 */}
                                        {isLoading && currentThinkingStep && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                <span>{currentThinkingStep}</span>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* 결과 표시 - ReactMarkdown with custom components */}
                {response && !isLoading && (
                    <motion.article
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="markdown-content"
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // 헤딩 - 크기 차이 확실하게
                                h1: ({ children }) => (
                                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mt-8 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                                        {children}
                                    </h1>
                                ),
                                h2: ({ children }) => (
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-8 mb-4">
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mt-6 mb-3 pl-3 border-l-3 border-blue-500">
                                        {children}
                                    </h3>
                                ),
                                h4: ({ children }) => (
                                    <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mt-5 mb-2">
                                        {children}
                                    </h4>
                                ),
                                // 문단
                                p: ({ children }) => (
                                    <p className="text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 mb-4">
                                        {children}
                                    </p>
                                ),
                                // 강조
                                strong: ({ children }) => (
                                    <strong className="font-semibold text-zinc-900 dark:text-white">
                                        {children}
                                    </strong>
                                ),
                                em: ({ children }) => (
                                    <em className="italic text-zinc-500 dark:text-zinc-400">
                                        {children}
                                    </em>
                                ),
                                // 리스트
                                ul: ({ children }) => (
                                    <ul className="space-y-2 my-4 ml-1">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="space-y-3 my-4 ml-1 counter-reset-item">{children}</ol>
                                ),
                                li: ({ children }) => (
                                    <li className="flex items-start gap-3 text-[15px] text-zinc-600 dark:text-zinc-400">
                                        <span className="text-blue-500 mt-1.5 text-sm flex-shrink-0">●</span>
                                        <span className="flex-1">{children}</span>
                                    </li>
                                ),
                                // 코드
                                code: ({ children, className }) => {
                                    const isInline = !className
                                    if (isInline) {
                                        return (
                                            <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[13px] font-mono text-emerald-600 dark:text-emerald-400">
                                                {children}
                                            </code>
                                        )
                                    }
                                    return (
                                        <code className="text-zinc-100 text-sm font-mono">
                                            {children}
                                        </code>
                                    )
                                },
                                pre: ({ children }) => (
                                    <pre className="bg-zinc-900 text-zinc-100 rounded-xl p-4 my-6 overflow-x-auto border border-zinc-800">
                                        {children}
                                    </pre>
                                ),
                                // 링크
                                a: ({ children, href }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 inline-flex items-center gap-1"
                                    >
                                        {children}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ),
                                // 구분선
                                hr: () => (
                                    <hr className="my-8 border-zinc-200 dark:border-zinc-700" />
                                ),
                                // 인용문
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-zinc-500 dark:text-zinc-400">
                                        {children}
                                    </blockquote>
                                ),
                                // 테이블
                                table: ({ children }) => (
                                    <div className="overflow-x-auto my-6">
                                        <table className="w-full text-sm border-collapse">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                th: ({ children }) => (
                                    <th className="bg-zinc-100 dark:bg-zinc-800 p-3 text-left font-semibold text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700">
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className="p-3 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                                        {children}
                                    </td>
                                ),
                            }}
                        >
                            {response}
                        </ReactMarkdown>
                    </motion.article>
                )}

                {/* 로딩 중 스켈레톤 - 더 세련되게 */}
                {isLoading && !response && (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="h-4 rounded-full bg-zinc-100 dark:bg-zinc-800"
                                style={{ width: `${85 - i * 15}%` }}
                            />
                        ))}
                    </div>
                )}

                {/* 하단 액션 - 미니멀 */}
                {response && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4"
                    >
                        <button
                            onClick={onNewSearch}
                            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            새 질문
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <button className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            복사
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

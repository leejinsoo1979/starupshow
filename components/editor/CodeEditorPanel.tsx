"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  GitBranch,
  GitCommit,
  Upload,
  Play,
  Save,
  ChevronDown,
  FileCode,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MonacoCodeEditor, LANGUAGE_OPTIONS } from './MonacoCodeEditor'

interface CodeEditorPanelProps {
  isOpen: boolean
  onClose: () => void
  initialCode?: string
  initialLanguage?: string
  fileName?: string
  onSave?: (code: string, fileName: string, language: string) => void
  onCommit?: (code: string, commitMessage: string, branch: string) => Promise<void>
  onRun?: (code: string) => Promise<string>
}

export function CodeEditorPanel({
  isOpen,
  onClose,
  initialCode = '// 여기에 코드를 작성하세요\n',
  initialLanguage = 'javascript',
  fileName: initialFileName = 'untitled.js',
  onSave,
  onCommit,
  onRun,
}: CodeEditorPanelProps) {
  const [code, setCode] = useState(initialCode)
  const [language, setLanguage] = useState(initialLanguage)
  const [fileName, setFileName] = useState(initialFileName)
  const [branch, setBranch] = useState('main')
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runOutput, setRunOutput] = useState<string | null>(null)
  const [showCommitPanel, setShowCommitPanel] = useState(false)
  const [commitStatus, setCommitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSave = () => {
    onSave?.(code, fileName, language)
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return

    setIsCommitting(true)
    setCommitStatus('idle')

    try {
      await onCommit?.(code, commitMessage, branch)
      setCommitStatus('success')
      setCommitMessage('')
      setTimeout(() => {
        setShowCommitPanel(false)
        setCommitStatus('idle')
      }, 2000)
    } catch {
      setCommitStatus('error')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleRun = async () => {
    setIsRunning(true)
    setRunOutput(null)

    try {
      const output = await onRun?.(code)
      setRunOutput(output || '실행 완료')
    } catch (err) {
      setRunOutput(`에러: ${err instanceof Error ? err.message : '알 수 없는 에러'}`)
    } finally {
      setIsRunning(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-5xl h-[80vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-accent" />
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none border-b border-transparent focus:border-accent"
              />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Branch selector */}
              <div className="flex items-center gap-1 px-2 py-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg">
                <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="text-xs bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="main">main</option>
                  <option value="develop">develop</option>
                  <option value="feature/new">feature/new</option>
                </select>
              </div>

              {/* Action buttons */}
              {onRun && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span className="ml-1.5">실행</span>
                </Button>
              )}

              {onSave && (
                <Button size="sm" variant="ghost" onClick={handleSave}>
                  <Save className="w-4 h-4" />
                  <span className="ml-1.5">저장</span>
                </Button>
              )}

              {onCommit && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowCommitPanel(!showCommitPanel)}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Upload className="w-4 h-4" />
                  <span className="ml-1.5">커밋 & 푸시</span>
                </Button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Commit Panel */}
          <AnimatePresence>
            {showCommitPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <GitCommit className="w-5 h-5 text-accent mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="커밋 메시지를 입력하세요 (예: feat: 새 기능 추가)"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">
                          브랜치: <span className="font-medium text-accent">{branch}</span> → GitHub
                        </p>
                        <Button
                          size="sm"
                          onClick={handleCommit}
                          disabled={isCommitting || !commitMessage.trim()}
                          className="bg-accent hover:bg-accent/90"
                        >
                          {isCommitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : commitStatus === 'success' ? (
                            <Check className="w-4 h-4" />
                          ) : commitStatus === 'error' ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span className="ml-1.5">
                            {commitStatus === 'success' ? '완료!' : commitStatus === 'error' ? '실패' : '푸시'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <MonacoCodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="100%"
              minimap={true}
            />
          </div>

          {/* Output Panel */}
          {runOutput && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              className="border-t border-zinc-200 dark:border-zinc-700"
            >
              <div className="p-3 bg-zinc-900 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-500">출력</span>
                </div>
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {runOutput}
                </pre>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

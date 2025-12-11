"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Loader2 } from 'lucide-react'

// Monaco Editor는 클라이언트에서만 로드
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-zinc-900">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  ),
})

interface MonacoCodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  height?: string | number
  readOnly?: boolean
  minimap?: boolean
  lineNumbers?: boolean
  className?: string
}

export function MonacoCodeEditor({
  value,
  onChange,
  language = 'javascript',
  height = '300px',
  readOnly = false,
  minimap = false,
  lineNumbers = true,
  className = '',
}: MonacoCodeEditorProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={`bg-zinc-900 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div className={`overflow-hidden rounded-lg border border-zinc-700 ${className}`}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange(val || '')}
        theme={isDark ? 'vs-dark' : 'light'}
        options={{
          readOnly,
          minimap: { enabled: minimap },
          lineNumbers: lineNumbers ? 'on' : 'off',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          tabSize: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          overviewRulerBorder: false,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  )
}

// 언어 선택을 위한 옵션
export const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'yaml', label: 'YAML' },
  { value: 'shell', label: 'Shell' },
]

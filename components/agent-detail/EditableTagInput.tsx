'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableTagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder: string
  color: string
  isDark: boolean
}

export function EditableTagInput({
  tags,
  onChange,
  placeholder,
  color,
  isDark,
}: EditableTagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      if (!tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()])
      }
      setInputValue('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="px-3 py-1 rounded-lg text-sm flex items-center gap-1"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm border',
          isDark
            ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500'
            : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
        )}
      />
    </div>
  )
}

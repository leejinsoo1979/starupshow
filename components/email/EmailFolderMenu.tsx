'use client'

import {
  Inbox,
  Star,
  Send,
  Trash2,
  Mail,
  Clock,
  Paperclip,
  FileEdit,
  MailWarning,
  RefreshCw,
  PenSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'
import type { EmailAccount, EmailMessage } from '@/types/email'

type Folder = 'inbox' | 'starred' | 'sent' | 'trash' | 'spam' | 'drafts' | 'all' | 'scheduled' | 'attachments'

interface EmailFolderMenuProps {
  accounts: EmailAccount[]
  selectedAccount: EmailAccount | null
  onAccountChange: (account: EmailAccount) => void
  onAddAccount: () => void
  allEmails: EmailMessage[]
  currentFolder: Folder
  onFolderChange: (folder: Folder) => void
  onCompose: () => void
  onSync: () => void
  isSyncing: boolean
}

const folderConfig: { id: Folder; label: string; icon: any }[] = [
  { id: 'inbox', label: '받은메일', icon: Inbox },
  { id: 'starred', label: '중요메일', icon: Star },
  { id: 'sent', label: '보낸메일', icon: Send },
  { id: 'drafts', label: '임시보관함', icon: FileEdit },
  { id: 'spam', label: '스팸', icon: MailWarning },
  { id: 'trash', label: '휴지통', icon: Trash2 },
  { id: 'all', label: '전체메일', icon: Mail },
  { id: 'attachments', label: '첨부파일', icon: Paperclip },
  { id: 'scheduled', label: '예약메일', icon: Clock },
]

export function EmailFolderMenu({
  allEmails,
  currentFolder,
  onFolderChange,
  onCompose,
  onSync,
  isSyncing,
  selectedAccount,
}: EmailFolderMenuProps) {
  const { accentColor } = useThemeStore()

  // Email counts
  const getCounts = () => {
    const inboxCount = allEmails.filter((e) => !e.is_trash && !e.is_sent && !(e as any).is_spam && !(e as any).is_draft).length
    const unreadCount = allEmails.filter((e) => !e.is_read && !e.is_trash && !e.is_sent).length
    const starredCount = allEmails.filter((e) => e.is_starred && !e.is_trash).length
    const sentCount = allEmails.filter((e) => e.is_sent && !e.is_trash).length
    const draftsCount = allEmails.filter((e) => (e as any).is_draft && !e.is_trash).length
    const spamCount = allEmails.filter((e) => (e as any).is_spam && !e.is_trash).length
    const trashCount = allEmails.filter((e) => e.is_trash).length
    const allCount = allEmails.filter((e) => !e.is_trash).length
    const attachmentCount = allEmails.filter((e) => e.has_attachments && !e.is_trash).length
    const scheduledCount = allEmails.filter((e) => (e as any).is_scheduled && !e.is_trash).length

    return { inbox: inboxCount, unread: unreadCount, starred: starredCount, sent: sentCount, drafts: draftsCount, spam: spamCount, trash: trashCount, all: allCount, attachments: attachmentCount, scheduled: scheduledCount }
  }

  const counts = getCounts()

  const getAccentClasses = () => {
    switch (accentColor) {
      case 'purple': return { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', light: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' }
      case 'blue': return { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' }
      case 'green': return { bg: 'bg-green-500', hover: 'hover:bg-green-600', light: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400' }
      case 'orange': return { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', light: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' }
      case 'pink': return { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', light: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' }
      case 'red': return { bg: 'bg-red-500', hover: 'hover:bg-red-600', light: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' }
      case 'yellow': return { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', light: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' }
      case 'cyan': return { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', light: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' }
      default: return { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' }
    }
  }

  const accent = getAccentClasses()

  return (
    <div className="h-full flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
      {/* Header */}
      <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-zinc-900 dark:text-white text-sm">메일</h2>
          <button
            onClick={onSync}
            disabled={isSyncing || !selectedAccount}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            title="동기화"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          </button>
        </div>

        {/* Compose Button */}
        <button
          onClick={onCompose}
          disabled={!selectedAccount}
          className={cn(
            "w-full px-3 py-2 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2 text-sm",
            selectedAccount
              ? cn(accent.bg, accent.hover)
              : "bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed"
          )}
        >
          <PenSquare className="w-4 h-4" />
          메일 쓰기
        </button>
      </div>

      {/* Folder List */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {folderConfig.map((folder) => {
          const Icon = folder.icon
          const isActive = currentFolder === folder.id
          const count = counts[folder.id as keyof typeof counts] || 0
          const showCount = folder.id === 'inbox' ? counts.unread : count

          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? cn(accent.bg, "text-white")
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{folder.label}</span>
              {showCount > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-xs min-w-[20px] text-center",
                  isActive
                    ? "bg-white/20"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                )}>
                  {showCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

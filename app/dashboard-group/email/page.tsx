'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Plus,
  Inbox,
  Star,
  Send,
  Trash2,
  RefreshCw,
  Sparkles,
  Loader2,
  X,
  Paperclip,
  Reply,
  Forward,
  ArrowLeft,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'
import { Button } from '@/components/ui/Button'
import { EmailAccountModal, EmailAccountFormData } from '@/components/email/EmailAccountModal'
import { EmailFolderMenu } from '@/components/email/EmailFolderMenu'
import type { EmailAccount, EmailMessage } from '@/types/email'

type Folder = 'inbox' | 'starred' | 'sent' | 'trash' | 'spam' | 'drafts' | 'all' | 'scheduled' | 'attachments'

const folderLabels: Record<Folder, string> = {
  inbox: '받은메일',
  starred: '중요메일',
  sent: '보낸메일',
  trash: '휴지통',
  spam: '스팸',
  drafts: '임시보관함',
  all: '전체메일',
  scheduled: '예약메일',
  attachments: '첨부파일',
}

export default function EmailPage() {
  const searchParams = useSearchParams()
  const { accentColor } = useThemeStore()
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null)
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [allEmails, setAllEmails] = useState<EmailMessage[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)

  // Get folder from URL params or state
  const folderParam = searchParams.get('folder') as Folder | null
  const [currentFolder, setCurrentFolder] = useState<Folder>(folderParam || 'inbox')
  const actionParam = searchParams.get('action')

  // Update folder from URL params
  useEffect(() => {
    if (folderParam && folderParam !== currentFolder) {
      setCurrentFolder(folderParam)
    }
  }, [folderParam])

  const [isAddModalOpen, setIsAddModalOpen] = useState(actionParam === 'add-account')
  const [isComposeOpen, setIsComposeOpen] = useState(actionParam === 'compose')
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)

  // Compose email state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')

  // Email counts
  const unreadCount = allEmails.filter((e) => !e.is_read && !e.is_trash && !e.is_sent).length

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

  // Handle action params
  useEffect(() => {
    if (actionParam === 'add-account') {
      setIsAddModalOpen(true)
    } else if (actionParam === 'compose') {
      setIsComposeOpen(true)
    }
  }, [actionParam])

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/email/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
        if (data.length > 0 && !selectedAccount) {
          setSelectedAccount(data[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }, [selectedAccount])

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    if (!selectedAccount) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/email/messages?account_id=${selectedAccount.id}`)
      if (res.ok) {
        let data = await res.json()
        setAllEmails(data)

        // Client-side filtering based on folder
        if (currentFolder === 'starred') {
          data = data.filter((e: EmailMessage) => e.is_starred && !e.is_trash)
        } else if (currentFolder === 'sent') {
          data = data.filter((e: EmailMessage) => e.is_sent && !e.is_trash)
        } else if (currentFolder === 'trash') {
          data = data.filter((e: EmailMessage) => e.is_trash)
        } else if (currentFolder === 'spam') {
          data = data.filter((e: EmailMessage) => (e as any).is_spam && !e.is_trash)
        } else if (currentFolder === 'drafts') {
          data = data.filter((e: EmailMessage) => (e as any).is_draft && !e.is_trash)
        } else if (currentFolder === 'all') {
          data = data.filter((e: EmailMessage) => !e.is_trash)
        } else if (currentFolder === 'attachments') {
          data = data.filter((e: EmailMessage) => e.has_attachments && !e.is_trash)
        } else {
          // inbox
          data = data.filter((e: EmailMessage) => !e.is_trash && !e.is_sent && !(e as any).is_spam && !(e as any).is_draft)
        }

        setEmails(data)
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedAccount, currentFolder])

  // Sync emails
  const syncEmails = async () => {
    if (!selectedAccount) return

    setIsSyncing(true)
    try {
      const res = await fetch('/api/email/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selectedAccount.id }),
      })

      if (res.ok) {
        await fetchEmails()
      }
    } catch (error) {
      console.error('Failed to sync emails:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Add account
  const handleAddAccount = async (data: EmailAccountFormData) => {
    setIsAddingAccount(true)
    try {
      const res = await fetch('/api/email/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const account = await res.json()
        setAccounts([...accounts, account])
        setSelectedAccount(account)
        setIsAddModalOpen(false)

        // Sync emails for new account
        setIsSyncing(true)
        try {
          await fetch('/api/email/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: account.id }),
          })
        } catch (syncError) {
          console.error('Failed to sync emails:', syncError)
        } finally {
          setIsSyncing(false)
        }
      } else {
        const error = await res.json()
        alert(error.error || '계정 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to add account:', error)
      alert('계정 추가에 실패했습니다.')
    } finally {
      setIsAddingAccount(false)
    }
  }

  // Star email
  const handleStar = async (emailId: string, starred: boolean) => {
    try {
      await fetch('/api/email/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: emailId, action: 'star', value: starred }),
      })

      setEmails(emails.map((e) =>
        e.id === emailId ? { ...e, is_starred: starred } : e
      ))
      setAllEmails(allEmails.map((e) =>
        e.id === emailId ? { ...e, is_starred: starred } : e
      ))

      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, is_starred: starred })
      }
    } catch (error) {
      console.error('Failed to star email:', error)
    }
  }

  // Delete email
  const handleDelete = async (emailId: string) => {
    try {
      await fetch('/api/email/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: emailId, action: 'trash' }),
      })

      setEmails(emails.filter((e) => e.id !== emailId))
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null)
      }
    } catch (error) {
      console.error('Failed to delete email:', error)
    }
  }

  // Mark as read
  const handleMarkRead = async (emailId: string, read: boolean) => {
    try {
      await fetch('/api/email/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: emailId, action: 'read', value: read }),
      })

      setEmails(emails.map((e) =>
        e.id === emailId ? { ...e, is_read: read } : e
      ))
      setAllEmails(allEmails.map((e) =>
        e.id === emailId ? { ...e, is_read: read } : e
      ))
    } catch (error) {
      console.error('Failed to mark email:', error)
    }
  }

  // Generate AI reply
  const handleGenerateReply = async (email: EmailMessage) => {
    setIsGeneratingReply(true)
    try {
      const res = await fetch('/api/email/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: email.id }),
      })
      if (res.ok) {
        // Handle response
      }
    } catch (error) {
      console.error('Failed to generate reply:', error)
    } finally {
      setIsGeneratingReply(false)
    }
  }

  // Select email and mark as read
  const handleSelectEmail = (email: EmailMessage) => {
    setSelectedEmail(email)
    if (!email.is_read) {
      handleMarkRead(email.id, true)
    }
  }

  // Send email
  const handleSendEmail = async () => {
    if (!selectedAccount || !composeTo.trim() || !composeSubject.trim()) {
      alert('받는 사람과 제목을 입력해주세요.')
      return
    }

    setIsSending(true)
    try {
      const toAddresses = composeTo.split(',').map(e => {
        const trimmed = e.trim()
        return { email: trimmed, name: trimmed.split('@')[0] }
      })

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          to: toAddresses,
          subject: composeSubject,
          body_text: composeBody,
          body_html: `<p>${composeBody.replace(/\n/g, '<br/>')}</p>`,
        }),
      })

      if (res.ok) {
        alert('이메일이 발송되었습니다.')
        setIsComposeOpen(false)
        setComposeTo('')
        setComposeSubject('')
        setComposeBody('')
      } else {
        const error = await res.json()
        alert(error.error || '이메일 발송에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('이메일 발송에 실패했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  // Handle folder change
  const handleFolderChange = (folder: Folder) => {
    setCurrentFolder(folder)
    setSelectedEmail(null)
  }

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white dark:bg-zinc-900">
      {/* Folder Menu */}
      <div className="w-52 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800">
        <EmailFolderMenu
          accounts={accounts}
          selectedAccount={selectedAccount}
          onAccountChange={setSelectedAccount}
          onAddAccount={() => setIsAddModalOpen(true)}
          allEmails={allEmails}
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          onCompose={() => setIsComposeOpen(true)}
          onSync={syncEmails}
          isSyncing={isSyncing}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            {selectedEmail && (
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              {selectedEmail ? selectedEmail.subject || '(제목 없음)' : folderLabels[currentFolder]}
            </h1>
            {!selectedEmail && unreadCount > 0 && currentFolder === 'inbox' && (
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", accent.light, accent.text)}>
                {unreadCount} 안읽음
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedEmail ? (
              <>
                <button
                  onClick={() => handleStar(selectedEmail.id, !selectedEmail.is_starred)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedEmail.is_starred
                      ? "text-yellow-500 hover:text-yellow-600"
                      : "text-zinc-400 hover:text-yellow-500"
                  )}
                >
                  <Star className={cn("w-5 h-5", selectedEmail.is_starred && "fill-current")} />
                </button>
                <button
                  onClick={() => handleDelete(selectedEmail.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={syncEmails}
                disabled={isSyncing || !selectedAccount}
                className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedEmail ? (
            /* Email Viewer */
            <motion.div
              key="viewer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {/* Email Header */}
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg", accent.bg)}>
                    {(selectedEmail.from_name || selectedEmail.from_address)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {selectedEmail.from_name || selectedEmail.from_address}
                    </p>
                    <p className="text-sm text-zinc-500 truncate">
                      {selectedEmail.from_address}
                    </p>
                  </div>
                  <span className="text-sm text-zinc-400 flex-shrink-0">
                    {new Date(selectedEmail.received_at || selectedEmail.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                {selectedEmail.to_addresses && selectedEmail.to_addresses.length > 0 && (
                  <p className="text-sm text-zinc-500 mt-2">
                    받는 사람: {selectedEmail.to_addresses.map((a) => a.name || a.email).join(', ')}
                  </p>
                )}
              </div>

              {/* AI Summary */}
              {selectedEmail.ai_summary && (
                <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent.light)}>
                      <Bot className={cn("w-4 h-4", accent.text)} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">AI 분석</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">{selectedEmail.ai_summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Body - Always Light Mode */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {selectedEmail.has_attachments && selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mb-4 p-3 bg-zinc-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-sm text-zinc-500">
                      <Paperclip className="w-4 h-4" />
                      <span>첨부파일 ({selectedEmail.attachments.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.attachments.map((att, i) => (
                        <div key={i} className="px-3 py-2 bg-white rounded-lg text-sm text-zinc-700 border border-zinc-200">
                          {att.filename}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEmail.body_html ? (
                  <div
                    className="prose prose-sm max-w-none text-zinc-900"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700">
                    {selectedEmail.body_text}
                  </pre>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
                <button className="flex-1 px-4 py-2.5 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm flex items-center justify-center gap-2">
                  <Reply className="w-4 h-4" />
                  답장
                </button>
                <button className="flex-1 px-4 py-2.5 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm flex items-center justify-center gap-2">
                  <Forward className="w-4 h-4" />
                  전달
                </button>
                <button
                  onClick={() => handleGenerateReply(selectedEmail)}
                  disabled={isGeneratingReply}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-all text-sm flex items-center justify-center gap-2",
                    accent.bg, accent.hover,
                    "disabled:opacity-50"
                  )}
                >
                  {isGeneratingReply ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  AI 답장
                </button>
              </div>
            </motion.div>
          ) : (
            /* Email List */
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto"
            >
              {!selectedAccount ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8">
                  <Mail className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-center mb-4">이메일 계정을 추가하여 시작하세요</p>
                  <Button
                    variant="accent"
                    size="md"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    계정 추가
                  </Button>
                </div>
              ) : isLoading || isSyncing ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8">
                  <Inbox className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">이메일이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
                        !email.is_read && "bg-zinc-50 dark:bg-zinc-800/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0",
                          email.is_read ? "bg-zinc-400" : accent.bg
                        )}>
                          {(email.from_name || email.from_address)[0].toUpperCase()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={cn(
                              "truncate",
                              email.is_read
                                ? "text-zinc-600 dark:text-zinc-400"
                                : "text-zinc-900 dark:text-white font-semibold"
                            )}>
                              {email.from_name || email.from_address}
                            </span>
                            <span className="text-xs text-zinc-400 flex-shrink-0">
                              {formatDate(email.received_at || email.created_at)}
                            </span>
                          </div>
                          <p className={cn(
                            "text-sm truncate",
                            email.is_read
                              ? "text-zinc-500 dark:text-zinc-500"
                              : "text-zinc-800 dark:text-zinc-200"
                          )}>
                            {email.subject || '(제목 없음)'}
                          </p>
                          {email.body_text && (
                            <p className="text-xs text-zinc-400 truncate mt-1">
                              {email.body_text.slice(0, 100)}
                            </p>
                          )}
                        </div>

                        {/* Indicators */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {email.is_starred && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          {email.has_attachments && (
                            <Paperclip className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Add Account Modal */}
      <EmailAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAccount}
        isLoading={isAddingAccount}
      />

      {/* Compose Email Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsComposeOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">새 메일</h2>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    보내는 사람
                  </label>
                  <input
                    type="text"
                    value={selectedAccount?.email_address || ''}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-500 dark:text-zinc-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    받는 사람 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="이메일 주소 (여러 명은 쉼표로 구분)"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="메일 제목"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    내용
                  </label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="메일 내용을 입력하세요..."
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setIsComposeOpen(false)}
                >
                  취소
                </Button>
                <Button
                  variant="accent"
                  size="md"
                  leftIcon={isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  onClick={handleSendEmail}
                  disabled={isSending || !composeTo.trim() || !composeSubject.trim()}
                >
                  {isSending ? '발송 중...' : '보내기'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

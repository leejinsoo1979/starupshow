'use client'

import React, { useState, useCallback } from 'react'
import {
  FileText, Send, CheckCircle, XCircle, Clock, AlertTriangle,
  Plus, Search, ChevronRight, User, Calendar, Paperclip,
  ArrowRight, FileCheck, Loader2, RefreshCw, Eye
} from 'lucide-react'
import { useApprovalDocuments, useApprovalTemplates, useApprovalStats, useEmployees } from '@/lib/erp/hooks'
import { PageHeader, StatCard, StatGrid, StatusBadge } from './shared'
import type { ApprovalDocumentStatus, ApprovalCategory } from '@/lib/erp/types'
import { useThemeStore, accentColors } from '@/stores/themeStore'

type TabType = 'inbox' | 'sent' | 'drafts' | 'completed'

export function ApprovalPage() {
  const { accentColor } = useThemeStore()
  const themeColor = accentColors.find(c => c.id === accentColor)?.color || '#3b82f6'

  const [activeTab, setActiveTab] = useState<TabType>('inbox')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 새 결재 모달 상태
  const [newDoc, setNewDoc] = useState({
    template_id: '',
    title: '',
    content: '',
    is_urgent: false,
    approval_lines: [] as { approver_id: string; approval_type: string }[],
  })

  // 데이터 조회
  const { data: employees } = useEmployees({ limit: '1000' })
  const { data: templates, loading: templatesLoading } = useApprovalTemplates()
  const { data: statsData, loading: statsLoading, refresh: refreshStats } = useApprovalStats(employees?.[0]?.id)

  // 현재 탭에 따른 문서 조회
  const documentParams: Record<string, string> = {
    tab: activeTab,
    employee_id: employees?.[0]?.id || '',
  }
  if (search) documentParams.search = search
  if (categoryFilter !== 'all') documentParams.category = categoryFilter

  const {
    data: documents,
    loading: documentsLoading,
    refresh: refreshDocuments,
  } = useApprovalDocuments(documentParams)

  // 통계
  const stats = {
    inbox: statsData?.inbox || 0,
    sent: statsData?.sent || 0,
    drafts: statsData?.drafts || 0,
    completed: statsData?.completed || 0,
  }

  const handleCreateDocument = useCallback(async (saveAsDraft = false) => {
    if (!newDoc.title.trim()) {
      setSubmitMessage({ type: 'error', text: '제목을 입력해주세요.' })
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const response = await fetch('/api/erp/approval/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDoc,
          drafter_id: employees?.[0]?.id,
          form_data: {},
          save_as_draft: saveAsDraft,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '결재 문서 생성에 실패했습니다.')
      }

      setSubmitMessage({
        type: 'success',
        text: saveAsDraft ? '임시저장되었습니다.' : '상신되었습니다.',
      })

      setShowNewModal(false)
      setNewDoc({ template_id: '', title: '', content: '', is_urgent: false, approval_lines: [] })
      refreshDocuments()
      refreshStats()
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [newDoc, employees, refreshDocuments, refreshStats])

  const handleApprovalAction = useCallback(async (documentId: string, action: 'approve' | 'reject') => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/erp/approval/documents/${documentId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approver_id: employees?.[0]?.id,
          comment: '',
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '처리에 실패했습니다.')
      }

      setSubmitMessage({ type: 'success', text: result.data?.message || '처리되었습니다.' })
      setSelectedDocument(null)
      refreshDocuments()
      refreshStats()
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [employees, refreshDocuments, refreshStats])

  const getStatusInfo = (status: ApprovalDocumentStatus) => {
    switch (status) {
      case 'draft': return { label: '임시저장', color: 'default', icon: FileText }
      case 'pending': return { label: '결재중', color: 'warning', icon: Clock }
      case 'approved': return { label: '승인', color: 'success', icon: CheckCircle }
      case 'rejected': return { label: '반려', color: 'error', icon: XCircle }
      case 'cancelled': return { label: '취소', color: 'default', icon: XCircle }
      default: return { label: status, color: 'default', icon: FileText }
    }
  }

  const getCategoryLabel = (category: ApprovalCategory) => {
    switch (category) {
      case 'leave': return '휴가'
      case 'expense': return '경비'
      case 'purchase': return '구매'
      case 'general': return '일반'
      case 'hr': return '인사'
      default: return category
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'leave': return Calendar
      case 'expense': return FileText
      case 'purchase': return FileCheck
      default: return FileText
    }
  }

  const getInitials = (name: string) => name?.slice(0, 2) || '?'

  const tabs: { id: TabType; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'inbox', label: '결재함', icon: FileText, count: stats.inbox },
    { id: 'sent', label: '상신함', icon: Send, count: stats.sent },
    { id: 'drafts', label: '임시저장', icon: FileText, count: stats.drafts },
    { id: 'completed', label: '완료함', icon: CheckCircle, count: stats.completed },
  ]

  const isLoading = templatesLoading || statsLoading || documentsLoading

  return (
    <div className="space-y-6">
      <PageHeader
        title="전자결재"
        subtitle="결재 문서를 작성하고 승인합니다"
        icon={FileText}
        onAdd={() => setShowNewModal(true)}
        addLabel="새 결재"
      />

      {/* 알림 메시지 */}
      {submitMessage && (
        <div
          className="p-4 rounded-lg text-sm"
          style={submitMessage.type === 'success'
            ? { backgroundColor: `${themeColor}15`, color: themeColor }
            : { backgroundColor: 'rgb(239 68 68 / 0.1)', color: 'rgb(239 68 68)' }
          }
        >
          {submitMessage.text}
        </div>
      )}

      {/* 통계 카드 */}
      <StatGrid columns={4}>
        <StatCard
          title="결재 대기"
          value={stats.inbox}
          icon={Clock}
          iconColor="text-yellow-500"
        />
        <StatCard
          title="상신 문서"
          value={stats.sent}
          icon={Send}
          iconColor="text-blue-500"
        />
        <StatCard
          title="임시저장"
          value={stats.drafts}
          icon={FileText}
          iconColor="text-gray-500"
        />
        <StatCard
          title="완료"
          value={stats.completed}
          icon={CheckCircle}
          iconColor="text-accent"
        />
      </StatGrid>

      <div className="flex gap-6">
        {/* 사이드바 */}
        <div className="w-64 space-y-4">
          {/* 탭 메뉴 */}
          <div className="bg-theme-card border border-theme rounded-xl p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent text-white'
                    : 'text-theme hover:bg-theme-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
                {tab.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-theme-secondary text-theme-muted'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 새 결재 양식 */}
          <div className="bg-theme-card border border-theme rounded-xl p-4">
            <h3 className="text-sm font-semibold text-theme mb-3">새 결재 작성</h3>
            <div className="space-y-2">
              {templates?.map((template: any) => {
                const Icon = getCategoryIcon(template.category)
                return (
                  <button
                    key={template.id}
                    onClick={() => {
                      setNewDoc(prev => ({ ...prev, template_id: template.id }))
                      setShowNewModal(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-theme hover:bg-theme-secondary rounded-lg transition-colors"
                  >
                    <Icon className="w-4 h-4 text-theme-muted" />
                    <span>{template.name}</span>
                  </button>
                )
              })}
              {(!templates || templates.length === 0) && !templatesLoading && (
                <p className="text-xs text-theme-muted text-center py-2">
                  결재 양식이 없습니다
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1">
          {/* 필터 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                placeholder="문서 제목, 번호로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-theme-input border border-theme rounded-lg text-sm text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-theme-input border border-theme rounded-lg text-sm text-theme cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">전체 분류</option>
              <option value="leave">휴가</option>
              <option value="expense">경비</option>
              <option value="purchase">구매</option>
              <option value="general">일반</option>
            </select>
            <button
              onClick={() => { refreshDocuments(); refreshStats() }}
              className="p-2.5 hover:bg-theme-secondary rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 text-theme-muted ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 문서 목록 */}
          <div className="bg-theme-card border border-theme rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : !documents || documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="w-16 h-16 text-theme-muted mb-4" />
                <h3 className="text-lg font-medium text-theme mb-2">결재 문서가 없습니다</h3>
                <p className="text-sm text-theme-muted">
                  새 결재를 작성하거나 필터를 변경해보세요
                </p>
              </div>
            ) : (
              <div className="divide-y divide-theme">
                {documents.map((doc: any) => {
                  const statusInfo = getStatusInfo(doc.status)

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 hover:bg-theme-secondary/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      {/* 긴급 표시 */}
                      {doc.is_urgent && (
                        <div className="flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                      )}

                      {/* 문서 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-theme-muted">{doc.document_number}</span>
                          {doc.template?.category && (
                            <span className="text-xs px-1.5 py-0.5 bg-theme-secondary text-theme-muted rounded">
                              {getCategoryLabel(doc.template.category)}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-theme truncate">{doc.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-theme-muted">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.drafter?.name || '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {doc.draft_date ? new Date(doc.draft_date).toLocaleDateString('ko-KR') : '-'}
                          </span>
                        </div>
                      </div>

                      {/* 결재 진행 상태 */}
                      <div className="flex items-center gap-3">
                        {doc.status === 'pending' && doc.current_approver && (
                          <div className="text-right">
                            <p className="text-xs text-theme-muted">현재 결재자</p>
                            <p className="text-sm font-medium text-theme">{doc.current_approver.name}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          {doc.total_steps > 0 && Array.from({ length: doc.total_steps }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2 rounded-full ${
                                idx < doc.approval_step
                                  ? doc.status === 'rejected' && idx === doc.approval_step - 1
                                    ? 'bg-red-500'
                                    : ''
                                  : 'bg-theme-secondary'
                              }`}
                              style={
                                idx < doc.approval_step && !(doc.status === 'rejected' && idx === doc.approval_step - 1)
                                  ? { backgroundColor: themeColor }
                                  : undefined
                              }
                            />
                          ))}
                        </div>

                        <StatusBadge status={statusInfo.color} label={statusInfo.label} />

                        <ChevronRight className="w-5 h-5 text-theme-muted" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 문서 상세 모달 */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-theme-card border border-theme rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <div>
                <h2 className="text-xl font-bold text-theme">{selectedDocument.title}</h2>
                <p className="text-sm text-theme-muted mt-1">{selectedDocument.document_number}</p>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-theme-muted" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 문서 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-theme-muted mb-1">기안자</p>
                  <p className="text-sm text-theme">{selectedDocument.drafter?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-theme-muted mb-1">기안일</p>
                  <p className="text-sm text-theme">
                    {selectedDocument.draft_date ? new Date(selectedDocument.draft_date).toLocaleDateString('ko-KR') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-theme-muted mb-1">상태</p>
                  <StatusBadge
                    status={getStatusInfo(selectedDocument.status).color}
                    label={getStatusInfo(selectedDocument.status).label}
                  />
                </div>
                <div>
                  <p className="text-xs text-theme-muted mb-1">분류</p>
                  <p className="text-sm text-theme">
                    {selectedDocument.template?.category ? getCategoryLabel(selectedDocument.template.category) : '-'}
                  </p>
                </div>
              </div>

              {/* 내용 */}
              {selectedDocument.content && (
                <div>
                  <p className="text-xs text-theme-muted mb-2">내용</p>
                  <div className="p-4 bg-theme-secondary rounded-lg text-sm text-theme whitespace-pre-wrap">
                    {selectedDocument.content}
                  </div>
                </div>
              )}

              {/* 결재선 */}
              {selectedDocument.approval_lines && selectedDocument.approval_lines.length > 0 && (
                <div>
                  <p className="text-xs text-theme-muted mb-2">결재선</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {selectedDocument.approval_lines.map((line: any, idx: number) => (
                      <React.Fragment key={line.id}>
                        <div
                          className={`flex-shrink-0 p-3 rounded-lg border ${
                            line.status === 'rejected'
                              ? 'border-red-500 bg-red-500/10'
                              : line.status === 'pending'
                              ? 'border-yellow-500 bg-yellow-500/10'
                              : line.status !== 'approved'
                              ? 'border-theme bg-theme-secondary'
                              : ''
                          }`}
                          style={line.status === 'approved' ? {
                            borderColor: themeColor,
                            backgroundColor: `${themeColor}15`
                          } : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-accent">
                                {getInitials(line.approver?.name || '')}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-theme">{line.approver?.name || '-'}</p>
                              <p className="text-xs text-theme-muted">
                                {line.approval_type === 'approval' ? '결재' : line.approval_type === 'agreement' ? '합의' : '참조'}
                              </p>
                            </div>
                          </div>
                          {line.status !== 'pending' && line.action_date && (
                            <p className="text-xs text-theme-muted mt-2">
                              {new Date(line.action_date).toLocaleString('ko-KR')}
                            </p>
                          )}
                        </div>
                        {idx < selectedDocument.approval_lines.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-theme-muted flex-shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 결재 버튼 (결재함에서만 표시) */}
            {activeTab === 'inbox' && selectedDocument.status === 'pending' && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
                <button
                  onClick={() => handleApprovalAction(selectedDocument.id, 'reject')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  반려
                </button>
                <button
                  onClick={() => handleApprovalAction(selectedDocument.id, 'approve')}
                  disabled={isSubmitting}
                  className="px-4 py-2 disabled:opacity-50 text-white rounded-lg transition-colors hover:brightness-110"
                  style={{ backgroundColor: themeColor }}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '승인'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 새 결재 모달 */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-theme-card border border-theme rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <h2 className="text-xl font-bold text-theme">새 결재 작성</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-theme-muted" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 양식 선택 */}
              <div>
                <label className="block text-sm font-medium text-theme mb-2">결재 양식</label>
                <div className="grid grid-cols-2 gap-3">
                  {templates?.map((template: any) => {
                    const Icon = getCategoryIcon(template.category)
                    const isSelected = newDoc.template_id === template.id
                    return (
                      <button
                        key={template.id}
                        onClick={() => setNewDoc(prev => ({ ...prev, template_id: template.id }))}
                        className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${
                          isSelected
                            ? 'border-accent bg-accent/5'
                            : 'border-theme hover:border-accent/50 hover:bg-accent/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent/20' : 'bg-accent/10'}`}>
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <span className="font-medium text-theme">{template.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 긴급 여부 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDoc.is_urgent}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, is_urgent: e.target.checked }))}
                  className="w-4 h-4 rounded border-theme text-accent focus:ring-accent"
                />
                <span className="text-sm text-theme">긴급 문서</span>
              </label>

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-theme mb-2">제목</label>
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="결재 제목을 입력하세요"
                  className="w-full px-4 py-3 bg-theme-input border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-medium text-theme mb-2">내용</label>
                <textarea
                  rows={6}
                  value={newDoc.content}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="결재 내용을 입력하세요"
                  className="w-full px-4 py-3 bg-theme-input border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                />
              </div>

              {/* 결재선 */}
              <div>
                <label className="block text-sm font-medium text-theme mb-2">결재선</label>
                <div className="flex items-center gap-2 p-4 bg-theme-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-theme">{employees?.[0]?.name || '본인'}</p>
                      <p className="text-xs text-theme-muted">기안</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-theme-muted mx-2" />

                  {newDoc.approval_lines.map((line, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex items-center gap-2 p-2 border border-theme rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-accent">
                            {getInitials(employees?.find((e: any) => e.id === line.approver_id)?.name || '')}
                          </span>
                        </div>
                        <span className="text-sm text-theme">
                          {employees?.find((e: any) => e.id === line.approver_id)?.name || '-'}
                        </span>
                        <button
                          onClick={() => setNewDoc(prev => ({
                            ...prev,
                            approval_lines: prev.approval_lines.filter((_, i) => i !== idx)
                          }))}
                          className="text-red-500 hover:text-red-600"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <ArrowRight className="w-4 h-4 text-theme-muted" />
                    </React.Fragment>
                  ))}

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewDoc(prev => ({
                          ...prev,
                          approval_lines: [...prev.approval_lines, { approver_id: e.target.value, approval_type: 'approval' }]
                        }))
                        e.target.value = ''
                      }
                    }}
                    className="px-3 py-2 border border-dashed border-theme rounded-lg text-sm text-theme-muted bg-transparent focus:outline-none focus:border-accent"
                  >
                    <option value="">결재자 추가</option>
                    {employees?.filter((e: any) => e.id !== employees?.[0]?.id && !newDoc.approval_lines.find(l => l.approver_id === e.id)).map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.position?.name || '-'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 첨부파일 */}
              <div>
                <label className="block text-sm font-medium text-theme mb-2">첨부파일</label>
                <div className="flex items-center justify-center p-8 border border-dashed border-theme rounded-lg hover:border-accent transition-colors cursor-pointer">
                  <div className="text-center">
                    <Paperclip className="w-8 h-8 text-theme-muted mx-auto mb-2" />
                    <p className="text-sm text-theme-muted">파일을 드래그하거나 클릭하여 첨부</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-theme-muted hover:text-theme hover:bg-theme-secondary rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleCreateDocument(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-theme-secondary text-theme rounded-lg hover:bg-theme-secondary/80 disabled:opacity-50 transition-colors"
              >
                임시저장
              </button>
              <button
                onClick={() => handleCreateDocument(false)}
                disabled={isSubmitting || newDoc.approval_lines.length === 0}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '상신'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

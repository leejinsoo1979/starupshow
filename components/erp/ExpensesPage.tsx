'use client'

import React, { useState } from 'react'
import { CreditCard, Eye, Check, X, FileText, Upload, Receipt } from 'lucide-react'
import { useExpenses, useExpenseCategories, useCorporateCards, useEmployees, useMutation } from '@/lib/erp/hooks'
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FormModal,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  FormRow,
  StatCard,
  StatGrid,
} from './shared'

export function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<any>({
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    amount: 0,
  })

  const { data: expenses, loading, pagination, setPage, updateParams, refresh } = useExpenses({
    status: statusFilter,
  })
  const { data: categories } = useExpenseCategories(true)
  const { data: cards } = useCorporateCards()
  const { data: employeesData } = useEmployees()
  const { loading: saving, create, mutate } = useMutation('/api/erp/expenses')

  const employees = employeesData || []

  const handleSearch = (value: string) => {
    setSearch(value)
  }

  const handleAdd = () => {
    setFormData({
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      amount: 0,
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      await create(formData)
      setShowModal(false)
      refresh()
    } catch (error) {
      console.error('Create error:', error)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await mutate('PUT', { action: 'approve' }, id)
      refresh()
    } catch (error) {
      console.error('Approve error:', error)
    }
  }

  const handleReject = async (id: string, reason: string) => {
    try {
      await mutate('PUT', { action: 'reject', rejection_reason: reason }, id)
      refresh()
    } catch (error) {
      console.error('Reject error:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  // Calculate totals
  const pendingCount = expenses.filter((e: any) => e.status === 'pending').length
  const approvedAmount = expenses
    .filter((e: any) => e.status === 'approved' || e.status === 'reimbursed')
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

  const columns = [
    {
      key: 'request_number',
      header: '신청번호',
      width: '130px',
    },
    {
      key: 'expense_date',
      header: '지출일',
      width: '100px',
    },
    {
      key: 'employee',
      header: '신청자',
      render: (item: any) => (
        <div>
          <div className="text-sm text-white">{item.employee?.name}</div>
          <div className="text-xs text-zinc-500">{item.employee?.department?.name}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: '분류',
      render: (item: any) => item.category?.name || '-',
    },
    {
      key: 'merchant_name',
      header: '사용처',
    },
    {
      key: 'amount',
      header: '금액',
      render: (item: any) => (
        <span className="font-medium text-white">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'payment_method',
      header: '결제수단',
      render: (item: any) => {
        const labels: Record<string, string> = {
          cash: '현금',
          corporate_card: '법인카드',
          personal_card: '개인카드',
        }
        return labels[item.payment_method] || item.payment_method
      },
    },
    {
      key: 'status',
      header: '상태',
      render: (item: any) => (
        <StatusBadge status={item.status} label="" />
      ),
    },
  ]

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <PageHeader
        title="경비 관리"
        subtitle="경비 신청 및 정산 관리"
        icon={CreditCard}
        onAdd={handleAdd}
        addLabel="경비 신청"
      />

      {/* Stats */}
      <div className="px-6 py-4">
        <StatGrid columns={4}>
          <StatCard
            title="총 신청 건수"
            value={pagination.total}
            icon={FileText}
            loading={loading}
          />
          <StatCard
            title="승인 대기"
            value={pendingCount}
            icon={Receipt}
            iconColor="text-yellow-500"
            loading={loading}
          />
          <StatCard
            title="이번 달 승인 금액"
            value={formatCurrency(approvedAmount)}
            icon={CreditCard}
            iconColor="text-green-500"
            loading={loading}
          />
          <StatCard
            title="정산 완료"
            value={expenses.filter((e: any) => e.status === 'reimbursed').length}
            icon={Check}
            iconColor="text-blue-500"
            loading={loading}
          />
        </StatGrid>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex items-center gap-3">
        <FormSelect
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            updateParams({ status: e.target.value })
          }}
          options={[
            { value: 'pending', label: '대기' },
            { value: 'approved', label: '승인' },
            { value: 'rejected', label: '반려' },
            { value: 'reimbursed', label: '정산완료' },
          ]}
          placeholder="상태 전체"
          className="w-32"
        />
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6">
        <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={expenses}
            loading={loading}
            emptyMessage="등록된 경비 신청이 없습니다."
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={handleSearch}
            searchPlaceholder="신청번호, 사용처 검색..."
            rowActions={(item: any) => (
              <div className="flex items-center gap-1">
                <button className="p-1 text-zinc-400 hover:text-white">
                  <Eye className="w-4 h-4" />
                </button>
                {item.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="p-1 text-zinc-400 hover:text-green-400"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('반려 사유를 입력하세요:')
                        if (reason) handleReject(item.id, reason)
                      }}
                      className="p-1 text-zinc-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Create Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="경비 신청"
        onSubmit={handleSubmit}
        loading={saving}
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <FormRow>
              <FormField label="신청자" required>
                <FormSelect
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData((f: any) => ({ ...f, employee_id: e.target.value }))}
                  options={employees?.map((e: any) => ({ value: e.id, label: e.name })) || []}
                  placeholder="신청자 선택"
                />
              </FormField>
              <FormField label="지출일" required>
                <FormInput
                  type="date"
                  value={formData.expense_date || ''}
                  onChange={(e) => setFormData((f: any) => ({ ...f, expense_date: e.target.value }))}
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="분류">
                <FormSelect
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData((f: any) => ({ ...f, category_id: e.target.value }))}
                  options={categories?.map((c: any) => ({ value: c.id, label: c.name })) || []}
                  placeholder="분류 선택"
                />
              </FormField>
              <FormField label="금액" required>
                <FormInput
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData((f: any) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="결제수단">
                <FormSelect
                  value={formData.payment_method || 'cash'}
                  onChange={(e) => setFormData((f: any) => ({ ...f, payment_method: e.target.value }))}
                  options={[
                    { value: 'cash', label: '현금' },
                    { value: 'corporate_card', label: '법인카드' },
                    { value: 'personal_card', label: '개인카드' },
                  ]}
                />
              </FormField>
              {formData.payment_method === 'corporate_card' && (
                <FormField label="법인카드">
                  <FormSelect
                    value={formData.corporate_card_id || ''}
                    onChange={(e) => setFormData((f: any) => ({ ...f, corporate_card_id: e.target.value }))}
                    options={cards?.map((c: any) => ({ value: c.id, label: c.card_name })) || []}
                    placeholder="카드 선택"
                  />
                </FormField>
              )}
            </FormRow>

            <FormField label="사용처">
              <FormInput
                value={formData.merchant_name || ''}
                onChange={(e) => setFormData((f: any) => ({ ...f, merchant_name: e.target.value }))}
                placeholder="사용처 입력"
              />
            </FormField>

            <FormField label="내용">
              <FormTextarea
                value={formData.description || ''}
                onChange={(e) => setFormData((f: any) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="경비 사용 내용"
              />
            </FormField>
          </div>

          {/* Receipt Upload */}
          <div className="pt-4 border-t border-zinc-800">
            <FormField label="영수증">
              <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700 rounded-lg hover:border-purple-500 cursor-pointer transition-colors">
                <div className="flex flex-col items-center text-zinc-500">
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-sm">영수증 업로드</span>
                </div>
              </div>
            </FormField>
          </div>
        </div>
      </FormModal>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { Receipt, TrendingUp, TrendingDown, Eye, Edit, X, Plus, DollarSign } from 'lucide-react'
import { useTransactions, usePartners, useProducts, useMutation } from '@/lib/erp/hooks'
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

interface TransactionItem {
  product_id?: string
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  tax_type: string
}

export function TransactionsPage() {
  const [transactionType, setTransactionType] = useState<'sales' | 'purchase'>('sales')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<any>({
    transaction_type: 'sales',
    transaction_date: new Date().toISOString().split('T')[0],
    items: [{ product_name: '', quantity: 1, unit: 'EA', unit_price: 0, tax_type: 'taxable' }],
  })

  const { data: transactions, loading, pagination, setPage, updateParams, refresh } = useTransactions({
    type: transactionType,
    search,
  })
  const { data: partners } = usePartners({ partner_type: transactionType === 'sales' ? 'customer' : 'vendor' })
  const { data: products } = useProducts()
  const { loading: saving, create } = useMutation('/api/erp/transactions')

  const handleSearch = (value: string) => {
    setSearch(value)
    updateParams({ search: value })
  }

  const handleTypeChange = (type: 'sales' | 'purchase') => {
    setTransactionType(type)
    updateParams({ type })
  }

  const handleAdd = () => {
    setFormData({
      transaction_type: transactionType,
      transaction_date: new Date().toISOString().split('T')[0],
      items: [{ product_name: '', quantity: 1, unit: 'EA', unit_price: 0, tax_type: 'taxable' }],
    })
    setShowModal(true)
  }

  const handleAddItem = () => {
    setFormData((f: any) => ({
      ...f,
      items: [...f.items, { product_name: '', quantity: 1, unit: 'EA', unit_price: 0, tax_type: 'taxable' }],
    }))
  }

  const handleRemoveItem = (index: number) => {
    setFormData((f: any) => ({
      ...f,
      items: f.items.filter((_: any, i: number) => i !== index),
    }))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData((f: any) => ({
      ...f,
      items: f.items.map((item: any, i: number) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  // Calculate totals
  const totalAmount = transactions.reduce((sum: number, t: any) => sum + (t.total_amount || 0), 0)
  const unpaidAmount = transactions
    .filter((t: any) => t.payment_status !== 'paid')
    .reduce((sum: number, t: any) => sum + (t.total_amount - t.paid_amount), 0)

  const columns = [
    {
      key: 'transaction_number',
      header: '거래번호',
      width: '140px',
    },
    {
      key: 'transaction_date',
      header: '거래일',
      width: '100px',
    },
    {
      key: 'partner',
      header: '거래처',
      render: (item: any) => item.partner?.name || item.partner_name || '-',
    },
    {
      key: 'supply_amount',
      header: '공급가액',
      render: (item: any) => formatCurrency(item.supply_amount),
    },
    {
      key: 'tax_amount',
      header: '부가세',
      render: (item: any) => formatCurrency(item.tax_amount),
    },
    {
      key: 'total_amount',
      header: '합계금액',
      render: (item: any) => (
        <span className="font-medium text-white">{formatCurrency(item.total_amount)}</span>
      ),
    },
    {
      key: 'payment_status',
      header: '결제상태',
      render: (item: any) => (
        <StatusBadge status={item.payment_status} label="" />
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (item: any) => (
        <StatusBadge status={item.status} label="" />
      ),
    },
  ]

  const itemTotal = formData.items?.reduce((sum: number, item: TransactionItem) => {
    const supply = item.quantity * item.unit_price
    const tax = item.tax_type === 'taxable' ? Math.round(supply * 0.1) : 0
    return sum + supply + tax
  }, 0) || 0

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <PageHeader
        title={transactionType === 'sales' ? '매출 관리' : '매입 관리'}
        subtitle="거래 내역 조회 및 등록"
        icon={Receipt}
        onAdd={handleAdd}
        addLabel={transactionType === 'sales' ? '매출 등록' : '매입 등록'}
        onExport={() => {}}
      />

      {/* Stats */}
      <div className="px-6 py-4">
        <StatGrid columns={4}>
          <StatCard
            title="총 거래 건수"
            value={pagination.total}
            icon={Receipt}
            loading={loading}
          />
          <StatCard
            title="총 거래 금액"
            value={formatCurrency(totalAmount)}
            icon={transactionType === 'sales' ? TrendingUp : TrendingDown}
            iconColor={transactionType === 'sales' ? 'text-green-500' : 'text-orange-500'}
            loading={loading}
          />
          <StatCard
            title={transactionType === 'sales' ? '미수금' : '미지급금'}
            value={formatCurrency(unpaidAmount)}
            icon={DollarSign}
            iconColor="text-yellow-500"
            loading={loading}
          />
          <StatCard
            title="결제 완료"
            value={transactions.filter((t: any) => t.payment_status === 'paid').length}
            icon={Receipt}
            iconColor="text-blue-500"
            loading={loading}
          />
        </StatGrid>
      </div>

      {/* Type Toggle */}
      <div className="px-6 pb-4 flex items-center gap-2">
        <button
          onClick={() => handleTypeChange('sales')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${transactionType === 'sales' ? 'bg-green-500/20 text-green-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
        >
          <TrendingUp className="w-4 h-4 inline-block mr-2" />
          매출
        </button>
        <button
          onClick={() => handleTypeChange('purchase')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${transactionType === 'purchase' ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
        >
          <TrendingDown className="w-4 h-4 inline-block mr-2" />
          매입
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6">
        <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={transactions}
            loading={loading}
            emptyMessage="등록된 거래가 없습니다."
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={handleSearch}
            searchPlaceholder="거래번호, 거래처 검색..."
            rowActions={(item: any) => (
              <div className="flex items-center gap-1">
                <button className="p-1 text-zinc-400 hover:text-white">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      {/* Create Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={transactionType === 'sales' ? '매출 등록' : '매입 등록'}
        onSubmit={handleSubmit}
        loading={saving}
        size="xl"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <FormRow>
              <FormField label="거래일" required>
                <FormInput
                  type="date"
                  value={formData.transaction_date || ''}
                  onChange={(e) => setFormData((f: any) => ({ ...f, transaction_date: e.target.value }))}
                />
              </FormField>
              <FormField label="거래처">
                <FormSelect
                  value={formData.partner_id || ''}
                  onChange={(e) => setFormData((f: any) => ({ ...f, partner_id: e.target.value }))}
                  options={partners?.map((p: any) => ({ value: p.id, label: p.name })) || []}
                  placeholder="거래처 선택"
                />
              </FormField>
            </FormRow>
          </div>

          {/* Items */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">품목</h3>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
              >
                <Plus className="w-4 h-4" />
                품목 추가
              </button>
            </div>

            <div className="space-y-3">
              {formData.items?.map((item: TransactionItem, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex-1 grid grid-cols-5 gap-3">
                    <FormInput
                      placeholder="품목명"
                      value={item.product_name}
                      onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                    />
                    <FormInput
                      type="number"
                      placeholder="수량"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                    <FormInput
                      placeholder="단위"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    />
                    <FormInput
                      type="number"
                      placeholder="단가"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                    <FormSelect
                      value={item.tax_type}
                      onChange={(e) => handleItemChange(index, 'tax_type', e.target.value)}
                      options={[
                        { value: 'taxable', label: '과세' },
                        { value: 'exempt', label: '면세' },
                        { value: 'zero', label: '영세' },
                      ]}
                    />
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-zinc-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-right">
                <div className="text-sm text-zinc-400">합계금액</div>
                <div className="text-lg font-bold text-white">{formatCurrency(itemTotal)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-4 border-t border-zinc-800">
            <FormField label="비고">
              <FormTextarea
                value={formData.description || ''}
                onChange={(e) => setFormData((f: any) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="비고 사항"
              />
            </FormField>
          </div>
        </div>
      </FormModal>
    </div>
  )
}

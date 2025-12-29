'use client'

import React, { useState } from 'react'
import { Wallet, Plus, Eye, Check, Banknote, FileText, Settings, Loader2 } from 'lucide-react'
import { usePayrollRecords, useMutation, usePayrollSettings } from '@/lib/erp/hooks'
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FormModal,
  FormField,
  FormInput,
  FormSelect,
  FormRow,
  StatCard,
  StatGrid,
} from './shared'

export function PayrollPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [createData, setCreateData] = useState({ year: currentYear, month: new Date().getMonth() + 1 })

  const { data: records, loading, pagination, setPage, refresh } = usePayrollRecords({ year })
  const { data: settings, loading: settingsLoading, refresh: refreshSettings } = usePayrollSettings()
  const { loading: creating, create } = useMutation('/api/erp/payroll')
  const { loading: savingSettings, mutate: saveSettings } = useMutation('/api/erp/payroll-settings')

  const handleCreatePayroll = async () => {
    try {
      await create(createData)
      setShowCreateModal(false)
      refresh()
    } catch (error) {
      console.error('Create error:', error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      await saveSettings('POST', settings)
      setShowSettingsModal(false)
      refreshSettings()
    } catch (error) {
      console.error('Settings save error:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  const columns = [
    {
      key: 'period',
      header: '급여 기간',
      render: (item: any) => `${item.year}년 ${item.month}월`,
    },
    {
      key: 'total_employees',
      header: '대상 인원',
      render: (item: any) => `${item.total_employees}명`,
    },
    {
      key: 'total_earnings',
      header: '총 지급액',
      render: (item: any) => formatCurrency(item.total_earnings),
    },
    {
      key: 'total_deductions',
      header: '총 공제액',
      render: (item: any) => formatCurrency(item.total_deductions),
    },
    {
      key: 'total_net_pay',
      header: '실수령액 합계',
      render: (item: any) => (
        <span className="font-medium text-green-400">{formatCurrency(item.total_net_pay)}</span>
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

  // Calculate totals
  const totalNetPay = records.reduce((sum: number, r: any) => sum + (r.total_net_pay || 0), 0)
  const draftCount = records.filter((r: any) => r.status === 'draft').length
  const confirmedCount = records.filter((r: any) => r.status === 'confirmed').length
  const paidCount = records.filter((r: any) => r.status === 'paid').length

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <PageHeader
        title="급여 관리"
        subtitle="급여 대장 및 명세서 관리"
        icon={Wallet}
        actions={
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            급여 설정
          </button>
        }
        onAdd={() => setShowCreateModal(true)}
        addLabel="급여 생성"
      />

      {/* Stats */}
      <div className="px-6 py-4">
        <StatGrid columns={4}>
          <StatCard
            title={`${year}년 총 지급액`}
            value={formatCurrency(totalNetPay)}
            icon={Wallet}
            loading={loading}
          />
          <StatCard
            title="작성 중"
            value={draftCount}
            icon={FileText}
            iconColor="text-zinc-400"
            loading={loading}
          />
          <StatCard
            title="확정됨"
            value={confirmedCount}
            icon={Check}
            iconColor="text-blue-500"
            loading={loading}
          />
          <StatCard
            title="지급 완료"
            value={paidCount}
            icon={Banknote}
            iconColor="text-green-500"
            loading={loading}
          />
        </StatGrid>
      </div>

      {/* Year Filter */}
      <div className="px-6 pb-4">
        <FormSelect
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={Array.from({ length: 5 }, (_, i) => ({
            value: String(currentYear - i),
            label: `${currentYear - i}년`,
          }))}
          className="w-32"
        />
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6">
        <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={records}
            loading={loading}
            emptyMessage="급여 대장이 없습니다."
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={setPage}
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

      {/* Create Payroll Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="급여 생성"
        onSubmit={handleCreatePayroll}
        loading={creating}
        size="sm"
      >
        <div className="space-y-4">
          <FormRow>
            <FormField label="년도" required>
              <FormSelect
                value={String(createData.year)}
                onChange={(e) => setCreateData(d => ({ ...d, year: parseInt(e.target.value) }))}
                options={Array.from({ length: 3 }, (_, i) => ({
                  value: String(currentYear - i),
                  label: `${currentYear - i}년`,
                }))}
              />
            </FormField>
            <FormField label="월" required>
              <FormSelect
                value={String(createData.month)}
                onChange={(e) => setCreateData(d => ({ ...d, month: parseInt(e.target.value) }))}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1}월`,
                }))}
              />
            </FormField>
          </FormRow>
          <p className="text-sm text-zinc-500">
            해당 월의 근태 정보를 기반으로 급여가 자동 계산됩니다.
          </p>
        </div>
      </FormModal>

      {/* Settings Modal */}
      <FormModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="급여 설정"
        onSubmit={handleSaveSettings}
        loading={savingSettings || settingsLoading}
        size="lg"
      >
        {settings && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400">기본 설정</h3>
              <FormField label="급여 지급일">
                <FormInput
                  type="number"
                  min={1}
                  max={31}
                  value={settings.pay_day || 25}
                  onChange={(e) => {}}
                  placeholder="25"
                />
              </FormField>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400">4대보험 요율 (%)</h3>
              <FormRow>
                <FormField label="국민연금">
                  <FormInput
                    type="number"
                    step="0.01"
                    value={settings.national_pension_rate || 4.5}
                    onChange={(e) => {}}
                  />
                </FormField>
                <FormField label="건강보험">
                  <FormInput
                    type="number"
                    step="0.01"
                    value={settings.health_insurance_rate || 3.545}
                    onChange={(e) => {}}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="장기요양 (건강보험 대비)">
                  <FormInput
                    type="number"
                    step="0.01"
                    value={settings.long_term_care_rate || 12.81}
                    onChange={(e) => {}}
                  />
                </FormField>
                <FormField label="고용보험">
                  <FormInput
                    type="number"
                    step="0.01"
                    value={settings.employment_insurance_rate || 0.9}
                    onChange={(e) => {}}
                  />
                </FormField>
              </FormRow>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400">수당 배율</h3>
              <FormRow cols={3}>
                <FormField label="연장근무">
                  <FormInput
                    type="number"
                    step="0.1"
                    value={settings.overtime_rate || 1.5}
                    onChange={(e) => {}}
                  />
                </FormField>
                <FormField label="야간근무">
                  <FormInput
                    type="number"
                    step="0.1"
                    value={settings.night_rate || 0.5}
                    onChange={(e) => {}}
                  />
                </FormField>
                <FormField label="휴일근무">
                  <FormInput
                    type="number"
                    step="0.1"
                    value={settings.holiday_rate || 1.5}
                    onChange={(e) => {}}
                  />
                </FormField>
              </FormRow>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  )
}

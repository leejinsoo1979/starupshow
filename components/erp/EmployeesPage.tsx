'use client'

import React, { useState } from 'react'
import { Users, MoreVertical, Eye, Edit, UserMinus, Mail, Phone, Building2 } from 'lucide-react'
import { useEmployees, useDepartments, usePositions, useMutation } from '@/lib/erp/hooks'
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
import type { Employee, CreateEmployeeInput } from '@/lib/erp/types'

export function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<Partial<CreateEmployeeInput>>({})

  const { data: employees, loading, pagination, setPage, updateParams, refresh } = useEmployees({
    search,
    ...filters,
  })
  const { data: departments } = useDepartments(true)
  const { data: positions } = usePositions()
  const { loading: saving, create, update, remove } = useMutation<CreateEmployeeInput>('/api/erp/employees')

  const handleSearch = (value: string) => {
    setSearch(value)
    updateParams({ search: value })
  }

  const handleAdd = () => {
    setSelectedEmployee(null)
    setFormData({
      hire_type: 'regular',
      status: 'active',
    })
    setShowModal(true)
  }

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData(employee)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      if (selectedEmployee) {
        await update(selectedEmployee.id, formData as CreateEmployeeInput)
      } else {
        await create(formData as CreateEmployeeInput)
      }
      setShowModal(false)
      refresh()
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`${employee.name} 직원을 퇴사 처리하시겠습니까?`)) return
    try {
      await remove(employee.id)
      refresh()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const activeCount = employees.filter(e => e.status === 'active').length
  const onLeaveCount = employees.filter(e => e.status === 'on_leave').length

  const columns = [
    {
      key: 'employee_number',
      header: '사번',
      width: '100px',
    },
    {
      key: 'name',
      header: '이름',
      render: (item: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-purple-400">
              {item.name?.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-xs text-zinc-500">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'department.name',
      header: '부서',
      render: (item: Employee) => item.department?.name || '-',
    },
    {
      key: 'position.name',
      header: '직급',
      render: (item: Employee) => item.position?.name || '-',
    },
    {
      key: 'hire_date',
      header: '입사일',
      render: (item: Employee) => item.hire_date || '-',
    },
    {
      key: 'hire_type',
      header: '고용형태',
      render: (item: Employee) => {
        const labels: Record<string, string> = {
          regular: '정규직',
          contract: '계약직',
          part_time: '시간제',
          intern: '인턴',
        }
        return labels[item.hire_type] || item.hire_type
      },
    },
    {
      key: 'status',
      header: '상태',
      render: (item: Employee) => (
        <StatusBadge status={item.status} label="" />
      ),
    },
  ]

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <PageHeader
        title="직원 관리"
        subtitle="직원 정보 조회 및 관리"
        icon={Users}
        onAdd={handleAdd}
        addLabel="직원 등록"
        onExport={() => {}}
      />

      {/* Stats */}
      <div className="px-6 py-4">
        <StatGrid columns={4}>
          <StatCard title="전체 직원" value={pagination.total} icon={Users} />
          <StatCard title="재직 중" value={activeCount} icon={Users} iconColor="text-green-500" />
          <StatCard title="휴직 중" value={onLeaveCount} icon={Users} iconColor="text-yellow-500" />
          <StatCard title="이번 달 입사" value={0} icon={Users} iconColor="text-blue-500" />
        </StatGrid>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex items-center gap-3">
        <FormSelect
          value={filters.status || ''}
          onChange={(e) => {
            setFilters(f => ({ ...f, status: e.target.value }))
            updateParams({ status: e.target.value })
          }}
          options={[
            { value: 'active', label: '재직' },
            { value: 'on_leave', label: '휴직' },
            { value: 'resigned', label: '퇴사' },
          ]}
          placeholder="상태 전체"
          className="w-32"
        />
        <FormSelect
          value={filters.department_id || ''}
          onChange={(e) => {
            setFilters(f => ({ ...f, department_id: e.target.value }))
            updateParams({ department_id: e.target.value })
          }}
          options={departments?.map((d: any) => ({ value: d.id, label: d.name })) || []}
          placeholder="부서 전체"
          className="w-40"
        />
        <FormSelect
          value={filters.hire_type || ''}
          onChange={(e) => {
            setFilters(f => ({ ...f, hire_type: e.target.value }))
            updateParams({ hire_type: e.target.value })
          }}
          options={[
            { value: 'regular', label: '정규직' },
            { value: 'contract', label: '계약직' },
            { value: 'part_time', label: '시간제' },
            { value: 'intern', label: '인턴' },
          ]}
          placeholder="고용형태 전체"
          className="w-36"
        />
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6">
        <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={employees}
            loading={loading}
            emptyMessage="등록된 직원이 없습니다."
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={handleSearch}
            searchPlaceholder="이름, 사번, 이메일 검색..."
            onRowClick={handleEdit}
            rowActions={(item: Employee) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1 text-zinc-400 hover:text-red-400"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      {/* Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedEmployee ? '직원 정보 수정' : '직원 등록'}
        onSubmit={handleSubmit}
        loading={saving}
        size="lg"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400">기본 정보</h3>
            <FormRow>
              <FormField label="이름" required>
                <FormInput
                  value={formData.name || ''}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="이름"
                />
              </FormField>
              <FormField label="사번">
                <FormInput
                  value={formData.employee_number || ''}
                  onChange={(e) => setFormData(f => ({ ...f, employee_number: e.target.value }))}
                  placeholder="자동생성"
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="이메일">
                <FormInput
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@company.com"
                />
              </FormField>
              <FormField label="전화번호">
                <FormInput
                  value={formData.phone || ''}
                  onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="010-0000-0000"
                />
              </FormField>
            </FormRow>
          </div>

          {/* Organization Info */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">조직 정보</h3>
            <FormRow>
              <FormField label="부서">
                <FormSelect
                  value={formData.department_id || ''}
                  onChange={(e) => setFormData(f => ({ ...f, department_id: e.target.value }))}
                  options={departments?.map((d: any) => ({ value: d.id, label: d.name })) || []}
                  placeholder="부서 선택"
                />
              </FormField>
              <FormField label="직급">
                <FormSelect
                  value={formData.position_id || ''}
                  onChange={(e) => setFormData(f => ({ ...f, position_id: e.target.value }))}
                  options={positions?.map((p: any) => ({ value: p.id, label: p.name })) || []}
                  placeholder="직급 선택"
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="고용형태">
                <FormSelect
                  value={formData.hire_type || 'regular'}
                  onChange={(e) => setFormData(f => ({ ...f, hire_type: e.target.value as any }))}
                  options={[
                    { value: 'regular', label: '정규직' },
                    { value: 'contract', label: '계약직' },
                    { value: 'part_time', label: '시간제' },
                    { value: 'intern', label: '인턴' },
                  ]}
                />
              </FormField>
              <FormField label="입사일">
                <FormInput
                  type="date"
                  value={formData.hire_date || ''}
                  onChange={(e) => setFormData(f => ({ ...f, hire_date: e.target.value }))}
                />
              </FormField>
            </FormRow>
          </div>

          {/* Bank Info */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">급여 계좌 정보</h3>
            <FormRow cols={3}>
              <FormField label="은행">
                <FormInput
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder="은행명"
                />
              </FormField>
              <FormField label="계좌번호">
                <FormInput
                  value={formData.bank_account || ''}
                  onChange={(e) => setFormData(f => ({ ...f, bank_account: e.target.value }))}
                  placeholder="계좌번호"
                />
              </FormField>
              <FormField label="예금주">
                <FormInput
                  value={formData.bank_holder || ''}
                  onChange={(e) => setFormData(f => ({ ...f, bank_holder: e.target.value }))}
                  placeholder="예금주"
                />
              </FormField>
            </FormRow>
          </div>
        </div>
      </FormModal>
    </div>
  )
}

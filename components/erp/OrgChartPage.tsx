'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Building2, Users, User, Mail, Phone, ChevronDown, ChevronUp,
  ZoomIn, ZoomOut, Maximize2, Minimize2, Grid3X3, GitBranch
} from 'lucide-react'
import { useEmployees, useDepartments } from '@/lib/erp/hooks'
import { PageHeader, StatCard, StatGrid } from './shared'
import type { Department, Employee } from '@/lib/erp/types'

interface OrgNodeData {
  id: string
  name: string
  type: 'company' | 'department' | 'employee'
  department?: Department
  employee?: Employee
  children: OrgNodeData[]
  memberCount: number
  level: number
}

// 조직도 노드 컴포넌트
function OrgNode({
  node,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
  zoom,
}: {
  node: OrgNodeData
  isExpanded: boolean
  onToggle: (id: string) => void
  onSelect: (node: OrgNodeData) => void
  isSelected: boolean
  zoom: number
}) {
  const hasChildren = node.children.length > 0
  const isDepartment = node.type === 'department' || node.type === 'company'

  const getInitials = (name: string) => name?.slice(0, 2) || '?'

  if (!isDepartment && node.type === 'employee') {
    // 직원 카드 (작은 버전)
    return (
      <div
        className={`flex flex-col items-center p-2 bg-theme-card border rounded-lg cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'border-accent ring-2 ring-accent/20' : 'border-theme hover:border-accent/50'
        }`}
        style={{ minWidth: 80 * zoom, maxWidth: 100 * zoom }}
        onClick={() => onSelect(node)}
      >
        {node.employee?.profile_image_url ? (
          <img
            src={node.employee.profile_image_url}
            alt={node.name}
            className="rounded-full object-cover border-2 border-theme"
            style={{ width: 40 * zoom, height: 40 * zoom }}
          />
        ) : (
          <div
            className="rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center border-2 border-theme"
            style={{ width: 40 * zoom, height: 40 * zoom }}
          >
            <span className="font-bold text-accent" style={{ fontSize: 12 * zoom }}>
              {getInitials(node.name)}
            </span>
          </div>
        )}
        <span className="font-medium text-theme text-center mt-1 truncate w-full" style={{ fontSize: 11 * zoom }}>
          {node.name}
        </span>
        <span className="text-theme-muted truncate w-full text-center" style={{ fontSize: 9 * zoom }}>
          {node.employee?.position?.name || ''}
        </span>
      </div>
    )
  }

  // 부서/회사 카드
  return (
    <div className="flex flex-col items-center">
      {/* 부서 카드 */}
      <div
        className={`relative flex flex-col items-center p-4 bg-theme-card border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
          isSelected ? 'border-accent ring-2 ring-accent/20' : 'border-accent/30 hover:border-accent'
        } ${node.type === 'company' ? 'bg-gradient-to-br from-accent/10 to-accent/5' : ''}`}
        style={{ minWidth: 160 * zoom }}
        onClick={() => onSelect(node)}
      >
        {/* 아이콘 */}
        <div
          className={`rounded-xl flex items-center justify-center mb-2 ${
            node.type === 'company' ? 'bg-accent text-white' : 'bg-accent/10'
          }`}
          style={{ width: 48 * zoom, height: 48 * zoom }}
        >
          <Building2 className={node.type === 'company' ? 'text-white' : 'text-accent'} style={{ width: 24 * zoom, height: 24 * zoom }} />
        </div>

        {/* 부서명 */}
        <h3 className="font-bold text-theme text-center" style={{ fontSize: 14 * zoom }}>
          {node.name}
        </h3>

        {/* 인원수 */}
        <div className="flex items-center gap-1 mt-1">
          <Users className="text-theme-muted" style={{ width: 12 * zoom, height: 12 * zoom }} />
          <span className="text-theme-muted" style={{ fontSize: 11 * zoom }}>
            {node.memberCount}명
          </span>
        </div>

        {/* 부서장 */}
        {node.department?.manager && (
          <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-theme-secondary rounded-lg">
            {node.department.manager.profile_image_url ? (
              <img
                src={node.department.manager.profile_image_url}
                alt={node.department.manager.name}
                className="rounded-full object-cover"
                style={{ width: 20 * zoom, height: 20 * zoom }}
              />
            ) : (
              <div
                className="rounded-full bg-accent/20 flex items-center justify-center"
                style={{ width: 20 * zoom, height: 20 * zoom }}
              >
                <span className="font-bold text-accent" style={{ fontSize: 8 * zoom }}>
                  {getInitials(node.department.manager.name)}
                </span>
              </div>
            )}
            <span className="text-theme" style={{ fontSize: 11 * zoom }}>
              {node.department.manager.name}
            </span>
          </div>
        )}

        {/* 확장/축소 버튼 */}
        {hasChildren && (
          <button
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 p-1 bg-theme-card border border-theme rounded-full hover:bg-theme-secondary transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.id)
            }}
          >
            {isExpanded ? (
              <ChevronUp className="text-theme-muted" style={{ width: 14 * zoom, height: 14 * zoom }} />
            ) : (
              <ChevronDown className="text-theme-muted" style={{ width: 14 * zoom, height: 14 * zoom }} />
            )}
          </button>
        )}
      </div>

      {/* 연결선 및 자식 노드들 */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center">
          {/* 수직 연결선 */}
          <div className="w-0.5 bg-accent/30" style={{ height: 24 * zoom }} />

          {/* 수평 연결선 */}
          {node.children.length > 1 && (
            <div
              className="h-0.5 bg-accent/30"
              style={{
                width: `calc(${(node.children.length - 1) * 180 * zoom}px)`,
              }}
            />
          )}

          {/* 자식 노드들 */}
          <div className="flex items-start" style={{ gap: 16 * zoom }}>
            {node.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* 수직 연결선 (각 자식에게) */}
                {node.children.length > 1 && (
                  <div className="w-0.5 bg-accent/30" style={{ height: 16 * zoom }} />
                )}
                <OrgChartBranch
                  node={child}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  isSelected={isSelected}
                  selectedId={isSelected ? node.id : null}
                  expandedNodes={new Set()}
                  zoom={zoom}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 재귀적 브랜치 컴포넌트
function OrgChartBranch({
  node,
  onToggle,
  onSelect,
  selectedId,
  expandedNodes,
  zoom,
}: {
  node: OrgNodeData
  onToggle: (id: string) => void
  onSelect: (node: OrgNodeData) => void
  isSelected: boolean
  selectedId: string | null
  expandedNodes: Set<string>
  zoom: number
}) {
  const [localExpanded, setLocalExpanded] = useState(node.level < 2)

  const handleToggle = (id: string) => {
    if (id === node.id) {
      setLocalExpanded(!localExpanded)
    }
  }

  return (
    <OrgNode
      node={node}
      isExpanded={localExpanded}
      onToggle={handleToggle}
      onSelect={onSelect}
      isSelected={selectedId === node.id}
      zoom={zoom}
    />
  )
}

export function OrgChartPage() {
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<OrgNodeData | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart')

  const { data: employees } = useEmployees({ limit: '1000' })
  const { data: departments } = useDepartments(true)

  // 조직도 트리 구조 생성
  const orgTree = useMemo((): OrgNodeData | null => {
    if (!departments || !employees) return null

    // 부서별 직원 맵핑
    const employeesByDept: Record<string, Employee[]> = {}
    employees.forEach((emp: Employee) => {
      const deptId = emp.department_id || 'unassigned'
      if (!employeesByDept[deptId]) {
        employeesByDept[deptId] = []
      }
      employeesByDept[deptId].push(emp)
    })

    // 부서 계층 구조 빌드
    const buildDeptTree = (parentId: string | null, level: number): OrgNodeData[] => {
      const children = departments
        .filter((d: Department) => (d.parent_id || null) === parentId)
        .sort((a: Department, b: Department) => (a.sort_order || 0) - (b.sort_order || 0))

      return children.map((dept: Department) => {
        const deptEmployees = employeesByDept[dept.id] || []
        const childDepts = buildDeptTree(dept.id, level + 1)
        const childMemberCount = childDepts.reduce((sum, child) => sum + child.memberCount, 0)

        return {
          id: dept.id,
          name: dept.name,
          type: 'department' as const,
          department: dept,
          children: [
            ...childDepts,
            // 직원들은 부서 카드 아래에 그리드로 표시
          ],
          level,
          memberCount: deptEmployees.length + childMemberCount,
        }
      })
    }

    const rootDepts = buildDeptTree(null, 1)

    return {
      id: 'company',
      name: '주식회사 유에이블코퍼레이션',
      type: 'company',
      children: rootDepts,
      level: 0,
      memberCount: employees.length,
    }
  }, [departments, employees])

  // 통계
  const stats = useMemo(() => {
    if (!employees || !departments) return { total: 0, departments: 0, active: 0 }
    return {
      total: employees.length,
      departments: departments.length,
      active: employees.filter((e: Employee) => e.status === 'active').length,
    }
  }, [employees, departments])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5))
  const handleZoomReset = () => setZoom(1)

  const getInitials = (name: string) => name?.slice(0, 2) || '?'

  // 카드 뷰 렌더링
  const renderCardsView = () => {
    if (!departments || !employees) return null

    return (
      <div className="space-y-8">
        {departments.map((dept: Department) => {
          const deptEmployees = employees.filter((e: Employee) => e.department_id === dept.id)

          return (
            <div key={dept.id} className="space-y-4">
              {/* 부서 헤더 */}
              <div className="flex items-center gap-3 pb-3 border-b border-theme">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-theme">{dept.name}</h3>
                  <p className="text-sm text-theme-muted">{deptEmployees.length}명</p>
                </div>
              </div>

              {/* 직원 그리드 */}
              {deptEmployees.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {deptEmployees.map((emp: Employee) => (
                    <div
                      key={emp.id}
                      className="group flex flex-col items-center p-4 bg-theme-card border border-theme rounded-xl hover:border-accent/50 hover:shadow-lg cursor-pointer transition-all"
                      onClick={() => setSelectedNode({
                        id: emp.id,
                        name: emp.name,
                        type: 'employee',
                        employee: emp,
                        children: [],
                        memberCount: 0,
                        level: 2,
                      })}
                    >
                      {emp.profile_image_url ? (
                        <img
                          src={emp.profile_image_url}
                          alt={emp.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-theme group-hover:border-accent transition-colors"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center border-2 border-theme group-hover:border-accent transition-colors">
                          <span className="text-xl font-bold text-accent">{getInitials(emp.name)}</span>
                        </div>
                      )}
                      <h4 className="font-medium text-theme mt-2 text-center">{emp.name}</h4>
                      <p className="text-xs text-theme-muted">{emp.position?.name || '-'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-theme-muted py-4">배정된 직원이 없습니다</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="조직도"
        subtitle="회사 조직 구조를 시각화합니다"
        icon={Building2}
      />

      {/* 통계 */}
      <StatGrid columns={3}>
        <StatCard title="전체 인원" value={stats.total} icon={Users} iconColor="text-blue-500" />
        <StatCard title="부서 수" value={stats.departments} icon={Building2} iconColor="text-purple-500" />
        <StatCard title="재직 중" value={stats.active} icon={Users} iconColor="text-green-500" />
      </StatGrid>

      {/* 툴바 */}
      <div className="flex items-center justify-between bg-theme-card border border-theme rounded-xl p-3">
        <div className="flex items-center gap-2">
          {/* 뷰 모드 */}
          <div className="flex items-center gap-1 p-1 bg-theme-secondary rounded-lg">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart' ? 'bg-accent text-white' : 'text-theme-muted hover:text-theme'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              조직도
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-accent text-white' : 'text-theme-muted hover:text-theme'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              카드뷰
            </button>
          </div>
        </div>

        {/* 줌 컨트롤 (차트 뷰에서만) */}
        {viewMode === 'chart' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
              title="축소"
            >
              <ZoomOut className="w-4 h-4 text-theme-muted" />
            </button>
            <span className="text-sm text-theme-muted w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
              title="확대"
            >
              <ZoomIn className="w-4 h-4 text-theme-muted" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
              title="원래 크기"
            >
              <Maximize2 className="w-4 h-4 text-theme-muted" />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* 조직도 영역 */}
        <div className="flex-1 bg-theme-card border border-theme rounded-xl p-8 min-h-[600px] overflow-auto">
          {viewMode === 'chart' ? (
            <div className="flex justify-center">
              {orgTree && (
                <OrgChartBranch
                  node={orgTree}
                  onToggle={() => {}}
                  onSelect={setSelectedNode}
                  isSelected={false}
                  selectedId={selectedNode?.id || null}
                  expandedNodes={new Set()}
                  zoom={zoom}
                />
              )}
            </div>
          ) : (
            renderCardsView()
          )}
        </div>

        {/* 상세 정보 패널 */}
        {selectedNode && (
          <div className="w-80 bg-theme-card border border-theme rounded-xl p-6 h-fit sticky top-6">
            {selectedNode.type === 'employee' && selectedNode.employee ? (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  {selectedNode.employee.profile_image_url ? (
                    <img
                      src={selectedNode.employee.profile_image_url}
                      alt={selectedNode.employee.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-theme mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center border-4 border-theme mb-4">
                      <span className="text-3xl font-bold text-accent">
                        {getInitials(selectedNode.employee.name)}
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-theme">{selectedNode.employee.name}</h3>
                  <p className="text-sm text-accent">{selectedNode.employee.position?.name || '-'}</p>
                  <p className="text-sm text-theme-muted">{selectedNode.employee.department?.name || '-'}</p>
                </div>

                <div className="space-y-3">
                  {selectedNode.employee.email && (
                    <a
                      href={`mailto:${selectedNode.employee.email}`}
                      className="flex items-center gap-3 p-3 bg-theme-secondary rounded-lg hover:bg-accent/10 transition-colors"
                    >
                      <Mail className="w-5 h-5 text-theme-muted" />
                      <span className="text-sm text-theme truncate">{selectedNode.employee.email}</span>
                    </a>
                  )}
                  {selectedNode.employee.phone && (
                    <a
                      href={`tel:${selectedNode.employee.phone}`}
                      className="flex items-center gap-3 p-3 bg-theme-secondary rounded-lg hover:bg-accent/10 transition-colors"
                    >
                      <Phone className="w-5 h-5 text-theme-muted" />
                      <span className="text-sm text-theme">{selectedNode.employee.phone}</span>
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                    <Building2 className="w-10 h-10 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-theme">{selectedNode.name}</h3>
                  <p className="text-sm text-theme-muted">{selectedNode.memberCount}명</p>
                </div>

                {selectedNode.department?.manager && (
                  <div className="p-4 bg-theme-secondary rounded-lg">
                    <p className="text-xs text-theme-muted mb-2">부서장</p>
                    <div className="flex items-center gap-3">
                      {selectedNode.department.manager.profile_image_url ? (
                        <img
                          src={selectedNode.department.manager.profile_image_url}
                          alt={selectedNode.department.manager.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center">
                          <span className="text-sm font-bold text-accent">
                            {getInitials(selectedNode.department.manager.name)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-theme">{selectedNode.department.manager.name}</p>
                        <p className="text-xs text-theme-muted">
                          {selectedNode.department.manager.position?.name || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

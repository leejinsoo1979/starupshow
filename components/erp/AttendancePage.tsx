'use client'

import React, { useState, useCallback } from 'react'
import {
  Clock, Calendar, Users, LogIn, LogOut, Coffee, AlertCircle,
  ChevronLeft, ChevronRight, X, MapPin, Loader2, RefreshCw
} from 'lucide-react'
import { useAttendance, useAttendanceStats, useEmployees } from '@/lib/erp/hooks'
import { PageHeader, StatCard, StatGrid, StatusBadge } from './shared'
import type { AttendanceStatus } from '@/lib/erp/types'
import { useThemeStore, accentColors } from '@/stores/themeStore'

export function AttendancePage() {
  const { accentColor } = useThemeStore()
  const themeColor = accentColors.find(c => c.id === accentColor)?.color || '#3b82f6'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkMessage, setCheckMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const dateString = currentDate.toISOString().split('T')[0]

  // 실제 데이터 조회
  const { data: employees, loading: employeesLoading } = useEmployees({ limit: '1000' })
  const { data: statsData, loading: statsLoading, refresh: refreshStats } = useAttendanceStats(dateString)
  const { data: records, loading: recordsLoading, refresh: refreshRecords } = useAttendance({
    start_date: dateString,
    end_date: dateString,
  })

  // 직원별 출퇴근 기록 병합
  const attendanceRecords = React.useMemo(() => {
    if (!employees) return records || []

    // 출퇴근 기록이 있는 직원 ID 목록
    const recordedEmployeeIds = new Set(records?.map((r: any) => r.employee_id) || [])

    // 기록이 없는 직원들은 미출근 상태로 추가
    const missingRecords = employees
      .filter((emp: any) => !recordedEmployeeIds.has(emp.id))
      .map((emp: any) => ({
        id: `no-record-${emp.id}`,
        employee_id: emp.id,
        employee: emp,
        work_date: dateString,
        check_in: null,
        check_out: null,
        work_minutes: 0,
        overtime_minutes: 0,
        status: 'absent' as AttendanceStatus,
      }))

    return [...(records || []), ...missingRecords]
  }, [employees, records, dateString])

  // 통계 (API 데이터 우선, 없으면 계산)
  const stats = React.useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total || 0,
        present: statsData.present || 0,
        late: statsData.late || 0,
        absent: statsData.absent || 0,
        vacation: statsData.vacation || 0,
      }
    }

    const total = employees?.length || 0
    const present = records?.filter((r: any) => ['normal', 'late', 'early_leave'].includes(r.status)).length || 0
    const late = records?.filter((r: any) => r.status === 'late').length || 0
    const vacation = records?.filter((r: any) => r.status === 'vacation').length || 0
    const absent = total - present - vacation

    return { total, present, late, absent, vacation }
  }, [statsData, employees, records])

  const handleCheckIn = useCallback(async () => {
    setIsCheckingIn(true)
    setCheckMessage(null)

    try {
      // TODO: 실제 employee_id는 현재 로그인한 사용자의 ID를 사용해야 함
      const employeeId = employees?.[0]?.id
      if (!employeeId) {
        throw new Error('직원 정보를 찾을 수 없습니다.')
      }

      const response = await fetch('/api/erp/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          type: 'check_in',
          location: { lat: 37.5665, lng: 126.978, address: '서울특별시 강남구' },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '출근 처리에 실패했습니다.')
      }

      setCheckMessage({ type: 'success', text: '출근 처리되었습니다!' })
      refreshRecords()
      refreshStats()
    } catch (error) {
      setCheckMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다.',
      })
    } finally {
      setIsCheckingIn(false)
    }
  }, [employees, refreshRecords, refreshStats])

  const handleCheckOut = useCallback(async () => {
    setIsCheckingOut(true)
    setCheckMessage(null)

    try {
      const employeeId = employees?.[0]?.id
      if (!employeeId) {
        throw new Error('직원 정보를 찾을 수 없습니다.')
      }

      const response = await fetch('/api/erp/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          type: 'check_out',
          location: { lat: 37.5665, lng: 126.978, address: '서울특별시 강남구' },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '퇴근 처리에 실패했습니다.')
      }

      setCheckMessage({ type: 'success', text: '퇴근 처리되었습니다!' })
      refreshRecords()
      refreshStats()
    } catch (error) {
      setCheckMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다.',
      })
    } finally {
      setIsCheckingOut(false)
    }
  }, [employees, refreshRecords, refreshStats])

  const formatTime = (datetime?: string) => {
    if (!datetime) return '-'
    try {
      const date = new Date(datetime)
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return datetime.slice(0, 5) // HH:MM 형식이면 그대로 반환
    }
  }

  const formatMinutes = (minutes: number) => {
    if (!minutes || minutes <= 0) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}시간 ${mins}분`
  }

  const prevDate = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const nextDate = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToday = () => {
    setCurrentDate(new Date())
  }

  const getStatusInfo = (status: AttendanceStatus) => {
    switch (status) {
      case 'normal': return { label: '정상', color: 'success' }
      case 'late': return { label: '지각', color: 'warning' }
      case 'early_leave': return { label: '조퇴', color: 'warning' }
      case 'absent': return { label: '결근', color: 'error' }
      case 'vacation': return { label: '휴가', color: 'purple' }
      case 'holiday': return { label: '휴일', color: 'info' }
      default: return { label: status || '미확인', color: 'default' }
    }
  }

  const getInitials = (name: string) => name?.slice(0, 2) || '?'

  const isLoading = employeesLoading || statsLoading || recordsLoading

  return (
    <div className="space-y-6">
      <PageHeader
        title="근태관리"
        subtitle="직원 출퇴근 현황을 관리합니다"
        icon={Clock}
      />

      {/* 통계 카드 */}
      <StatGrid columns={5}>
        <StatCard
          title="전체 인원"
          value={stats.total}
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatCard
          title="출근"
          value={stats.present}
          icon={LogIn}
          iconColor="text-accent"
        />
        <StatCard
          title="지각"
          value={stats.late}
          icon={AlertCircle}
          iconColor="text-yellow-500"
        />
        <StatCard
          title="결근"
          value={stats.absent}
          icon={X}
          iconColor="text-red-500"
        />
        <StatCard
          title="휴가"
          value={stats.vacation}
          icon={Coffee}
          iconColor="text-purple-500"
        />
      </StatGrid>

      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={prevDate}
            className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-theme-muted" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            <span className="text-lg font-semibold text-theme">
              {currentDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: viewMode === 'daily' ? 'numeric' : undefined,
                weekday: viewMode === 'daily' ? 'short' : undefined,
              })}
            </span>
          </div>

          <button
            onClick={nextDate}
            className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-theme-muted" />
          </button>

          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            오늘
          </button>

          <button
            onClick={() => { refreshRecords(); refreshStats() }}
            className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 text-theme-muted ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-theme-secondary rounded-lg">
          {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-accent text-white'
                  : 'text-theme-muted hover:text-theme'
              }`}
            >
              {mode === 'daily' ? '일별' : mode === 'weekly' ? '주별' : '월별'}
            </button>
          ))}
        </div>
      </div>

      {/* 근태 테이블 */}
      <div className="bg-theme-card border border-theme rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-theme bg-theme-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    직원
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    부서
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    출근
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    퇴근
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    근무시간
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    연장근무
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-theme-muted uppercase tracking-wider">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {attendanceRecords.map((record: any) => {
                  const statusInfo = getStatusInfo(record.status)
                  const employee = record.employee

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-theme-secondary/30 transition-colors ${
                        selectedEmployee === record.employee_id ? 'bg-accent/5' : ''
                      }`}
                      onClick={() => setSelectedEmployee(record.employee_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {employee?.profile_image_url ? (
                            <img
                              src={employee.profile_image_url}
                              alt={employee.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center">
                              <span className="text-xs font-bold text-accent">
                                {getInitials(employee?.name || '')}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-theme">{employee?.name || '-'}</p>
                            <p className="text-xs text-theme-muted">
                              {employee?.position?.name || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-muted">
                        {employee?.department?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <LogIn className="w-3.5 h-3.5" style={{ color: themeColor }} />
                          <span className="text-sm text-theme">
                            {formatTime(record.check_in)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <LogOut className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-sm text-theme">
                            {formatTime(record.check_out)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-theme">
                        {formatMinutes(record.work_minutes)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.overtime_minutes > 0 ? (
                          <span className="text-accent">{formatMinutes(record.overtime_minutes)}</span>
                        ) : (
                          <span className="text-theme-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={statusInfo.color} label={statusInfo.label} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {attendanceRecords.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Clock className="w-16 h-16 text-theme-muted mb-4" />
                <h3 className="text-lg font-medium text-theme mb-2">근태 기록이 없습니다</h3>
                <p className="text-sm text-theme-muted">
                  해당 날짜의 출퇴근 기록이 없습니다
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 출퇴근 버튼 (본인용) */}
      <div className="bg-theme-card border border-theme rounded-xl p-6">
        <h3 className="text-lg font-semibold text-theme mb-4">나의 출퇴근</h3>

        {checkMessage && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={checkMessage.type === 'success'
              ? { backgroundColor: `${themeColor}15`, color: themeColor }
              : { backgroundColor: 'rgb(239 68 68 / 0.1)', color: 'rgb(239 68 68)' }
            }
          >
            {checkMessage.text}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={handleCheckIn}
            disabled={isCheckingIn}
            className="flex-1 flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors hover:brightness-110"
            style={{ backgroundColor: themeColor }}
          >
            {isCheckingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            출근하기
          </button>
          <button
            onClick={handleCheckOut}
            disabled={isCheckingOut}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            {isCheckingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            퇴근하기
          </button>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-theme-muted">
          <MapPin className="w-4 h-4" />
          <span>현재 위치: 서울특별시 강남구</span>
        </div>
      </div>
    </div>
  )
}

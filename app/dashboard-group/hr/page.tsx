'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  Clock,
  Calendar,
  Briefcase,
  Building2,
  Award,
  ChevronRight,
  UserCheck,
  UserMinus,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export default function HRDashboardPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  const mockData = {
    totalEmployees: 127,
    activeEmployees: 118,
    onLeave: 6,
    todayAttendance: 112,
    attendanceRate: 95,
    pendingApprovals: 5,
    newHires: 7,
    resignations: 1,
    upcomingBirthdays: [
      { name: '김민수', date: '01/15', department: '개발팀', initial: '김' },
      { name: '이서연', date: '01/18', department: '디자인팀', initial: '이' },
      { name: '박지훈', date: '01/22', department: '마케팅팀', initial: '박' },
    ],
    recentActivities: [
      { type: 'join', name: '최영희', department: '인사팀', date: '01.10', time: '09:00' },
      { type: 'leave_approved', name: '정다은', department: '개발팀', date: '01.09', time: '14:30' },
      { type: 'promotion', name: '한승우', department: '영업팀', date: '01.08', time: '11:00' },
      { type: 'resign', name: '오준서', department: '경영지원팀', date: '01.05', time: '18:00' },
    ],
    departmentStats: [
      { name: '개발팀', count: 42 },
      { name: '디자인팀', count: 18 },
      { name: '마케팅팀', count: 22 },
      { name: '영업팀', count: 28 },
      { name: '경영지원팀', count: 17 },
    ],
    monthlyTrend: [
      { month: '8월', joins: 5, resigns: 2 },
      { month: '9월', joins: 8, resigns: 1 },
      { month: '10월', joins: 3, resigns: 4 },
      { month: '11월', joins: 6, resigns: 2 },
      { month: '12월', joins: 4, resigns: 3 },
      { month: '1월', joins: 7, resigns: 1 },
    ],
  }

  const totalDept = mockData.departmentStats.reduce((acc, d) => acc + d.count, 0)

  // Department colors using theme palette
  const deptColors = ['bg-accent', 'bg-purple-500', 'bg-accent', 'bg-amber-500', 'bg-red-500']

  const getActivityConfig = (type: string) => {
    switch (type) {
      case 'join':
        return { icon: UserCheck, label: '입사', className: 'bg-accent/15 text-accent' }
      case 'resign':
        return { icon: UserMinus, label: '퇴사', className: 'bg-red-500/15 text-red-500' }
      case 'leave_approved':
        return { icon: Calendar, label: '휴가 승인', className: 'bg-accent/15 text-accent' }
      case 'promotion':
        return { icon: Award, label: '승진', className: 'bg-purple-500/15 text-purple-500' }
      default:
        return { icon: Users, label: type, className: isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600' }
    }
  }

  if (!mounted) return null

  return (
    <div className={cn(
      "min-h-screen p-8 transition-colors duration-300",
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-100 text-zinc-900"
    )}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-accent/20">
            <Users className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className={cn(
              "text-3xl font-bold tracking-tight",
              isDark ? "text-zinc-100" : "text-zinc-900"
            )}>인사관리</h1>
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>2026년 1월 현황</p>
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Total Employees */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-accent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>전체 직원</span>
              <div className="p-2 rounded-xl bg-accent/20">
                <Users className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-bold tracking-tight", isDark ? "text-zinc-100" : "text-zinc-900")}>
                {mockData.totalEmployees}
              </span>
              <span className={cn("text-lg", isDark ? "text-zinc-500" : "text-zinc-600")}>명</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15">
                <ArrowUpRight className="w-3 h-3 text-accent" />
                <span className="text-xs font-medium text-accent">3.2%</span>
              </div>
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>전월 대비</span>
            </div>
          </div>
        </div>

        {/* Today Attendance */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-accent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>오늘 출근</span>
              <div className="p-2 rounded-xl bg-accent/20">
                <Clock className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-bold tracking-tight", isDark ? "text-zinc-100" : "text-zinc-900")}>
                {mockData.todayAttendance}
              </span>
              <span className={cn("text-lg", isDark ? "text-zinc-500" : "text-zinc-600")}>명</span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>출근율</span>
                <span className="text-accent font-medium">{mockData.attendanceRate}%</span>
              </div>
              <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${mockData.attendanceRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* On Leave */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-amber-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>휴가/휴직</span>
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Briefcase className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-bold tracking-tight", isDark ? "text-zinc-100" : "text-zinc-900")}>
                {mockData.onLeave}
              </span>
              <span className={cn("text-lg", isDark ? "text-zinc-500" : "text-zinc-600")}>명</span>
            </div>
            <p className={cn("text-xs mt-3", isDark ? "text-zinc-500" : "text-zinc-600")}>육아휴직 4명 포함</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-red-500" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>승인 대기</span>
              <div className="p-2 rounded-xl bg-red-500/20">
                <span className="text-sm font-bold text-red-500">{mockData.pendingApprovals}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-bold tracking-tight", isDark ? "text-zinc-100" : "text-zinc-900")}>
                {mockData.pendingApprovals}
              </span>
              <span className={cn("text-lg", isDark ? "text-zinc-500" : "text-zinc-600")}>건</span>
            </div>
            <p className={cn("text-xs mt-3", isDark ? "text-zinc-500" : "text-zinc-600")}>휴가신청 3건 포함</p>
          </div>
        </div>
      </div>

      {/* Second Row - Charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Department Distribution */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>부서별 인원</h3>
            <Building2 className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>

          {/* Horizontal Stacked Bar */}
          <div className="mb-6">
            <div className="h-4 rounded-full overflow-hidden flex">
              {mockData.departmentStats.map((dept, idx) => (
                <div
                  key={dept.name}
                  className={cn("h-full transition-all duration-500", deptColors[idx])}
                  style={{ width: `${(dept.count / totalDept) * 100}%` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {mockData.departmentStats.map((dept, idx) => (
              <div key={dept.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", deptColors[idx])} />
                  <span className={cn("text-sm", isDark ? "text-zinc-300" : "text-zinc-700")}>{dept.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>{dept.count}</span>
                  <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>
                    ({Math.round((dept.count / totalDept) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>입/퇴사 추이</h3>
            <TrendingUp className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>

          <div className="h-44 flex items-end gap-3">
            {mockData.monthlyTrend.map((item) => {
              const maxVal = Math.max(...mockData.monthlyTrend.flatMap(t => [t.joins, t.resigns]))
              const joinHeight = (item.joins / maxVal) * 100
              const resignHeight = (item.resigns / maxVal) * 100
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    <div
                      className="w-5 rounded-t-lg bg-accent transition-all duration-500"
                      style={{ height: `${joinHeight}%` }}
                    />
                    <div
                      className="w-5 rounded-t-lg bg-red-500 transition-all duration-500"
                      style={{ height: `${resignHeight}%` }}
                    />
                  </div>
                  <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.month}</span>
                </div>
              )
            })}
          </div>

          <div className={cn(
            "flex items-center justify-center gap-6 mt-4 pt-4 border-t",
            isDark ? "border-zinc-800" : "border-zinc-200"
          )}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-accent" />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>입사</span>
              <span className="text-sm font-semibold text-accent">+{mockData.newHires}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>퇴사</span>
              <span className="text-sm font-semibold text-red-500">-{mockData.resignations}</span>
            </div>
          </div>
        </div>

        {/* Attendance Ring */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>출근 현황</h3>
            <Clock className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>

          <div className="relative w-44 h-44 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="65"
                fill="none"
                className={isDark ? "stroke-zinc-800" : "stroke-zinc-200"}
                strokeWidth="14"
              />
              <circle
                cx="80"
                cy="80"
                r="65"
                fill="none"
                className="stroke-accent"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${mockData.attendanceRate * 4.08} 408`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-4xl font-bold", isDark ? "text-zinc-100" : "text-zinc-900")}>
                {mockData.attendanceRate}%
              </span>
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>출근율</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className={cn("text-center p-3 rounded-2xl", "bg-accent/10")}>
              <p className="text-xl font-bold text-accent">{mockData.todayAttendance}</p>
              <p className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-zinc-600")}>출근</p>
            </div>
            <div className={cn("text-center p-3 rounded-2xl", "bg-amber-500/10")}>
              <p className="text-xl font-bold text-amber-500">{mockData.onLeave}</p>
              <p className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-zinc-600")}>휴가</p>
            </div>
            <div className={cn("text-center p-3 rounded-2xl", "bg-red-500/10")}>
              <p className="text-xl font-bold text-red-500">
                {mockData.activeEmployees - mockData.todayAttendance - mockData.onLeave}
              </p>
              <p className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-zinc-600")}>미출근</p>
            </div>
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Activities */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>최근 활동</h3>
            <button className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 transition-colors">
              전체보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {mockData.recentActivities.map((activity, idx) => {
              const config = getActivityConfig(activity.type)
              const Icon = config.icon
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl transition-colors cursor-pointer",
                    isDark
                      ? "bg-zinc-800 hover:bg-zinc-700"
                      : "bg-zinc-100 hover:bg-zinc-200"
                  )}
                >
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", config.className.split(' ')[0])}>
                    <Icon className={cn("w-5 h-5", config.className.split(' ')[1])} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{activity.name}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", config.className)}>
                        {config.label}
                      </span>
                    </div>
                    <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>{activity.department}</span>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-zinc-700")}>{activity.date}</p>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>{activity.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Upcoming Birthdays */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>다가오는 생일</h3>
                <span className="text-xl">🎂</span>
              </div>
              <Calendar className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
            </div>

            <div className="flex gap-3">
              {mockData.upcomingBirthdays.map((person, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex-1 p-4 rounded-2xl text-center hover:scale-[1.02] transition-transform cursor-pointer",
                    isDark
                      ? "bg-zinc-800"
                      : "bg-zinc-100"
                  )}
                >
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-accent flex items-center justify-center text-white text-lg font-bold">
                    {person.initial}
                  </div>
                  <p className={cn("font-medium text-sm", isDark ? "text-zinc-100" : "text-zinc-900")}>{person.name}</p>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-zinc-600")}>{person.department}</p>
                  <p className="text-xs text-accent mt-1 font-medium">{person.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>빠른 작업</h3>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Users, label: '직원 등록' },
                { icon: Calendar, label: '휴가 관리' },
                { icon: Clock, label: '근태 관리' },
                { icon: Building2, label: '조직도' },
              ].map((action, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "group p-4 rounded-2xl transition-all hover:scale-[1.02]",
                    isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200"
                  )}
                >
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 bg-accent/20">
                    <action.icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className={cn("text-xs", isDark ? "text-zinc-300" : "text-zinc-700")}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

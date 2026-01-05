'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Calendar,
  BarChart3,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  RefreshCw,
  Star,
  FileSpreadsheet,
  ChevronRight,
  PieChart,
  Send,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export default function ReportsDashboardPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  // Mock data
  const mockData = {
    totalReports: 48,
    weeklyReports: 32,
    monthlyReports: 16,
    avgCompletion: 87,
    changePercent: 15.2,
    pendingApprovals: 3,
    monthlyTrend: [
      { month: '7월', completion: 72, target: 80 },
      { month: '8월', completion: 78, target: 80 },
      { month: '9월', completion: 85, target: 80 },
      { month: '10월', completion: 82, target: 85 },
      { month: '11월', completion: 88, target: 85 },
      { month: '12월', completion: 92, target: 90 },
    ],
    reportTypes: [
      { name: '태스크 현황', count: 18, percent: 37.5 },
      { name: '팀 생산성', count: 12, percent: 25.0 },
      { name: 'KPI 분석', count: 8, percent: 16.7 },
      { name: '매출 리포트', count: 6, percent: 12.5 },
      { name: '비용 분석', count: 4, percent: 8.3 },
    ],
    recentReports: [
      { id: 'RPT-048', title: '12월 4주차 주간 업무 리포트', type: 'weekly', completion: 87, date: '12.28', starred: true },
      { id: 'RPT-047', title: '12월 월간 성과 리포트', type: 'monthly', completion: 92, date: '12.27', starred: true },
      { id: 'RPT-046', title: '12월 3주차 주간 업무 리포트', type: 'weekly', completion: 78, date: '12.21', starred: false },
      { id: 'RPT-045', title: '12월 2주차 주간 업무 리포트', type: 'weekly', completion: 85, date: '12.14', starred: false },
      { id: 'RPT-044', title: '11월 월간 성과 리포트', type: 'monthly', completion: 88, date: '11.30', starred: false },
    ],
    scheduledReports: [
      { title: '12월 5주차 주간 리포트', schedule: '매주 월요일 09:00', nextRun: '01.06', type: 'weekly' },
      { title: '1월 월간 성과 리포트', schedule: '매월 1일 10:00', nextRun: '02.01', type: 'monthly' },
      { title: 'Q4 분기 종합 리포트', schedule: '분기별', nextRun: '01.15', type: 'quarterly' },
    ],
    alerts: [
      { type: 'success', message: '12월 월간 리포트 생성 완료', time: '방금 전' },
      { type: 'info', message: '다음 주간 리포트 예정: 01.06', time: '1시간 전' },
      { type: 'warning', message: '2건의 리포트 승인 대기 중', time: '3시간 전' },
    ],
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'weekly': return { label: '주간', className: 'bg-accent/20 text-accent' }
      case 'monthly': return { label: '월간', className: 'bg-accent/20 text-accent' }
      case 'quarterly': return { label: '분기', className: 'bg-amber-500/20 text-amber-500' }
      default: return { label: type, className: isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600' }
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
            <FileText className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className={cn(
              "text-3xl font-bold tracking-tight",
              isDark ? "text-zinc-100" : "text-zinc-900"
            )}>리포트</h1>
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>업무 현황 및 성과 분석 리포트</p>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { title: '총 리포트', value: mockData.totalReports, sub: '이번 달 12건 생성', trend: `+${mockData.changePercent}%`, icon: FileText },
          { title: '주간 리포트', value: mockData.weeklyReports, sub: '자동 생성 활성화', icon: Calendar },
          { title: '월간 리포트', value: mockData.monthlyReports, sub: '분기별 4건 포함', icon: BarChart3 },
          { title: '평균 달성률', value: `${mockData.avgCompletion}%`, sub: '목표 대비', icon: Target },
        ].map((stat, idx) => (
          <div key={idx} className={cn(
            "relative overflow-hidden rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-accent" />
            <div className="flex items-center justify-between mb-4">
              <span className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>{stat.title}</span>
              <div className="p-2 rounded-xl bg-accent/20">
                <stat.icon className="w-4 h-4 text-accent" />
              </div>
            </div>
            <p className={cn("text-3xl font-bold tracking-tight mb-1", isDark ? "text-zinc-100" : "text-zinc-900")}>{stat.value}</p>
            {stat.trend && (
              <span className="text-sm font-medium text-accent">{stat.trend} 전월 대비</span>
            )}
            {stat.sub && !stat.trend && (
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>{stat.sub}</span>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Performance Trend */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>월별 달성률 추이</h3>
            <TrendingUp className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="h-48 flex items-end gap-2">
            {mockData.monthlyTrend.map((item) => {
              const completionHeight = item.completion
              const targetHeight = item.target
              const isAboveTarget = item.completion >= item.target
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 flex items-end gap-0.5 w-full">
                    <div
                      className={cn("flex-1 rounded-lg", isDark ? "bg-zinc-700" : "bg-zinc-200")}
                      style={{ height: `${targetHeight}%` }}
                    />
                    <div
                      className={cn("flex-1 rounded-lg", isAboveTarget ? "bg-accent" : "bg-accent")}
                      style={{ height: `${completionHeight}%` }}
                    />
                  </div>
                  <span className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.month}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", isDark ? "bg-zinc-700" : "bg-zinc-300")} />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>목표</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>달성</span>
            </div>
          </div>
        </div>

        {/* Report Types Donut */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>리포트 유형별</h3>
            <PieChart className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="55" strokeWidth="20" fill="none" className={isDark ? "stroke-zinc-800" : "stroke-zinc-200"} />
              {(() => {
                let offset = 0
                const circumference = 2 * Math.PI * 55
                // Using theme-consistent colors
                const segmentColors = ['rgb(var(--accent-color-rgb))', '#22c55e', '#a855f7', '#f59e0b', '#ef4444']
                return mockData.reportTypes.map((type, index) => {
                  const segmentLength = (type.percent / 100) * circumference
                  const segment = (
                    <circle
                      key={type.name}
                      cx="80"
                      cy="80"
                      r="55"
                      fill="none"
                      stroke={segmentColors[index]}
                      strokeWidth="20"
                      strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                      strokeDashoffset={-offset}
                    />
                  )
                  offset += segmentLength
                  return segment
                })
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", isDark ? "text-zinc-100" : "text-zinc-900")}>{mockData.totalReports}</span>
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>총 리포트</span>
            </div>
          </div>
          <div className="space-y-2">
            {mockData.reportTypes.slice(0, 4).map((type, index) => {
              const dotColors = ['bg-accent', 'bg-accent', 'bg-purple-500', 'bg-amber-500']
              return (
                <div key={type.name} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", dotColors[index])} />
                  <span className={cn("text-xs flex-1", isDark ? "text-zinc-500" : "text-zinc-600")}>{type.name}</span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{type.count}건</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Scheduled Reports */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>예약된 리포트</h3>
            <RefreshCw className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="space-y-3">
            {mockData.scheduledReports.map((report, idx) => {
              const typeConfig = getTypeConfig(report.type)
              return (
                <div key={idx} className={cn(
                  "p-4 rounded-2xl",
                  isDark ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-sm font-medium truncate flex-1", isDark ? "text-zinc-100" : "text-zinc-900")}>{report.title}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium ml-2", typeConfig.className)}>
                      {typeConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <Clock className={cn("w-3 h-3", isDark ? "text-zinc-500" : "text-zinc-600")} />
                    <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>{report.schedule}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>다음 생성: {report.nextRun}</span>
                    <button className="text-xs text-accent hover:text-accent/80 font-medium">실행</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Reports */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>최근 리포트</h3>
            <button className="text-sm text-accent hover:text-accent/80 flex items-center gap-1">
              전체보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {mockData.recentReports.map((report) => {
              const typeConfig = getTypeConfig(report.type)
              return (
                <div key={report.id} className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl transition-colors",
                  isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200"
                )}>
                  <div className={cn("p-3 rounded-xl", isDark ? "bg-zinc-700" : "bg-white")}>
                    {report.starred ? (
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    ) : (
                      <FileText className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn("font-medium truncate block", isDark ? "text-zinc-100" : "text-zinc-900")}>{report.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", typeConfig.className)}>
                        {typeConfig.label}
                      </span>
                      <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>{report.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-12 h-1.5 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                      <div
                        className={cn("h-full rounded-full", report.completion >= 90 ? "bg-accent" : report.completion >= 70 ? "bg-accent" : "bg-amber-500")}
                        style={{ width: `${report.completion}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium w-8 text-right", report.completion >= 90 ? "text-accent" : isDark ? "text-zinc-100" : "text-zinc-900")}>
                      {report.completion}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Insights & Alerts */}
        <div className="space-y-4">
          {/* AI Insights */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>AI 인사이트</h3>
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div className={cn("p-4 rounded-2xl", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <p className={cn("text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-600")}>
                12월 성과가 크게 향상되었습니다. 목표 대비 <span className="font-semibold text-accent">102%</span> 달성으로 Q4 최고 성과를 기록했습니다.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-accent" />
                  <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>생산성 +18%</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-accent" />
                  <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>완료율 92%</span>
                </div>
              </div>
            </div>
            <button className={cn(
              "w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-colors",
              "bg-accent/20 text-accent hover:bg-accent/30"
            )}>
              <FileSpreadsheet className="w-4 h-4" />
              상세 분석 보기
            </button>
          </div>

          {/* Alerts */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <h3 className={cn("text-lg font-semibold mb-4", isDark ? "text-zinc-100" : "text-zinc-900")}>알림</h3>
            <div className="space-y-2">
              {mockData.alerts.map((alert, idx) => (
                <div key={idx} className={cn(
                  "flex items-start gap-3 p-3 rounded-2xl",
                  isDark ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                    alert.type === 'success' ? "bg-accent/20" :
                    alert.type === 'warning' ? "bg-amber-400/20" :
                    "bg-accent/20"
                  )}>
                    {alert.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-accent" />
                    ) : alert.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", isDark ? "text-zinc-100" : "text-zinc-900")}>{alert.message}</p>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-zinc-600")}>{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={cn(
        "rounded-3xl p-6 border mt-4 transition-all duration-300",
        isDark
          ? "bg-zinc-900 border-zinc-800"
          : "bg-white border-zinc-200 shadow-sm"
      )}>
        <h3 className={cn("text-lg font-semibold mb-4", isDark ? "text-zinc-100" : "text-zinc-900")}>빠른 작업</h3>
        <div className="grid grid-cols-6 gap-3">
          {[
            { icon: Calendar, label: '주간 리포트' },
            { icon: BarChart3, label: '월간 리포트' },
            { icon: Target, label: 'KPI 분석' },
            { icon: TrendingUp, label: '성과 리포트' },
            { icon: Send, label: '리포트 공유' },
            { icon: Zap, label: 'AI 생성' },
          ].map((action, idx) => (
            <button key={idx} className={cn(
              "p-4 rounded-2xl text-center transition-all hover:scale-105",
              isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200"
            )}>
              <action.icon className="w-6 h-6 mx-auto mb-2 text-accent" />
              <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

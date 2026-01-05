'use client'

import React, { useState, useEffect } from 'react'
import {
  Wallet,
  Calculator,
  CreditCard,
  FileText,
  Building2,
  TrendingUp,
  Clock,
  ChevronRight,
  Shield,
  Banknote,
  Receipt,
  Users,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export default function PayrollDashboardPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  // Mock data
  const mockData = {
    totalPayroll: 485000000,
    netPayroll: 412250000,
    insurance: 48500000,
    tax: 24250000,
    employeeCount: 24,
    completedCount: 20,
    payrollGrowth: 5.2,
    monthlyTrend: [
      { month: '8월', amount: 462 },
      { month: '9월', amount: 468 },
      { month: '10월', amount: 472 },
      { month: '11월', amount: 478 },
      { month: '12월', amount: 481 },
      { month: '1월', amount: 485 },
    ],
    payrollBreakdown: [
      { label: '기본급', amount: 380000000, percent: 78 },
      { label: '성과급', amount: 48500000, percent: 10 },
      { label: '식대', amount: 24250000, percent: 5 },
      { label: '교통비', amount: 12120000, percent: 2.5 },
      { label: '기타수당', amount: 20130000, percent: 4.5 },
    ],
    recentPayments: [
      { id: '1', name: '김철수', department: '개발팀', amount: 4500000, status: 'completed', date: '01/05' },
      { id: '2', name: '이영희', department: '디자인팀', amount: 3800000, status: 'completed', date: '01/05' },
      { id: '3', name: '박민수', department: '마케팅팀', amount: 4200000, status: 'completed', date: '01/05' },
      { id: '4', name: '정수진', department: '영업팀', amount: 5100000, status: 'scheduled', date: '01/10' },
      { id: '5', name: '최동현', department: '개발팀', amount: 4800000, status: 'completed', date: '01/05' },
    ],
    departmentStats: [
      { name: '개발팀', count: 12, amount: 210000000 },
      { name: '마케팅팀', count: 5, amount: 95000000 },
      { name: '디자인팀', count: 4, amount: 72000000 },
      { name: '영업팀', count: 3, amount: 68000000 },
    ],
  }

  const formatCurrency = (value: number) => {
    if (value >= 100000000) return `₩${(value / 100000000).toFixed(1)}억`
    if (value >= 10000000) return `₩${(value / 10000000).toFixed(1)}천만`
    return `₩${(value / 10000).toFixed(0)}만`
  }

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
  }

  const maxTrendValue = Math.max(...mockData.monthlyTrend.map(t => t.amount))
  const minTrendValue = Math.min(...mockData.monthlyTrend.map(t => t.amount))
  const progressRate = (mockData.completedCount / mockData.employeeCount) * 100

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
            <Wallet className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className={cn(
              "text-3xl font-bold tracking-tight",
              isDark ? "text-zinc-100" : "text-zinc-900"
            )}>급여관리</h1>
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월 현황</p>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { title: '총 급여', value: formatCurrency(mockData.totalPayroll), sub: `${mockData.employeeCount}명 대상`, trend: `+${mockData.payrollGrowth}%`, type: 'accent', icon: Wallet },
          { title: '실지급액', value: formatCurrency(mockData.netPayroll), sub: '공제 후 금액', type: 'success', icon: CreditCard },
          { title: '4대보험', value: formatCurrency(mockData.insurance), sub: '회사 부담분 포함', type: 'neutral', icon: Shield },
          { title: '원천징수', value: formatCurrency(mockData.tax), sub: '소득세 + 지방세', type: 'warning', icon: Banknote },
        ].map((stat, idx) => (
          <div key={idx} className={cn(
            "relative overflow-hidden rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <span className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>{stat.title}</span>
              <div className={cn(
                "p-2 rounded-xl",
                stat.type === 'success' ? "bg-accent/20" :
                stat.type === 'warning' ? "bg-amber-500/20" :
                stat.type === 'neutral' ? (isDark ? "bg-zinc-700" : "bg-zinc-200") :
                "bg-accent/20"
              )}>
                <stat.icon className={cn(
                  "w-4 h-4",
                  stat.type === 'success' ? "text-accent" :
                  stat.type === 'warning' ? "text-amber-500" :
                  stat.type === 'neutral' ? (isDark ? "text-zinc-400" : "text-zinc-600") :
                  "text-accent"
                )} />
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
        {/* Monthly Trend */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>월별 급여 추이</h3>
            <TrendingUp className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="h-48 flex items-end gap-2">
            {mockData.monthlyTrend.map((item) => {
              const height = ((item.amount - minTrendValue + 10) / (maxTrendValue - minTrendValue + 10)) * 100
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.amount}</span>
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-accent rounded-lg"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.month}</span>
                </div>
              )
            })}
          </div>
          <p className={cn("text-xs text-center mt-3", isDark ? "text-zinc-500" : "text-zinc-600")}>단위: 백만원</p>
        </div>

        {/* Deduction Breakdown */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>공제 내역</h3>
            <Receipt className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="60" strokeWidth="16" fill="none" className={isDark ? "stroke-zinc-800" : "stroke-zinc-200"} />
              <circle
                cx="80" cy="80" r="60" strokeWidth="16" fill="none"
                strokeDasharray={`${(mockData.netPayroll / mockData.totalPayroll) * 377} 377`}
                strokeLinecap="round"
                className="stroke-accent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-4xl font-bold", isDark ? "text-zinc-100" : "text-zinc-900")}>85%</span>
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>실지급율</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={cn("p-3 rounded-2xl text-center", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <div className="w-3 h-3 rounded-full bg-accent mx-auto mb-1" />
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>실지급</p>
              <p className={cn("text-sm font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>85%</p>
            </div>
            <div className={cn("p-3 rounded-2xl text-center", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <div className={cn("w-3 h-3 rounded-full mx-auto mb-1", isDark ? "bg-zinc-500" : "bg-zinc-400")} />
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>4대보험</p>
              <p className={cn("text-sm font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>10%</p>
            </div>
            <div className={cn("p-3 rounded-2xl text-center", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <div className="w-3 h-3 rounded-full bg-amber-500 mx-auto mb-1" />
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>원천세</p>
              <p className={cn("text-sm font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>5%</p>
            </div>
          </div>
        </div>

        {/* Payment Progress */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>지급 진행률</h3>
            <Clock className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="60" strokeWidth="16" fill="none" className={isDark ? "stroke-zinc-800" : "stroke-zinc-200"} />
              <circle
                cx="80" cy="80" r="60" strokeWidth="16" fill="none"
                strokeDasharray={`${progressRate * 3.77} 377`}
                strokeLinecap="round"
                className="stroke-accent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-4xl font-bold", isDark ? "text-zinc-100" : "text-zinc-900")}>{mockData.completedCount}</span>
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>/ {mockData.employeeCount}명</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>완료</span>
              <span className="text-sm font-semibold text-accent">{mockData.completedCount}명</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>예정</span>
              <span className="text-sm font-semibold text-amber-500">{mockData.employeeCount - mockData.completedCount}명</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Payments */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>급여 지급 현황</h3>
            <button className="text-sm text-accent hover:text-accent/80 flex items-center gap-1">
              전체보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {mockData.recentPayments.map((payment) => (
              <div key={payment.id} className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-colors",
                isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200"
              )}>
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-lg">
                  {payment.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{payment.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      payment.status === 'completed' ? "bg-accent/20 text-accent" : "bg-amber-500/20 text-amber-500"
                    )}>
                      {payment.status === 'completed' ? '완료' : '예정'}
                    </span>
                  </div>
                  <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>{payment.department} · {payment.date}</span>
                </div>
                <span className={cn("font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatFullCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-4">
          {/* Payroll Breakdown */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>급여 구성</h3>
              <Calculator className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
            </div>
            <div className="space-y-3">
              {mockData.payrollBreakdown.slice(0, 4).map((item, idx) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-3 h-3 rounded-sm",
                        idx === 0 ? "bg-accent" : isDark ? "bg-zinc-600" : "bg-zinc-400"
                      )} />
                      <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.label}</span>
                    </div>
                    <span className={cn("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(item.amount)}</span>
                  </div>
                  <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                    <div className={cn(
                      "h-full rounded-full",
                      idx === 0 ? "bg-accent" : isDark ? "bg-zinc-500" : "bg-zinc-400"
                    )} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Stats */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>부서별 급여</h3>
              <Building2 className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mockData.departmentStats.map((dept) => (
                <div key={dept.name} className={cn(
                  "p-4 rounded-2xl",
                  isDark ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-accent" />
                    <span className={cn("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{dept.name}</span>
                  </div>
                  <p className="text-lg font-bold text-accent">{formatCurrency(dept.amount)}</p>
                  <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>{dept.count}명</p>
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
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Calculator, label: '급여 계산' },
            { icon: FileText, label: '명세서' },
            { icon: Shield, label: '4대보험' },
            { icon: Receipt, label: '연말정산' },
          ].map((action, idx) => (
            <button key={idx} className={cn(
              "p-4 rounded-2xl text-center transition-all hover:scale-105",
              isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200"
            )}>
              <action.icon className="w-6 h-6 mx-auto mb-2 text-accent" />
              <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

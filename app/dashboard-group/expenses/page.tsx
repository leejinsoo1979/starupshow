'use client'

import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Car,
  Plane,
  CheckCircle,
  Clock,
  XCircle,
  Utensils,
  Hotel,
  ShoppingBag,
  TrendingUp,
  FileText,
  Upload,
  Download,
  ChevronRight,
  CreditCard,
  Plus,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export default function ExpensesDashboardPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  // Mock data
  const mockData = {
    totalExpense: 8450000,
    budget: 10000000,
    approved: 6280000,
    pending: 1840000,
    rejected: 330000,
    changePercent: 12.5,
    monthlyTrend: [
      { month: '8월', expense: 7100000, budget: 8000000 },
      { month: '9월', expense: 5800000, budget: 8000000 },
      { month: '10월', expense: 7500000, budget: 8000000 },
      { month: '11월', expense: 6900000, budget: 8000000 },
      { month: '12월', expense: 8450000, budget: 8000000 },
      { month: '1월', expense: 5200000, budget: 8000000 },
    ],
    categoryBreakdown: [
      { name: '출장비', amount: 2480000, percent: 29.3, icon: Plane },
      { name: '식대', amount: 2150000, percent: 25.4, icon: Utensils },
      { name: '교통비', amount: 1820000, percent: 21.5, icon: Car },
      { name: '숙박비', amount: 890000, percent: 10.5, icon: Hotel },
      { name: '소모품', amount: 650000, percent: 7.7, icon: ShoppingBag },
    ],
    topSpenders: [
      { name: '김영수', department: '영업팀', amount: 1250000, count: 18 },
      { name: '이지현', department: '마케팅팀', amount: 980000, count: 14 },
      { name: '박준혁', department: '기술팀', amount: 870000, count: 11 },
      { name: '최민서', department: '경영지원팀', amount: 650000, count: 9 },
    ],
    recentExpenses: [
      { id: 'EXP-0892', date: '01/03', employee: '김영수', category: '출장비', amount: 285000, status: 'approved' },
      { id: 'EXP-0891', date: '01/02', employee: '이지현', category: '식대', amount: 420000, status: 'approved' },
      { id: 'EXP-0890', date: '01/02', employee: '박준혁', category: '교통비', amount: 35000, status: 'pending' },
      { id: 'EXP-0889', date: '01/01', employee: '최민서', category: '소모품', amount: 89000, status: 'approved' },
      { id: 'EXP-0888', date: '01/01', employee: '김영수', category: '숙박비', amount: 150000, status: 'pending' },
    ],
    pendingApprovals: [
      { id: 'EXP-0890', employee: '박준혁', category: '교통비', amount: 35000, date: '01/02' },
      { id: 'EXP-0888', employee: '김영수', category: '숙박비', amount: 150000, date: '01/01' },
      { id: 'EXP-0885', employee: '정하늘', category: '출장비', amount: 380000, date: '12/30' },
    ],
  }

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₩${(value / 10000000).toFixed(1)}천만`
    if (value >= 10000) return `₩${Math.round(value / 10000)}만`
    return `₩${value.toLocaleString()}`
  }

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value)
  }

  const budgetUsage = (mockData.totalExpense / mockData.budget) * 100
  const isOverBudget = budgetUsage > 100
  const maxExpense = Math.max(...mockData.monthlyTrend.map(m => Math.max(m.expense, m.budget)))
  const maxSpenderAmount = Math.max(...mockData.topSpenders.map(s => s.amount))

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
            <Receipt className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className={cn(
              "text-3xl font-bold tracking-tight",
              isDark ? "text-zinc-100" : "text-zinc-900"
            )}>경비관리</h1>
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
          { title: '이번 달 경비', value: formatCurrency(mockData.totalExpense), sub: `예산 ${formatCurrency(mockData.budget)}`, trend: `-${mockData.changePercent}%`, type: 'accent', icon: CreditCard },
          { title: '승인 완료', value: formatCurrency(mockData.approved), sub: `${Math.round((mockData.approved / mockData.totalExpense) * 100)}% 처리됨`, type: 'success', icon: CheckCircle },
          { title: '승인 대기', value: formatCurrency(mockData.pending), sub: `${mockData.pendingApprovals.length}건 대기중`, type: 'warning', icon: Clock },
          { title: '반려', value: formatCurrency(mockData.rejected), sub: '사유 확인 필요', type: 'danger', icon: XCircle },
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
                stat.type === 'success' ? "bg-green-500/20" :
                stat.type === 'warning' ? "bg-amber-500/20" :
                stat.type === 'danger' ? "bg-red-500/20" :
                "bg-accent/20"
              )}>
                <stat.icon className={cn(
                  "w-4 h-4",
                  stat.type === 'success' ? "text-green-500" :
                  stat.type === 'warning' ? "text-amber-500" :
                  stat.type === 'danger' ? "text-red-500" :
                  "text-accent"
                )} />
              </div>
            </div>
            <p className={cn("text-3xl font-bold tracking-tight mb-1", isDark ? "text-zinc-100" : "text-zinc-900")}>{stat.value}</p>
            {stat.trend && (
              <span className="text-sm font-medium text-green-500">{stat.trend} 전월 대비</span>
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
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>월별 경비 추이</h3>
            <TrendingUp className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="h-48 flex items-end gap-2">
            {mockData.monthlyTrend.map((item) => {
              const expenseHeight = (item.expense / maxExpense) * 100
              const budgetHeight = (item.budget / maxExpense) * 100
              const overBudget = item.expense > item.budget
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 flex items-end gap-0.5 w-full">
                    <div
                      className={cn("flex-1 rounded-lg", isDark ? "bg-zinc-700" : "bg-zinc-200")}
                      style={{ height: `${budgetHeight}%` }}
                    />
                    <div
                      className={cn("flex-1 rounded-lg", overBudget ? "bg-red-500" : "bg-accent")}
                      style={{ height: `${expenseHeight}%` }}
                    />
                  </div>
                  <span className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.month}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", isDark ? "bg-zinc-700" : "bg-zinc-200")} />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>예산</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>사용</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>카테고리별 경비</h3>
            <Receipt className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="space-y-3">
            {mockData.categoryBreakdown.map((cat, idx) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      idx === 0 ? "bg-accent/20" : isDark ? "bg-zinc-700" : "bg-zinc-200"
                    )}>
                      <cat.icon className={cn(
                        "w-3 h-3",
                        idx === 0 ? "text-accent" : isDark ? "text-zinc-400" : "text-zinc-600"
                      )} />
                    </div>
                    <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>{cat.name}</span>
                  </div>
                  <span className={cn("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(cat.amount)}</span>
                </div>
                <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                  <div className={cn(
                    "h-full rounded-full",
                    idx === 0 ? "bg-accent" : isDark ? "bg-zinc-500" : "bg-zinc-400"
                  )} style={{ width: `${cat.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Status */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>예산 현황</h3>
            <CreditCard className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="60" strokeWidth="16" fill="none" className={isDark ? "stroke-zinc-800" : "stroke-zinc-200"} />
              <circle
                cx="80" cy="80" r="60" strokeWidth="16" fill="none"
                strokeDasharray={`${Math.min(budgetUsage, 100) * 3.77} 377`}
                strokeLinecap="round"
                className={isOverBudget ? "stroke-red-500" : "stroke-accent"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-4xl font-bold", isOverBudget ? "text-red-500" : isDark ? "text-zinc-100" : "text-zinc-900")}>
                {budgetUsage.toFixed(0)}%
              </span>
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>소진율</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("p-3 rounded-2xl text-center", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <p className={cn("text-lg font-bold", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(mockData.totalExpense)}</p>
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>사용</p>
            </div>
            <div className={cn("p-3 rounded-2xl text-center", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <p className="text-lg font-bold text-green-500">{formatCurrency(mockData.budget - mockData.totalExpense)}</p>
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>잔여</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Expenses */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>최근 경비</h3>
            <button className="text-sm text-accent hover:text-accent/80 flex items-center gap-1">
              전체보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {mockData.recentExpenses.map((expense) => (
              <div key={expense.id} className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-colors",
                isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200"
              )}>
                <div className={cn("p-3 rounded-xl", isDark ? "bg-zinc-700" : "bg-white")}>
                  <Receipt className={cn("w-5 h-5", isDark ? "text-zinc-400" : "text-zinc-600")} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{expense.employee}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      expense.status === 'approved' ? "bg-green-500/20 text-green-500" :
                      expense.status === 'pending' ? "bg-amber-500/20 text-amber-500" :
                      "bg-red-500/20 text-red-500"
                    )}>
                      {expense.status === 'approved' ? '승인' : expense.status === 'pending' ? '대기' : '반려'}
                    </span>
                  </div>
                  <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>{expense.category} · {expense.date}</span>
                </div>
                <span className={cn("font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatFullCurrency(expense.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-4">
          {/* Top Spenders */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>경비 사용 TOP</h3>
              <TrendingUp className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
            </div>
            <div className="space-y-3">
              {mockData.topSpenders.map((spender, idx) => (
                <div key={spender.name} className="flex items-center gap-3">
                  <span className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold",
                    idx === 0 ? "bg-amber-500/20 text-amber-500" :
                    isDark ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-600"
                  )}>{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-sm", isDark ? "text-zinc-100" : "text-zinc-900")}>{spender.name}</span>
                      <span className={cn("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(spender.amount)}</span>
                    </div>
                    <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                      <div className="h-full bg-accent rounded-full" style={{ width: `${(spender.amount / maxSpenderAmount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approvals */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>승인 대기</h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-accent text-white rounded-full">
                  {mockData.pendingApprovals.length}
                </span>
              </div>
              <Clock className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
            </div>
            <div className="space-y-2">
              {mockData.pendingApprovals.map((item) => (
                <div key={item.id} className={cn(
                  "flex items-center justify-between p-3 rounded-2xl",
                  isDark ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                  <div>
                    <p className={cn("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{item.employee}</p>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.category} · {item.date}</p>
                  </div>
                  <span className={cn("font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(item.amount)}</span>
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
            { icon: Plus, label: '경비 등록' },
            { icon: Upload, label: '영수증' },
            { icon: FileText, label: '정산 내역' },
            { icon: Download, label: '리포트' },
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

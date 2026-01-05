'use client'

import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  CircleDollarSign,
  Receipt,
  FileText,
  Users,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export default function SalesDashboardPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  // Mock data
  const mockData = {
    monthlySales: 124500000,
    monthlyPurchase: 83200000,
    receivables: 21500000,
    payables: 18400000,
    profit: 41300000,
    salesGrowth: 12.5,
    purchaseGrowth: 8.2,
    profitMargin: 33,
    monthlyTrend: [
      { month: '8월', sales: 98, purchase: 72 },
      { month: '9월', sales: 112, purchase: 78 },
      { month: '10월', sales: 95, purchase: 82 },
      { month: '11월', sales: 108, purchase: 71 },
      { month: '12월', sales: 124, purchase: 83 },
      { month: '1월', sales: 130, purchase: 85 },
    ],
    recentTransactions: [
      { id: '1', type: 'sales', partner: '(주)테크솔루션', amount: 15400000, date: '01/05', status: 'completed' },
      { id: '2', type: 'purchase', partner: '글로벌물산', amount: 8200000, date: '01/04', status: 'completed' },
      { id: '3', type: 'sales', partner: '스마트시스템즈', amount: 22800000, date: '01/03', status: 'pending' },
      { id: '4', type: 'purchase', partner: '(주)원자재공급', amount: 5600000, date: '01/02', status: 'completed' },
      { id: '5', type: 'sales', partner: '디지털코리아', amount: 18900000, date: '01/01', status: 'overdue' },
    ],
    topPartners: [
      { name: '(주)테크솔루션', amount: 89400000, percent: 28, trend: 'up' },
      { name: '스마트시스템즈', amount: 67200000, percent: 21, trend: 'up' },
      { name: '디지털코리아', amount: 54100000, percent: 17, trend: 'down' },
      { name: '글로벌물산', amount: 41800000, percent: 13, trend: 'up' },
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

  const maxTrendValue = Math.max(...mockData.monthlyTrend.map(t => Math.max(t.sales, t.purchase)))

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
            <DollarSign className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className={cn(
              "text-3xl font-bold tracking-tight",
              isDark ? "text-zinc-100" : "text-zinc-900"
            )}>매출입관리</h1>
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
          { title: '이번 달 매출', value: formatCurrency(mockData.monthlySales), trend: `+${mockData.salesGrowth}%`, type: 'success', icon: TrendingUp },
          { title: '이번 달 매입', value: formatCurrency(mockData.monthlyPurchase), trend: `-${mockData.purchaseGrowth}%`, type: 'danger', icon: TrendingDown },
          { title: '순이익', value: formatCurrency(mockData.profit), sub: `이익률 ${mockData.profitMargin}%`, type: 'accent', icon: CircleDollarSign },
          { title: '미수금', value: formatCurrency(mockData.receivables), sub: '12건 회수 필요', type: 'warning', icon: Wallet },
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
                stat.type === 'danger' ? "bg-red-500/20" :
                stat.type === 'warning' ? "bg-amber-500/20" :
                "bg-accent/20"
              )}>
                <stat.icon className={cn(
                  "w-4 h-4",
                  stat.type === 'success' ? "text-accent" :
                  stat.type === 'danger' ? "text-red-500" :
                  stat.type === 'warning' ? "text-amber-500" :
                  "text-accent"
                )} />
              </div>
            </div>
            <p className={cn("text-3xl font-bold tracking-tight mb-1", isDark ? "text-zinc-100" : "text-zinc-900")}>{stat.value}</p>
            {stat.trend && (
              <span className={cn(
                "text-sm font-medium",
                stat.type === 'success' ? "text-accent" :
                stat.type === 'danger' ? "text-red-500" :
                "text-accent"
              )}>{stat.trend} 전월 대비</span>
            )}
            {stat.sub && (
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
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>월별 매출/매입</h3>
            <DollarSign className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="h-48 flex items-end gap-2">
            {mockData.monthlyTrend.map((item) => {
              const salesHeight = (item.sales / maxTrendValue) * 100
              const purchaseHeight = (item.purchase / maxTrendValue) * 100
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 flex items-end gap-1 w-full">
                    <div
                      className="flex-1 bg-gradient-to-t from-accent to-accent/60 rounded-lg"
                      style={{ height: `${salesHeight}%` }}
                    />
                    <div
                      className="flex-1 bg-gradient-to-t from-red-500 to-red-500/60 rounded-lg"
                      style={{ height: `${purchaseHeight}%` }}
                    />
                  </div>
                  <span className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-zinc-600")}>{item.month}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>매출</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>매입</span>
            </div>
          </div>
        </div>

        {/* Revenue Structure */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>수익 구조</h3>
            <CircleDollarSign className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="60" strokeWidth="16" fill="none" className={isDark ? "stroke-zinc-800" : "stroke-zinc-200"} />
              <circle
                cx="80" cy="80" r="60" strokeWidth="16" fill="none"
                strokeDasharray={`${(mockData.monthlySales / (mockData.monthlySales + mockData.monthlyPurchase)) * 377} 377`}
                strokeLinecap="round"
                className="stroke-accent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-4xl font-bold", isDark ? "text-zinc-100" : "text-zinc-900")}>{mockData.profitMargin}%</span>
              <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>이익률</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("p-3 rounded-2xl text-center", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <p className="text-xl font-bold text-accent">{formatCurrency(mockData.monthlySales)}</p>
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>매출</p>
            </div>
            <div className={cn("p-3 rounded-2xl text-center", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <p className="text-xl font-bold text-red-500">{formatCurrency(mockData.monthlyPurchase)}</p>
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>매입</p>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>결제 현황</h3>
            <CreditCard className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
          </div>
          <div className="space-y-4">
            {/* Receivables */}
            <div className={cn("p-4 rounded-2xl", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>미수금</span>
                </div>
                <span className={cn("font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(mockData.receivables)}</span>
              </div>
              <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '54%' }} />
              </div>
              <p className={cn("text-xs mt-1", isDark ? "text-zinc-500" : "text-zinc-600")}>12건 회수 필요</p>
            </div>

            {/* Payables */}
            <div className={cn("p-4 rounded-2xl", isDark ? "bg-zinc-800" : "bg-zinc-100")}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent" />
                  <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>미지급금</span>
                </div>
                <span className={cn("font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(mockData.payables)}</span>
              </div>
              <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                <div className="h-full bg-accent rounded-full" style={{ width: '46%' }} />
              </div>
              <p className={cn("text-xs mt-1", isDark ? "text-zinc-500" : "text-zinc-600")}>8건 지급 예정</p>
            </div>

            {/* Net Position */}
            <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30">
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>순 채권</span>
                <span className="font-bold text-accent">+{formatCurrency(mockData.receivables - mockData.payables)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className={cn(
          "rounded-3xl p-6 border transition-all duration-300",
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>최근 거래 내역</h3>
            <button className="text-sm text-accent hover:text-accent/80 flex items-center gap-1">
              전체보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {mockData.recentTransactions.map((tx) => (
              <div key={tx.id} className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-colors",
                isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200"
              )}>
                <div className={cn(
                  "p-3 rounded-xl",
                  tx.type === 'sales' ? "bg-accent/20" : "bg-red-500/20"
                )}>
                  {tx.type === 'sales' ? (
                    <ArrowUpRight className="w-5 h-5 text-accent" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{tx.partner}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      tx.status === 'completed' ? "bg-accent/20 text-accent" :
                      tx.status === 'pending' ? "bg-amber-500/20 text-amber-500" :
                      "bg-red-500/20 text-red-500"
                    )}>
                      {tx.status === 'completed' ? '완료' : tx.status === 'pending' ? '대기' : '연체'}
                    </span>
                  </div>
                  <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>{tx.date}</span>
                </div>
                <span className={cn(
                  "font-semibold",
                  tx.type === 'sales' ? "text-accent" : "text-red-500"
                )}>
                  {tx.type === 'sales' ? '+' : '-'}{formatFullCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Partners & Quick Actions */}
        <div className="space-y-4">
          {/* Top Partners */}
          <div className={cn(
            "rounded-3xl p-6 border transition-all duration-300",
            isDark
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-semibold", isDark ? "text-zinc-100" : "text-zinc-900")}>주요 거래처</h3>
              <Users className={cn("w-5 h-5", isDark ? "text-zinc-500" : "text-zinc-600")} />
            </div>
            <div className="space-y-3">
              {mockData.topPartners.map((partner, idx) => (
                <div key={partner.name} className="flex items-center gap-3">
                  <span className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold",
                    isDark ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-600"
                  )}>{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-sm", isDark ? "text-zinc-100" : "text-zinc-900")}>{partner.name}</span>
                      <div className="flex items-center gap-1">
                        <span className={cn("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{formatCurrency(partner.amount)}</span>
                        {partner.trend === 'up' ? (
                          <ArrowUpRight className="w-4 h-4 text-accent" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-zinc-700" : "bg-zinc-200")}>
                      <div className="h-full bg-accent rounded-full" style={{ width: `${partner.percent}%` }} />
                    </div>
                  </div>
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
            <h3 className={cn("text-lg font-semibold mb-4", isDark ? "text-zinc-100" : "text-zinc-900")}>빠른 작업</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: '매출 등록' },
                { icon: TrendingDown, label: '매입 등록' },
                { icon: FileText, label: '세금계산서' },
                { icon: Users, label: '거래처 관리' },
                { icon: Receipt, label: '미수금 관리' },
                { icon: CreditCard, label: '미지급 관리' },
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
      </div>
    </div>
  )
}

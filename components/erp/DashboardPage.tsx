'use client'

import React, { useMemo } from 'react'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
  Receipt,
  BarChart3,
  Activity,
  Zap,
  Target,
  ArrowRight,
} from 'lucide-react'
import { useDashboard } from '@/lib/erp/hooks'
import { useThemeStore, accentColors } from '@/stores/themeStore'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const { data, loading } = useDashboard()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const accentColor = useThemeStore((s) => s.accentColor)
  const themeConfig = useMemo(() => {
    return accentColors.find(c => c.id === accentColor) || accentColors[0]
  }, [accentColor])

  const formatCompact = (amount: number) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}천만`
    if (amount >= 10000) return `${Math.round(amount / 10000)}만`
    return amount.toLocaleString()
  }

  const currentDate = new Date()
  const hours = currentDate.getHours()
  const greeting = hours < 12 ? '좋은 아침이에요' : hours < 18 ? '좋은 오후예요' : '좋은 저녁이에요'

  const profit = data?.financials?.monthly_profit || 0
  const isProfit = profit >= 0
  const attendanceRate = data?.employees?.active
    ? Math.round((data.employees.today_attendance / data.employees.active) * 100)
    : 0

  // Skeleton component
  const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn(
      "animate-pulse rounded",
      isDark ? "bg-white/5" : "bg-black/5",
      className
    )} />
  )

  return (
    <div className={cn(
      "min-h-full p-8",
      isDark ? "bg-[#0a0a0a]" : "bg-[#fafafa]"
    )}>
      {/* Header */}
      <div className="mb-8">
        <p className={cn(
          "text-sm mb-1",
          isDark ? "text-white/40" : "text-black/40"
        )}>
          {currentDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
        <h1 className={cn(
          "text-3xl font-semibold tracking-tight",
          isDark ? "text-white" : "text-black"
        )}>
          {greeting}
        </h1>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-5 mb-5">
        {/* 직원 현황 */}
        <div className={cn(
          "group relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.04]"
            : "bg-white hover:shadow-lg hover:shadow-black/5"
        )}>
          <div className="flex items-start justify-between mb-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${themeConfig.color}15` }}
            >
              <Users className="w-5 h-5" style={{ color: themeConfig.color }} />
            </div>
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
            )}>
              <Activity className="w-3 h-3" />
              <span>Active</span>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-10 w-20 mb-2" />
          ) : (
            <div className="mb-2">
              <span className={cn(
                "text-4xl font-bold tracking-tight tabular-nums",
                isDark ? "text-white" : "text-black"
              )}>
                {data?.employees?.total || 0}
              </span>
              <span className={cn(
                "text-lg ml-1",
                isDark ? "text-white/40" : "text-black/40"
              )}>명</span>
            </div>
          )}

          <p className={cn(
            "text-sm",
            isDark ? "text-white/50" : "text-black/50"
          )}>전체 직원</p>
        </div>

        {/* 오늘 출근 */}
        <div className={cn(
          "group relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.04]"
            : "bg-white hover:shadow-lg hover:shadow-black/5"
        )}>
          <div className="flex items-start justify-between mb-6">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10">
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded-full tabular-nums",
              attendanceRate >= 80
                ? isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                : isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
            )}>
              {attendanceRate}%
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-10 w-16 mb-2" />
          ) : (
            <div className="mb-2">
              <span className={cn(
                "text-4xl font-bold tracking-tight tabular-nums",
                isDark ? "text-white" : "text-black"
              )}>
                {data?.employees?.today_attendance || 0}
              </span>
              <span className={cn(
                "text-lg ml-1",
                isDark ? "text-white/40" : "text-black/40"
              )}>명</span>
            </div>
          )}

          <p className={cn(
            "text-sm",
            isDark ? "text-white/50" : "text-black/50"
          )}>오늘 출근</p>
        </div>

        {/* 이번 달 매출 */}
        <div className={cn(
          "group relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.04]"
            : "bg-white hover:shadow-lg hover:shadow-black/5"
        )}>
          <div className="flex items-start justify-between mb-6">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              "text-emerald-500"
            )}>
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12%</span>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-10 w-24 mb-2" />
          ) : (
            <div className="mb-2">
              <span className={cn(
                "text-4xl font-bold tracking-tight tabular-nums",
                isDark ? "text-white" : "text-black"
              )}>
                {formatCompact(data?.financials?.monthly_sales || 0)}
              </span>
            </div>
          )}

          <p className={cn(
            "text-sm",
            isDark ? "text-white/50" : "text-black/50"
          )}>이번 달 매출</p>
        </div>

        {/* 이번 달 매입 */}
        <div className={cn(
          "group relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.04]"
            : "bg-white hover:shadow-lg hover:shadow-black/5"
        )}>
          <div className="flex items-start justify-between mb-6">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-orange-500/10">
              <TrendingDown className="w-5 h-5 text-orange-500" />
            </div>
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              "text-red-500"
            )}>
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>-5%</span>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-10 w-24 mb-2" />
          ) : (
            <div className="mb-2">
              <span className={cn(
                "text-4xl font-bold tracking-tight tabular-nums",
                isDark ? "text-white" : "text-black"
              )}>
                {formatCompact(data?.financials?.monthly_purchases || 0)}
              </span>
            </div>
          )}

          <p className={cn(
            "text-sm",
            isDark ? "text-white/50" : "text-black/50"
          )}>이번 달 매입</p>
        </div>
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* 손익 카드 - 강조 */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl p-6",
            isProfit
              ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
              : "bg-gradient-to-br from-red-500 to-red-600"
          )}
        >
          <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8">
            <div className={cn(
              "w-full h-full rounded-full",
              isProfit ? "bg-emerald-400/20" : "bg-red-400/20"
            )} />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-sm">이번 달 손익</p>
                <p className="text-white/50 text-xs">매출 - 매입</p>
              </div>
            </div>

            {loading ? (
              <div className="h-10 w-32 bg-white/20 rounded animate-pulse" />
            ) : (
              <p className="text-4xl font-bold text-white tracking-tight tabular-nums">
                {isProfit ? '+' : ''}{formatCompact(profit)}
                <span className="text-lg font-normal ml-1 text-white/70">원</span>
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                {isProfit ? '흑자' : '적자'}
              </span>
            </div>
          </div>
        </div>

        {/* 매출채권 */}
        <div className={cn(
          "rounded-2xl p-6 transition-all duration-300",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
            : "bg-white"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium",
                isDark ? "text-white" : "text-black"
              )}>매출채권</p>
              <p className={cn(
                "text-xs",
                isDark ? "text-white/40" : "text-black/40"
              )}>받을 돈</p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <p className={cn(
              "text-3xl font-bold tracking-tight tabular-nums",
              isDark ? "text-white" : "text-black"
            )}>
              {formatCompact(data?.financials?.total_receivable || 0)}
              <span className={cn(
                "text-sm font-normal ml-1",
                isDark ? "text-white/40" : "text-black/40"
              )}>원</span>
            </p>
          )}
        </div>

        {/* 매입채무 */}
        <div className={cn(
          "rounded-2xl p-6 transition-all duration-300",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
            : "bg-white"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium",
                isDark ? "text-white" : "text-black"
              )}>매입채무</p>
              <p className={cn(
                "text-xs",
                isDark ? "text-white/40" : "text-black/40"
              )}>줄 돈</p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : (
            <p className={cn(
              "text-3xl font-bold tracking-tight tabular-nums",
              isDark ? "text-white" : "text-black"
            )}>
              {formatCompact(data?.financials?.total_payable || 0)}
              <span className={cn(
                "text-sm font-normal ml-1",
                isDark ? "text-white/40" : "text-black/40"
              )}>원</span>
            </p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-5 gap-5">
        {/* 승인 대기 */}
        <div className={cn(
          "col-span-2 rounded-2xl overflow-hidden",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
            : "bg-white"
        )}>
          <div className={cn(
            "px-6 py-4 flex items-center justify-between",
            isDark ? "border-b border-white/5" : "border-b border-black/5"
          )}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${themeConfig.color}15` }}
              >
                <Receipt className="w-4 h-4" style={{ color: themeConfig.color }} />
              </div>
              <span className={cn(
                "font-semibold",
                isDark ? "text-white" : "text-black"
              )}>승인 대기</span>
            </div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full tabular-nums"
              style={{
                backgroundColor: `${themeConfig.color}15`,
                color: themeConfig.color
              }}
            >
              {(data?.leaves?.pending || 0) + (data?.expenses?.pending || 0)}
            </span>
          </div>

          <div className="p-3">
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all",
              isDark ? "hover:bg-white/5" : "hover:bg-black/[0.02]"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className={cn(
                    "font-medium",
                    isDark ? "text-white" : "text-black"
                  )}>휴가 신청</p>
                  <p className={cn(
                    "text-xs",
                    isDark ? "text-white/40" : "text-black/40"
                  )}>승인 대기</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-2xl font-bold tabular-nums",
                  isDark ? "text-white" : "text-black"
                )}>
                  {data?.leaves?.pending || 0}
                </span>
                <ArrowRight className={cn(
                  "w-4 h-4",
                  isDark ? "text-white/30" : "text-black/30"
                )} />
              </div>
            </div>

            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all",
              isDark ? "hover:bg-white/5" : "hover:bg-black/[0.02]"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className={cn(
                    "font-medium",
                    isDark ? "text-white" : "text-black"
                  )}>경비 신청</p>
                  <p className={cn(
                    "text-xs",
                    isDark ? "text-white/40" : "text-black/40"
                  )}>결재 대기</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-2xl font-bold tabular-nums",
                  isDark ? "text-white" : "text-black"
                )}>
                  {data?.expenses?.pending || 0}
                </span>
                <ArrowRight className={cn(
                  "w-4 h-4",
                  isDark ? "text-white/30" : "text-black/30"
                )} />
              </div>
            </div>
          </div>
        </div>

        {/* 월별 매출/매입 차트 */}
        <div className={cn(
          "col-span-3 rounded-2xl overflow-hidden",
          isDark
            ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
            : "bg-white"
        )}>
          <div className={cn(
            "px-6 py-4 flex items-center justify-between",
            isDark ? "border-b border-white/5" : "border-b border-black/5"
          )}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${themeConfig.color}15` }}
              >
                <BarChart3 className="w-4 h-4" style={{ color: themeConfig.color }} />
              </div>
              <span className={cn(
                "font-semibold",
                isDark ? "text-white" : "text-black"
              )}>월별 추이</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: themeConfig.color }}
                />
                <span className={cn(
                  "text-xs",
                  isDark ? "text-white/50" : "text-black/50"
                )}>매출</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isDark ? "bg-white/30" : "bg-black/20"
                )} />
                <span className={cn(
                  "text-xs",
                  isDark ? "text-white/50" : "text-black/50"
                )}>매입</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="h-40 flex items-end gap-6">
              {(data?.monthly_trend || Array(6).fill({ month: '', sales: 0, purchases: 0 })).map((item: any, index: number) => {
                const maxValue = Math.max(
                  ...(data?.monthly_trend || []).map((t: any) => Math.max(t.sales, t.purchases)),
                  1
                )
                const salesHeight = maxValue > 0 ? (item.sales / maxValue) * 100 : 8
                const purchasesHeight = maxValue > 0 ? (item.purchases / maxValue) * 100 : 8

                return (
                  <div key={item.month || index} className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-full flex items-end justify-center gap-2 h-28">
                      <div
                        className="flex-1 max-w-4 rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(salesHeight, 8)}%`,
                          backgroundColor: themeConfig.color,
                        }}
                      />
                      <div
                        className={cn(
                          "flex-1 max-w-4 rounded-t-md transition-all duration-500",
                          isDark ? "bg-white/20" : "bg-black/10"
                        )}
                        style={{
                          height: `${Math.max(purchasesHeight, 8)}%`,
                        }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs tabular-nums",
                      isDark ? "text-white/40" : "text-black/40"
                    )}>
                      {item.month ? `${item.month.slice(-2)}월` : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

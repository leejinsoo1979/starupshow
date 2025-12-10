'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, Zap, Building2 } from 'lucide-react'

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted?: boolean
  icon: React.ComponentType<{ className?: string }>
  cta: string
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '무료',
    period: '',
    description: '스타트업 초기 단계에 적합',
    icon: Zap,
    cta: '무료로 시작하기',
    features: [
      '팀원 최대 3명',
      '기본 대시보드',
      '커밋 기록 무제한',
      '주간 AI 리포트 1회',
      '기본 KPI 추적',
      '이메일 지원',
    ],
  },
  {
    name: 'Pro',
    price: '49,000',
    period: '월',
    description: '성장하는 스타트업을 위한 플랜',
    icon: Sparkles,
    highlighted: true,
    cta: '14일 무료 체험',
    features: [
      '팀원 최대 15명',
      '고급 대시보드 & 분석',
      '무제한 커밋 & 태스크',
      '일일 AI 인사이트',
      '고급 KPI & 리포팅',
      '투자자 대시보드',
      '슬랙 연동',
      '우선 지원',
    ],
  },
  {
    name: 'Enterprise',
    price: '맞춤',
    period: '',
    description: '대규모 조직을 위한 솔루션',
    icon: Building2,
    cta: '문의하기',
    features: [
      '무제한 팀원',
      '전용 인프라',
      '커스텀 AI 모델',
      '실시간 AI 분석',
      '고급 보안 & 감사',
      'API 액세스',
      '전용 계정 매니저',
      'SLA 보장',
      '온보딩 지원',
    ],
  },
]

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <section id="pricing" className="py-24 bg-white dark:bg-zinc-950">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent mb-4"
          >
            가격 정책
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4"
          >
            성장 단계에 맞는 플랜을 선택하세요
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-600 dark:text-zinc-400"
          >
            모든 플랜에서 핵심 기능을 사용할 수 있습니다. 팀 규모에 맞게 업그레이드하세요.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              연간 결제
              <span className="ml-2 text-xs text-accent font-semibold">20% 할인</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => {
            const Icon = tier.icon
            const displayPrice = tier.price === '무료' || tier.price === '맞춤'
              ? tier.price
              : billingPeriod === 'yearly'
                ? `${Math.round(parseInt(tier.price.replace(',', '')) * 0.8).toLocaleString()}`
                : tier.price

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  tier.highlighted
                    ? 'bg-accent text-white ring-4 ring-accent/20'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-white text-accent text-sm font-semibold rounded-full shadow-lg">
                      가장 인기
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    tier.highlighted
                      ? 'bg-white/20'
                      : 'bg-accent/10'
                  }`}>
                    <Icon className={`w-6 h-6 ${tier.highlighted ? 'text-white' : 'text-accent'}`} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${
                    tier.highlighted ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {tier.name}
                  </h3>
                  <p className={`text-sm ${
                    tier.highlighted ? 'text-white/80' : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {tier.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className={`text-4xl font-bold ${
                    tier.highlighted ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {displayPrice !== '무료' && displayPrice !== '맞춤' && '₩'}
                    {displayPrice}
                  </span>
                  {tier.period && (
                    <span className={`text-sm ml-1 ${
                      tier.highlighted ? 'text-white/70' : 'text-zinc-500'
                    }`}>
                      /{tier.period}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <button
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all mb-6 ${
                    tier.highlighted
                      ? 'bg-white text-accent hover:bg-zinc-100'
                      : 'bg-accent text-white hover:bg-accent/90'
                  }`}
                >
                  {tier.cta}
                </button>

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        tier.highlighted ? 'text-white' : 'text-accent'
                      }`} />
                      <span className={`text-sm ${
                        tier.highlighted ? 'text-white/90' : 'text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ Link */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12 text-zinc-600 dark:text-zinc-400"
        >
          가격에 대해 궁금한 점이 있으신가요?{' '}
          <a href="#contact" className="text-accent hover:underline font-medium">
            자주 묻는 질문
          </a>
          을 확인하세요.
        </motion.p>
      </div>
    </section>
  )
}

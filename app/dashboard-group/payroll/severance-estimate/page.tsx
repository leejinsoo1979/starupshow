'use client'
import { GenericPage } from '@/components/erp'
import { TrendingUp } from 'lucide-react'

export default function Page() {
  return <GenericPage title="퇴직금추계액" description="퇴직금 추계액을 계산합니다" icon={TrendingUp} showAddButton={false} />
}

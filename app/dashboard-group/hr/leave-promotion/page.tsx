'use client'
import { GenericPage } from '@/components/erp'
import { TrendingUp } from 'lucide-react'

export default function Page() {
  return <GenericPage title="연차촉진 현황" description="연차 촉진 현황을 확인합니다" icon={TrendingUp} showAddButton={false} />
}

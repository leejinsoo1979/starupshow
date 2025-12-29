'use client'
import { GenericPage } from '@/components/erp'
import { BarChart3 } from 'lucide-react'

export default function Page() {
  return <GenericPage title="인건비현황" description="인건비 현황을 조회합니다" icon={BarChart3} showAddButton={false} />
}

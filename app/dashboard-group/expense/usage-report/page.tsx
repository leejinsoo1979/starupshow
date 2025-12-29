'use client'
import { GenericPage } from '@/components/erp'
import { BarChart3 } from 'lucide-react'

export default function Page() {
  return <GenericPage title="경비사용현황" description="경비 사용 현황을 조회합니다" icon={BarChart3} showAddButton={false} />
}

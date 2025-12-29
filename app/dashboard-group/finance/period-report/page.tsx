'use client'
import { GenericPage } from '@/components/erp'
import { CalendarRange } from 'lucide-react'

export default function Page() {
  return <GenericPage title="기간별시재보고" description="기간별 시재 현황을 확인합니다" icon={CalendarRange} showAddButton={false} />
}

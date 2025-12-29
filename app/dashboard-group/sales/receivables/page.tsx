'use client'
import { GenericPage } from '@/components/erp'
import { CircleDollarSign } from 'lucide-react'

export default function Page() {
  return <GenericPage title="미수금현황" description="미수금 현황을 조회합니다" icon={CircleDollarSign} showAddButton={false} />
}

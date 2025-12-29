'use client'
import { GenericPage } from '@/components/erp'
import { Wallet } from 'lucide-react'

export default function Page() {
  return <GenericPage title="미지급현황" description="미지급 현황을 조회합니다" icon={Wallet} showAddButton={false} />
}

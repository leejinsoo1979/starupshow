'use client'
import { GenericPage } from '@/components/erp'
import { TrendingUp } from 'lucide-react'

export default function Page() {
  return <GenericPage title="간편손익" description="간편 손익을 조회합니다" icon={TrendingUp} showAddButton={false} />
}

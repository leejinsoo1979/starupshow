'use client'
import { GenericPage } from '@/components/erp'
import { RefreshCw } from 'lucide-react'

export default function Page() {
  return <GenericPage title="환율조회" description="실시간 환율을 조회합니다" icon={RefreshCw} showAddButton={false} />
}

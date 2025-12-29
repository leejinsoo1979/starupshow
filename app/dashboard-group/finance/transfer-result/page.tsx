'use client'
import { GenericPage } from '@/components/erp'
import { CheckCircle } from 'lucide-react'

export default function Page() {
  return <GenericPage title="이체결과조회" description="이체 결과를 조회합니다" icon={CheckCircle} showAddButton={false} />
}

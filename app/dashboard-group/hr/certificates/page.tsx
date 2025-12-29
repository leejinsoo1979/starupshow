'use client'
import { GenericPage } from '@/components/erp'
import { FileCheck } from 'lucide-react'

export default function Page() {
  return <GenericPage title="증명발급현황" description="증명서 발급 현황을 조회합니다" icon={FileCheck} addButtonLabel="증명서 발급" />
}

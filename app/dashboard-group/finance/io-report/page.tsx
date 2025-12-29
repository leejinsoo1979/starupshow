'use client'
import { GenericPage } from '@/components/erp'
import { ArrowLeftRight } from 'lucide-react'

export default function Page() {
  return <GenericPage title="입출금내역보고" description="입출금 내역을 보고합니다" icon={ArrowLeftRight} showAddButton={false} />
}

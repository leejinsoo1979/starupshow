'use client'
import { GenericPage } from '@/components/erp'
import { Clock } from 'lucide-react'

export default function Page() {
  return <GenericPage title="이체대기" description="이체 대기 내역을 확인합니다" icon={Clock} addButtonLabel="이체 등록" />
}

'use client'
import { GenericPage } from '@/components/erp'
import { Clock } from 'lucide-react'

export default function Page() {
  return <GenericPage title="근로시간관리" description="근로시간을 관리합니다" icon={Clock} addButtonLabel="시간 등록" />
}

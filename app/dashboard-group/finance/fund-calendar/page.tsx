'use client'
import { GenericPage } from '@/components/erp'
import { Calendar } from 'lucide-react'

export default function Page() {
  return <GenericPage title="자금캘린더" description="자금 일정을 캘린더로 확인합니다" icon={Calendar} addButtonLabel="일정 추가" />
}

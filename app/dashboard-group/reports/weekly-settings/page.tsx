'use client'
import { GenericPage } from '@/components/erp'
import { CalendarDays } from 'lucide-react'

export default function Page() {
  return <GenericPage title="주간리포트 설정" description="주간 리포트를 설정합니다" icon={CalendarDays} addButtonLabel="설정 추가" />
}

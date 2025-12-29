'use client'
import { GenericPage } from '@/components/erp'
import { CalendarX } from 'lucide-react'

export default function Page() {
  return <GenericPage title="휴일대체 관리" description="휴일대체를 관리합니다" icon={CalendarX} addButtonLabel="휴일대체 등록" />
}

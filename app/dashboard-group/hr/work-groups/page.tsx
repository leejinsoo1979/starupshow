'use client'
import { GenericPage } from '@/components/erp'
import { Clock } from 'lucide-react'

export default function Page() {
  return <GenericPage title="근무그룹 관리" description="근무 그룹을 설정하고 관리합니다" icon={Clock} addButtonLabel="그룹 추가" />
}

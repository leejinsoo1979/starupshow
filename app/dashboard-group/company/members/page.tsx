'use client'
import { GenericPage } from '@/components/erp'
import { Users } from 'lucide-react'

export default function Page() {
  return <GenericPage title="팀원 현황" description="팀원 현황을 조회합니다" icon={Users} addButtonLabel="팀원 추가" />
}

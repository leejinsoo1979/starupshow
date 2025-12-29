'use client'
import { GenericPage } from '@/components/erp'
import { Users } from 'lucide-react'

export default function Page() {
  return <GenericPage title="팀설계" description="조직 구조와 팀을 설계합니다" icon={Users} addButtonLabel="팀 추가" />
}

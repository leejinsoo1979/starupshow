'use client'
import { GenericPage } from '@/components/erp'
import { UserCog } from 'lucide-react'

export default function Page() {
  return <GenericPage title="계정상태관리" description="사원 계정 상태를 관리합니다" icon={UserCog} addButtonLabel="계정 추가" />
}

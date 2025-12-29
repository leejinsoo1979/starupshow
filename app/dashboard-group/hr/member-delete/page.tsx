'use client'
import { GenericPage } from '@/components/erp'
import { UserMinus } from 'lucide-react'

export default function Page() {
  return <GenericPage title="팀원삭제관리" description="삭제된 팀원 정보를 관리합니다" icon={UserMinus} showAddButton={false} />
}

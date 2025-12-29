'use client'
import { GenericPage } from '@/components/erp'
import { History } from 'lucide-react'

export default function Page() {
  return <GenericPage title="부가세 납부환급이력" description="부가세 납부/환급 이력을 조회합니다" icon={History} showAddButton={false} />
}

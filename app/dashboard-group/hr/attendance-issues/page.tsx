'use client'
import { GenericPage } from '@/components/erp'
import { AlertCircle } from 'lucide-react'

export default function Page() {
  return <GenericPage title="출퇴근이상자 관리" description="출퇴근 이상자를 확인하고 관리합니다" icon={AlertCircle} showAddButton={false} />
}

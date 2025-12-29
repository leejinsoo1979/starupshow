'use client'
import { GenericPage } from '@/components/erp'
import { Wallet } from 'lucide-react'

export default function Page() {
  return <GenericPage title="퇴직금대장(작성)" description="퇴직금대장을 작성합니다" icon={Wallet} addButtonLabel="퇴직금 등록" />
}

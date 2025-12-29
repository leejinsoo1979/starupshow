'use client'
import { GenericPage } from '@/components/erp'
import { Landmark } from 'lucide-react'

export default function Page() {
  return <GenericPage title="은행대출금" description="은행 대출금을 관리합니다" icon={Landmark} addButtonLabel="대출 등록" />
}

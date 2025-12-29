'use client'
import { GenericPage } from '@/components/erp'
import { ArrowUpFromLine } from 'lucide-react'

export default function Page() {
  return <GenericPage title="통장출금(지급)" description="통장 출금 내역을 관리합니다" icon={ArrowUpFromLine} addButtonLabel="출금 등록" />
}

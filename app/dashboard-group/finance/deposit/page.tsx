'use client'
import { GenericPage } from '@/components/erp'
import { ArrowDownToLine } from 'lucide-react'

export default function Page() {
  return <GenericPage title="통장입금(수납)" description="통장 입금 내역을 관리합니다" icon={ArrowDownToLine} addButtonLabel="입금 등록" />
}

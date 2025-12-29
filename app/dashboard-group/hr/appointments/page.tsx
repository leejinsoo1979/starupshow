'use client'
import { GenericPage } from '@/components/erp'
import { FileText } from 'lucide-react'

export default function Page() {
  return <GenericPage title="인사발령" description="인사발령 내역을 관리합니다" icon={FileText} addButtonLabel="발령 등록" />
}

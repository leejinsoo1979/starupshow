'use client'
import { GenericPage } from '@/components/erp'
import { FileText } from 'lucide-react'

export default function Page() {
  return <GenericPage title="연차정책 관리" description="연차 정책을 설정합니다" icon={FileText} addButtonLabel="정책 추가" />
}

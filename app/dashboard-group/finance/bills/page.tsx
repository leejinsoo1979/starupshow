'use client'
import { GenericPage } from '@/components/erp'
import { FileText } from 'lucide-react'

export default function Page() {
  return <GenericPage title="어음대장" description="어음을 관리합니다" icon={FileText} addButtonLabel="어음 등록" />
}

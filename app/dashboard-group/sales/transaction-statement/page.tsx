'use client'
import { GenericPage } from '@/components/erp'
import { FileText } from 'lucide-react'

export default function Page() {
  return <GenericPage title="거래명세서 작성" description="거래명세서를 작성합니다" icon={FileText} addButtonLabel="명세서 작성" />
}

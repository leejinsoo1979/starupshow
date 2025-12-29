'use client'
import { GenericPage } from '@/components/erp'
import { FileText } from 'lucide-react'

export default function Page() {
  return <GenericPage title="일용근로지급명세서" description="일용직 지급명세서를 관리합니다" icon={FileText} addButtonLabel="명세서 작성" />
}

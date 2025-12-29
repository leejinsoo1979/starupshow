'use client'
import { GenericPage } from '@/components/erp'
import { FolderOpen } from 'lucide-react'

export default function Page() {
  return <GenericPage title="문서함" description="회사 문서를 관리합니다" icon={FolderOpen} addButtonLabel="문서 업로드" />
}

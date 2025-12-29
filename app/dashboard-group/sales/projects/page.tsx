'use client'
import { GenericPage } from '@/components/erp'
import { FolderKanban } from 'lucide-react'

export default function Page() {
  return <GenericPage title="프로젝트" description="프로젝트를 관리합니다" icon={FolderKanban} addButtonLabel="프로젝트 추가" />
}

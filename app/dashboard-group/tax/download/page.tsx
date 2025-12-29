'use client'
import { GenericPage } from '@/components/erp'
import { Download } from 'lucide-react'

export default function Page() {
  return <GenericPage title="세무자료 다운로드" description="세무자료를 다운로드합니다" icon={Download} addButtonLabel="다운로드" />
}

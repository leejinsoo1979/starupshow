'use client'
import { GenericPage } from '@/components/erp'
import { FileSpreadsheet } from 'lucide-react'

export default function Page() {
  return <GenericPage title="데이터엑셀변환" description="데이터를 엑셀로 변환합니다" icon={FileSpreadsheet} addButtonLabel="변환하기" />
}

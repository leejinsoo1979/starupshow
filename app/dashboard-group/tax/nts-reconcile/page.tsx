'use client'
import { GenericPage } from '@/components/erp'
import { FileSearch } from 'lucide-react'

export default function Page() {
  return <GenericPage title="국세청자료대사" description="국세청 자료와 대사합니다" icon={FileSearch} addButtonLabel="대사 실행" />
}

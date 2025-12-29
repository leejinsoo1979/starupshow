'use client'
import { GenericPage } from '@/components/erp'
import { Settings } from 'lucide-react'

export default function Page() {
  return <GenericPage title="거래유형 설정" description="거래유형을 설정합니다" icon={Settings} addButtonLabel="유형 추가" />
}

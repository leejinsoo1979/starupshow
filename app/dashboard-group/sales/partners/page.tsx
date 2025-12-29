'use client'
import { GenericPage } from '@/components/erp'
import { Building } from 'lucide-react'

export default function Page() {
  return <GenericPage title="거래처" description="거래처 정보를 관리합니다" icon={Building} addButtonLabel="거래처 등록" />
}

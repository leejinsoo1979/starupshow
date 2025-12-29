'use client'
import { GenericPage } from '@/components/erp'
import { Gift } from 'lucide-react'

export default function Page() {
  return <GenericPage title="보상휴가 관리" description="보상휴가를 관리합니다" icon={Gift} addButtonLabel="보상휴가 등록" />
}

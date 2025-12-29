'use client'
import { GenericPage } from '@/components/erp'
import { PiggyBank } from 'lucide-react'

export default function Page() {
  return <GenericPage title="경비예산관리" description="경비 예산을 관리합니다" icon={PiggyBank} addButtonLabel="예산 등록" />
}

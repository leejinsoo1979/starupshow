'use client'
import { GenericPage } from '@/components/erp'
import { PiggyBank } from 'lucide-react'

export default function Page() {
  return <GenericPage title="정기예적금" description="정기예적금을 관리합니다" icon={PiggyBank} addButtonLabel="예적금 등록" />
}

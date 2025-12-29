'use client'
import { GenericPage } from '@/components/erp'
import { Coins } from 'lucide-react'

export default function Page() {
  return <GenericPage title="현금출납장" description="현금 출납을 관리합니다" icon={Coins} addButtonLabel="거래 등록" />
}

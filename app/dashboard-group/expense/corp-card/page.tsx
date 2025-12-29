'use client'
import { GenericPage } from '@/components/erp'
import { CreditCard } from 'lucide-react'

export default function Page() {
  return <GenericPage title="법인카드관리" description="법인카드를 관리합니다" icon={CreditCard} addButtonLabel="카드 등록" />
}

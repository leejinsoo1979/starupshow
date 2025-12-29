'use client'
import { GenericPage } from '@/components/erp'
import { ShoppingCart } from 'lucide-react'

export default function Page() {
  return <GenericPage title="매입내역" description="매입 내역을 조회합니다" icon={ShoppingCart} addButtonLabel="매입 등록" />
}

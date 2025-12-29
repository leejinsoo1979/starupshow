'use client'
import { GenericPage } from '@/components/erp'
import { Car } from 'lucide-react'

export default function Page() {
  return <GenericPage title="차량관리" description="법인 차량을 관리합니다" icon={Car} addButtonLabel="차량 등록" />
}

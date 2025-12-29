'use client'
import { GenericPage } from '@/components/erp'
import { Route } from 'lucide-react'

export default function Page() {
  return <GenericPage title="차량운행일지" description="차량 운행 일지를 관리합니다" icon={Route} addButtonLabel="운행 등록" />
}

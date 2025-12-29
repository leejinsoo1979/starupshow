'use client'
import { GenericPage } from '@/components/erp'
import { Calculator } from 'lucide-react'

export default function Page() {
  return <GenericPage title="기초잔액등록" description="기초잔액을 등록합니다" icon={Calculator} addButtonLabel="잔액 등록" />
}

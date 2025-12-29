'use client'
import { GenericPage } from '@/components/erp'
import { Calculator } from 'lucide-react'

export default function Page() {
  return <GenericPage title="세금과공과 관리" description="세금과 공과금을 관리합니다" icon={Calculator} addButtonLabel="세금 등록" />
}

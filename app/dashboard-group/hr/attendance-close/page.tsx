'use client'
import { GenericPage } from '@/components/erp'
import { CheckSquare } from 'lucide-react'

export default function Page() {
  return <GenericPage title="근태마감" description="근태를 마감 처리합니다" icon={CheckSquare} addButtonLabel="마감 처리" />
}

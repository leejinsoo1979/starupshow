'use client'
import { GenericPage } from '@/components/erp'
import { Calculator } from 'lucide-react'

export default function Page() {
  return <GenericPage title="정산보험료" description="보험료를 정산합니다" icon={Calculator} addButtonLabel="정산하기" />
}

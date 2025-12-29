'use client'
import { GenericPage } from '@/components/erp'
import { Table } from 'lucide-react'

export default function Page() {
  return <GenericPage title="매입매출합계표" description="매입매출합계표를 조회합니다" icon={Table} showAddButton={false} />
}

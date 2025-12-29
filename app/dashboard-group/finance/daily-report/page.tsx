'use client'
import { GenericPage } from '@/components/erp'
import { FileBarChart } from 'lucide-react'

export default function Page() {
  return <GenericPage title="일일시재보고서" description="일일 시재 현황을 확인합니다" icon={FileBarChart} showAddButton={false} />
}

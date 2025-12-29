'use client'
import { GenericPage } from '@/components/erp'
import { Shield } from 'lucide-react'

export default function Page() {
  return <GenericPage title="신고대상조회" description="사회보험 신고 대상을 조회합니다" icon={Shield} showAddButton={false} />
}

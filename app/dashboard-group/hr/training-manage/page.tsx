'use client'
import { GenericPage } from '@/components/erp'
import { GraduationCap } from 'lucide-react'

export default function Page() {
  return <GenericPage title="교육관리" description="직원 교육을 관리합니다" icon={GraduationCap} addButtonLabel="교육 등록" />
}

'use client'
import { GenericPage } from '@/components/erp'
import { Users } from 'lucide-react'

export default function Page() {
  return <GenericPage title="사원별 급여관리" description="사원별 급여를 관리합니다" icon={Users} addButtonLabel="급여 등록" />
}

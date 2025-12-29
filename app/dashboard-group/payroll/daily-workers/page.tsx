'use client'
import { GenericPage } from '@/components/erp'
import { UserPlus } from 'lucide-react'

export default function Page() {
  return <GenericPage title="일용직사원관리" description="일용직 사원을 관리합니다" icon={UserPlus} addButtonLabel="사원 등록" />
}

'use client'
import { GenericPage } from '@/components/erp'
import { Globe } from 'lucide-react'

export default function Page() {
  return <GenericPage title="외화예금" description="외화예금을 관리합니다" icon={Globe} addButtonLabel="외화 등록" />
}

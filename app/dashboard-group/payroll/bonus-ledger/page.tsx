'use client'
import { GenericPage } from '@/components/erp'
import { Gift } from 'lucide-react'

export default function Page() {
  return <GenericPage title="상여대장(작성)" description="상여대장을 작성합니다" icon={Gift} addButtonLabel="상여 등록" />
}

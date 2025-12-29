'use client'
import { GenericPage } from '@/components/erp'
import { Settings } from 'lucide-react'

export default function Page() {
  return <GenericPage title="사용용도 설정" description="경비 사용 용도를 설정합니다" icon={Settings} addButtonLabel="용도 추가" />
}

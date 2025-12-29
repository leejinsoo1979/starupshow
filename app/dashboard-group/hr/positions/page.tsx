'use client'
import { GenericPage } from '@/components/erp'
import { Award } from 'lucide-react'

export default function Page() {
  return <GenericPage title="직위체계" description="직위 체계를 관리합니다" icon={Award} addButtonLabel="직위 추가" />
}

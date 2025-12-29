'use client'
import { GenericPage } from '@/components/erp'
import { BookOpen } from 'lucide-react'

export default function Page() {
  return <GenericPage title="매입처원장" description="매입처원장을 조회합니다" icon={BookOpen} showAddButton={false} />
}

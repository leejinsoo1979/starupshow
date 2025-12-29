'use client'
import { GenericPage } from '@/components/erp'
import { TrendingUp } from 'lucide-react'

export default function Page() {
  return <GenericPage title="펀드" description="펀드 투자를 관리합니다" icon={TrendingUp} addButtonLabel="펀드 등록" />
}

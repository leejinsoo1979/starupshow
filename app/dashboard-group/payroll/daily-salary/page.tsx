'use client'
import { GenericPage } from '@/components/erp'
import { Coins } from 'lucide-react'

export default function Page() {
  return <GenericPage title="일용직급여대장" description="일용직 급여대장을 관리합니다" icon={Coins} addButtonLabel="급여 등록" />
}

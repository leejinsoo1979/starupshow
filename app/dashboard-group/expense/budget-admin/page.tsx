'use client'
import { GenericPage } from '@/components/erp'
import { UserCog } from 'lucide-react'

export default function Page() {
  return <GenericPage title="경비예산운영자 설정" description="경비 예산 운영자를 설정합니다" icon={UserCog} addButtonLabel="운영자 추가" />
}

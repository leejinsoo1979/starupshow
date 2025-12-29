'use client'
import { GenericPage } from '@/components/erp'
import { Target } from 'lucide-react'

export default function Page() {
  return <GenericPage title="비전, 목표·OKR" description="회사 비전과 OKR을 관리합니다" icon={Target} addButtonLabel="목표 추가" />
}

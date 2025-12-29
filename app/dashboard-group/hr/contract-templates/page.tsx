'use client'
import { GenericPage } from '@/components/erp'
import { FileSignature } from 'lucide-react'

export default function Page() {
  return <GenericPage title="템플릿 관리" description="계약서 템플릿을 관리합니다" icon={FileSignature} addButtonLabel="템플릿 추가" />
}

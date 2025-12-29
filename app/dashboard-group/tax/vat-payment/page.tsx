'use client'
import { GenericPage } from '@/components/erp'
import { Receipt } from 'lucide-react'

export default function Page() {
  return <GenericPage title="부가세 납부관리" description="부가세 납부를 관리합니다" icon={Receipt} addButtonLabel="납부 등록" />
}

'use client'
import { GenericPage } from '@/components/erp'
import { Receipt } from 'lucide-react'

export default function Page() {
  return <GenericPage title="간이영수증외" description="간이영수증을 관리합니다" icon={Receipt} addButtonLabel="영수증 등록" />
}

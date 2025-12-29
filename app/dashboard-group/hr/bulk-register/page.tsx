'use client'
import { GenericPage } from '@/components/erp'
import { Upload } from 'lucide-react'

export default function Page() {
  return <GenericPage title="팀원일괄등록" description="엑셀 파일로 팀원을 일괄 등록합니다" icon={Upload} addButtonLabel="파일 업로드" />
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgentBuilderRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard-group/agents')
  }, [router])

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-zinc-500">리다이렉트 중...</div>
    </div>
  )
}

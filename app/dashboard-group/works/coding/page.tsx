"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { CodingWorkspace } from "@/components/works"
import { Suspense } from "react"

function CodingPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const projectType = searchParams.get('type') || 'simple-web'
    const projectTitle = searchParams.get('title') || '간단한 웹사이트 또는 웹 앱'

    return (
        <CodingWorkspace
            onBack={() => router.push('/dashboard-group/works')}
            projectType={projectType}
            projectTitle={projectTitle}
        />
    )
}

export default function CodingPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-zinc-400">로딩 중...</div>
            </div>
        }>
            <CodingPageContent />
        </Suspense>
    )
}

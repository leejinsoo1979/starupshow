'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button, Logo } from '@/components/ui'
import { Particles } from '@/components/ui/particles'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen md:h-screen md:overflow-hidden w-full bg-zinc-950">
      {/* Particles Background */}
      <Particles
        color="#666666"
        quantity={120}
        ease={20}
        className="absolute inset-0"
      />

      {/* Radial gradient backgrounds */}
      <div
        aria-hidden
        className="absolute inset-0 isolate -z-10 contain-strict"
      >
        <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(255,255,255,0.06)_0,rgba(140,140,140,0.02)_50%,rgba(255,255,255,0.01)_80%)] absolute top-0 left-0 h-[80rem] w-[35rem] -translate-y-[22rem] -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[80rem] w-[15rem] translate-x-[5%] -translate-y-1/2 -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[80rem] w-[15rem] -translate-y-[22rem] -rotate-45 rounded-full" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4">
        {/* Back to Home Button */}
        <Button variant="ghost" className="absolute top-4 left-4 text-zinc-400 hover:text-zinc-100" asChild>
          <Link href="/">
            <ChevronLeft className="me-1 size-4" />
            홈으로
          </Link>
        </Button>

        {/* Auth Card */}
        <div className="mx-auto w-full max-w-sm space-y-6">
          {/* Logo */}
          <Logo size="lg" href="/" />

          {/* Children (Login/Signup Form) */}
          {children}

          {/* Terms */}
          <p className="text-zinc-500 text-sm">
            계속하면{' '}
            <Link
              href="/terms"
              className="hover:text-accent underline underline-offset-4 transition-colors"
            >
              이용약관
            </Link>
            {' '}및{' '}
            <Link
              href="/privacy"
              className="hover:text-accent underline underline-offset-4 transition-colors"
            >
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}

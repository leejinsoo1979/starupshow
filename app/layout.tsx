import type { Metadata } from 'next'
import { Quicksand } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

// 둥글고 세련된 로고용 폰트
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-logo',
})

export const metadata: Metadata = {
  title: 'GlowUS - Founders OS for Real-Time Growth',
  description: '스타트업 창업자를 위한 AI 기반 운영 플랫폼. 업무 관리부터 투자 유치까지.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={quicksand.variable} suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

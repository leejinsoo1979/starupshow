'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import {
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Rocket,
  TrendingUp,
  Github
} from 'lucide-react'

type UserRole = 'founder' | 'vc'

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
  </svg>
)

const roleOptions = [
  {
    id: 'founder' as const,
    title: '스타트업 창업자',
    description: '팀을 운영하고, 프로젝트를 관리하며, 투자자에게 어필하세요.',
    icon: Rocket,
  },
  {
    id: 'vc' as const,
    title: '투자자 (VC)',
    description: '유망한 스타트업을 발굴하고 투자 파이프라인을 관리하세요.',
    icon: TrendingUp,
  },
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'form'>('role')
  const [role, setRole] = useState<UserRole>('founder')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            company,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignup = async (provider: 'google' | 'github') => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  // Success state
  if (success) {
    return (
      <div className="space-y-6 text-center">
        <motion.div
          className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-zinc-100">
            이메일을 확인해주세요
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            <span className="font-medium text-accent">{email}</span>로<br />
            확인 메일을 보냈습니다.<br />
            이메일의 링크를 클릭하여 가입을 완료해주세요.
          </p>
          <Link href="/auth-group/login">
            <Button variant="outline" size="lg" className="mt-4 border-zinc-700">
              로그인 페이지로
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Role selection step
  if (step === 'role') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold tracking-wide text-zinc-100">
            회원가입
          </h1>
          <p className="text-zinc-400 text-base">
            어떤 역할로 가입하시겠습니까?
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-100"
            onClick={() => handleOAuthSignup('google')}
          >
            <GoogleIcon className="me-2 size-4" />
            Google로 계속하기
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-100"
            onClick={() => handleOAuthSignup('github')}
          >
            <Github strokeWidth={2.5} className="me-2 size-4" />
            GitHub로 계속하기
          </Button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-3 text-zinc-500">또는 역할 선택</span>
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          {roleOptions.map((option, index) => (
            <motion.button
              key={option.id}
              onClick={() => {
                setRole(option.id)
                setStep('form')
              }}
              className="w-full p-4 border border-zinc-800 rounded-xl text-left group transition-all duration-300 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <option.icon className="w-6 h-6 text-zinc-400 group-hover:text-accent transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-100 mb-0.5">{option.title}</h3>
                  <p className="text-sm text-zinc-500">
                    {option.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Login Link */}
        <p className="text-sm text-zinc-400 text-center">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/auth-group/login"
            className="text-accent hover:text-accent/80 font-semibold transition-colors"
          >
            로그인
          </Link>
        </p>
      </div>
    )
  }

  // Form step
  const selectedRole = roleOptions.find(r => r.id === role)!

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <selectedRole.icon className="w-5 h-5 text-accent" />
          </div>
          <span className="text-sm text-zinc-500 font-medium">
            {role === 'founder' ? '창업자' : '투자자'}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-wide text-zinc-100">
          계정 만들기
        </h1>
        <p className="text-zinc-400 text-base">
          정보를 입력하고 시작하세요
        </p>
      </div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<User className="w-5 h-5" />}
          required
        />
        <Input
          type="email"
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-5 h-5" />}
          required
        />
        <Input
          type="password"
          placeholder="비밀번호 (최소 6자)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-5 h-5" />}
          showPasswordToggle
          hint="영문, 숫자를 포함한 6자 이상"
          minLength={6}
          required
        />
        <Input
          type="text"
          placeholder={role === 'founder' ? '회사명' : '소속 기관'}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          leftIcon={<Building2 className="w-5 h-5" />}
        />

        <Button
          type="submit"
          className="w-full h-12"
          size="lg"
          isLoading={isLoading}
          rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
        >
          회원가입
        </Button>
      </form>

      {/* Back Button */}
      <button
        type="button"
        onClick={() => setStep('role')}
        className="flex items-center justify-center gap-2 w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        역할 다시 선택
      </button>
    </div>
  )
}

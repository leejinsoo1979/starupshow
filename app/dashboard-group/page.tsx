'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import {
  GitCommit,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Zap,
  Target,
  BrainCircuit,
  Activity,
  Calendar,
  Layers,
  Search,
  UserPlus,
  Users
} from 'lucide-react'
import { BsRobot } from 'react-icons/bs'
import { useRouter } from 'next/navigation'
import {
  LiveMeshGradient,
  TiltCard,
  AICoreWidget,
  ActivityHeatmap,
  EngagementOverview,
  TasksChart,
  ProductivityChart
} from '@/components/dashboard'
import { cn } from '@/lib/utils'

// ... (imports)
export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { accentColor } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // --- Theme Helpers ---
  const getAccentText = () => {
    switch (accentColor) {
      case 'purple': return 'text-purple-600 dark:text-purple-400'
      case 'blue': return 'text-blue-600 dark:text-blue-400'
      case 'green': return 'text-green-600 dark:text-green-400'
      case 'orange': return 'text-orange-600 dark:text-orange-400'
      case 'pink': return 'text-pink-600 dark:text-pink-400'
      case 'red': return 'text-red-600 dark:text-red-400'
      case 'yellow': return 'text-yellow-600 dark:text-yellow-400'
      case 'cyan': return 'text-cyan-600 dark:text-cyan-400'
      default: return 'text-blue-600 dark:text-blue-400'
    }
  }

  // --- Layout Animation ---
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 100 } }
  }

  return (
    <div className="relative min-h-screen text-zinc-900 dark:text-white p-6 font-sans selection:bg-accent/20">
      <LiveMeshGradient />

      {/* --- HUD Header --- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end mb-10 pb-4 border-b border-zinc-200 dark:border-white/5"
      >
        <div>
          <h1 className="text-6xl font-thin tracking-tighter mb-2">
            HELLO, <span className={cn("font-bold", getAccentText())}>{user?.name || 'USER'}</span>
          </h1>
          <div className="flex items-center gap-3 text-zinc-500 dark:text-white/50 text-sm tracking-widest font-mono">
            <span className="flex items-center gap-1"><BrainCircuit className="w-3 h-3" /> SYSTEM ONLINE</span>
            <span>::</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="hidden md:flex gap-4">
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 backdrop-blur transition-all border border-zinc-200 dark:border-white/10">
            <Search className="w-4 h-4 text-zinc-600 dark:text-white/70" />
          </button>
          <button
            onClick={() => router.push('/agent-builder/new')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 hover:bg-accent/20 backdrop-blur transition-all border border-accent/20 hover:border-accent/40"
            title="AI 에이전트"
          >
            <BsRobot className="w-4 h-4 text-accent" />
          </button>
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 backdrop-blur transition-all border border-zinc-200 dark:border-white/10">
            <Layers className="w-4 h-4 text-zinc-600 dark:text-white/70" />
          </button>
        </div>
      </motion.div>

      {/* --- Bento Grid --- */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 auto-rows-[180px] gap-6"
      >

        {/* 1. AI Core (Large) */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-2 md:row-span-2">
          <TiltCard className="h-full flex flex-col items-center justify-center bg-white/50 dark:bg-black/20">
            <AICoreWidget />
          </TiltCard>
        </motion.div>

        {/* 2. Urgent Tasks (Medium) */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-2 md:row-span-2">
          <TiltCard className="h-full p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="font-medium tracking-tight text-zinc-700 dark:text-white">CRITICAL TASKS</span>
              </div>
              <span className="text-xs font-mono text-zinc-400 dark:text-white/40">3 PENDING</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {[
                { title: "Payment Gateway API Fail", priority: "URGENT", time: "2m ago" },
                { title: "Investor Demo Prep", priority: "HIGH", time: "1h ago" },
                { title: "Server Migration", priority: "HIGH", time: "3h ago" },
              ].map((t, i) => (
                <div key={i} className="group flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/5 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-white/90 group-hover:text-zinc-900 dark:group-hover:text-white">{t.title}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-white/40 mt-1">{t.time}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-400 dark:text-white/20 group-hover:text-zinc-600 dark:group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          </TiltCard>
        </motion.div>

        {/* 3. Sprint Progress (Small) */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-2">
          <TiltCard className="h-full p-5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-white/60">SPRINT PROGRESS</span>
                <Target className="w-4 h-4 text-zinc-400 dark:text-white/40" />
              </div>
              <div>
                <div className="text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white">78%</div>
                <div className="h-1 w-full bg-zinc-200 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div className={cn("h-full rounded-full w-[78%] transition-all duration-1000", `bg-${accentColor}-500`)} />
                </div>
              </div>
            </div>
          </TiltCard>
        </motion.div>

        {/* 4. Productivity Score (Small) */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-2">
          <TiltCard className="h-full p-5 flex flex-col justify-between">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-zinc-500 dark:text-white/60">PRODUCTIVITY</span>
              <Zap className={cn("w-4 h-4", getAccentText())} />
            </div>
            <div className="flex items-end gap-3">
              <span className={cn("text-4xl font-bold tracking-tighter", getAccentText())}>94</span>
              <span className="text-sm text-green-600 dark:text-green-400 mb-1.5 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12%
              </span>
            </div>
          </TiltCard>
        </motion.div>

        {/* 5. Add Team Member Card */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-2">
          <TiltCard
            className="h-full p-5 flex flex-col justify-between cursor-pointer group hover:border-accent/50 transition-all"
            onClick={() => router.push('/dashboard-group/team/members/new')}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  "bg-accent/10 group-hover:bg-accent/20"
                )}>
                  <Users className={cn("w-4 h-4", getAccentText())} />
                </div>
                <span className="font-medium tracking-tight text-zinc-700 dark:text-white">팀원</span>
              </div>
              <span className="text-xs font-mono text-zinc-400 dark:text-white/40">5 MEMBERS</span>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex -space-x-2">
                {['JK', 'SL', 'MH', 'YJ'].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-white/70"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <button
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  "bg-accent/10 hover:bg-accent/20 group-hover:scale-110",
                  "border-2 border-dashed border-accent/30 hover:border-accent/50"
                )}
              >
                <UserPlus className={cn("w-4 h-4", getAccentText())} />
              </button>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-white/50">+ 팀원 생성</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 dark:text-white/30 group-hover:text-accent transition-colors" />
              </div>
            </div>
          </TiltCard>
        </motion.div>

        {/* 6. Commit Heatmap (Wide) */}
        <motion.div variants={item} className="md:col-span-4 lg:col-span-4 md:row-span-2">
          <TiltCard className="h-full p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <GitCommit className="w-5 h-5 text-zinc-500 dark:text-white/50" />
              <span className="font-medium tracking-tight text-zinc-700 dark:text-white">COMMIT ACTIVITY</span>
            </div>
            <div className="flex-1 rounded-xl bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-white/5 p-4 flex items-center justify-center">
              <ActivityHeatmap />
            </div>
          </TiltCard>
        </motion.div>

        {/* 6. Recent Commits List (Tall) */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-2 md:row-span-2">
          <TiltCard className="h-full p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-zinc-500 dark:text-white/50" />
              <span className="font-medium tracking-tight text-zinc-700 dark:text-white">RECENT PUSHES</span>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-white/70">
                    JK
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 dark:text-white/80 truncate">fix: authentication loop issue</p>
                    <p className="text-xs text-zinc-400 dark:text-white/30 font-mono">main • 24m ago</p>
                  </div>
                </div>
              ))}
            </div>
          </TiltCard>
        </motion.div>

        {/* 7. Engagement Chart (Wide) */}
        <motion.div variants={item} className="md:col-span-3 lg:col-span-3">
          <TiltCard className="h-full p-5">
            <EngagementOverview />
          </TiltCard>
        </motion.div>

        {/* 8. Productivity Chart (Wide) */}
        <motion.div variants={item} className="md:col-span-3 lg:col-span-3">
          <TiltCard className="h-full p-5">
            <ProductivityChart />
          </TiltCard>
        </motion.div>

      </motion.div>
    </div>
  )
}

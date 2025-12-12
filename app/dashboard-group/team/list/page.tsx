'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useTeamStore } from '@/stores/teamStore'
import { useThemeStore } from '@/stores/themeStore'
import { TeamCreateModal, TeamFormData } from '@/components/team/TeamCreateModal'
import {
  Users,
  Plus,
  Building2,
  MoreVertical,
  Trash2,
  ChevronRight,
  Calendar,
  Search,
  Edit2,
  LayoutGrid,
  List,
  Sparkles,
  TrendingUp,
  FolderKanban,
  ArrowLeft,
} from 'lucide-react'

type ViewMode = 'album' | 'list'

// 팀별 그라데이션 색상
const teamGradients = [
  'from-violet-500 via-purple-500 to-fuchsia-500',
  'from-blue-500 via-cyan-500 to-teal-500',
  'from-emerald-500 via-green-500 to-lime-500',
  'from-orange-500 via-amber-500 to-yellow-500',
  'from-pink-500 via-rose-500 to-red-500',
  'from-indigo-500 via-blue-500 to-cyan-500',
  'from-fuchsia-500 via-pink-500 to-rose-500',
  'from-teal-500 via-emerald-500 to-green-500',
]

const teamPatterns = [
  'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
  'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)',
]

export default function TeamListPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { accentColor } = useThemeStore()
  const { teams, addTeam, removeTeam } = useTeamStore()
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('album')

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : true

  const getAccentClasses = () => {
    const colors: Record<string, { bg: string; bgLight: string; text: string; gradient: string }> = {
      purple: { bg: 'bg-purple-500', bgLight: 'bg-purple-500/10', text: 'text-purple-500', gradient: 'from-purple-500 to-violet-600' },
      blue: { bg: 'bg-blue-500', bgLight: 'bg-blue-500/10', text: 'text-blue-500', gradient: 'from-blue-500 to-cyan-500' },
      green: { bg: 'bg-green-500', bgLight: 'bg-green-500/10', text: 'text-green-500', gradient: 'from-green-500 to-emerald-500' },
      orange: { bg: 'bg-orange-500', bgLight: 'bg-orange-500/10', text: 'text-orange-500', gradient: 'from-orange-500 to-amber-500' },
      pink: { bg: 'bg-pink-500', bgLight: 'bg-pink-500/10', text: 'text-pink-500', gradient: 'from-pink-500 to-rose-500' },
      red: { bg: 'bg-red-500', bgLight: 'bg-red-500/10', text: 'text-red-500', gradient: 'from-red-500 to-rose-500' },
      yellow: { bg: 'bg-yellow-500', bgLight: 'bg-yellow-500/10', text: 'text-yellow-500', gradient: 'from-yellow-500 to-amber-500' },
      cyan: { bg: 'bg-cyan-500', bgLight: 'bg-cyan-500/10', text: 'text-cyan-500', gradient: 'from-cyan-500 to-teal-500' },
    }
    return colors[accentColor] || colors.blue
  }

  const accent = getAccentClasses()

  const handleCreateTeam = (data: TeamFormData) => {
    addTeam(data)
    setIsModalOpen(false)
  }

  const handleDeleteTeam = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('정말 이 팀을 삭제하시겠습니까?')) {
      removeTeam(teamId)
      setMenuOpenId(null)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTeamGradient = (index: number) => teamGradients[index % teamGradients.length]
  const getTeamPattern = (index: number) => teamPatterns[index % teamPatterns.length]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1 },
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard-group/team')}
          className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">팀 대시보드로 돌아가기</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              팀목록
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              {teams.length}개의 팀
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                onClick={() => setViewMode('album')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'album'
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                앨범
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'list'
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <List className="w-4 h-4" />
                리스트
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "px-5 py-2.5 rounded-xl font-medium text-white flex items-center gap-2 shadow-lg",
                "bg-gradient-to-r", accent.gradient,
                "hover:shadow-xl transition-all"
              )}
            >
              <Plus className="w-4 h-4" />
              새 팀 만들기
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="팀 이름, 업종으로 검색..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all"
          />
        </div>
      </motion.div>

      {/* Empty State */}
      {teams.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className={cn(
            "w-28 h-28 rounded-3xl flex items-center justify-center mb-6 bg-gradient-to-br shadow-2xl",
            accent.gradient
          )}>
            <Users className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            아직 팀이 없습니다
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-8">
            첫 번째 팀을 만들어 프로젝트를 시작하세요.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "px-8 py-4 rounded-2xl font-semibold text-white shadow-xl",
              "bg-gradient-to-r", accent.gradient,
              "hover:shadow-2xl transition-all"
            )}
          >
            <Sparkles className="w-5 h-5 inline mr-2" />
            팀 만들기
          </motion.button>
        </motion.div>
      ) : (
        <>
          {/* Album View */}
          {viewMode === 'album' && (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {/* Add Team Card */}
              <motion.div
                variants={item}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsModalOpen(true)}
                className={cn(
                  "group rounded-2xl cursor-pointer aspect-[4/3]",
                  "border-2 border-dashed",
                  isDark ? "border-zinc-700/50 hover:border-zinc-500" : "border-zinc-200 hover:border-zinc-400",
                  "bg-zinc-50/50 dark:bg-zinc-900/30",
                  "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30",
                  "transition-all duration-200"
                )}
              >
                <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
                    "bg-zinc-100 dark:bg-zinc-800",
                    "group-hover:bg-gradient-to-br group-hover:scale-110",
                    `group-hover:${accent.gradient}`
                  )}>
                    <Plus className="w-7 h-7 text-zinc-400 dark:text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      새 팀 만들기
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Team Cards */}
              {filteredTeams.map((team, index) => (
                <motion.div
                  key={team.id}
                  variants={item}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/dashboard-group/team?teamId=${team.id}`)}
                  className={cn(
                    "group relative rounded-2xl cursor-pointer aspect-[4/3] overflow-hidden",
                    "bg-white dark:bg-zinc-900",
                    "border border-zinc-200/80 dark:border-zinc-800",
                    "hover:border-zinc-300 dark:hover:border-zinc-700",
                    "shadow-sm hover:shadow-xl",
                    "transition-all duration-200"
                  )}
                >
                  {/* Top Accent Bar */}
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                    getTeamGradient(index)
                  )} />

                  {/* Menu Button */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === team.id ? null : team.id)
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        "opacity-0 group-hover:opacity-100",
                        "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                    </button>

                    {menuOpenId === team.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard-group/team/members?teamId=${team.id}`)
                            setMenuOpenId(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          팀원 관리
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          수정
                        </button>
                        <button
                          onClick={(e) => handleDeleteTeam(team.id, e)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          삭제
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="relative h-full p-5 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        "bg-gradient-to-br shadow-md",
                        getTeamGradient(index)
                      )}>
                        <span className="text-white font-bold text-lg">
                          {team.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-bold text-zinc-900 dark:text-white truncate text-lg leading-tight">
                          {team.name}
                        </h3>
                        {team.industry && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {team.industry}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {team.description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">
                        {team.description}
                      </p>
                    )}
                    {!team.description && <div className="flex-1" />}

                    {/* Stats */}
                    <div className="flex items-center gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                          {team.memberCount}명
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FolderKanban className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                          0개
                        </span>
                      </div>
                      <div className="ml-auto">
                        <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredTeams.length === 0 && searchQuery && (
                <div className="col-span-full text-center py-12">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    "{searchQuery}"에 대한 검색 결과가 없습니다
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {filteredTeams.map((team, index) => (
                <motion.div
                  key={team.id}
                  variants={item}
                  whileHover={{ x: 4 }}
                  onClick={() => router.push(`/dashboard-group/team?teamId=${team.id}`)}
                  className={cn(
                    "group rounded-2xl cursor-pointer overflow-hidden",
                    "bg-white dark:bg-zinc-800/50",
                    "border border-zinc-200 dark:border-zinc-700/50",
                    "shadow-sm hover:shadow-xl",
                    "transition-all duration-300"
                  )}
                >
                  <div className="flex items-stretch">
                    {/* Color Bar */}
                    <div className={cn(
                      "w-2 bg-gradient-to-b",
                      getTeamGradient(index)
                    )} />

                    {/* Content */}
                    <div className="flex-1 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Team Icon */}
                          <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                            getTeamGradient(index)
                          )}>
                            <Building2 className="w-7 h-7 text-white" />
                          </div>

                          {/* Team Info */}
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                                {team.name}
                              </h3>
                              {team.industry && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                  {team.industry}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1.5">
                              <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                {team.memberCount}명
                              </span>
                              <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {formatDate(team.createdAt)}
                              </span>
                              {team.teamSize && (
                                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                                  규모: {team.teamSize}
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-1 max-w-lg">
                                {team.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          {/* Quick Stats */}
                          <div className="hidden md:flex items-center gap-6 mr-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-zinc-900 dark:text-white">0</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">프로젝트</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-zinc-900 dark:text-white">0</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">태스크</p>
                            </div>
                          </div>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpenId(menuOpenId === team.id ? null : team.id)
                              }}
                              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <MoreVertical className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                            </button>

                            {menuOpenId === team.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/dashboard-group/team/members?teamId=${team.id}`)
                                    setMenuOpenId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                  <Users className="w-4 h-4" />
                                  팀원 관리
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMenuOpenId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  수정
                                </button>
                                <button
                                  onClick={(e) => handleDeleteTeam(team.id, e)}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>

                          <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredTeams.length === 0 && searchQuery && (
                <div className="text-center py-12">
                  <p className="text-zinc-500 dark:text-zinc-400">
                    "{searchQuery}"에 대한 검색 결과가 없습니다
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Click outside to close menu */}
      {menuOpenId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuOpenId(null)}
        />
      )}

      {/* Team Create Modal */}
      <TeamCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTeam}
      />
    </div>
  )
}

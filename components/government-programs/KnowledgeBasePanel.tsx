// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Package,
  Award,
  PieChart,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Star,
  Building2,
  DollarSign,
  Save,
  X,
  Upload,
  FileText,
  Loader2,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeBaseData {
  profile: any
  team_members: any[]
  products: any[]
  achievements: any[]
  financials: any[]
  market_data: any
  knowledge_entries: any[]
  completeness: {
    score: number
    maxScore: number
    percentage: number
    details: any
  }
}

const SECTIONS = [
  { id: 'profile', name: '기본 정보', icon: Building2, color: 'blue' },
  { id: 'team', name: '팀 구성', icon: Users, color: 'green' },
  { id: 'products', name: '제품/서비스', icon: Package, color: 'purple' },
  { id: 'achievements', name: '성과/수상', icon: Award, color: 'yellow' },
  { id: 'financials', name: '재무 정보', icon: DollarSign, color: 'red' },
  { id: 'market', name: '시장 분석', icon: PieChart, color: 'cyan' },
]

interface KnowledgeBasePanelProps {
  isDark?: boolean
  themeColor?: string
}

export default function KnowledgeBasePanel({ isDark = true, themeColor = '#3b82f6' }: KnowledgeBasePanelProps) {
  const [data, setData] = useState<KnowledgeBaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('profile')
  const [editMode, setEditMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)

  useEffect(() => {
    loadKnowledgeBase()
  }, [])

  // 파일 업로드 → AI 분석
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/knowledge-base/parse', {
        method: 'POST',
        body: formData
      })

      const json = await res.json()

      if (json.success) {
        setUploadResult({
          success: true,
          message: `분석 완료! 프로필: ${json.results.profile_updated ? '✓' : '-'}, 팀원: ${json.results.team_added}명, 제품: ${json.results.products_added}개, 성과: ${json.results.achievements_added}건`
        })
        loadKnowledgeBase() // 새로고침
      } else {
        setUploadResult({ success: false, message: json.error })
      }
    } catch (error: any) {
      setUploadResult({ success: false, message: error.message })
    } finally {
      setUploading(false)
    }
  }

  const loadKnowledgeBase = async () => {
    try {
      const res = await fetch('/api/knowledge-base')
      const json = await res.json()
      if (json.success) {
        setData(json)
      }
    } catch (error) {
      console.error('Failed to load knowledge base:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (profileData: any) => {
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })
      const json = await res.json()
      if (json.success) {
        loadKnowledgeBase()
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const handleAddItem = async (type: string, itemData: any) => {
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: itemData })
      })
      const json = await res.json()
      if (json.success) {
        loadKnowledgeBase()
        setShowAddModal(false)
        setAddType(null)
      }
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  const handleDeleteItem = async (type: string, id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/knowledge-base?type=${type}&id=${id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.success) {
        loadKnowledgeBase()
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={cn(
          "w-12 h-12 rounded-full border-4 animate-spin",
          isDark ? "border-white/10 border-t-white/50" : "border-gray-200 border-t-gray-500"
        )} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Completeness */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            회사 지식베이스
          </h2>
          <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-gray-500")}>
            사업계획서 자동생성을 위한 회사 정보를 관리합니다
          </p>
        </div>

        {/* Completeness Score */}
        <div className={cn(
          "rounded-xl p-4 border",
          isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="28" cy="28" r="24"
                  fill="none" strokeWidth="4"
                  className={isDark ? "stroke-white/10" : "stroke-gray-200"}
                />
                <circle
                  cx="28" cy="28" r="24"
                  fill="none" strokeWidth="4"
                  strokeDasharray={`${(data?.completeness?.percentage || 0) * 1.51} 151`}
                  style={{ stroke: themeColor }}
                  className="transition-all duration-500"
                />
              </svg>
              <span className={cn(
                "absolute inset-0 flex items-center justify-center text-sm font-bold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {data?.completeness?.percentage || 0}%
              </span>
            </div>
            <div>
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>
                지식베이스 완성도
              </p>
              <p className="text-sm font-medium" style={{ color: themeColor }}>
                {(data?.completeness?.percentage || 0) >= 50
                  ? '사업계획서 자동생성 가능'
                  : (data?.completeness?.percentage || 0) >= 20
                    ? '인터뷰 모드로 생성 가능'
                    : '기본 정보 입력 필요'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 인터뷰 모드 안내 (지식베이스 부족시) */}
      {(data?.completeness?.percentage || 0) < 50 && (
        <div className={cn(
          "rounded-xl border p-4 mb-4",
          isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
        )}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className={cn("font-semibold text-sm mb-1", isDark ? "text-white" : "text-gray-900")}>
                💡 인터뷰 모드로 사업계획서 생성 가능
              </h4>
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>
                지식베이스가 부족해도 괜찮습니다! 사업계획서 생성 시 AI가 공고문 양식에 맞춰
                질문을 드리고, 답변을 바탕으로 완벽한 내용을 작성해 드립니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 파일 업로드 영역 */}
      <div className={cn(
        "rounded-xl border-2 border-dashed p-6 transition-all",
        isDark ? "border-white/20 hover:border-white/40 bg-white/[0.02]" : "border-gray-300 hover:border-gray-400 bg-gray-50"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${themeColor}20` }}>
              <Sparkles className="w-7 h-7" style={{ color: themeColor }} />
            </div>
          </div>
          <div className="flex-1">
            <h3 className={cn("font-semibold mb-1", isDark ? "text-white" : "text-gray-900")}>
              AI 자동 분석으로 빠르게 채우기
            </h3>
            <p className={cn("text-sm mb-3", isDark ? "text-zinc-400" : "text-gray-500")}>
              기존 사업계획서, 회사소개서, IR자료를 업로드하면 AI가 분석해서 지식베이스를 자동으로 채워줍니다.
            </p>
            <div className="flex items-center gap-3">
              <label className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors",
                uploading ? "opacity-50 pointer-events-none" : "",
                isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
              )}>
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{uploading ? 'AI 분석 중...' : '파일 업로드'}</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.pptx,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  disabled={uploading}
                />
              </label>
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-400")}>
                PDF, TXT, PPTX, DOCX 지원
              </span>
            </div>
          </div>
        </div>

        {/* 업로드 결과 */}
        {uploadResult && (
          <div className={cn(
            "mt-4 p-3 rounded-lg flex items-center gap-2",
            uploadResult.success
              ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-700"
              : isDark ? "bg-accent/20 text-accent" : "bg-blue-50 text-blue-700"
          )}>
            {uploadResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{uploadResult.message}</span>
          </div>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all border",
                isActive
                  ? "text-white"
                  : isDark
                    ? "bg-white/5 text-zinc-400 border-white/10 hover:border-white/20"
                    : "bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-300"
              )}
              style={isActive ? {
                background: `linear-gradient(135deg, ${themeColor}, ${themeColor}80)`,
                borderColor: 'transparent'
              } : undefined}
            >
              <Icon className="w-4 h-4" />
              {section.name}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className={cn(
        "rounded-2xl border p-6 min-h-[400px]",
        isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"
      )}>
        <AnimatePresence mode="wait">
          {activeSection === 'profile' && (
            <ProfileSection
              key="profile"
              profile={data?.profile}
              onSave={handleSaveProfile}
              editMode={editMode}
              setEditMode={setEditMode}
              isDark={isDark}
              themeColor={themeColor}
            />
          )}

          {activeSection === 'team' && (
            <TeamSection
              key="team"
              members={data?.team_members || []}
              onAdd={() => { setAddType('team'); setShowAddModal(true) }}
              onDelete={(id) => handleDeleteItem('team', id)}
              isDark={isDark}
              themeColor={themeColor}
            />
          )}

          {activeSection === 'products' && (
            <ProductsSection
              key="products"
              products={data?.products || []}
              onAdd={() => { setAddType('product'); setShowAddModal(true) }}
              onDelete={(id) => handleDeleteItem('product', id)}
              isDark={isDark}
              themeColor={themeColor}
            />
          )}

          {activeSection === 'achievements' && (
            <AchievementsSection
              key="achievements"
              achievements={data?.achievements || []}
              onAdd={() => { setAddType('achievement'); setShowAddModal(true) }}
              onDelete={(id) => handleDeleteItem('achievement', id)}
              isDark={isDark}
              themeColor={themeColor}
            />
          )}

          {activeSection === 'financials' && (
            <FinancialsSection
              key="financials"
              financials={data?.financials || []}
              onAdd={() => { setAddType('financial'); setShowAddModal(true) }}
              onDelete={(id) => handleDeleteItem('financial', id)}
              isDark={isDark}
              themeColor={themeColor}
            />
          )}

          {activeSection === 'market' && (
            <MarketSection
              key="market"
              marketData={data?.market_data}
              onSave={(d) => handleAddItem('market', d)}
              isDark={isDark}
              themeColor={themeColor}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && addType && (
          <AddItemModal
            type={addType}
            onClose={() => { setShowAddModal(false); setAddType(null) }}
            onSave={(itemData) => handleAddItem(addType, itemData)}
            isDark={isDark}
            themeColor={themeColor}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Profile Section Component
function ProfileSection({
  profile, onSave, editMode, setEditMode, isDark, themeColor
}: {
  profile: any
  onSave: (data: any) => void
  editMode: boolean
  setEditMode: (v: boolean) => void
  isDark: boolean
  themeColor: string
}) {
  const [formData, setFormData] = useState({
    business_description: profile?.business_description || '',
    main_products: profile?.main_products || '',
    core_technologies: profile?.core_technologies || ''
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
          <Building2 className="w-5 h-5" style={{ color: themeColor }} />
          기본 정보
        </h3>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ background: `${themeColor}20`, color: themeColor }}
          >
            <Edit2 className="w-4 h-4" />
            수정
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(false)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                isDark ? "bg-white/10 text-zinc-300 hover:bg-white/20" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              )}
            >
              <X className="w-4 h-4" />
              취소
            </button>
            <button
              onClick={() => onSave(formData)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
              style={{ background: themeColor }}
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        )}
      </div>

      {/* 기존 프로필 정보 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '업종', value: profile?.industry_category || '미설정' },
          { label: '사업자 유형', value: profile?.entity_type || '미설정' },
          { label: '창업 단계', value: profile?.startup_stage || '미설정' },
          { label: '지역', value: profile?.region || '미설정' },
        ].map((item, i) => (
          <div key={i} className={cn(
            "rounded-lg p-4",
            isDark ? "bg-white/5" : "bg-gray-100"
          )}>
            <p className={cn("text-xs mb-1", isDark ? "text-zinc-500" : "text-gray-500")}>{item.label}</p>
            <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 상세 정보 입력/표시 */}
      <div className="space-y-4">
        <div>
          <label className={cn("block text-sm mb-2", isDark ? "text-zinc-400" : "text-gray-600")}>
            사업 설명 <span style={{ color: themeColor }}>*</span>
          </label>
          {editMode ? (
            <textarea
              value={formData.business_description}
              onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
              className={cn(
                "w-full h-32 rounded-lg p-3 border focus:ring-2 transition-all",
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder-zinc-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              )}
              style={{ '--tw-ring-color': themeColor } as any}
              placeholder="회사의 사업 내용을 상세히 설명해주세요..."
            />
          ) : (
            <div className={cn(
              "rounded-lg p-4 min-h-[80px]",
              isDark ? "bg-white/5 text-zinc-300" : "bg-gray-100 text-gray-700"
            )}>
              {profile?.business_description || (
                <span className={cn("flex items-center gap-2", isDark ? "text-zinc-500" : "text-gray-400")}>
                  <AlertCircle className="w-4 h-4" />
                  사업 설명을 입력해주세요
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={cn("block text-sm mb-2", isDark ? "text-zinc-400" : "text-gray-600")}>
            주요 제품/서비스 <span style={{ color: themeColor }}>*</span>
          </label>
          {editMode ? (
            <textarea
              value={formData.main_products}
              onChange={(e) => setFormData({ ...formData, main_products: e.target.value })}
              className={cn(
                "w-full h-24 rounded-lg p-3 border focus:ring-2 transition-all",
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder-zinc-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              )}
              placeholder="주요 제품 및 서비스를 설명해주세요..."
            />
          ) : (
            <div className={cn(
              "rounded-lg p-4 min-h-[60px]",
              isDark ? "bg-white/5 text-zinc-300" : "bg-gray-100 text-gray-700"
            )}>
              {profile?.main_products || (
                <span className={cn("flex items-center gap-2", isDark ? "text-zinc-500" : "text-gray-400")}>
                  <AlertCircle className="w-4 h-4" />
                  주요 제품/서비스를 입력해주세요
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={cn("block text-sm mb-2", isDark ? "text-zinc-400" : "text-gray-600")}>
            핵심 기술 <span style={{ color: themeColor }}>*</span>
          </label>
          {editMode ? (
            <textarea
              value={formData.core_technologies}
              onChange={(e) => setFormData({ ...formData, core_technologies: e.target.value })}
              className={cn(
                "w-full h-24 rounded-lg p-3 border focus:ring-2 transition-all",
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder-zinc-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              )}
              placeholder="보유한 핵심 기술을 설명해주세요..."
            />
          ) : (
            <div className={cn(
              "rounded-lg p-4 min-h-[60px]",
              isDark ? "bg-white/5 text-zinc-300" : "bg-gray-100 text-gray-700"
            )}>
              {profile?.core_technologies || (
                <span className={cn("flex items-center gap-2", isDark ? "text-zinc-500" : "text-gray-400")}>
                  <AlertCircle className="w-4 h-4" />
                  핵심 기술을 입력해주세요
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Team Section Component
function TeamSection({
  members, onAdd, onDelete, isDark, themeColor
}: {
  members: any[]
  onAdd: () => void
  onDelete: (id: string) => void
  isDark: boolean
  themeColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
          <Users className="w-5 h-5 text-green-500" />
          팀 구성원 ({members.length}명)
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          팀원 추가
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12">
          <Users className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-zinc-600" : "text-gray-400")} />
          <p className={isDark ? "text-zinc-400" : "text-gray-500"}>등록된 팀원이 없습니다</p>
          <p className={cn("text-sm mt-1", isDark ? "text-zinc-500" : "text-gray-400")}>
            팀원을 추가하면 사업계획서의 팀 소개 섹션에 활용됩니다
          </p>
          <button
            onClick={onAdd}
            className="mt-4 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            첫 팀원 추가하기
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-colors",
                isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-gray-50 border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                  {member.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{member.name}</span>
                    {member.is_key_member && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                        <Star className="w-3 h-3" />
                        핵심인력
                      </span>
                    )}
                  </div>
                  <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>{member.position || member.role}</p>
                </div>
              </div>
              <button
                onClick={() => onDelete(member.id)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark ? "text-zinc-400 hover:text-accent hover:bg-accent/10" : "text-gray-400 hover:text-accent hover:bg-accent/10"
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Products Section Component
function ProductsSection({
  products, onAdd, onDelete, isDark, themeColor
}: {
  products: any[]
  onAdd: () => void
  onDelete: (id: string) => void
  isDark: boolean
  themeColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
          <Package className="w-5 h-5 text-purple-500" />
          제품/서비스 ({products.length}개)
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          제품 추가
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <Package className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-zinc-600" : "text-gray-400")} />
          <p className={isDark ? "text-zinc-400" : "text-gray-500"}>등록된 제품이 없습니다</p>
          <button
            onClick={onAdd}
            className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            첫 제품 추가하기
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className={cn(
                "p-5 rounded-xl border transition-colors",
                isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-gray-50 border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{product.name}</span>
                  {product.is_flagship && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      <Star className="w-3 h-3" />
                      주력
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onDelete(product.id)}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    isDark ? "text-zinc-400 hover:text-accent hover:bg-accent/10" : "text-gray-400 hover:text-accent hover:bg-accent/10"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className={cn("text-sm line-clamp-2 mb-3", isDark ? "text-zinc-400" : "text-gray-500")}>
                {product.description || '설명 없음'}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.development_stage && (
                  <span className={cn(
                    "px-2 py-1 text-xs rounded",
                    isDark ? "bg-white/10 text-zinc-300" : "bg-gray-200 text-gray-600"
                  )}>
                    {product.development_stage}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Achievements Section Component
function AchievementsSection({
  achievements, onAdd, onDelete, isDark, themeColor
}: {
  achievements: any[]
  onAdd: () => void
  onDelete: (id: string) => void
  isDark: boolean
  themeColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
          <Award className="w-5 h-5 text-yellow-500" />
          성과 및 수상 ({achievements.length}건)
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          성과 추가
        </button>
      </div>

      {achievements.length === 0 ? (
        <div className="text-center py-12">
          <Award className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-zinc-600" : "text-gray-400")} />
          <p className={isDark ? "text-zinc-400" : "text-gray-500"}>등록된 성과가 없습니다</p>
          <button
            onClick={onAdd}
            className="mt-4 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
          >
            첫 성과 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-colors",
                isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-gray-50 border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  achievement.achievement_type === 'award' ? 'bg-yellow-500/20 text-yellow-400' :
                  achievement.achievement_type === 'certification' ? 'bg-blue-500/20 text-blue-400' :
                  achievement.achievement_type === 'patent' ? 'bg-purple-500/20 text-purple-400' :
                  isDark ? 'bg-white/10 text-zinc-400' : 'bg-gray-200 text-gray-500'
                )}>
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{achievement.title}</span>
                  <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>
                    {achievement.issuer} {achievement.date && `• ${achievement.date}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDelete(achievement.id)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark ? "text-zinc-400 hover:text-accent hover:bg-accent/10" : "text-gray-400 hover:text-accent hover:bg-accent/10"
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Financials Section Component
function FinancialsSection({
  financials, onAdd, onDelete, isDark, themeColor
}: {
  financials: any[]
  onAdd: () => void
  onDelete: (id: string) => void
  isDark: boolean
  themeColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
          <DollarSign className="w-5 h-5 text-accent" />
          재무 정보 ({financials.length}건)
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          재무 데이터 추가
        </button>
      </div>

      {financials.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-zinc-600" : "text-gray-400")} />
          <p className={isDark ? "text-zinc-400" : "text-gray-500"}>등록된 재무 정보가 없습니다</p>
          <button
            onClick={onAdd}
            className="mt-4 px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
          >
            재무 데이터 추가하기
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn("text-left border-b", isDark ? "text-zinc-400 border-white/10" : "text-gray-500 border-gray-200")}>
                <th className="pb-3 font-medium">연도</th>
                <th className="pb-3 font-medium">매출</th>
                <th className="pb-3 font-medium">영업이익</th>
                <th className="pb-3 font-medium">순이익</th>
                <th className="pb-3 font-medium">직원수</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {financials.map((f) => (
                <tr key={f.id} className={cn("border-b", isDark ? "border-white/5" : "border-gray-100")}>
                  <td className={cn("py-3 font-medium", isDark ? "text-white" : "text-gray-900")}>
                    {f.fiscal_year}년{f.fiscal_quarter && ` ${f.fiscal_quarter}Q`}
                  </td>
                  <td className={isDark ? "py-3 text-white" : "py-3 text-gray-900"}>
                    {f.revenue ? `${(f.revenue / 100000000).toFixed(1)}억원` : '-'}
                  </td>
                  <td className={isDark ? "py-3 text-white" : "py-3 text-gray-900"}>
                    {f.operating_profit ? `${(f.operating_profit / 100000000).toFixed(1)}억원` : '-'}
                  </td>
                  <td className={isDark ? "py-3 text-white" : "py-3 text-gray-900"}>
                    {f.net_profit ? `${(f.net_profit / 100000000).toFixed(1)}억원` : '-'}
                  </td>
                  <td className={isDark ? "py-3 text-white" : "py-3 text-gray-900"}>{f.employee_count || '-'}명</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onDelete(f.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isDark ? "text-zinc-400 hover:text-accent hover:bg-accent/10" : "text-gray-400 hover:text-accent hover:bg-accent/10"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}

// Market Section Component
function MarketSection({
  marketData, onSave, isDark, themeColor
}: {
  marketData: any
  onSave: (data: any) => void
  isDark: boolean
  themeColor: string
}) {
  const [formData, setFormData] = useState({
    industry_name: marketData?.industry_name || '',
    tam: marketData?.tam || '',
    sam: marketData?.sam || '',
    som: marketData?.som || '',
    market_growth_rate: marketData?.market_growth_rate || '',
    market_trends: marketData?.market_trends?.join(', ') || ''
  })

  const handleSubmit = () => {
    onSave({
      ...formData,
      tam: formData.tam ? Number(formData.tam) : null,
      sam: formData.sam ? Number(formData.sam) : null,
      som: formData.som ? Number(formData.som) : null,
      market_growth_rate: formData.market_growth_rate ? Number(formData.market_growth_rate) : null,
      market_trends: formData.market_trends ? formData.market_trends.split(',').map((s: string) => s.trim()) : []
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
          <PieChart className="w-5 h-5 text-cyan-500" />
          시장 분석 데이터
        </h3>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
        >
          <Save className="w-4 h-4" />
          저장
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[
          { label: '산업/시장 분야', key: 'industry_name', placeholder: '예: AI 소프트웨어 시장', type: 'text' },
          { label: '시장 성장률 (%)', key: 'market_growth_rate', placeholder: '예: 15.5', type: 'number' },
          { label: 'TAM - 전체 시장 규모 (억원)', key: 'tam', placeholder: '예: 50000', type: 'number' },
          { label: 'SAM - 유효 시장 규모 (억원)', key: 'sam', placeholder: '예: 10000', type: 'number' },
          { label: 'SOM - 목표 시장 규모 (억원)', key: 'som', placeholder: '예: 500', type: 'number' },
          { label: '시장 트렌드 (쉼표로 구분)', key: 'market_trends', placeholder: '예: AI 자동화, 클라우드 전환', type: 'text' },
        ].map((field) => (
          <div key={field.key}>
            <label className={cn("block text-sm mb-2", isDark ? "text-zinc-400" : "text-gray-600")}>{field.label}</label>
            <input
              type={field.type}
              value={(formData as any)[field.key]}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className={cn(
                "w-full rounded-lg p-3 border focus:ring-2 transition-all",
                isDark
                  ? "bg-white/5 border-white/10 text-white placeholder-zinc-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              )}
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Add Item Modal
function AddItemModal({
  type, onClose, onSave, isDark, themeColor
}: {
  type: string
  onClose: () => void
  onSave: (data: any) => void
  isDark: boolean
  themeColor: string
}) {
  const [formData, setFormData] = useState<any>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const getTitle = () => {
    switch (type) {
      case 'team': return '팀원 추가'
      case 'product': return '제품/서비스 추가'
      case 'achievement': return '성과 추가'
      case 'financial': return '재무 데이터 추가'
      default: return '항목 추가'
    }
  }

  const inputClass = cn(
    "w-full rounded-lg p-2.5 border focus:ring-2 transition-all",
    isDark
      ? "bg-white/5 border-white/10 text-white placeholder-zinc-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          "rounded-2xl border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto",
          isDark ? "bg-zinc-900 border-white/10" : "bg-white border-gray-200"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={cn("text-lg font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>{getTitle()}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'team' && (
            <>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>이름 *</label>
                <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>직책</label>
                <input type="text" value={formData.position || ''} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className={inputClass} placeholder="예: CTO, 개발팀장" />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>전문분야 (쉼표로 구분)</label>
                <input type="text" value={formData.expertise_str || ''} onChange={(e) => setFormData({ ...formData, expertise_str: e.target.value, expertise: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} className={inputClass} placeholder="예: AI, 머신러닝, 백엔드" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_key_member" checked={formData.is_key_member || false} onChange={(e) => setFormData({ ...formData, is_key_member: e.target.checked })} className="w-4 h-4 rounded" />
                <label htmlFor="is_key_member" className={cn("text-sm", isDark ? "text-zinc-300" : "text-gray-600")}>핵심 인력으로 표시</label>
              </div>
            </>
          )}

          {type === 'product' && (
            <>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>제품/서비스명 *</label>
                <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>설명</label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={cn(inputClass, "h-20")} />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>개발 단계</label>
                <select value={formData.development_stage || ''} onChange={(e) => setFormData({ ...formData, development_stage: e.target.value })} className={inputClass}>
                  <option value="">선택</option>
                  <option value="idea">아이디어</option>
                  <option value="mvp">MVP</option>
                  <option value="beta">베타</option>
                  <option value="launched">출시</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_flagship" checked={formData.is_flagship || false} onChange={(e) => setFormData({ ...formData, is_flagship: e.target.checked })} className="w-4 h-4 rounded" />
                <label htmlFor="is_flagship" className={cn("text-sm", isDark ? "text-zinc-300" : "text-gray-600")}>주력 제품으로 표시</label>
              </div>
            </>
          )}

          {type === 'achievement' && (
            <>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>성과 유형 *</label>
                <select required value={formData.achievement_type || ''} onChange={(e) => setFormData({ ...formData, achievement_type: e.target.value })} className={inputClass}>
                  <option value="">선택</option>
                  <option value="award">수상</option>
                  <option value="certification">인증</option>
                  <option value="patent">특허</option>
                  <option value="partnership">파트너십</option>
                </select>
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>제목 *</label>
                <input type="text" required value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>수여 기관</label>
                <input type="text" value={formData.issuer || ''} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>날짜</label>
                <input type="date" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputClass} />
              </div>
            </>
          )}

          {type === 'financial' && (
            <>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>연도 *</label>
                <input type="number" required value={formData.fiscal_year || new Date().getFullYear()} onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>매출 (원)</label>
                <input type="number" value={formData.revenue || ''} onChange={(e) => setFormData({ ...formData, revenue: e.target.value ? parseFloat(e.target.value) : null })} className={inputClass} placeholder="예: 1000000000 (10억)" />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>영업이익 (원)</label>
                <input type="number" value={formData.operating_profit || ''} onChange={(e) => setFormData({ ...formData, operating_profit: e.target.value ? parseFloat(e.target.value) : null })} className={inputClass} />
              </div>
              <div>
                <label className={cn("block text-sm mb-1", isDark ? "text-zinc-400" : "text-gray-600")}>직원수</label>
                <input type="number" value={formData.employee_count || ''} onChange={(e) => setFormData({ ...formData, employee_count: e.target.value ? parseInt(e.target.value) : null })} className={inputClass} />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg transition-colors",
                isDark ? "bg-white/10 text-zinc-300 hover:bg-white/20" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              )}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors"
              style={{ background: themeColor }}
            >
              추가
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Youtube,
  Globe,
  Bot,
  User,
  Calendar,
  ChevronRight,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/Button"

interface ProjectDocument {
  id: string
  title: string
  content: string
  summary?: string | null
  doc_type: string
  source_url?: string | null
  source_type?: string | null
  created_by_type: string
  created_by_agent_id?: string | null
  created_by_user_id?: string | null
  tags: string[]
  status: string
  created_at: string
  created_by_agent?: {
    id: string
    name: string
    avatar_url?: string
  } | null
  created_by_user?: {
    id: string
    name: string
    avatar_url?: string
  } | null
}

const docTypeLabels: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  analysis: { label: "분석", icon: FileText, color: "#3B82F6" },
  summary: { label: "요약", icon: FileText, color: "#10B981" },
  report: { label: "리포트", icon: FileText, color: "#8B5CF6" },
  research: { label: "리서치", icon: Globe, color: "#F59E0B" },
  transcript: { label: "트랜스크립트", icon: Youtube, color: "#EF4444" },
  meeting_notes: { label: "회의록", icon: FileText, color: "#EC4899" },
  deliverable: { label: "결과물", icon: FileText, color: "#06B6D4" },
  other: { label: "기타", icon: FileText, color: "#6B7280" },
}

interface ProjectDocumentsProps {
  projectId: string
}

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [projectId])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/documents`)
      if (!res.ok) throw new Error("문서 로드 실패")
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Documents fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDocTypeInfo = (type: string) => {
    return docTypeLabels[type] || docTypeLabels.other
  }

  const getSourceIcon = (sourceType?: string | null) => {
    if (sourceType === "youtube") return Youtube
    if (sourceType === "web") return Globe
    return FileText
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4" />
          프로젝트 문서
          <span className="text-sm text-zinc-500">({documents.length})</span>
        </h3>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>아직 생성된 문서가 없습니다</p>
          <p className="text-sm mt-1">에이전트가 작업을 완료하면 여기에 문서가 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const typeInfo = getDocTypeInfo(doc.doc_type)
            const TypeIcon = typeInfo.icon
            const SourceIcon = getSourceIcon(doc.source_type)

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer group"
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${typeInfo.color}20` }}
                  >
                    <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium truncate">{doc.title}</h4>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: `${typeInfo.color}20`,
                          color: typeInfo.color,
                        }}
                      >
                        {typeInfo.label}
                      </span>
                    </div>

                    {doc.summary && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{doc.summary}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                      {doc.source_url && (
                        <span className="flex items-center gap-1">
                          <SourceIcon className="w-3 h-3" />
                          {doc.source_type}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        {doc.created_by_type === "agent" ? (
                          <Bot className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {doc.created_by_agent?.name || doc.created_by_user?.name || "사용자"}
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Document Detail Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${getDocTypeInfo(selectedDoc.doc_type).color}20`,
                    }}
                  >
                    {(() => {
                      const Icon = getDocTypeInfo(selectedDoc.doc_type).icon
                      return (
                        <Icon
                          className="w-5 h-5"
                          style={{ color: getDocTypeInfo(selectedDoc.doc_type).color }}
                        />
                      )
                    })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedDoc.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{getDocTypeInfo(selectedDoc.doc_type).label}</span>
                      <span>•</span>
                      <span>
                        {new Date(selectedDoc.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedDoc(null)}>
                  <X className="w-5 h-5 text-zinc-400 hover:text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedDoc.source_url && (
                  <a
                    href={selectedDoc.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    원본 보기
                  </a>
                )}

                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-zinc-300">
                    {selectedDoc.content}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  {selectedDoc.created_by_type === "agent" && selectedDoc.created_by_agent && (
                    <>
                      <Bot className="w-4 h-4" />
                      <span>{selectedDoc.created_by_agent.name}</span>
                    </>
                  )}
                  {selectedDoc.created_by_type === "user" && selectedDoc.created_by_user && (
                    <>
                      <User className="w-4 h-4" />
                      <span>{selectedDoc.created_by_user.name}</span>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={() => setSelectedDoc(null)}>
                  닫기
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// @ts-nocheck
/**
 * 공고문 첨부파일 파싱 서비스
 * - PDF/HWP 다운로드
 * - 텍스트 추출
 * - AI로 사업계획서 양식 구조화
 * TODO: Supabase 타입 재생성 필요 (npx supabase gen types)
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface Attachment {
  url: string
  name: string
}

interface ParsedTemplate {
  sections: {
    section_id: string
    title: string
    required: boolean
    max_chars?: number
    guidelines?: string
    order: number
    evaluation_weight?: number
    subsections?: {
      id: string
      title: string
      description?: string
    }[]
  }[]
  evaluation_criteria?: {
    category: string
    weight: number
    description: string
  }[]
  total_pages?: number
  writing_guidelines?: string[]
}

/**
 * 첨부파일에서 사업계획서 양식 찾기
 */
export function findPlanTemplateAttachment(attachments: Attachment[]): Attachment | null {
  const keywords = ['사업계획서', '신청서', '양식', '서식', '작성']

  // 사업계획서 양식 파일 우선
  for (const att of attachments) {
    const name = att.name.toLowerCase()
    if (keywords.some(k => att.name.includes(k))) {
      // HWP나 HWPX, PDF 우선
      if (name.endsWith('.hwp') || name.endsWith('.hwpx') || name.endsWith('.pdf')) {
        return att
      }
    }
  }

  // 별첨1이나 서식 파일
  for (const att of attachments) {
    if (att.name.includes('별첨1') || att.name.includes('별첨 1')) {
      return att
    }
  }

  return null
}

/**
 * PDF에서 텍스트 추출 (unpdf 사용 - Node.js 호환)
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // unpdf - Node.js 호환 PDF 파싱
    const { extractText, getDocumentProxy } = await import('unpdf')

    const data = new Uint8Array(buffer)
    const pdf = await getDocumentProxy(data)
    const result = await extractText(pdf, { mergePages: true })

    return result.text
  } catch (error) {
    console.error('[AttachmentParser] PDF parse error:', error)
    throw new Error('PDF 텍스트 추출 실패: ' + (error as Error).message)
  }
}

/**
 * 파일 다운로드
 */
async function downloadFile(url: string): Promise<Buffer> {
  console.log('[AttachmentParser] Downloading:', url)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`파일 다운로드 실패: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * AI로 텍스트에서 사업계획서 양식 구조 추출
 */
async function extractTemplateWithAI(text: string, programTitle: string): Promise<ParsedTemplate> {
  const openai = getOpenAI()

  // 텍스트가 너무 길면 잘라서 처리
  const maxLength = 30000
  const truncatedText = text.length > maxLength
    ? text.substring(0, maxLength) + '\n...(이하 생략)...'
    : text

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    max_tokens: 4096,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `당신은 정부지원사업 공고문 분석 전문가입니다.
사업계획서 양식 문서에서 작성해야 할 항목들을 구조화된 형태로 추출합니다.

응답은 반드시 유효한 JSON 형식이어야 합니다.`
      },
      {
        role: 'user',
        content: `다음은 "${programTitle}" 사업의 사업계획서 양식입니다.

이 문서에서 사업계획서 작성 항목들을 추출해주세요.

문서 내용:
${truncatedText}

다음 JSON 형식으로 응답해주세요:
{
  "sections": [
    {
      "section_id": "1",
      "title": "섹션 제목 (예: 사업개요, 기술개발 내용 등)",
      "required": true,
      "max_chars": 3000,
      "guidelines": "작성 가이드라인 또는 유의사항",
      "order": 1,
      "evaluation_weight": 20,
      "subsections": [
        {"id": "1-1", "title": "세부항목", "description": "설명"}
      ]
    }
  ],
  "evaluation_criteria": [
    {"category": "평가항목", "weight": 30, "description": "평가 기준"}
  ],
  "writing_guidelines": ["작성 시 유의사항1", "유의사항2"]
}

실제 문서에 있는 항목만 추출하고, 없는 항목은 생략하세요.`
      }
    ]
  })

  const content = response.choices[0]?.message?.content || '{}'

  // JSON 파싱 (마크다운 코드블록 제거)
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '')
  }

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('[AttachmentParser] JSON parse error:', e)
    console.error('Raw content:', content)
    return { sections: [] }
  }
}

/**
 * 공고 첨부파일에서 사업계획서 양식 파싱
 */
export async function parseAttachmentTemplate(
  programId: string,
  options?: { forceRefresh?: boolean }
): Promise<{
  success: boolean
  template?: ParsedTemplate
  templateId?: string
  error?: string
}> {
  const supabase = createAdminClient()

  try {
    // 1. 프로그램 정보 조회
    const { data: program, error: programError } = await supabase
      .from('government_programs')
      .select('id, title, attachments_primary, attachments_extra')
      .eq('id', programId)
      .single()

    if (programError || !program) {
      return { success: false, error: '프로그램을 찾을 수 없습니다' }
    }

    // 2. 기존 파싱된 템플릿 확인
    if (!options?.forceRefresh) {
      const { data: existingTemplate } = await supabase
        .from('business_plan_templates')
        .select('id, template_name, sections')
        .eq('program_id', programId)
        .eq('parsing_status', 'completed')
        .single()

      if (existingTemplate) {
        return {
          success: true,
          templateId: existingTemplate.id,
          template: { sections: existingTemplate.sections || [] }
        }
      }
    }

    // 3. 첨부파일에서 사업계획서 양식 찾기
    const allAttachments = [
      ...(program.attachments_primary || []),
      ...(program.attachments_extra || [])
    ]

    const templateAttachment = findPlanTemplateAttachment(allAttachments)

    // 사업계획서 양식 → 공고문 PDF → 아무 PDF 순으로 찾기
    let targetAttachment = templateAttachment

    if (!targetAttachment) {
      // 공고문 PDF 시도
      const announcementPdf = allAttachments.find(a =>
        a.name.endsWith('.pdf') && (a.name.includes('공고') || a.name.includes('모집'))
      )

      if (announcementPdf) {
        console.log('[AttachmentParser] Using announcement PDF:', announcementPdf.name)
        targetAttachment = announcementPdf
      } else {
        // 아무 PDF라도 찾기
        const anyPdf = allAttachments.find(a => a.name.toLowerCase().endsWith('.pdf'))
        if (anyPdf) {
          console.log('[AttachmentParser] Using any available PDF:', anyPdf.name)
          targetAttachment = anyPdf
        }
      }
    }

    if (!targetAttachment) {
      return { success: false, error: '파싱 가능한 첨부파일이 없습니다' }
    }

    console.log('[AttachmentParser] Parsing attachment:', targetAttachment.name)

    // 4. 파일 다운로드
    const fileBuffer = await downloadFile(targetAttachment.url)

    // 5. 텍스트 추출
    let text: string

    if (targetAttachment.name.toLowerCase().endsWith('.pdf')) {
      text = await extractTextFromPDF(fileBuffer)
    } else if (targetAttachment.name.toLowerCase().match(/\.hwpx?$/)) {
      // HWP는 현재 지원하지 않음 - PDF 버전 찾기
      const pdfVersion = allAttachments.find(a =>
        a.name.replace(/\.hwpx?$/, '') === targetAttachment.name.replace(/\.hwpx?$/, '') &&
        a.name.endsWith('.pdf')
      )

      if (pdfVersion) {
        const pdfBuffer = await downloadFile(pdfVersion.url)
        text = await extractTextFromPDF(pdfBuffer)
      } else {
        // PDF 버전 없으면 공고문 PDF로 대체
        console.log('[AttachmentParser] No PDF version, trying announcement PDF')
        const announcementPdf = allAttachments.find(a =>
          a.name.endsWith('.pdf') && (a.name.includes('공고') || a.name.includes('모집'))
        )

        if (announcementPdf) {
          console.log('[AttachmentParser] Using announcement PDF:', announcementPdf.name)
          const pdfBuffer = await downloadFile(announcementPdf.url)
          text = await extractTextFromPDF(pdfBuffer)
        } else {
          return { success: false, error: 'PDF 파일을 찾을 수 없습니다' }
        }
      }
    } else {
      return { success: false, error: '지원하지 않는 파일 형식입니다' }
    }

    if (!text || text.length < 100) {
      return { success: false, error: '텍스트 추출 결과가 너무 짧습니다' }
    }

    console.log('[AttachmentParser] Extracted text length:', text.length)

    // 6. AI로 구조 추출
    const parsedTemplate = await extractTemplateWithAI(text, program.title)

    if (!parsedTemplate.sections?.length) {
      return { success: false, error: '양식 구조를 추출할 수 없습니다' }
    }

    console.log('[AttachmentParser] Parsed sections:', parsedTemplate.sections.length)

    // 7. 템플릿 저장 (기존 확인 후 update 또는 insert)
    const templateData = {
      program_id: programId,
      name: `${program.title} 양식`,
      template_name: `${program.title} 양식`,
      description: `${program.title} 공고문에서 추출된 사업계획서 양식`,
      sections: parsedTemplate.sections,
      section_structure: parsedTemplate.sections,
      evaluation_criteria: parsedTemplate.evaluation_criteria,
      writing_guidelines: parsedTemplate.writing_guidelines,
      parsing_status: 'completed',
      is_active: true,
      source_file: targetAttachment.name,
      source_url: targetAttachment.url,
      updated_at: new Date().toISOString()
    }

    // 기존 템플릿 확인
    const { data: existingTemplate } = await supabase
      .from('business_plan_templates')
      .select('id')
      .eq('program_id', programId)
      .single()

    let savedTemplate: { id: string } | null = null
    let saveError: any = null

    if (existingTemplate) {
      // 업데이트
      const result = await supabase
        .from('business_plan_templates')
        .update(templateData)
        .eq('id', existingTemplate.id)
        .select('id')
        .single()
      savedTemplate = result.data
      saveError = result.error
    } else {
      // 새로 생성
      const result = await supabase
        .from('business_plan_templates')
        .insert(templateData)
        .select('id')
        .single()
      savedTemplate = result.data
      saveError = result.error
    }

    if (saveError) {
      console.error('[AttachmentParser] Save error:', saveError)
      return { success: false, error: '템플릿 저장 실패: ' + saveError.message }
    }

    return {
      success: true,
      templateId: savedTemplate?.id,
      template: parsedTemplate
    }

  } catch (error: any) {
    console.error('[AttachmentParser] Error:', error)
    return { success: false, error: error.message || '파싱 중 오류 발생' }
  }
}

/**
 * 프로그램의 사업계획서 템플릿 가져오기 (없으면 파싱)
 */
export async function getOrParseTemplate(programId: string): Promise<{
  success: boolean
  template?: any
  templateId?: string
  error?: string
}> {
  const supabase = createAdminClient()

  // 기존 템플릿 확인
  const { data: existing } = await supabase
    .from('business_plan_templates')
    .select('*')
    .eq('program_id', programId)
    .eq('parsing_status', 'completed')
    .single()

  if (existing) {
    return {
      success: true,
      templateId: existing.id,
      template: existing
    }
  }

  // 없으면 파싱
  return parseAttachmentTemplate(programId)
}

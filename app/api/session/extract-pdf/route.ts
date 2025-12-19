/**
 * PDF 텍스트 추출 API
 *
 * PDF 파일에서 특정 페이지의 텍스트를 추출합니다.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const url = formData.get('url') as string | null
    const page = parseInt(formData.get('page') as string) || 1
    const contextPages = parseInt(formData.get('contextPages') as string) || 0

    let pdfBuffer: Buffer

    if (file) {
      // File upload
      const arrayBuffer = await file.arrayBuffer()
      pdfBuffer = Buffer.from(arrayBuffer)
    } else if (url) {
      // URL fetch
      const response = await fetch(url)
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch PDF from URL' },
          { status: 400 }
        )
      }
      const arrayBuffer = await response.arrayBuffer()
      pdfBuffer = Buffer.from(arrayBuffer)
    } else {
      return NextResponse.json(
        { error: 'Either file or url is required' },
        { status: 400 }
      )
    }

    // Dynamic import to avoid build issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse')

    // Parse entire PDF to get page count
    const pdfData = await pdfParse(pdfBuffer)
    const totalPages = pdfData.numpages

    // For page-specific extraction, we need to use pdfjs-dist
    // pdf-parse doesn't support page-specific extraction well
    // So we'll return the full text with page markers for now
    const fullText = pdfData.text

    // Simple page splitting heuristic (not perfect but works for most PDFs)
    const pageTexts = splitTextByPages(fullText, totalPages)

    // Get requested page and context pages
    const startPage = Math.max(1, page - contextPages)
    const endPage = Math.min(totalPages, page + contextPages)

    const result = {
      currentPage: {
        page,
        text: pageTexts[page - 1] || ''
      },
      contextPages: [] as { page: number; text: string }[],
      totalPages,
      metadata: {
        title: pdfData.info?.Title || null,
        author: pdfData.info?.Author || null,
        subject: pdfData.info?.Subject || null,
        extractedAt: new Date().toISOString()
      }
    }

    // Add context pages
    for (let p = startPage; p <= endPage; p++) {
      if (p !== page) {
        result.contextPages.push({
          page: p,
          text: pageTexts[p - 1] || ''
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PDF Extract] Error:', error)
    return NextResponse.json(
      { error: 'Failed to extract PDF text' },
      { status: 500 }
    )
  }
}

/**
 * Split text by pages using heuristics
 * This is a simple approach - for accurate page extraction,
 * you'd need to use pdfjs-dist with page iteration
 */
function splitTextByPages(text: string, numPages: number): string[] {
  if (numPages <= 1) {
    return [text]
  }

  // Try to split by form feed characters (common page separator)
  const ffSplit = text.split('\f')
  if (ffSplit.length === numPages) {
    return ffSplit.map(t => t.trim())
  }

  // Try to split by multiple newlines (less accurate)
  const lines = text.split('\n')
  const linesPerPage = Math.ceil(lines.length / numPages)
  const pages: string[] = []

  for (let i = 0; i < numPages; i++) {
    const start = i * linesPerPage
    const end = Math.min(start + linesPerPage, lines.length)
    pages.push(lines.slice(start, end).join('\n').trim())
  }

  return pages
}

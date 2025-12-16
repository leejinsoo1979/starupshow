import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { tavily } from '@tavily/core'
import { execSync } from 'child_process'
import path from 'path'

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || '' })

// ============================================
// MCP Tool Definitions for Agents
// ============================================

export type MCPToolName = 'web_search' | 'youtube_transcript' | 'web_fetch' | 'image_search'

// Web Search Tool (Tavily)
export const webSearchTool = new DynamicStructuredTool({
  name: 'web_search',
  description: '웹에서 정보를 검색합니다. 최신 정보, 뉴스, 문서 등을 찾을 때 사용하세요.',
  schema: z.object({
    query: z.string().describe('검색할 키워드나 질문'),
    maxResults: z.number().optional().default(5).describe('가져올 검색 결과 수'),
  }),
  func: async ({ query, maxResults = 5 }) => {
    try {
      if (!process.env.TAVILY_API_KEY) {
        return JSON.stringify({ error: 'TAVILY_API_KEY가 설정되지 않았습니다.' })
      }

      const response = await tavilyClient.search(query, {
        maxResults,
        includeAnswer: true,
        searchDepth: 'advanced',
      })

      const results = response.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 500),
      }))

      return JSON.stringify({
        answer: response.answer,
        results,
        sources: results.map((r: any) => r.url),
      })
    } catch (error) {
      return JSON.stringify({ error: `검색 실패: ${error}` })
    }
  },
})

// YouTube Transcript Tool (using Python youtube_transcript_api - most reliable)
export const youtubeTranscriptTool = new DynamicStructuredTool({
  name: 'youtube_transcript',
  description: 'YouTube 동영상의 자막(스크립트)을 가져옵니다. 동영상 내용을 분석할 때 사용하세요.',
  schema: z.object({
    videoUrl: z.string().describe('YouTube 동영상 URL (예: https://www.youtube.com/watch?v=xxxxx)'),
    lang: z.string().optional().default('ko').describe('자막 언어 (ko, en, ja 등)'),
  }),
  func: async ({ videoUrl, lang = 'ko' }) => {
    try {
      // Path to Python script
      const scriptPath = path.join(process.cwd(), 'scripts', 'fetch-youtube-transcript.py')

      // Execute Python script
      const result = execSync(
        `python3 "${scriptPath}" "${videoUrl}" "${lang}"`,
        {
          encoding: 'utf-8',
          timeout: 30000,
          maxBuffer: 1024 * 1024, // 1MB buffer
        }
      )

      return result.trim()
    } catch (error: any) {
      // Handle execution errors
      const stderr = error?.stderr?.toString() || ''
      const stdout = error?.stdout?.toString() || ''

      // Try to parse any JSON output
      const output = stdout || stderr
      if (output.includes('{')) {
        try {
          const jsonMatch = output.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            return jsonMatch[0]
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      return JSON.stringify({
        error: '자막 가져오기 실패: ' + (error?.message || String(error)),
        suggestion: '웹 검색으로 이 영상에 대한 정보를 찾아보세요.',
      })
    }
  },
})

// Web Fetch Tool (simple URL content fetching)
export const webFetchTool = new DynamicStructuredTool({
  name: 'web_fetch',
  description: '특정 웹페이지의 내용을 가져옵니다. URL의 텍스트 내용을 읽을 때 사용하세요.',
  schema: z.object({
    url: z.string().describe('가져올 웹페이지 URL'),
  }),
  func: async ({ url }) => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StartupShow-Agent/1.0)',
        },
      })

      if (!response.ok) {
        return JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` })
      }

      const html = await response.text()

      // Simple HTML to text conversion
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000)

      return JSON.stringify({
        url,
        content: text,
      })
    } catch (error) {
      return JSON.stringify({ error: `웹페이지 가져오기 실패: ${error}` })
    }
  },
})

// Image Search Tool (Tavily with images)
export const imageSearchTool = new DynamicStructuredTool({
  name: 'image_search',
  description: '이미지나 GIF를 검색합니다. 사진, 그림, 밈, GIF 등을 찾을 때 사용하세요. 검색 결과로 이미지 URL들을 반환합니다.',
  schema: z.object({
    query: z.string().describe('검색할 이미지 키워드 (예: "귀여운 고양이", "happy gif", "축하 이미지")'),
    maxResults: z.number().optional().default(5).describe('가져올 이미지 수 (기본 5개)'),
  }),
  func: async ({ query, maxResults = 5 }) => {
    try {
      if (!process.env.TAVILY_API_KEY) {
        return JSON.stringify({ error: 'TAVILY_API_KEY가 설정되지 않았습니다.' })
      }

      // Tavily 이미지 검색
      const response = await tavilyClient.search(query, {
        maxResults,
        includeImages: true,
        searchDepth: 'basic',
      })

      const images = response.images || []

      if (images.length === 0) {
        return JSON.stringify({
          error: '이미지를 찾지 못했습니다.',
          suggestion: '다른 검색어로 시도해보세요.'
        })
      }

      // 랜덤하게 섞어서 다양한 결과 제공
      const shuffled = images.sort(() => Math.random() - 0.5)

      return JSON.stringify({
        images: shuffled.slice(0, maxResults),
        count: Math.min(shuffled.length, maxResults),
        query,
      })
    } catch (error) {
      return JSON.stringify({ error: `이미지 검색 실패: ${error}` })
    }
  },
})

// Get all available tools
export const ALL_TOOLS = {
  web_search: webSearchTool,
  youtube_transcript: youtubeTranscriptTool,
  web_fetch: webFetchTool,
  image_search: imageSearchTool,
}

// Get tools by names
export function getToolsByNames(names: MCPToolName[]): DynamicStructuredTool[] {
  return names
    .map(name => ALL_TOOLS[name])
    .filter(Boolean)
}

// Get all tool names
export function getAllToolNames(): MCPToolName[] {
  return Object.keys(ALL_TOOLS) as MCPToolName[]
}

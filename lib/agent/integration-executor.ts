/**
 * Integration Executor
 * Activepieces를 통해 외부 앱 연동을 실행하는 모듈
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { APP_ACTIONS, getApp } from '@/lib/integrations/apps'
import { activepieces, triggerActivepiesesFlow } from '@/lib/activepieces/client'

export interface IntegrationConfig {
  app: string
  action: string
  config: Record<string, unknown>
  // Activepieces 연동용
  flowId?: string
  webhookUrl?: string
}

export interface IntegrationResult {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Execute an integration action via Activepieces
 */
export async function executeIntegration(
  integration: IntegrationConfig
): Promise<IntegrationResult> {
  const { app, action, config, flowId, webhookUrl } = integration

  console.log(`Executing integration: ${app}/${action}`, config)

  try {
    // 1. Activepieces 플로우 ID가 있으면 플로우 실행
    if (flowId) {
      const run = await triggerActivepiesesFlow(flowId, config as Record<string, any>)
      return {
        success: run.status === 'SUCCEEDED',
        data: run.output,
        error: run.error,
      }
    }

    // 2. 웹훅 URL이 있으면 웹훅 트리거
    if (webhookUrl) {
      const result = await activepieces.triggerWebhook(webhookUrl, {
        app,
        action,
        ...config,
      })
      return { success: true, data: result }
    }

    // 3. Activepieces 없이 직접 실행 (폴백)
    return await executeDirectAPI(app, action, config)

  } catch (error) {
    console.error(`Integration error (${app}/${action}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }
  }
}

/**
 * Direct API execution (fallback when Activepieces is not available)
 */
async function executeDirectAPI(
  app: string,
  action: string,
  config: Record<string, unknown>
): Promise<IntegrationResult> {
  switch (app) {
    // === HTTP Request ===
    case 'http':
    case 'webhook':
      return await executeHttpRequest(action, config)

    // === Communication ===
    case 'slack':
      return await executeSlack(action, config)
    case 'discord':
      return await executeDiscord(action, config)
    case 'telegram-bot':
      return await executeTelegram(action, config)
    case 'microsoft-teams':
      return await executeMicrosoftTeams(action, config)

    // === Email ===
    case 'sendgrid':
      return await executeSendGrid(action, config)
    case 'resend':
      return await executeResend(action, config)

    // === Productivity ===
    case 'notion':
      return await executeNotion(action, config)
    case 'google-sheets':
      return await executeGoogleSheets(action, config)

    // === AI ===
    case 'openai':
      return await executeOpenAI(action, config)

    // === Developer ===
    case 'github':
      return await executeGitHub(action, config)
    case 'supabase':
      return await executeSupabase(action, config)

    default:
      return {
        success: false,
        error: `이 앱은 Activepieces 플로우 설정이 필요합니다: ${app}. flowId 또는 webhookUrl을 설정해주세요.`,
      }
  }
}

// === HTTP Request ===
async function executeHttpRequest(
  action: string,
  config: Record<string, unknown>
): Promise<IntegrationResult> {
  const method = (config.method as string) || 'GET'
  const url = config.url as string
  const headers = config.headers ? JSON.parse(config.headers as string) : {}
  const body = config.body ? JSON.parse(config.body as string) : undefined

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => response.text())
  return { success: response.ok, data, error: !response.ok ? `HTTP ${response.status}` : undefined }
}

// === Slack ===
async function executeSlack(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return { success: false, error: 'SLACK_BOT_TOKEN 환경변수가 필요합니다' }

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  switch (action) {
    case 'send-message':
    case 'send-dm': {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST', headers,
        body: JSON.stringify({ channel: config.channel || config.userId, text: config.text }),
      })
      const data = await response.json()
      return { success: data.ok, data, error: data.error }
    }
    default:
      return { success: false, error: `지원하지 않는 Slack 액션: ${action}` }
  }
}

// === Discord ===
async function executeDiscord(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  switch (action) {
    case 'send-message': {
      const response = await fetch(config.webhookUrl as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: config.content, username: config.username || 'Agent Bot' }),
      })
      return { success: response.ok }
    }
    default:
      return { success: false, error: `지원하지 않는 Discord 액션: ${action}` }
  }
}

// === Telegram ===
async function executeTelegram(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const botToken = config.botToken as string
  if (!botToken) return { success: false, error: 'Telegram 봇 토큰이 필요합니다' }

  const baseUrl = `https://api.telegram.org/bot${botToken}`

  switch (action) {
    case 'send-message': {
      const response = await fetch(`${baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.chatId, text: config.text, parse_mode: 'HTML' }),
      })
      const data = await response.json()
      return { success: data.ok, data, error: data.description }
    }
    default:
      return { success: false, error: `지원하지 않는 Telegram 액션: ${action}` }
  }
}

// === Microsoft Teams ===
async function executeMicrosoftTeams(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  switch (action) {
    case 'send-message': {
      const res = await fetch(config.webhookUrl as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: config.text }),
      })
      return { success: res.ok }
    }
    default:
      return { success: false, error: `지원하지 않는 Teams 액션: ${action}` }
  }
}

// === SendGrid ===
async function executeSendGrid(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const apiKey = config.apiKey as string || process.env.SENDGRID_API_KEY
  if (!apiKey) return { success: false, error: 'SENDGRID_API_KEY가 필요합니다' }

  switch (action) {
    case 'send-email': {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: config.to }] }],
          from: { email: config.from },
          subject: config.subject,
          content: [{ type: 'text/html', value: config.body }],
        }),
      })
      return { success: res.ok }
    }
    default:
      return { success: false, error: `지원하지 않는 SendGrid 액션: ${action}` }
  }
}

// === Resend ===
async function executeResend(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const apiKey = config.apiKey as string || process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: 'RESEND_API_KEY가 필요합니다' }

  switch (action) {
    case 'send-email': {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.from, to: config.to, subject: config.subject, html: config.body }),
      })
      return { success: res.ok, data: await res.json() }
    }
    default:
      return { success: false, error: `지원하지 않는 Resend 액션: ${action}` }
  }
}

// === Notion ===
async function executeNotion(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const token = process.env.NOTION_API_KEY
  if (!token) return { success: false, error: 'NOTION_API_KEY 환경변수가 필요합니다' }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  }

  switch (action) {
    case 'create-page': {
      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST', headers,
        body: JSON.stringify({
          parent: { page_id: config.parentId },
          properties: { title: { title: [{ text: { content: config.title } }] } },
          children: config.content ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: config.content as string } }] } }] : [],
        }),
      })
      const data = await response.json()
      return { success: !data.code, data, error: data.message }
    }
    default:
      return { success: false, error: `지원하지 않는 Notion 액션: ${action}` }
  }
}

// === Google Sheets ===
async function executeGoogleSheets(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const { setCellValues, getCellValues } = await import('@/lib/google-sheets')

  try {
    switch (action) {
      case 'append-row': {
        const { spreadsheetId, sheetName, values } = config
        if (!spreadsheetId || !sheetName || !values) {
          return { success: false, error: 'spreadsheetId, sheetName, values가 필요합니다' }
        }
        const range = `${sheetName}!A:A`
        const existingData = await getCellValues(spreadsheetId as string, range)
        const nextRow = (existingData?.length || 0) + 1
        let parsedValues: unknown[]
        try { parsedValues = typeof values === 'string' ? JSON.parse(values) : values } catch { parsedValues = [values] }
        await setCellValues(spreadsheetId as string, `${sheetName}!A${nextRow}`, [parsedValues as string[]])
        return { success: true, data: { row: nextRow, values: parsedValues } }
      }
      case 'read-rows': {
        const { spreadsheetId, sheetName, range } = config
        if (!spreadsheetId || !sheetName) return { success: false, error: 'spreadsheetId, sheetName이 필요합니다' }
        const fullRange = range ? `${sheetName}!${range}` : `${sheetName}!A1:Z1000`
        const data = await getCellValues(spreadsheetId as string, fullRange)
        return { success: true, data: { rows: data || [], count: data?.length || 0 } }
      }
      default:
        return { success: false, error: `지원하지 않는 Google Sheets 액션: ${action}` }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

// === OpenAI ===
async function executeOpenAI(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { success: false, error: 'OPENAI_API_KEY 환경변수가 필요합니다' }

  switch (action) {
    case 'chat-completion': {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: [
            ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
            { role: 'user', content: config.userPrompt },
          ],
          temperature: parseFloat(config.temperature as string) || 0.7,
        }),
      })
      const data = await response.json()
      return { success: !data.error, data: data.choices?.[0]?.message?.content || data, error: data.error?.message }
    }
    default:
      return { success: false, error: `지원하지 않는 OpenAI 액션: ${action}` }
  }
}

// === GitHub ===
async function executeGitHub(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { success: false, error: 'GITHUB_TOKEN 환경변수가 필요합니다' }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  switch (action) {
    case 'create-issue': {
      const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/issues`, {
        method: 'POST', headers,
        body: JSON.stringify({
          title: config.title,
          body: config.body,
          labels: config.labels ? (config.labels as string).split(',').map(l => l.trim()) : [],
        }),
      })
      const data = await response.json()
      return { success: response.ok, data, error: data.message }
    }
    default:
      return { success: false, error: `지원하지 않는 GitHub 액션: ${action}` }
  }
}

// === Supabase ===
async function executeSupabase(action: string, config: Record<string, unknown>): Promise<IntegrationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return { success: false, error: 'Supabase 환경변수가 필요합니다' }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  const baseUrl = `${supabaseUrl}/rest/v1/${config.table}`

  switch (action) {
    case 'insert-row': {
      const data = JSON.parse(config.data as string)
      const response = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(data) })
      return { success: response.ok, data: await response.json() }
    }
    case 'select-rows': {
      const url = new URL(baseUrl)
      url.searchParams.append('select', (config.columns as string) || '*')
      const response = await fetch(url.toString(), { headers })
      return { success: response.ok, data: await response.json() }
    }
    default:
      return { success: false, error: `지원하지 않는 Supabase 액션: ${action}` }
  }
}

/**
 * Create LangChain tools from integration configurations
 */
export function createIntegrationTools(
  integrations: IntegrationConfig[]
): DynamicStructuredTool[] {
  return integrations.map(integration => {
    const app = getApp(integration.app)
    const actions = APP_ACTIONS[integration.app] || []
    const action = actions.find(a => a.id === integration.action)

    // Build the zod schema from action fields
    const schemaFields: Record<string, z.ZodTypeAny> = {}
    if (action?.fields) {
      for (const field of action.fields) {
        let fieldSchema: z.ZodTypeAny
        switch (field.type) {
          case 'number':
            fieldSchema = z.number().describe(field.name)
            break
          case 'boolean':
            fieldSchema = z.boolean().describe(field.name)
            break
          default:
            fieldSchema = z.string().describe(field.name)
        }
        if (!field.required) fieldSchema = fieldSchema.optional()
        schemaFields[field.id] = fieldSchema
      }
    }

    const schema = Object.keys(schemaFields).length > 0
      ? z.object(schemaFields)
      : z.object({}).passthrough()

    return new DynamicStructuredTool({
      name: `${integration.app}_${integration.action}`.replace(/-/g, '_'),
      description: `${app?.name || integration.app}: ${action?.description || integration.action}`,
      schema,
      func: async (args) => {
        const mergedConfig = { ...integration.config, ...args }
        const result = await executeIntegration({
          app: integration.app,
          action: integration.action,
          config: mergedConfig,
          flowId: integration.flowId,
          webhookUrl: integration.webhookUrl,
        })
        return JSON.stringify(result)
      },
    })
  })
}

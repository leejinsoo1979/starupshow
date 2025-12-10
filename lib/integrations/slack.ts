// Slack Integration Service
// Slack 알림 및 명령어 연동

const SLACK_API_URL = 'https://slack.com/api'

interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
}

interface SlackBlock {
  type: string
  text?: {
    type: string
    text: string
    emoji?: boolean
  }
  accessory?: any
  elements?: any[]
}

interface SlackAttachment {
  color?: string
  title?: string
  title_link?: string
  text?: string
  fields?: Array<{
    title: string
    value: string
    short?: boolean
  }>
  footer?: string
  ts?: number
}

interface SlackUser {
  id: string
  name: string
  real_name: string
  email?: string
  image_48: string
}

interface SlackChannel {
  id: string
  name: string
  is_private: boolean
}

// Slack OAuth URL 생성
export function getSlackAuthUrl(state: string): string {
  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`
  const scope = 'chat:write,channels:read,users:read,users:read.email'

  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`
}

// Access Token 교환
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  team: { id: string; name: string }
}> {
  const response = await fetch(`${SLACK_API_URL}/oauth.v2.access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`,
    }),
  })

  const data = await response.json()
  if (!data.ok) {
    throw new Error(data.error || 'Slack OAuth failed')
  }

  return {
    access_token: data.access_token,
    team: data.team,
  }
}

// Slack API 호출 헬퍼
async function slackFetch<T>(
  method: string,
  accessToken: string,
  body?: Record<string, any>
): Promise<T> {
  const response = await fetch(`${SLACK_API_URL}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()
  if (!data.ok) {
    throw new Error(data.error || `Slack API error: ${method}`)
  }

  return data
}

// 메시지 전송
export async function sendMessage(
  accessToken: string,
  message: SlackMessage
): Promise<{ ts: string; channel: string }> {
  return slackFetch('chat.postMessage', accessToken, message)
}

// 채널 목록 조회
export async function getChannels(accessToken: string): Promise<SlackChannel[]> {
  const data = await slackFetch<{ channels: SlackChannel[] }>(
    'conversations.list',
    accessToken,
    { types: 'public_channel,private_channel' }
  )
  return data.channels
}

// 사용자 목록 조회
export async function getUsers(accessToken: string): Promise<SlackUser[]> {
  const data = await slackFetch<{ members: SlackUser[] }>('users.list', accessToken)
  return data.members.filter((m: any) => !m.is_bot && !m.deleted)
}

// 태스크 알림 메시지 생성
export function createTaskNotification(task: {
  title: string
  status: string
  priority: string
  assignee?: string
  startup_name?: string
  url?: string
}): SlackMessage {
  const statusEmoji: Record<string, string> = {
    TODO: '📋',
    IN_PROGRESS: '🔄',
    REVIEW: '👀',
    DONE: '✅',
  }

  const priorityColor: Record<string, string> = {
    LOW: '#94a3b8',
    MEDIUM: '#eab308',
    HIGH: '#f97316',
    URGENT: '#ef4444',
  }

  return {
    channel: '', // 호출 시 설정
    text: `새 태스크: ${task.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[task.status] || '📌'} 태스크 업데이트`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${task.title}*`,
        },
      },
    ],
    attachments: [
      {
        color: priorityColor[task.priority] || '#6b7280',
        fields: [
          {
            title: '상태',
            value: task.status,
            short: true,
          },
          {
            title: '우선순위',
            value: task.priority,
            short: true,
          },
          ...(task.assignee
            ? [{ title: '담당자', value: task.assignee, short: true }]
            : []),
          ...(task.startup_name
            ? [{ title: '스타트업', value: task.startup_name, short: true }]
            : []),
        ],
        footer: 'GlowUS',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }
}

// 리포트 알림 메시지 생성
export function createReportNotification(report: {
  title: string
  type: 'weekly' | 'monthly'
  period: string
  summary: string
  stats: {
    total: number
    completed: number
    completionRate: number
  }
  url?: string
}): SlackMessage {
  return {
    channel: '',
    text: `${report.type === 'weekly' ? '주간' : '월간'} 리포트: ${report.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 ${report.type === 'weekly' ? '주간' : '월간'} 리포트`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${report.title}*\n기간: ${report.period}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• 전체 태스크: *${report.stats.total}*개\n• 완료: *${report.stats.completed}*개\n• 완료율: *${report.stats.completionRate}%*`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: report.summary.slice(0, 500) + (report.summary.length > 500 ? '...' : ''),
        },
      },
    ],
  }
}

// KPI 알림 메시지 생성
export function createKpiNotification(kpi: {
  metric_type: string
  metric_value: number
  metric_unit: string
  change?: number
  startup_name?: string
}): SlackMessage {
  const changeEmoji = kpi.change
    ? kpi.change > 0
      ? '📈'
      : kpi.change < 0
      ? '📉'
      : '➡️'
    : ''

  return {
    channel: '',
    text: `KPI 업데이트: ${kpi.metric_type}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${changeEmoji} *${kpi.metric_type}* 업데이트\n현재 값: *${kpi.metric_value.toLocaleString()}${kpi.metric_unit}*${kpi.change ? `\n변화: ${kpi.change > 0 ? '+' : ''}${kpi.change}%` : ''}`,
        },
      },
    ],
  }
}

// Incoming Webhook으로 메시지 전송 (간단한 알림용)
export async function sendWebhook(
  webhookUrl: string,
  message: SlackMessage
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    throw new Error('Slack webhook failed')
  }
}

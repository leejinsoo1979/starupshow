// Activepieces 앱 전체 목록
export interface IntegrationApp {
  id: string
  name: string
  icon: string
  category: string
  description?: string
}

export interface IntegrationAction {
  id: string
  name: string
  description: string
  fields: IntegrationField[]
}

export interface IntegrationField {
  id: string
  name: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean'
  required?: boolean
  placeholder?: string
  options?: string[]
}

// 전체 앱 목록 (Activepieces 기반)
export const INTEGRATION_APPS: IntegrationApp[] = [
  // Communication (9)
  { id: 'slack', name: 'Slack', icon: '💬', category: 'communication' },
  { id: 'discord', name: 'Discord', icon: '🎮', category: 'communication' },
  { id: 'telegram-bot', name: 'Telegram', icon: '✈️', category: 'communication' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '📱', category: 'communication' },
  { id: 'microsoft-teams', name: 'Microsoft Teams', icon: '👥', category: 'communication' },
  { id: 'intercom', name: 'Intercom', icon: '💁', category: 'communication' },
  { id: 'twilio', name: 'Twilio', icon: '📞', category: 'communication' },
  { id: 'line', name: 'LINE', icon: '🟢', category: 'communication' },
  { id: 'mattermost', name: 'Mattermost', icon: '🔵', category: 'communication' },

  // Productivity (21)
  { id: 'google-sheets', name: 'Google Sheets', icon: '📊', category: 'productivity' },
  { id: 'google-docs', name: 'Google Docs', icon: '📄', category: 'productivity' },
  { id: 'google-slides', name: 'Google Slides', icon: '📽️', category: 'productivity' },
  { id: 'google-drive', name: 'Google Drive', icon: '🗂️', category: 'productivity' },
  { id: 'google-calendar', name: 'Google Calendar', icon: '📅', category: 'productivity' },
  { id: 'notion', name: 'Notion', icon: '📝', category: 'productivity' },
  { id: 'airtable', name: 'Airtable', icon: '📋', category: 'productivity' },
  { id: 'trello', name: 'Trello', icon: '📌', category: 'productivity' },
  { id: 'asana', name: 'Asana', icon: '✅', category: 'productivity' },
  { id: 'monday', name: 'Monday.com', icon: '📆', category: 'productivity' },
  { id: 'clickup', name: 'ClickUp', icon: '🎯', category: 'productivity' },
  { id: 'todoist', name: 'Todoist', icon: '☑️', category: 'productivity' },
  { id: 'linear', name: 'Linear', icon: '📐', category: 'productivity' },
  { id: 'jira-cloud', name: 'Jira', icon: '🔷', category: 'productivity' },
  { id: 'confluence', name: 'Confluence', icon: '📚', category: 'productivity' },
  { id: 'coda', name: 'Coda', icon: '📓', category: 'productivity' },
  { id: 'microsoft-excel-365', name: 'Excel 365', icon: '📗', category: 'productivity' },
  { id: 'microsoft-onenote', name: 'OneNote', icon: '📔', category: 'productivity' },
  { id: 'microsoft-todo', name: 'Microsoft To Do', icon: '✔️', category: 'productivity' },
  { id: 'baserow', name: 'Baserow', icon: '🗃️', category: 'productivity' },
  { id: 'nocodb', name: 'NocoDB', icon: '🗄️', category: 'productivity' },

  // Email (10)
  { id: 'gmail', name: 'Gmail', icon: '📧', category: 'email' },
  { id: 'microsoft-outlook', name: 'Outlook', icon: '📨', category: 'email' },
  { id: 'sendgrid', name: 'SendGrid', icon: '📤', category: 'email' },
  { id: 'mailchimp', name: 'Mailchimp', icon: '🐵', category: 'email' },
  { id: 'mailjet', name: 'Mailjet', icon: '✉️', category: 'email' },
  { id: 'sendinblue', name: 'Brevo (Sendinblue)', icon: '💌', category: 'email' },
  { id: 'convertkit', name: 'ConvertKit', icon: '📬', category: 'email' },
  { id: 'resend', name: 'Resend', icon: '📩', category: 'email' },
  { id: 'smtp', name: 'SMTP', icon: '📮', category: 'email' },
  { id: 'imap', name: 'IMAP', icon: '📥', category: 'email' },

  // CRM & Sales (9)
  { id: 'hubspot', name: 'HubSpot', icon: '🧡', category: 'crm' },
  { id: 'salesforce', name: 'Salesforce', icon: '☁️', category: 'crm' },
  { id: 'pipedrive', name: 'Pipedrive', icon: '🔄', category: 'crm' },
  { id: 'zoho-crm', name: 'Zoho CRM', icon: '📇', category: 'crm' },
  { id: 'close', name: 'Close', icon: '📞', category: 'crm' },
  { id: 'freshsales', name: 'Freshsales', icon: '🍃', category: 'crm' },
  { id: 'copper', name: 'Copper', icon: '🔶', category: 'crm' },
  { id: 'attio', name: 'Attio', icon: '🎨', category: 'crm' },
  { id: 'folk', name: 'Folk', icon: '👥', category: 'crm' },

  // AI (16)
  { id: 'openai', name: 'OpenAI', icon: '🤖', category: 'ai' },
  { id: 'google-gemini', name: 'Google Gemini', icon: '♊', category: 'ai' },
  { id: 'claude', name: 'Claude', icon: '🧠', category: 'ai' },
  { id: 'mistral-ai', name: 'Mistral AI', icon: '🌀', category: 'ai' },
  { id: 'groq', name: 'Groq', icon: '⚡', category: 'ai' },
  { id: 'perplexity-ai', name: 'Perplexity', icon: '🔍', category: 'ai' },
  { id: 'anthropic', name: 'Anthropic', icon: '🅰️', category: 'ai' },
  { id: 'hugging-face', name: 'Hugging Face', icon: '🤗', category: 'ai' },
  { id: 'stability-ai', name: 'Stability AI', icon: '🎨', category: 'ai' },
  { id: 'elevenlabs', name: 'ElevenLabs', icon: '🔊', category: 'ai' },
  { id: 'deepgram', name: 'Deepgram', icon: '🎙️', category: 'ai' },
  { id: 'assemblyai', name: 'AssemblyAI', icon: '📝', category: 'ai' },
  { id: 'deepl', name: 'DeepL', icon: '🌐', category: 'ai' },
  { id: 'azure-openai', name: 'Azure OpenAI', icon: '☁️', category: 'ai' },
  { id: 'open-router', name: 'OpenRouter', icon: '🔀', category: 'ai' },
  { id: 'replicate', name: 'Replicate', icon: '🔁', category: 'ai' },

  // Developer Tools (13)
  { id: 'github', name: 'GitHub', icon: '🐙', category: 'developer' },
  { id: 'gitlab', name: 'GitLab', icon: '🦊', category: 'developer' },
  { id: 'http', name: 'HTTP Request', icon: '🌐', category: 'developer' },
  { id: 'webhook', name: 'Webhook', icon: '🪝', category: 'developer' },
  { id: 'graphql', name: 'GraphQL', icon: '◼️', category: 'developer' },
  { id: 'postgres', name: 'PostgreSQL', icon: '🐘', category: 'developer' },
  { id: 'mysql', name: 'MySQL', icon: '🐬', category: 'developer' },
  { id: 'mongodb', name: 'MongoDB', icon: '🍃', category: 'developer' },
  { id: 'supabase', name: 'Supabase', icon: '⚡', category: 'developer' },
  { id: 'firebase', name: 'Firebase', icon: '🔥', category: 'developer' },
  { id: 'redis', name: 'Redis', icon: '🔴', category: 'developer' },
  { id: 'pinecone', name: 'Pinecone', icon: '🌲', category: 'developer' },
  { id: 'qdrant', name: 'Qdrant', icon: '🔷', category: 'developer' },

  // Storage (5)
  { id: 'amazon-s3', name: 'Amazon S3', icon: '🪣', category: 'storage' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', category: 'storage' },
  { id: 'box', name: 'Box', icon: '📁', category: 'storage' },
  { id: 'microsoft-onedrive', name: 'OneDrive', icon: '☁️', category: 'storage' },
  { id: 'google-cloud-storage', name: 'Google Cloud Storage', icon: '🗄️', category: 'storage' },

  // Social Media (10)
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', category: 'social' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', category: 'social' },
  { id: 'instagram-business', name: 'Instagram', icon: '📸', category: 'social' },
  { id: 'facebook-pages', name: 'Facebook Pages', icon: '👍', category: 'social' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', category: 'social' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', category: 'social' },
  { id: 'pinterest', name: 'Pinterest', icon: '📍', category: 'social' },
  { id: 'reddit', name: 'Reddit', icon: '🤖', category: 'social' },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋', category: 'social' },
  { id: 'mastodon', name: 'Mastodon', icon: '🐘', category: 'social' },

  // E-commerce (6)
  { id: 'shopify', name: 'Shopify', icon: '🛍️', category: 'ecommerce' },
  { id: 'woocommerce', name: 'WooCommerce', icon: '🛒', category: 'ecommerce' },
  { id: 'stripe', name: 'Stripe', icon: '💳', category: 'ecommerce' },
  { id: 'square', name: 'Square', icon: '⬜', category: 'ecommerce' },
  { id: 'paypal', name: 'PayPal', icon: '💰', category: 'ecommerce' },
  { id: 'bigcommerce', name: 'BigCommerce', icon: '🏪', category: 'ecommerce' },

  // Forms & Surveys (6)
  { id: 'typeform', name: 'Typeform', icon: '📝', category: 'forms' },
  { id: 'google-forms', name: 'Google Forms', icon: '📋', category: 'forms' },
  { id: 'jotform', name: 'JotForm', icon: '📄', category: 'forms' },
  { id: 'tally', name: 'Tally', icon: '✏️', category: 'forms' },
  { id: 'surveymonkey', name: 'SurveyMonkey', icon: '🐒', category: 'forms' },
  { id: 'fillout-forms', name: 'Fillout', icon: '📑', category: 'forms' },

  // Scheduling (3)
  { id: 'calendly', name: 'Calendly', icon: '📆', category: 'scheduling' },
  { id: 'cal-com', name: 'Cal.com', icon: '📅', category: 'scheduling' },
  { id: 'acuity-scheduling', name: 'Acuity Scheduling', icon: '🗓️', category: 'scheduling' },

  // Customer Support (5)
  { id: 'zendesk', name: 'Zendesk', icon: '🎫', category: 'support' },
  { id: 'freshdesk', name: 'Freshdesk', icon: '🆘', category: 'support' },
  { id: 'help-scout', name: 'Help Scout', icon: '🏕️', category: 'support' },
  { id: 'crisp', name: 'Crisp', icon: '💬', category: 'support' },
  { id: 'front', name: 'Front', icon: '📫', category: 'support' },

  // Analytics (5)
  { id: 'google-analytics', name: 'Google Analytics', icon: '📈', category: 'analytics' },
  { id: 'mixpanel', name: 'Mixpanel', icon: '📊', category: 'analytics' },
  { id: 'posthog', name: 'PostHog', icon: '🦔', category: 'analytics' },
  { id: 'segment', name: 'Segment', icon: '📶', category: 'analytics' },
  { id: 'amplitude', name: 'Amplitude', icon: '📉', category: 'analytics' },

  // Documents (3)
  { id: 'pdf', name: 'PDF', icon: '📕', category: 'documents' },
  { id: 'docusign', name: 'DocuSign', icon: '✍️', category: 'documents' },
  { id: 'pandadoc', name: 'PandaDoc', icon: '🐼', category: 'documents' },

  // Utilities (11)
  { id: 'schedule', name: 'Schedule', icon: '⏰', category: 'utility' },
  { id: 'delay', name: 'Delay', icon: '⏳', category: 'utility' },
  { id: 'json', name: 'JSON', icon: '{}', category: 'utility' },
  { id: 'csv', name: 'CSV', icon: '📑', category: 'utility' },
  { id: 'xml', name: 'XML', icon: '📃', category: 'utility' },
  { id: 'rss', name: 'RSS', icon: '📰', category: 'utility' },
  { id: 'text-helper', name: 'Text Helper', icon: '📝', category: 'utility' },
  { id: 'date-helper', name: 'Date Helper', icon: '📅', category: 'utility' },
  { id: 'math-helper', name: 'Math Helper', icon: '🔢', category: 'utility' },
  { id: 'file-helper', name: 'File Helper', icon: '📁', category: 'utility' },
  { id: 'image-helper', name: 'Image Helper', icon: '🖼️', category: 'utility' },
]

// 카테고리 목록
export const CATEGORIES = [
  { id: 'all', name: '전체', icon: '🔍' },
  { id: 'communication', name: '커뮤니케이션', icon: '💬' },
  { id: 'productivity', name: '생산성', icon: '📊' },
  { id: 'email', name: '이메일', icon: '📧' },
  { id: 'crm', name: 'CRM', icon: '📇' },
  { id: 'ai', name: 'AI', icon: '🤖' },
  { id: 'developer', name: '개발', icon: '👨‍💻' },
  { id: 'storage', name: '저장소', icon: '🗄️' },
  { id: 'social', name: '소셜미디어', icon: '📱' },
  { id: 'ecommerce', name: '이커머스', icon: '🛒' },
  { id: 'forms', name: '폼/설문', icon: '📝' },
  { id: 'scheduling', name: '일정', icon: '📅' },
  { id: 'support', name: '고객지원', icon: '🎫' },
  { id: 'analytics', name: '분석', icon: '📈' },
  { id: 'documents', name: '문서', icon: '📄' },
  { id: 'utility', name: '유틸리티', icon: '🔧' },
]

// ============================================================================
// 모든 앱의 액션 정의 (132개 앱)
// ============================================================================
export const APP_ACTIONS: Record<string, IntegrationAction[]> = {
  // === COMMUNICATION (9) ===
  'slack': [
    { id: 'send-message', name: '메시지 전송', description: '채널에 메시지 보내기', fields: [
      { id: 'channel', name: '채널', type: 'text', required: true, placeholder: '#general' },
      { id: 'text', name: '메시지', type: 'textarea', required: true },
    ]},
    { id: 'send-dm', name: 'DM 전송', description: '사용자에게 DM 보내기', fields: [
      { id: 'userId', name: '사용자 ID', type: 'text', required: true },
      { id: 'text', name: '메시지', type: 'textarea', required: true },
    ]},
  ],
  'discord': [
    { id: 'send-message', name: '메시지 전송', description: 'Webhook으로 메시지 보내기', fields: [
      { id: 'webhookUrl', name: 'Webhook URL', type: 'text', required: true },
      { id: 'content', name: '메시지', type: 'textarea', required: true },
      { id: 'username', name: '봇 이름', type: 'text', placeholder: 'Bot' },
    ]},
    { id: 'send-embed', name: '임베드 전송', description: '임베드 메시지 보내기', fields: [
      { id: 'webhookUrl', name: 'Webhook URL', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea' },
      { id: 'color', name: '색상 (Hex)', type: 'text', placeholder: '#5865F2' },
    ]},
  ],
  'telegram-bot': [
    { id: 'send-message', name: '메시지 전송', description: '채팅에 메시지 보내기', fields: [
      { id: 'botToken', name: '봇 토큰', type: 'text', required: true },
      { id: 'chatId', name: '채팅 ID', type: 'text', required: true },
      { id: 'text', name: '메시지', type: 'textarea', required: true },
    ]},
    { id: 'send-photo', name: '사진 전송', description: '채팅에 사진 보내기', fields: [
      { id: 'botToken', name: '봇 토큰', type: 'text', required: true },
      { id: 'chatId', name: '채팅 ID', type: 'text', required: true },
      { id: 'photoUrl', name: '사진 URL', type: 'text', required: true },
    ]},
  ],
  'whatsapp': [
    { id: 'send-message', name: '메시지 전송', description: 'WhatsApp 메시지 보내기', fields: [
      { id: 'phoneNumberId', name: 'Phone Number ID', type: 'text', required: true },
      { id: 'to', name: '받는 번호', type: 'text', required: true, placeholder: '821012345678' },
      { id: 'message', name: '메시지', type: 'textarea', required: true },
    ]},
  ],
  'microsoft-teams': [
    { id: 'send-message', name: '메시지 전송', description: 'Teams 채널에 메시지 보내기', fields: [
      { id: 'webhookUrl', name: 'Webhook URL', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text' },
      { id: 'text', name: '메시지', type: 'textarea', required: true },
    ]},
  ],
  'intercom': [
    { id: 'create-contact', name: '연락처 생성', description: '새 연락처 만들기', fields: [
      { id: 'email', name: '이메일', type: 'text', required: true },
      { id: 'name', name: '이름', type: 'text' },
    ]},
    { id: 'send-message', name: '메시지 전송', description: '사용자에게 메시지 보내기', fields: [
      { id: 'userId', name: '사용자 ID', type: 'text', required: true },
      { id: 'body', name: '메시지', type: 'textarea', required: true },
    ]},
  ],
  'twilio': [
    { id: 'send-sms', name: 'SMS 전송', description: 'SMS 메시지 보내기', fields: [
      { id: 'to', name: '받는 번호', type: 'text', required: true, placeholder: '+821012345678' },
      { id: 'body', name: '메시지', type: 'textarea', required: true },
    ]},
    { id: 'make-call', name: '전화 걸기', description: '음성 전화 걸기', fields: [
      { id: 'to', name: '받는 번호', type: 'text', required: true },
      { id: 'twiml', name: 'TwiML', type: 'textarea', required: true },
    ]},
  ],
  'line': [
    { id: 'send-message', name: '메시지 전송', description: 'LINE 메시지 보내기', fields: [
      { id: 'to', name: '받는 사람 ID', type: 'text', required: true },
      { id: 'text', name: '메시지', type: 'textarea', required: true },
    ]},
  ],
  'mattermost': [
    { id: 'send-message', name: '메시지 전송', description: '채널에 메시지 보내기', fields: [
      { id: 'webhookUrl', name: 'Webhook URL', type: 'text', required: true },
      { id: 'text', name: '메시지', type: 'textarea', required: true },
      { id: 'channel', name: '채널', type: 'text' },
    ]},
  ],

  // === PRODUCTIVITY (21) ===
  'google-sheets': [
    { id: 'append-row', name: '행 추가', description: '시트에 새 행 추가', fields: [
      { id: 'spreadsheetId', name: '스프레드시트 ID', type: 'text', required: true },
      { id: 'sheetName', name: '시트 이름', type: 'text', required: true, placeholder: 'Sheet1' },
      { id: 'values', name: '데이터 (JSON 배열)', type: 'textarea', required: true, placeholder: '["값1", "값2"]' },
    ]},
    { id: 'read-rows', name: '행 읽기', description: '시트에서 데이터 읽기', fields: [
      { id: 'spreadsheetId', name: '스프레드시트 ID', type: 'text', required: true },
      { id: 'sheetName', name: '시트 이름', type: 'text', required: true },
      { id: 'range', name: '범위', type: 'text', placeholder: 'A1:D10' },
    ]},
    { id: 'update-row', name: '행 수정', description: '특정 행 데이터 수정', fields: [
      { id: 'spreadsheetId', name: '스프레드시트 ID', type: 'text', required: true },
      { id: 'sheetName', name: '시트 이름', type: 'text', required: true },
      { id: 'range', name: '범위', type: 'text', required: true, placeholder: 'A2:D2' },
      { id: 'values', name: '데이터 (JSON 배열)', type: 'textarea', required: true },
    ]},
  ],
  'google-docs': [
    { id: 'create-document', name: '문서 생성', description: '새 문서 만들기', fields: [
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea' },
    ]},
    { id: 'append-text', name: '텍스트 추가', description: '문서에 텍스트 추가', fields: [
      { id: 'documentId', name: '문서 ID', type: 'text', required: true },
      { id: 'text', name: '텍스트', type: 'textarea', required: true },
    ]},
  ],
  'google-slides': [
    { id: 'create-presentation', name: '프레젠테이션 생성', description: '새 프레젠테이션 만들기', fields: [
      { id: 'title', name: '제목', type: 'text', required: true },
    ]},
  ],
  'google-drive': [
    { id: 'upload-file', name: '파일 업로드', description: '드라이브에 파일 업로드', fields: [
      { id: 'fileName', name: '파일명', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
      { id: 'folderId', name: '폴더 ID', type: 'text' },
    ]},
    { id: 'create-folder', name: '폴더 생성', description: '새 폴더 만들기', fields: [
      { id: 'name', name: '폴더명', type: 'text', required: true },
      { id: 'parentId', name: '상위 폴더 ID', type: 'text' },
    ]},
  ],
  'google-calendar': [
    { id: 'create-event', name: '일정 생성', description: '새 일정 만들기', fields: [
      { id: 'summary', name: '제목', type: 'text', required: true },
      { id: 'start', name: '시작 시간', type: 'text', required: true, placeholder: '2024-01-01T09:00:00' },
      { id: 'end', name: '종료 시간', type: 'text', required: true, placeholder: '2024-01-01T10:00:00' },
      { id: 'description', name: '설명', type: 'textarea' },
    ]},
  ],
  'notion': [
    { id: 'create-page', name: '페이지 생성', description: '새 페이지 만들기', fields: [
      { id: 'parentId', name: '상위 페이지/DB ID', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea' },
    ]},
    { id: 'create-database-item', name: 'DB 항목 추가', description: '데이터베이스에 항목 추가', fields: [
      { id: 'databaseId', name: '데이터베이스 ID', type: 'text', required: true },
      { id: 'properties', name: '속성 (JSON)', type: 'textarea', required: true },
    ]},
  ],
  'airtable': [
    { id: 'create-record', name: '레코드 생성', description: '테이블에 레코드 추가', fields: [
      { id: 'baseId', name: 'Base ID', type: 'text', required: true },
      { id: 'tableId', name: 'Table ID/Name', type: 'text', required: true },
      { id: 'fields', name: '필드 (JSON)', type: 'textarea', required: true },
    ]},
    { id: 'find-records', name: '레코드 검색', description: '조건에 맞는 레코드 찾기', fields: [
      { id: 'baseId', name: 'Base ID', type: 'text', required: true },
      { id: 'tableId', name: 'Table ID/Name', type: 'text', required: true },
      { id: 'filterFormula', name: '필터 공식', type: 'text' },
    ]},
  ],
  'trello': [
    { id: 'create-card', name: '카드 생성', description: '새 카드 만들기', fields: [
      { id: 'listId', name: '리스트 ID', type: 'text', required: true },
      { id: 'name', name: '카드 이름', type: 'text', required: true },
      { id: 'desc', name: '설명', type: 'textarea' },
    ]},
    { id: 'move-card', name: '카드 이동', description: '카드를 다른 리스트로 이동', fields: [
      { id: 'cardId', name: '카드 ID', type: 'text', required: true },
      { id: 'listId', name: '목표 리스트 ID', type: 'text', required: true },
    ]},
  ],
  'asana': [
    { id: 'create-task', name: '태스크 생성', description: '새 태스크 만들기', fields: [
      { id: 'projectId', name: '프로젝트 ID', type: 'text', required: true },
      { id: 'name', name: '태스크 이름', type: 'text', required: true },
      { id: 'notes', name: '설명', type: 'textarea' },
    ]},
  ],
  'monday': [
    { id: 'create-item', name: '아이템 생성', description: '새 아이템 만들기', fields: [
      { id: 'boardId', name: '보드 ID', type: 'text', required: true },
      { id: 'itemName', name: '아이템 이름', type: 'text', required: true },
      { id: 'columnValues', name: '컬럼 값 (JSON)', type: 'textarea' },
    ]},
  ],
  'clickup': [
    { id: 'create-task', name: '태스크 생성', description: '새 태스크 만들기', fields: [
      { id: 'listId', name: '리스트 ID', type: 'text', required: true },
      { id: 'name', name: '태스크 이름', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea' },
    ]},
  ],
  'todoist': [
    { id: 'create-task', name: '태스크 생성', description: '새 태스크 만들기', fields: [
      { id: 'content', name: '내용', type: 'text', required: true },
      { id: 'projectId', name: '프로젝트 ID', type: 'text' },
      { id: 'dueDate', name: '마감일', type: 'text', placeholder: '2024-01-01' },
    ]},
  ],
  'linear': [
    { id: 'create-issue', name: '이슈 생성', description: '새 이슈 만들기', fields: [
      { id: 'teamId', name: '팀 ID', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea' },
    ]},
  ],
  'jira-cloud': [
    { id: 'create-issue', name: '이슈 생성', description: '새 이슈 만들기', fields: [
      { id: 'projectKey', name: '프로젝트 키', type: 'text', required: true },
      { id: 'summary', name: '요약', type: 'text', required: true },
      { id: 'issueType', name: '이슈 유형', type: 'select', required: true, options: ['Task', 'Bug', 'Story', 'Epic'] },
      { id: 'description', name: '설명', type: 'textarea' },
    ]},
  ],
  'confluence': [
    { id: 'create-page', name: '페이지 생성', description: '새 페이지 만들기', fields: [
      { id: 'spaceKey', name: '스페이스 키', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'body', name: '내용', type: 'textarea' },
    ]},
  ],
  'coda': [
    { id: 'add-row', name: '행 추가', description: '테이블에 행 추가', fields: [
      { id: 'docId', name: '문서 ID', type: 'text', required: true },
      { id: 'tableId', name: '테이블 ID', type: 'text', required: true },
      { id: 'cells', name: '셀 값 (JSON)', type: 'textarea', required: true },
    ]},
  ],
  'microsoft-excel-365': [
    { id: 'add-row', name: '행 추가', description: '워크시트에 행 추가', fields: [
      { id: 'workbookId', name: '워크북 ID', type: 'text', required: true },
      { id: 'worksheetName', name: '워크시트 이름', type: 'text', required: true },
      { id: 'values', name: '값 (JSON 배열)', type: 'textarea', required: true },
    ]},
  ],
  'microsoft-onenote': [
    { id: 'create-page', name: '페이지 생성', description: '새 페이지 만들기', fields: [
      { id: 'sectionId', name: '섹션 ID', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'content', name: '내용 (HTML)', type: 'textarea' },
    ]},
  ],
  'microsoft-todo': [
    { id: 'create-task', name: '태스크 생성', description: '새 태스크 만들기', fields: [
      { id: 'listId', name: '리스트 ID', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'dueDateTime', name: '마감일', type: 'text' },
    ]},
  ],
  'baserow': [
    { id: 'create-row', name: '행 생성', description: '테이블에 행 추가', fields: [
      { id: 'tableId', name: '테이블 ID', type: 'text', required: true },
      { id: 'fields', name: '필드 (JSON)', type: 'textarea', required: true },
    ]},
  ],
  'nocodb': [
    { id: 'create-record', name: '레코드 생성', description: '테이블에 레코드 추가', fields: [
      { id: 'tableId', name: '테이블 ID', type: 'text', required: true },
      { id: 'data', name: '데이터 (JSON)', type: 'textarea', required: true },
    ]},
  ],

  // === EMAIL (10) ===
  'gmail': [
    { id: 'send-email', name: '이메일 전송', description: '이메일 보내기', fields: [
      { id: 'to', name: '받는 사람', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'body', name: '본문', type: 'textarea', required: true },
    ]},
  ],
  'microsoft-outlook': [
    { id: 'send-email', name: '이메일 전송', description: '이메일 보내기', fields: [
      { id: 'to', name: '받는 사람', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'body', name: '본문', type: 'textarea', required: true },
    ]},
  ],
  'sendgrid': [
    { id: 'send-email', name: '이메일 전송', description: '이메일 보내기', fields: [
      { id: 'to', name: '받는 사람', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
      { id: 'from', name: '보내는 사람', type: 'text', required: true },
    ]},
  ],
  'mailchimp': [
    { id: 'add-subscriber', name: '구독자 추가', description: '리스트에 구독자 추가', fields: [
      { id: 'listId', name: '리스트 ID', type: 'text', required: true },
      { id: 'email', name: '이메일', type: 'text', required: true },
      { id: 'firstName', name: '이름', type: 'text' },
      { id: 'lastName', name: '성', type: 'text' },
    ]},
  ],
  'mailjet': [
    { id: 'send-email', name: '이메일 전송', description: '이메일 보내기', fields: [
      { id: 'to', name: '받는 사람', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'text', name: '내용', type: 'textarea', required: true },
      { id: 'from', name: '보내는 사람', type: 'text', required: true },
    ]},
  ],
  'sendinblue': [
    { id: 'send-email', name: '이메일 전송', description: '이메일 보내기', fields: [
      { id: 'to', name: '받는 사람', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'htmlContent', name: '내용 (HTML)', type: 'textarea', required: true },
      { id: 'sender', name: '보내는 사람', type: 'text', required: true },
    ]},
  ],
  'convertkit': [
    { id: 'add-subscriber', name: '구독자 추가', description: '폼에 구독자 추가', fields: [
      { id: 'formId', name: '폼 ID', type: 'text', required: true },
      { id: 'email', name: '이메일', type: 'text', required: true },
      { id: 'firstName', name: '이름', type: 'text' },
    ]},
  ],
  'resend': [
    { id: 'send-email', name: '이메일 전송', description: '이메일 보내기', fields: [
      { id: 'to', name: '받는 사람', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'html', name: '내용 (HTML)', type: 'textarea', required: true },
      { id: 'from', name: '보내는 사람', type: 'text', required: true },
    ]},
  ],
  'smtp': [
    { id: 'send-email', name: '이메일 전송', description: 'SMTP로 이메일 보내기', fields: [
      { id: 'host', name: 'SMTP 호스트', type: 'text', required: true },
      { id: 'port', name: '포트', type: 'number', required: true },
      { id: 'user', name: '사용자', type: 'text', required: true },
      { id: 'pass', name: '비밀번호', type: 'text', required: true },
      { id: 'to', name: '받는 사람', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'text', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'imap': [
    { id: 'fetch-emails', name: '이메일 가져오기', description: '이메일 목록 조회', fields: [
      { id: 'host', name: 'IMAP 호스트', type: 'text', required: true },
      { id: 'port', name: '포트', type: 'number', required: true },
      { id: 'user', name: '사용자', type: 'text', required: true },
      { id: 'pass', name: '비밀번호', type: 'text', required: true },
      { id: 'folder', name: '폴더', type: 'text', placeholder: 'INBOX' },
    ]},
  ],

  // === CRM (9) ===
  'hubspot': [
    { id: 'create-contact', name: '연락처 생성', description: '새 연락처 만들기', fields: [
      { id: 'email', name: '이메일', type: 'text', required: true },
      { id: 'firstname', name: '이름', type: 'text' },
      { id: 'lastname', name: '성', type: 'text' },
      { id: 'phone', name: '전화번호', type: 'text' },
    ]},
    { id: 'create-deal', name: '거래 생성', description: '새 거래 만들기', fields: [
      { id: 'dealname', name: '거래명', type: 'text', required: true },
      { id: 'amount', name: '금액', type: 'number' },
      { id: 'dealstage', name: '단계', type: 'text' },
    ]},
  ],
  'salesforce': [
    { id: 'create-lead', name: '리드 생성', description: '새 리드 만들기', fields: [
      { id: 'lastName', name: '성', type: 'text', required: true },
      { id: 'company', name: '회사', type: 'text', required: true },
      { id: 'email', name: '이메일', type: 'text' },
    ]},
    { id: 'create-opportunity', name: '기회 생성', description: '새 기회 만들기', fields: [
      { id: 'name', name: '이름', type: 'text', required: true },
      { id: 'stageName', name: '단계', type: 'text', required: true },
      { id: 'closeDate', name: '마감일', type: 'text', required: true },
    ]},
  ],
  'pipedrive': [
    { id: 'create-deal', name: '거래 생성', description: '새 거래 만들기', fields: [
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'value', name: '금액', type: 'number' },
      { id: 'personId', name: '담당자 ID', type: 'text' },
    ]},
    { id: 'create-person', name: '담당자 생성', description: '새 담당자 만들기', fields: [
      { id: 'name', name: '이름', type: 'text', required: true },
      { id: 'email', name: '이메일', type: 'text' },
      { id: 'phone', name: '전화번호', type: 'text' },
    ]},
  ],
  'zoho-crm': [
    { id: 'create-lead', name: '리드 생성', description: '새 리드 만들기', fields: [
      { id: 'lastName', name: '성', type: 'text', required: true },
      { id: 'company', name: '회사', type: 'text' },
      { id: 'email', name: '이메일', type: 'text' },
    ]},
  ],
  'close': [
    { id: 'create-lead', name: '리드 생성', description: '새 리드 만들기', fields: [
      { id: 'name', name: '이름', type: 'text', required: true },
      { id: 'contacts', name: '연락처 (JSON)', type: 'textarea' },
    ]},
  ],
  'freshsales': [
    { id: 'create-contact', name: '연락처 생성', description: '새 연락처 만들기', fields: [
      { id: 'email', name: '이메일', type: 'text', required: true },
      { id: 'first_name', name: '이름', type: 'text' },
      { id: 'last_name', name: '성', type: 'text' },
    ]},
  ],
  'copper': [
    { id: 'create-lead', name: '리드 생성', description: '새 리드 만들기', fields: [
      { id: 'name', name: '이름', type: 'text', required: true },
      { id: 'email', name: '이메일', type: 'text' },
    ]},
  ],
  'attio': [
    { id: 'create-record', name: '레코드 생성', description: '새 레코드 만들기', fields: [
      { id: 'objectId', name: '객체 ID', type: 'text', required: true },
      { id: 'data', name: '데이터 (JSON)', type: 'textarea', required: true },
    ]},
  ],
  'folk': [
    { id: 'create-contact', name: '연락처 생성', description: '새 연락처 만들기', fields: [
      { id: 'email', name: '이메일', type: 'text', required: true },
      { id: 'firstName', name: '이름', type: 'text' },
      { id: 'lastName', name: '성', type: 'text' },
    ]},
  ],

  // === AI (16) ===
  'openai': [
    { id: 'chat-completion', name: 'Chat Completion', description: 'GPT로 텍스트 생성', fields: [
      { id: 'model', name: '모델', type: 'select', required: true, options: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
      { id: 'systemPrompt', name: '시스템 프롬프트', type: 'textarea' },
      { id: 'userPrompt', name: '사용자 프롬프트', type: 'textarea', required: true },
    ]},
    { id: 'create-image', name: '이미지 생성', description: 'DALL-E로 이미지 생성', fields: [
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
      { id: 'size', name: '크기', type: 'select', options: ['1024x1024', '1792x1024', '1024x1792'] },
    ]},
  ],
  'google-gemini': [
    { id: 'generate-content', name: '콘텐츠 생성', description: 'Gemini로 텍스트 생성', fields: [
      { id: 'model', name: '모델', type: 'select', options: ['gemini-pro', 'gemini-pro-vision'] },
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'claude': [
    { id: 'create-message', name: '메시지 생성', description: 'Claude로 텍스트 생성', fields: [
      { id: 'model', name: '모델', type: 'select', options: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
      { id: 'systemPrompt', name: '시스템 프롬프트', type: 'textarea' },
      { id: 'userPrompt', name: '사용자 프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'mistral-ai': [
    { id: 'chat-completion', name: 'Chat Completion', description: 'Mistral로 텍스트 생성', fields: [
      { id: 'model', name: '모델', type: 'select', options: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'] },
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'groq': [
    { id: 'chat-completion', name: 'Chat Completion', description: 'Groq로 텍스트 생성', fields: [
      { id: 'model', name: '모델', type: 'select', options: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'perplexity-ai': [
    { id: 'chat-completion', name: 'Chat Completion', description: 'Perplexity로 검색 생성', fields: [
      { id: 'model', name: '모델', type: 'select', options: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'] },
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'anthropic': [
    { id: 'create-message', name: '메시지 생성', description: 'Claude로 텍스트 생성', fields: [
      { id: 'model', name: '모델', type: 'select', options: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'] },
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'hugging-face': [
    { id: 'inference', name: '추론', description: '모델로 추론 실행', fields: [
      { id: 'model', name: '모델 ID', type: 'text', required: true, placeholder: 'gpt2' },
      { id: 'inputs', name: '입력', type: 'textarea', required: true },
    ]},
  ],
  'stability-ai': [
    { id: 'generate-image', name: '이미지 생성', description: 'Stable Diffusion으로 이미지 생성', fields: [
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
      { id: 'negativePrompt', name: '네거티브 프롬프트', type: 'textarea' },
    ]},
  ],
  'elevenlabs': [
    { id: 'text-to-speech', name: '텍스트 → 음성', description: '텍스트를 음성으로 변환', fields: [
      { id: 'text', name: '텍스트', type: 'textarea', required: true },
      { id: 'voiceId', name: '음성 ID', type: 'text', required: true },
    ]},
  ],
  'deepgram': [
    { id: 'transcribe', name: '음성 → 텍스트', description: '음성을 텍스트로 변환', fields: [
      { id: 'audioUrl', name: '오디오 URL', type: 'text', required: true },
      { id: 'language', name: '언어', type: 'text', placeholder: 'ko' },
    ]},
  ],
  'assemblyai': [
    { id: 'transcribe', name: '음성 → 텍스트', description: '음성을 텍스트로 변환', fields: [
      { id: 'audioUrl', name: '오디오 URL', type: 'text', required: true },
      { id: 'languageCode', name: '언어 코드', type: 'text', placeholder: 'ko' },
    ]},
  ],
  'deepl': [
    { id: 'translate', name: '번역', description: '텍스트 번역', fields: [
      { id: 'text', name: '텍스트', type: 'textarea', required: true },
      { id: 'targetLang', name: '목표 언어', type: 'select', required: true, options: ['KO', 'EN', 'JA', 'ZH', 'DE', 'FR', 'ES'] },
      { id: 'sourceLang', name: '원본 언어', type: 'text' },
    ]},
  ],
  'azure-openai': [
    { id: 'chat-completion', name: 'Chat Completion', description: 'Azure OpenAI로 텍스트 생성', fields: [
      { id: 'deploymentName', name: '배포 이름', type: 'text', required: true },
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'open-router': [
    { id: 'chat-completion', name: 'Chat Completion', description: 'OpenRouter로 텍스트 생성', fields: [
      { id: 'model', name: '모델', type: 'text', required: true },
      { id: 'prompt', name: '프롬프트', type: 'textarea', required: true },
    ]},
  ],
  'replicate': [
    { id: 'run-model', name: '모델 실행', description: 'Replicate 모델 실행', fields: [
      { id: 'model', name: '모델 (owner/name:version)', type: 'text', required: true },
      { id: 'input', name: '입력 (JSON)', type: 'textarea', required: true },
    ]},
  ],

  // === DEVELOPER (13) ===
  'github': [
    { id: 'create-issue', name: '이슈 생성', description: '새 이슈 만들기', fields: [
      { id: 'owner', name: '소유자', type: 'text', required: true },
      { id: 'repo', name: '저장소', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'body', name: '내용', type: 'textarea' },
    ]},
    { id: 'create-pr', name: 'PR 생성', description: 'Pull Request 만들기', fields: [
      { id: 'owner', name: '소유자', type: 'text', required: true },
      { id: 'repo', name: '저장소', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'head', name: 'Head 브랜치', type: 'text', required: true },
      { id: 'base', name: 'Base 브랜치', type: 'text', required: true },
    ]},
  ],
  'gitlab': [
    { id: 'create-issue', name: '이슈 생성', description: '새 이슈 만들기', fields: [
      { id: 'projectId', name: '프로젝트 ID', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea' },
    ]},
  ],
  'http': [
    { id: 'request', name: 'HTTP 요청', description: '커스텀 API 호출', fields: [
      { id: 'method', name: '메소드', type: 'select', required: true, options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      { id: 'url', name: 'URL', type: 'text', required: true },
      { id: 'headers', name: '헤더 (JSON)', type: 'textarea' },
      { id: 'body', name: '바디 (JSON)', type: 'textarea' },
    ]},
  ],
  'webhook': [
    { id: 'send', name: 'Webhook 전송', description: 'Webhook 호출', fields: [
      { id: 'url', name: 'Webhook URL', type: 'text', required: true },
      { id: 'method', name: '메소드', type: 'select', options: ['POST', 'GET', 'PUT'] },
      { id: 'body', name: '바디 (JSON)', type: 'textarea' },
    ]},
  ],
  'graphql': [
    { id: 'query', name: 'GraphQL 쿼리', description: 'GraphQL 쿼리 실행', fields: [
      { id: 'endpoint', name: '엔드포인트', type: 'text', required: true },
      { id: 'query', name: '쿼리', type: 'textarea', required: true },
      { id: 'variables', name: '변수 (JSON)', type: 'textarea' },
    ]},
  ],
  'postgres': [
    { id: 'query', name: 'SQL 쿼리', description: 'PostgreSQL 쿼리 실행', fields: [
      { id: 'connectionString', name: '연결 문자열', type: 'text', required: true },
      { id: 'query', name: 'SQL 쿼리', type: 'textarea', required: true },
    ]},
  ],
  'mysql': [
    { id: 'query', name: 'SQL 쿼리', description: 'MySQL 쿼리 실행', fields: [
      { id: 'host', name: '호스트', type: 'text', required: true },
      { id: 'database', name: '데이터베이스', type: 'text', required: true },
      { id: 'user', name: '사용자', type: 'text', required: true },
      { id: 'password', name: '비밀번호', type: 'text', required: true },
      { id: 'query', name: 'SQL 쿼리', type: 'textarea', required: true },
    ]},
  ],
  'mongodb': [
    { id: 'find', name: '문서 검색', description: 'MongoDB 문서 검색', fields: [
      { id: 'connectionString', name: '연결 문자열', type: 'text', required: true },
      { id: 'database', name: '데이터베이스', type: 'text', required: true },
      { id: 'collection', name: '컬렉션', type: 'text', required: true },
      { id: 'filter', name: '필터 (JSON)', type: 'textarea' },
    ]},
    { id: 'insert', name: '문서 삽입', description: 'MongoDB 문서 삽입', fields: [
      { id: 'connectionString', name: '연결 문자열', type: 'text', required: true },
      { id: 'database', name: '데이터베이스', type: 'text', required: true },
      { id: 'collection', name: '컬렉션', type: 'text', required: true },
      { id: 'document', name: '문서 (JSON)', type: 'textarea', required: true },
    ]},
  ],
  'supabase': [
    { id: 'insert-row', name: '행 삽입', description: '테이블에 행 추가', fields: [
      { id: 'table', name: '테이블명', type: 'text', required: true },
      { id: 'data', name: '데이터 (JSON)', type: 'textarea', required: true },
    ]},
    { id: 'select-rows', name: '행 조회', description: '테이블에서 데이터 조회', fields: [
      { id: 'table', name: '테이블명', type: 'text', required: true },
      { id: 'columns', name: '컬럼', type: 'text', placeholder: '*' },
      { id: 'filter', name: '필터 (JSON)', type: 'textarea' },
    ]},
  ],
  'firebase': [
    { id: 'set-document', name: '문서 설정', description: 'Firestore 문서 설정', fields: [
      { id: 'collection', name: '컬렉션', type: 'text', required: true },
      { id: 'documentId', name: '문서 ID', type: 'text', required: true },
      { id: 'data', name: '데이터 (JSON)', type: 'textarea', required: true },
    ]},
  ],
  'redis': [
    { id: 'set', name: '값 설정', description: 'Redis 값 설정', fields: [
      { id: 'url', name: 'Redis URL', type: 'text', required: true },
      { id: 'key', name: '키', type: 'text', required: true },
      { id: 'value', name: '값', type: 'textarea', required: true },
    ]},
    { id: 'get', name: '값 조회', description: 'Redis 값 조회', fields: [
      { id: 'url', name: 'Redis URL', type: 'text', required: true },
      { id: 'key', name: '키', type: 'text', required: true },
    ]},
  ],
  'pinecone': [
    { id: 'upsert', name: '벡터 삽입', description: '벡터 삽입/업데이트', fields: [
      { id: 'indexName', name: '인덱스 이름', type: 'text', required: true },
      { id: 'vectors', name: '벡터 (JSON)', type: 'textarea', required: true },
    ]},
    { id: 'query', name: '벡터 검색', description: '유사 벡터 검색', fields: [
      { id: 'indexName', name: '인덱스 이름', type: 'text', required: true },
      { id: 'vector', name: '쿼리 벡터 (JSON)', type: 'textarea', required: true },
      { id: 'topK', name: '결과 수', type: 'number', placeholder: '10' },
    ]},
  ],
  'qdrant': [
    { id: 'upsert', name: '포인트 삽입', description: '포인트 삽입/업데이트', fields: [
      { id: 'collectionName', name: '컬렉션 이름', type: 'text', required: true },
      { id: 'points', name: '포인트 (JSON)', type: 'textarea', required: true },
    ]},
  ],

  // === STORAGE (5) ===
  'amazon-s3': [
    { id: 'upload-file', name: '파일 업로드', description: 'S3에 파일 업로드', fields: [
      { id: 'bucket', name: '버킷', type: 'text', required: true },
      { id: 'key', name: '키 (경로)', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
    ]},
    { id: 'get-file', name: '파일 다운로드', description: 'S3에서 파일 다운로드', fields: [
      { id: 'bucket', name: '버킷', type: 'text', required: true },
      { id: 'key', name: '키 (경로)', type: 'text', required: true },
    ]},
  ],
  'dropbox': [
    { id: 'upload-file', name: '파일 업로드', description: 'Dropbox에 파일 업로드', fields: [
      { id: 'path', name: '경로', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'box': [
    { id: 'upload-file', name: '파일 업로드', description: 'Box에 파일 업로드', fields: [
      { id: 'folderId', name: '폴더 ID', type: 'text', required: true },
      { id: 'fileName', name: '파일명', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'microsoft-onedrive': [
    { id: 'upload-file', name: '파일 업로드', description: 'OneDrive에 파일 업로드', fields: [
      { id: 'path', name: '경로', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'google-cloud-storage': [
    { id: 'upload-file', name: '파일 업로드', description: 'GCS에 파일 업로드', fields: [
      { id: 'bucket', name: '버킷', type: 'text', required: true },
      { id: 'path', name: '경로', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
    ]},
  ],

  // === SOCIAL (10) ===
  'twitter': [
    { id: 'post-tweet', name: '트윗 게시', description: '트윗 게시하기', fields: [
      { id: 'text', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'linkedin': [
    { id: 'create-post', name: '게시물 생성', description: 'LinkedIn 게시물 만들기', fields: [
      { id: 'text', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'instagram-business': [
    { id: 'create-media', name: '미디어 게시', description: 'Instagram에 미디어 게시', fields: [
      { id: 'imageUrl', name: '이미지 URL', type: 'text', required: true },
      { id: 'caption', name: '캡션', type: 'textarea' },
    ]},
  ],
  'facebook-pages': [
    { id: 'create-post', name: '게시물 생성', description: 'Facebook 페이지에 게시물 만들기', fields: [
      { id: 'pageId', name: '페이지 ID', type: 'text', required: true },
      { id: 'message', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'youtube': [
    { id: 'upload-video', name: '동영상 업로드', description: 'YouTube에 동영상 업로드', fields: [
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea' },
      { id: 'videoUrl', name: '동영상 URL', type: 'text', required: true },
    ]},
  ],
  'tiktok': [
    { id: 'upload-video', name: '동영상 업로드', description: 'TikTok에 동영상 업로드', fields: [
      { id: 'videoUrl', name: '동영상 URL', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text' },
    ]},
  ],
  'pinterest': [
    { id: 'create-pin', name: '핀 생성', description: '새 핀 만들기', fields: [
      { id: 'boardId', name: '보드 ID', type: 'text', required: true },
      { id: 'imageUrl', name: '이미지 URL', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text' },
      { id: 'description', name: '설명', type: 'textarea' },
    ]},
  ],
  'reddit': [
    { id: 'create-post', name: '게시물 생성', description: 'Reddit에 게시물 만들기', fields: [
      { id: 'subreddit', name: '서브레딧', type: 'text', required: true },
      { id: 'title', name: '제목', type: 'text', required: true },
      { id: 'text', name: '내용', type: 'textarea' },
    ]},
  ],
  'bluesky': [
    { id: 'create-post', name: '게시물 생성', description: 'Bluesky에 게시물 만들기', fields: [
      { id: 'text', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'mastodon': [
    { id: 'create-status', name: '상태 게시', description: 'Mastodon에 상태 게시', fields: [
      { id: 'instanceUrl', name: '인스턴스 URL', type: 'text', required: true },
      { id: 'status', name: '내용', type: 'textarea', required: true },
    ]},
  ],

  // === E-COMMERCE (6) ===
  'shopify': [
    { id: 'create-product', name: '상품 생성', description: '새 상품 만들기', fields: [
      { id: 'title', name: '상품명', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea' },
      { id: 'price', name: '가격', type: 'number', required: true },
    ]},
    { id: 'create-order', name: '주문 생성', description: '새 주문 만들기', fields: [
      { id: 'lineItems', name: '상품 목록 (JSON)', type: 'textarea', required: true },
      { id: 'customer', name: '고객 정보 (JSON)', type: 'textarea' },
    ]},
  ],
  'woocommerce': [
    { id: 'create-product', name: '상품 생성', description: '새 상품 만들기', fields: [
      { id: 'name', name: '상품명', type: 'text', required: true },
      { id: 'regular_price', name: '가격', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea' },
    ]},
  ],
  'stripe': [
    { id: 'create-customer', name: '고객 생성', description: '새 고객 만들기', fields: [
      { id: 'email', name: '이메일', type: 'text', required: true },
      { id: 'name', name: '이름', type: 'text' },
    ]},
    { id: 'create-payment-intent', name: '결제 인텐트 생성', description: '결제 의도 만들기', fields: [
      { id: 'amount', name: '금액 (센트)', type: 'number', required: true },
      { id: 'currency', name: '통화', type: 'text', required: true, placeholder: 'usd' },
    ]},
  ],
  'square': [
    { id: 'create-payment', name: '결제 생성', description: '새 결제 만들기', fields: [
      { id: 'amount', name: '금액 (센트)', type: 'number', required: true },
      { id: 'currency', name: '통화', type: 'text', required: true },
      { id: 'sourceId', name: '소스 ID', type: 'text', required: true },
    ]},
  ],
  'paypal': [
    { id: 'create-order', name: '주문 생성', description: '새 주문 만들기', fields: [
      { id: 'amount', name: '금액', type: 'number', required: true },
      { id: 'currency', name: '통화', type: 'text', required: true, placeholder: 'USD' },
    ]},
  ],
  'bigcommerce': [
    { id: 'create-product', name: '상품 생성', description: '새 상품 만들기', fields: [
      { id: 'name', name: '상품명', type: 'text', required: true },
      { id: 'price', name: '가격', type: 'number', required: true },
      { id: 'type', name: '유형', type: 'select', options: ['physical', 'digital'] },
    ]},
  ],

  // === FORMS (6) ===
  'typeform': [
    { id: 'get-responses', name: '응답 조회', description: '폼 응답 가져오기', fields: [
      { id: 'formId', name: '폼 ID', type: 'text', required: true },
    ]},
  ],
  'google-forms': [
    { id: 'get-responses', name: '응답 조회', description: '폼 응답 가져오기', fields: [
      { id: 'formId', name: '폼 ID', type: 'text', required: true },
    ]},
  ],
  'jotform': [
    { id: 'get-submissions', name: '제출 조회', description: '폼 제출 가져오기', fields: [
      { id: 'formId', name: '폼 ID', type: 'text', required: true },
    ]},
  ],
  'tally': [
    { id: 'get-responses', name: '응답 조회', description: '폼 응답 가져오기', fields: [
      { id: 'formId', name: '폼 ID', type: 'text', required: true },
    ]},
  ],
  'surveymonkey': [
    { id: 'get-responses', name: '응답 조회', description: '설문 응답 가져오기', fields: [
      { id: 'surveyId', name: '설문 ID', type: 'text', required: true },
    ]},
  ],
  'fillout-forms': [
    { id: 'get-submissions', name: '제출 조회', description: '폼 제출 가져오기', fields: [
      { id: 'formId', name: '폼 ID', type: 'text', required: true },
    ]},
  ],

  // === SCHEDULING (3) ===
  'calendly': [
    { id: 'get-events', name: '이벤트 조회', description: '예약된 이벤트 가져오기', fields: [
      { id: 'userUri', name: '사용자 URI', type: 'text', required: true },
    ]},
  ],
  'cal-com': [
    { id: 'get-bookings', name: '예약 조회', description: '예약 목록 가져오기', fields: [
      { id: 'userId', name: '사용자 ID', type: 'text' },
    ]},
  ],
  'acuity-scheduling': [
    { id: 'get-appointments', name: '예약 조회', description: '예약 목록 가져오기', fields: [
      { id: 'minDate', name: '시작일', type: 'text', placeholder: '2024-01-01' },
      { id: 'maxDate', name: '종료일', type: 'text', placeholder: '2024-12-31' },
    ]},
  ],

  // === SUPPORT (5) ===
  'zendesk': [
    { id: 'create-ticket', name: '티켓 생성', description: '새 티켓 만들기', fields: [
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea', required: true },
      { id: 'priority', name: '우선순위', type: 'select', options: ['low', 'normal', 'high', 'urgent'] },
    ]},
  ],
  'freshdesk': [
    { id: 'create-ticket', name: '티켓 생성', description: '새 티켓 만들기', fields: [
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'description', name: '설명', type: 'textarea', required: true },
      { id: 'email', name: '이메일', type: 'text', required: true },
    ]},
  ],
  'help-scout': [
    { id: 'create-conversation', name: '대화 생성', description: '새 대화 만들기', fields: [
      { id: 'mailboxId', name: '메일박스 ID', type: 'text', required: true },
      { id: 'customer', name: '고객 이메일', type: 'text', required: true },
      { id: 'subject', name: '제목', type: 'text', required: true },
      { id: 'text', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'crisp': [
    { id: 'send-message', name: '메시지 전송', description: '대화에 메시지 보내기', fields: [
      { id: 'websiteId', name: '웹사이트 ID', type: 'text', required: true },
      { id: 'sessionId', name: '세션 ID', type: 'text', required: true },
      { id: 'content', name: '내용', type: 'textarea', required: true },
    ]},
  ],
  'front': [
    { id: 'send-message', name: '메시지 전송', description: '대화에 메시지 보내기', fields: [
      { id: 'conversationId', name: '대화 ID', type: 'text', required: true },
      { id: 'body', name: '내용', type: 'textarea', required: true },
    ]},
  ],

  // === ANALYTICS (5) ===
  'google-analytics': [
    { id: 'get-report', name: '리포트 조회', description: 'GA 리포트 가져오기', fields: [
      { id: 'propertyId', name: '속성 ID', type: 'text', required: true },
      { id: 'startDate', name: '시작일', type: 'text', required: true, placeholder: '2024-01-01' },
      { id: 'endDate', name: '종료일', type: 'text', required: true, placeholder: '2024-12-31' },
      { id: 'metrics', name: '지표 (쉼표 구분)', type: 'text', required: true, placeholder: 'sessions,users' },
    ]},
  ],
  'mixpanel': [
    { id: 'track-event', name: '이벤트 추적', description: '이벤트 추적하기', fields: [
      { id: 'event', name: '이벤트 이름', type: 'text', required: true },
      { id: 'distinctId', name: '사용자 ID', type: 'text', required: true },
      { id: 'properties', name: '속성 (JSON)', type: 'textarea' },
    ]},
  ],
  'posthog': [
    { id: 'capture-event', name: '이벤트 캡처', description: '이벤트 캡처하기', fields: [
      { id: 'event', name: '이벤트 이름', type: 'text', required: true },
      { id: 'distinctId', name: '사용자 ID', type: 'text', required: true },
      { id: 'properties', name: '속성 (JSON)', type: 'textarea' },
    ]},
  ],
  'segment': [
    { id: 'track', name: '이벤트 추적', description: '이벤트 추적하기', fields: [
      { id: 'event', name: '이벤트 이름', type: 'text', required: true },
      { id: 'userId', name: '사용자 ID', type: 'text', required: true },
      { id: 'properties', name: '속성 (JSON)', type: 'textarea' },
    ]},
  ],
  'amplitude': [
    { id: 'track-event', name: '이벤트 추적', description: '이벤트 추적하기', fields: [
      { id: 'event_type', name: '이벤트 유형', type: 'text', required: true },
      { id: 'user_id', name: '사용자 ID', type: 'text', required: true },
      { id: 'event_properties', name: '이벤트 속성 (JSON)', type: 'textarea' },
    ]},
  ],

  // === DOCUMENTS (3) ===
  'pdf': [
    { id: 'generate', name: 'PDF 생성', description: 'HTML로 PDF 생성', fields: [
      { id: 'html', name: 'HTML 내용', type: 'textarea', required: true },
      { id: 'filename', name: '파일명', type: 'text', required: true },
    ]},
  ],
  'docusign': [
    { id: 'send-envelope', name: '봉투 전송', description: '서명 요청 보내기', fields: [
      { id: 'templateId', name: '템플릿 ID', type: 'text', required: true },
      { id: 'signerEmail', name: '서명자 이메일', type: 'text', required: true },
      { id: 'signerName', name: '서명자 이름', type: 'text', required: true },
    ]},
  ],
  'pandadoc': [
    { id: 'create-document', name: '문서 생성', description: '템플릿으로 문서 만들기', fields: [
      { id: 'templateId', name: '템플릿 ID', type: 'text', required: true },
      { id: 'name', name: '문서 이름', type: 'text', required: true },
      { id: 'recipients', name: '수신자 (JSON)', type: 'textarea', required: true },
    ]},
  ],

  // === UTILITIES (11) ===
  'schedule': [
    { id: 'wait', name: '대기', description: '지정된 시간만큼 대기', fields: [
      { id: 'delay', name: '대기 시간 (ms)', type: 'number', required: true },
    ]},
  ],
  'delay': [
    { id: 'wait', name: '대기', description: '지정된 시간만큼 대기', fields: [
      { id: 'milliseconds', name: '밀리초', type: 'number', required: true },
    ]},
  ],
  'json': [
    { id: 'parse', name: 'JSON 파싱', description: 'JSON 문자열 파싱', fields: [
      { id: 'jsonString', name: 'JSON 문자열', type: 'textarea', required: true },
    ]},
    { id: 'stringify', name: 'JSON 직렬화', description: '객체를 JSON으로 변환', fields: [
      { id: 'object', name: '객체 (JSON)', type: 'textarea', required: true },
    ]},
  ],
  'csv': [
    { id: 'parse', name: 'CSV 파싱', description: 'CSV를 JSON으로 변환', fields: [
      { id: 'csvData', name: 'CSV 데이터', type: 'textarea', required: true },
      { id: 'delimiter', name: '구분자', type: 'text', placeholder: ',' },
    ]},
  ],
  'xml': [
    { id: 'parse', name: 'XML 파싱', description: 'XML을 JSON으로 변환', fields: [
      { id: 'xmlData', name: 'XML 데이터', type: 'textarea', required: true },
    ]},
  ],
  'rss': [
    { id: 'fetch', name: 'RSS 피드 가져오기', description: 'RSS 피드 파싱', fields: [
      { id: 'url', name: 'RSS URL', type: 'text', required: true },
    ]},
  ],
  'text-helper': [
    { id: 'transform', name: '텍스트 변환', description: '텍스트 변환 작업', fields: [
      { id: 'text', name: '텍스트', type: 'textarea', required: true },
      { id: 'operation', name: '작업', type: 'select', required: true, options: ['uppercase', 'lowercase', 'trim', 'reverse', 'base64encode', 'base64decode'] },
    ]},
  ],
  'date-helper': [
    { id: 'format', name: '날짜 포맷', description: '날짜 형식 변환', fields: [
      { id: 'date', name: '날짜', type: 'text', required: true },
      { id: 'format', name: '포맷', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
    ]},
  ],
  'math-helper': [
    { id: 'calculate', name: '계산', description: '수학 계산 수행', fields: [
      { id: 'expression', name: '수식', type: 'text', required: true, placeholder: '(1 + 2) * 3' },
    ]},
  ],
  'file-helper': [
    { id: 'read', name: '파일 읽기', description: 'URL에서 파일 읽기', fields: [
      { id: 'url', name: '파일 URL', type: 'text', required: true },
    ]},
  ],
  'image-helper': [
    { id: 'resize', name: '이미지 리사이즈', description: '이미지 크기 변경', fields: [
      { id: 'imageUrl', name: '이미지 URL', type: 'text', required: true },
      { id: 'width', name: '너비', type: 'number', required: true },
      { id: 'height', name: '높이', type: 'number', required: true },
    ]},
  ],
}

// 앱 검색 함수
export function searchApps(query: string, category?: string): IntegrationApp[] {
  let apps = INTEGRATION_APPS

  if (category && category !== 'all') {
    apps = apps.filter(app => app.category === category)
  }

  if (query) {
    const q = query.toLowerCase()
    apps = apps.filter(app =>
      app.name.toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q)
    )
  }

  return apps
}

// 앱의 액션 가져오기
export function getAppActions(appId: string): IntegrationAction[] {
  return APP_ACTIONS[appId] || []
}

// 앱 정보 가져오기
export function getApp(appId: string): IntegrationApp | undefined {
  return INTEGRATION_APPS.find(app => app.id === appId)
}

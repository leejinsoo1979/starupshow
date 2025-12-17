/**
 * AppLogo - Universal App Logo Component
 * Simple Icons CDN + Custom SVG Fallbacks
 * UI-focused with loading states and dark mode support
 */

'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

interface AppLogoProps {
  appId: string
  className?: string
  size?: number
  showBackground?: boolean
}

// Simple Icons name mapping (https://simpleicons.org)
const SIMPLE_ICONS_MAP: Record<string, string> = {
  // Communication
  'slack': 'slack',
  'discord': 'discord',
  'telegram-bot': 'telegram',
  'whatsapp': 'whatsapp',
  'microsoft-teams': 'microsoftteams',
  'intercom': 'intercom',
  'twilio': 'twilio',
  'line': 'line',
  'mattermost': 'mattermost',

  // Productivity
  'google-sheets': 'googlesheets',
  'google-docs': 'googledocs',
  'google-slides': 'googleslides',
  'google-drive': 'googledrive',
  'google-calendar': 'googlecalendar',
  'notion': 'notion',
  'airtable': 'airtable',
  'trello': 'trello',
  'asana': 'asana',
  'monday': 'monday',
  'clickup': 'clickup',
  'todoist': 'todoist',
  'linear': 'linear',
  'jira-cloud': 'jira',
  'confluence': 'confluence',
  'coda': 'coda',
  'microsoft-excel-365': 'microsoftexcel',
  'microsoft-onenote': 'microsoftonenote',
  'microsoft-todo': 'microsofttodo',
  'baserow': 'baserow',

  // Email
  'gmail': 'gmail',
  'microsoft-outlook': 'microsoftoutlook',
  'sendgrid': 'sendgrid',
  'mailchimp': 'mailchimp',
  'mailjet': 'mailjet',
  'sendinblue': 'brevo',
  'convertkit': 'convertkit',
  'resend': 'resend',

  // CRM & Sales
  'hubspot': 'hubspot',
  'salesforce': 'salesforce',
  'pipedrive': 'pipedrive',
  'zoho-crm': 'zoho',

  // AI
  'openai': 'openai',
  'google-gemini': 'googlegemini',
  'anthropic': 'anthropic',
  'claude': 'anthropic',
  'mistral-ai': 'mistral',
  'groq': 'groq',
  'hugging-face': 'huggingface',
  'stability-ai': 'stability',
  'elevenlabs': 'elevenlabs',
  'deepgram': 'deepgram',
  'assemblyai': 'assemblyai',
  'deepl': 'deepl',
  'azure-openai': 'microsoftazure',
  'replicate': 'replicate',

  // Developer Tools
  'github': 'github',
  'gitlab': 'gitlab',
  'graphql': 'graphql',
  'postgres': 'postgresql',
  'mysql': 'mysql',
  'mongodb': 'mongodb',
  'supabase': 'supabase',
  'firebase': 'firebase',
  'redis': 'redis',
  'pinecone': 'pinecone',

  // Storage
  'amazon-s3': 'amazons3',
  'dropbox': 'dropbox',
  'box': 'box',
  'microsoft-onedrive': 'microsoftonedrive',
  'google-cloud-storage': 'googlecloud',

  // Social Media
  'twitter': 'x',
  'linkedin': 'linkedin',
  'instagram-business': 'instagram',
  'facebook-pages': 'facebook',
  'youtube': 'youtube',
  'tiktok': 'tiktok',
  'pinterest': 'pinterest',
  'reddit': 'reddit',
  'bluesky': 'bluesky',
  'mastodon': 'mastodon',

  // E-commerce
  'shopify': 'shopify',
  'woocommerce': 'woocommerce',
  'stripe': 'stripe',
  'square': 'square',
  'paypal': 'paypal',
  'bigcommerce': 'bigcommerce',

  // Forms & Surveys
  'typeform': 'typeform',
  'google-forms': 'googleforms',
  'jotform': 'jotform',
  'tally': 'tally',
  'surveymonkey': 'surveymonkey',

  // Scheduling
  'calendly': 'calendly',
  'cal-com': 'caldotcom',

  // Customer Support
  'zendesk': 'zendesk',
  'freshdesk': 'freshdesk',
  'crisp': 'crisp',
  'front': 'front',

  // Analytics
  'google-analytics': 'googleanalytics',
  'mixpanel': 'mixpanel',
  'posthog': 'posthog',
  'segment': 'segment',
  'amplitude': 'amplitude',

  // Documents
  'docusign': 'docusign',
  'pandadoc': 'pandadoc',
}

// Brand colors for Simple Icons - light mode colors
const BRAND_COLORS: Record<string, string> = {
  'slack': '4A154B',
  'discord': '5865F2',
  'telegram': '26A5E4',
  'whatsapp': '25D366',
  'microsoftteams': '6264A7',
  'intercom': '6AFDEF',
  'twilio': 'F22F46',
  'line': '00C300',
  'mattermost': '0058CC',
  'googlesheets': '34A853',
  'googledocs': '4285F4',
  'googleslides': 'FBBC04',
  'googledrive': '4285F4',
  'googlecalendar': '4285F4',
  'notion': '000000',
  'airtable': '18BFFF',
  'trello': '0052CC',
  'asana': 'F06A6A',
  'monday': 'FF3D57',
  'clickup': '7B68EE',
  'todoist': 'E44332',
  'linear': '5E6AD2',
  'jira': '0052CC',
  'confluence': '172B4D',
  'coda': 'F46A54',
  'microsoftexcel': '217346',
  'gmail': 'EA4335',
  'microsoftoutlook': '0078D4',
  'sendgrid': '1A82E2',
  'mailchimp': 'FFE01B',
  'hubspot': 'FF7A59',
  'salesforce': '00A1E0',
  'openai': '412991',
  'anthropic': 'D4A27F',
  'googlegemini': '8E75B2',
  'github': '181717',
  'gitlab': 'FC6D26',
  'postgresql': '4169E1',
  'mysql': '4479A1',
  'mongodb': '47A248',
  'supabase': '3ECF8E',
  'firebase': 'FFCA28',
  'redis': 'DC382D',
  'amazons3': '569A31',
  'dropbox': '0061FF',
  'x': '000000',
  'linkedin': '0A66C2',
  'instagram': 'E4405F',
  'facebook': '0866FF',
  'youtube': 'FF0000',
  'tiktok': '000000',
  'pinterest': 'BD081C',
  'reddit': 'FF4500',
  'shopify': '7AB55C',
  'stripe': '635BFF',
  'paypal': '00457C',
  'zendesk': '03363D',
  'googleanalytics': 'E37400',
  'mixpanel': '7856FF',
  'posthog': '1D4AFF',
  'brevo': '0B996E',
  'convertkit': 'FB6970',
  'resend': '000000',
  'pipedrive': '017737',
  'zoho': 'C8202B',
  'mistral': '000000',
  'groq': 'F55036',
  'huggingface': 'FFD21E',
  'stability': '000000',
  'elevenlabs': '000000',
  'deepgram': '13EF93',
  'assemblyai': '3E7BFA',
  'deepl': '0F2B46',
  'microsoftazure': '0078D4',
  'replicate': '000000',
  'graphql': 'E10098',
  'pinecone': '000000',
  'microsoftonedrive': '0078D4',
  'googlecloud': '4285F4',
  'bluesky': '1185FE',
  'mastodon': '6364FF',
  'woocommerce': '96588A',
  'square': '006AFF',
  'bigcommerce': '121118',
  'typeform': '262627',
  'googleforms': '7248B9',
  'jotform': '0A1551',
  'tally': '000000',
  'surveymonkey': '00BF6F',
  'calendly': '006BFF',
  'caldotcom': '292929',
  'freshdesk': '00A656',
  'crisp': '1972F5',
  'front': '001B38',
  'segment': '52BD94',
  'amplitude': '1E61F0',
  'docusign': 'FFCC22',
  'pandadoc': '5AAF4B',
  'baserow': '1F8FFF',
  'microsoftonenote': '7719AA',
  'microsofttodo': '3583FF',
}

// Dark logos that need white/light color in dark mode
const DARK_LOGOS = ['notion', 'github', 'x', 'tiktok', 'mistral', 'stability', 'elevenlabs', 'replicate', 'pinecone', 'typeform', 'caldotcom', 'tally', 'confluence', 'resend']

// Custom SVG logos for apps not in Simple Icons
function CustomLogo({ appId, size, isDark }: { appId: string; size: number; isDark?: boolean }) {
  const strokeColor = isDark ? '#e5e5e5' : 'currentColor'
  const fillColor = isDark ? '#e5e5e5' : 'currentColor'

  // HTTP/Webhook icon
  if (appId === 'http' || appId === 'webhook') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zM2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )
  }

  // Database icons (generic)
  if (appId === 'nocodb') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor}>
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.83 3.41L12 11l-6.83-3.41L12 4.18zM4 8.62l7 3.5v6.26l-7-3.5V8.62zm9 9.76v-6.26l7-3.5v6.26l-7 3.5z" />
      </svg>
    )
  }

  // Utility icons
  if (appId === 'schedule' || appId === 'delay') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
    )
  }

  if (appId === 'json') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor}>
        <path d="M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 00-2-2H0v-2h1a2 2 0 002-2V5a2 2 0 012-2m14 0a2 2 0 012 2v4a2 2 0 002 2h1v2h-1a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2m-7 12a1 1 0 011 1 1 1 0 01-1 1 1 1 0 01-1-1 1 1 0 011-1m-4 0a1 1 0 011 1 1 1 0 01-1 1 1 1 0 01-1-1 1 1 0 011-1m8 0a1 1 0 011 1 1 1 0 01-1 1 1 1 0 01-1-1 1 1 0 011-1z" />
      </svg>
    )
  }

  if (appId === 'csv' || appId === 'xml') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    )
  }

  if (appId === 'rss') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#F26522">
        <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19 7.38 20 6.18 20 5 20 4 19 4 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z" />
      </svg>
    )
  }

  if (appId === 'pdf') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#E53935">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M9.5,16H8V11H9.5A2,2 0 0,1 11.5,13A2,2 0 0,1 9.5,15V16M9.5,14A.5,.5 0 0,0 10,13.5A.5,.5 0 0,0 9.5,13H9V14H9.5M12,16H11V11H12.5A1.5,1.5 0 0,1 14,12.5V14.5A1.5,1.5 0 0,1 12.5,16H12M12.5,15A.5,.5 0 0,0 13,14.5V12.5A.5,.5 0 0,0 12.5,12H12V15H12.5M17,16H15V11H17V12H16V13H17V14H16V16H17M13,9H14V4L19,9H14V9Z" />
      </svg>
    )
  }

  if (appId === 'smtp' || appId === 'imap') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    )
  }

  if (appId === 'text-helper' || appId === 'date-helper' || appId === 'math-helper' || appId === 'file-helper' || appId === 'image-helper') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  }

  // Perplexity AI
  if (appId === 'perplexity-ai') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#20808D">
        <path d="M12 2L4 6v6c0 5.5 3.4 10.6 8 12 4.6-1.4 8-6.5 8-12V6l-8-4zm-1 15l-4-4 1.4-1.4 2.6 2.6 6.6-6.6L19 9l-8 8z"/>
      </svg>
    )
  }

  // OpenRouter
  if (appId === 'open-router') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
        <circle cx="12" cy="12" r="3" fill={strokeColor} />
      </svg>
    )
  }

  // Qdrant
  if (appId === 'qdrant') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#DC244C">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 18l-8-4V8l8 4v8zm1-9L5 7l7-3.5L19 7l-6 4z" />
      </svg>
    )
  }

  // Close CRM
  if (appId === 'close') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#2E3A59">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        <path d="M13 7h-2v6l5.25 3.15.75-1.23-4-2.42V7z"/>
      </svg>
    )
  }

  // Freshsales
  if (appId === 'freshsales') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#00B67A">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    )
  }

  // Copper
  if (appId === 'copper') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#F7941D">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
      </svg>
    )
  }

  // Attio
  if (appId === 'attio') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#5C5CFF">
        <rect x="4" y="4" width="16" height="16" rx="3"/>
      </svg>
    )
  }

  // Folk
  if (appId === 'folk') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#5C6BC0">
        <circle cx="12" cy="8" r="4"/>
        <path d="M12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z"/>
      </svg>
    )
  }

  // Help Scout
  if (appId === 'help-scout') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#1292EE">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
      </svg>
    )
  }

  // Acuity Scheduling
  if (appId === 'acuity-scheduling') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#006BFF">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
      </svg>
    )
  }

  // Fillout
  if (appId === 'fillout-forms') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#6C5CE7">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
      </svg>
    )
  }

  return null
}

export function AppLogo({ appId, className, size = 24, showBackground = true }: AppLogoProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const simpleIconName = SIMPLE_ICONS_MAP[appId]
  const isDarkLogo = DARK_LOGOS.includes(simpleIconName || '')

  // Try Simple Icons CDN first
  if (simpleIconName && !error) {
    // Use white color for dark logos in dark mode
    const color = BRAND_COLORS[simpleIconName] || '6366f1'
    const iconSize = Math.round(size * 0.7)

    return (
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl overflow-hidden transition-all',
          showBackground && 'bg-white dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700',
          className
        )}
        style={{ width: size, height: size }}
      >
        {/* Loading skeleton */}
        {!loaded && (
          <div
            className="absolute inset-0 bg-gray-100 dark:bg-zinc-700 animate-pulse rounded-xl"
          />
        )}

        {/* Light mode logo */}
        <img
          src={`https://cdn.simpleicons.org/${simpleIconName}/${color}`}
          alt={appId}
          width={iconSize}
          height={iconSize}
          className={cn(
            'object-contain transition-opacity duration-200 dark:hidden',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />

        {/* Dark mode logo - use lighter color for dark logos */}
        <img
          src={`https://cdn.simpleicons.org/${simpleIconName}/${isDarkLogo ? 'ffffff' : color}`}
          alt={appId}
          width={iconSize}
          height={iconSize}
          className={cn(
            'object-contain transition-opacity duration-200 hidden dark:block',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </div>
    )
  }

  // Try custom SVG logo
  const customLogo = CustomLogo({ appId, size: Math.round(size * 0.7), isDark: false })
  if (customLogo) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl overflow-hidden transition-all',
          showBackground && 'bg-white dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700',
          className
        )}
        style={{ width: size, height: size }}
      >
        <div className="dark:hidden">{customLogo}</div>
        <div className="hidden dark:block">{CustomLogo({ appId, size: Math.round(size * 0.7), isDark: true })}</div>
      </div>
    )
  }

  // Fallback: First letter with gradient background
  const appName = appId.replace(/-/g, ' ').split(' ')[0]
  const firstLetter = appName.charAt(0).toUpperCase()

  // Generate consistent color from app ID
  const hash = appId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hue = hash % 360

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl font-semibold text-white shadow-sm',
        className
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 30) % 360}, 70%, 45%))`,
        fontSize: size * 0.4
      }}
    >
      {firstLetter}
    </div>
  )
}

// Category icons (using Lucide-style SVGs)
export function CategoryIcon({ categoryId, className, size = 20 }: { categoryId: string; className?: string; size?: number }) {
  const iconMap: Record<string, JSX.Element> = {
    'all': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    'communication': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    'productivity': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
    'email': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    'crm': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    'ai': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2" />
        <circle cx="7.5" cy="13" r="1.5" fill="currentColor" />
        <circle cx="16.5" cy="13" r="1.5" fill="currentColor" />
        <path d="M8 17h8" />
      </svg>
    ),
    'developer': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    'storage': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      </svg>
    ),
    'social': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
    'ecommerce': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
    'forms': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    'scheduling': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    'support': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    'analytics': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
    'documents': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    'utility': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      {iconMap[categoryId] || iconMap['all']}
    </div>
  )
}

// GitHub Integration Service
// GitHub OAuth 및 Repository 연동

const GITHUB_API_URL = 'https://api.github.com'

interface GitHubUser {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
}

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  private: boolean
  default_branch: string
  updated_at: string
}

interface GitHubCommit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
  html_url: string
}

interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  labels: Array<{ name: string; color: string }>
  assignee: GitHubUser | null
  created_at: string
  updated_at: string
  html_url: string
}

// GitHub OAuth URL 생성
export function getGitHubAuthUrl(state: string): string {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`
  const scope = 'read:user user:email repo'

  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`
}

// Access Token 교환
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error_description || data.error)
  }

  return data.access_token
}

// GitHub API 호출 헬퍼
async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `GitHub API error: ${response.status}`)
  }

  return response.json()
}

// 현재 사용자 정보
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  return githubFetch<GitHubUser>('/user', accessToken)
}

// 사용자의 Repository 목록
export async function getUserRepos(
  accessToken: string,
  page = 1,
  perPage = 30
): Promise<GitHubRepo[]> {
  return githubFetch<GitHubRepo[]>(
    `/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
    accessToken
  )
}

// 특정 Repository의 최근 커밋
export async function getRepoCommits(
  accessToken: string,
  owner: string,
  repo: string,
  since?: string,
  perPage = 30
): Promise<GitHubCommit[]> {
  let endpoint = `/repos/${owner}/${repo}/commits?per_page=${perPage}`
  if (since) {
    endpoint += `&since=${since}`
  }

  const commits = await githubFetch<Array<{ sha: string; commit: any; html_url: string }>>(
    endpoint,
    accessToken
  )

  return commits.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author,
    html_url: c.html_url,
  }))
}

// Repository의 이슈 목록
export async function getRepoIssues(
  accessToken: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  perPage = 30
): Promise<GitHubIssue[]> {
  return githubFetch<GitHubIssue[]>(
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`,
    accessToken
  )
}

// 이슈 생성
export async function createIssue(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels?: string[]
): Promise<GitHubIssue> {
  return githubFetch<GitHubIssue>(
    `/repos/${owner}/${repo}/issues`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ title, body, labels }),
    }
  )
}

// 커밋을 태스크로 변환
export function commitToTask(commit: GitHubCommit) {
  // 커밋 메시지에서 타입 추출 (conventional commits)
  const typeMatch = commit.message.match(/^(feat|fix|docs|style|refactor|test|chore)(\(.*?\))?:/)
  const type = typeMatch ? typeMatch[1] : 'other'

  // 우선순위 결정
  let priority = 'MEDIUM'
  if (type === 'fix' || commit.message.toLowerCase().includes('hotfix')) {
    priority = 'HIGH'
  } else if (type === 'docs' || type === 'style') {
    priority = 'LOW'
  }

  return {
    title: commit.message.split('\n')[0].slice(0, 100),
    description: `GitHub 커밋: ${commit.sha.slice(0, 7)}\n\n${commit.message}\n\n[GitHub에서 보기](${commit.html_url})`,
    priority,
    status: 'DONE',
    category: type,
    completed_at: commit.author.date,
  }
}

// 이슈를 태스크로 변환
export function issueToTask(issue: GitHubIssue) {
  const priorityLabels = ['urgent', 'high', 'medium', 'low']
  const priorityLabel = issue.labels.find((l) => priorityLabels.includes(l.name.toLowerCase()))

  let priority = 'MEDIUM'
  if (priorityLabel) {
    priority = priorityLabel.name.toUpperCase()
  }

  return {
    title: issue.title,
    description: `GitHub Issue #${issue.number}\n\n${issue.body || ''}\n\n[GitHub에서 보기](${issue.html_url})`,
    priority,
    status: issue.state === 'closed' ? 'DONE' : 'TODO',
    tags: issue.labels.map((l) => l.name),
  }
}

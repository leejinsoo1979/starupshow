/**
 * GitHub API 통합 - 커밋/푸시 기능
 * 사용자 OAuth 토큰으로 GitHub 저장소에 직접 커밋
 */

interface GitHubFile {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

interface CommitResult {
  sha: string
  url: string
  message: string
  branch: string
  author: {
    name: string
    email: string
  }
  timestamp: string
}

interface GitHubApiOptions {
  accessToken: string
  owner: string
  repo: string
}

export class GitHubApi {
  private accessToken: string
  private owner: string
  private repo: string
  private baseUrl = 'https://api.github.com'

  constructor(options: GitHubApiOptions) {
    this.accessToken = options.accessToken
    this.owner = options.owner
    this.repo = options.repo
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `GitHub API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * 브랜치 목록 가져오기
   */
  async getBranches(): Promise<{ name: string; sha: string }[]> {
    const branches = await this.request(`/repos/${this.owner}/${this.repo}/branches`)
    return branches.map((b: { name: string; commit: { sha: string } }) => ({
      name: b.name,
      sha: b.commit.sha,
    }))
  }

  /**
   * 새 브랜치 생성
   */
  async createBranch(branchName: string, fromBranch = 'main'): Promise<void> {
    // 기존 브랜치의 SHA 가져오기
    const ref = await this.request(`/repos/${this.owner}/${this.repo}/git/ref/heads/${fromBranch}`)

    // 새 브랜치 생성
    await this.request(`/repos/${this.owner}/${this.repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      }),
    })
  }

  /**
   * 파일 내용 가져오기
   */
  async getFileContent(path: string, branch = 'main'): Promise<{ content: string; sha: string } | null> {
    try {
      const file = await this.request(
        `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${branch}`
      )
      return {
        content: Buffer.from(file.content, 'base64').toString('utf-8'),
        sha: file.sha,
      }
    } catch {
      return null
    }
  }

  /**
   * 단일 파일 커밋 & 푸시
   */
  async commitFile(
    file: GitHubFile,
    message: string,
    branch = 'main'
  ): Promise<CommitResult> {
    // 기존 파일이 있는지 확인 (업데이트 시 SHA 필요)
    const existingFile = await this.getFileContent(file.path, branch)

    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(file.content).toString('base64'),
      branch,
    }

    if (existingFile) {
      body.sha = existingFile.sha
    }

    const result = await this.request(
      `/repos/${this.owner}/${this.repo}/contents/${file.path}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    )

    return {
      sha: result.commit.sha,
      url: result.commit.html_url,
      message: result.commit.message,
      branch,
      author: {
        name: result.commit.author.name,
        email: result.commit.author.email,
      },
      timestamp: result.commit.author.date,
    }
  }

  /**
   * 여러 파일 한 번에 커밋 (Tree API 사용)
   */
  async commitMultipleFiles(
    files: GitHubFile[],
    message: string,
    branch = 'main'
  ): Promise<CommitResult> {
    // 1. 최신 커밋 SHA 가져오기
    const ref = await this.request(`/repos/${this.owner}/${this.repo}/git/ref/heads/${branch}`)
    const latestCommitSha = ref.object.sha

    // 2. 최신 커밋의 트리 가져오기
    const latestCommit = await this.request(
      `/repos/${this.owner}/${this.repo}/git/commits/${latestCommitSha}`
    )
    const baseTreeSha = latestCommit.tree.sha

    // 3. 새 트리 생성 (파일들 추가)
    const tree = files.map((file) => ({
      path: file.path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: file.content,
    }))

    const newTree = await this.request(`/repos/${this.owner}/${this.repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree,
      }),
    })

    // 4. 새 커밋 생성
    const newCommit = await this.request(`/repos/${this.owner}/${this.repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [latestCommitSha],
      }),
    })

    // 5. 브랜치 참조 업데이트 (푸시)
    await this.request(`/repos/${this.owner}/${this.repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
      }),
    })

    return {
      sha: newCommit.sha,
      url: newCommit.html_url,
      message: newCommit.message,
      branch,
      author: {
        name: newCommit.author.name,
        email: newCommit.author.email,
      },
      timestamp: newCommit.author.date,
    }
  }

  /**
   * 최근 커밋 목록 가져오기
   */
  async getCommits(branch = 'main', perPage = 30): Promise<CommitResult[]> {
    const commits = await this.request(
      `/repos/${this.owner}/${this.repo}/commits?sha=${branch}&per_page=${perPage}`
    )

    return commits.map((c: Record<string, unknown>) => ({
      sha: c.sha as unknown as string,
      url: c.html_url as unknown as string,
      message: ((c.commit as Record<string, unknown>)?.message || '') as string,
      branch,
      author: {
        name: (((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.name || '') as string,
        email: (((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.email || '') as string,
      },
      timestamp: (((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.date || '') as string,
    }))
  }

  /**
   * 저장소 정보 가져오기
   */
  async getRepository() {
    return this.request(`/repos/${this.owner}/${this.repo}`)
  }
}

/**
 * GitHub OAuth 토큰으로 GitHubApi 인스턴스 생성
 */
export function createGitHubApi(
  accessToken: string,
  owner: string,
  repo: string
): GitHubApi {
  return new GitHubApi({ accessToken, owner, repo })
}

import { NextResponse } from 'next/server'

export interface CodingProject {
    id: string
    type: string
    title: string
    description: string
    createdAt: Date
    status: 'initializing' | 'ready' | 'error'
    config: {
        framework?: string
        language?: string
        database?: string
        features?: string[]
    }
}

// 프로젝트 유형별 초기 설정
const projectConfigs: Record<string, Partial<CodingProject['config']>> = {
    'simple-web': {
        framework: 'vanilla',
        language: 'javascript',
        features: ['html', 'css', 'js', 'live-preview']
    },
    'fullstack': {
        framework: 'nextjs',
        language: 'typescript',
        database: 'postgresql',
        features: ['api-routes', 'auth', 'database', 'deployment']
    },
    'native-app': {
        framework: 'react-native',
        language: 'typescript',
        features: ['expo', 'navigation', 'state-management']
    },
    'github-project': {
        features: ['git-sync', 'branch-management', 'code-review']
    },
    'high-performance': {
        framework: 'python',
        language: 'python',
        features: ['jupyter', 'docker', 'gpu-support', 'large-memory']
    },
    'ssh-server': {
        features: ['ssh-tunnel', 'port-forwarding', 'remote-debug']
    },
    'ai-suggest': {
        features: ['ai-recommendation', 'auto-setup']
    }
}

export async function POST(request: Request) {
    try {
        const { projectType, userPrompt } = await request.json()

        if (!projectType) {
            return NextResponse.json(
                { error: '프로젝트 유형이 필요합니다.' },
                { status: 400 }
            )
        }

        // 프로젝트 ID 생성
        const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // 기본 설정 가져오기
        const baseConfig = projectConfigs[projectType] || {}

        // 프로젝트 생성
        const project: CodingProject = {
            id: projectId,
            type: projectType,
            title: getProjectTitle(projectType),
            description: userPrompt || getProjectDescription(projectType),
            createdAt: new Date(),
            status: 'ready',
            config: {
                ...baseConfig
            }
        }

        // 시스템 프롬프트 생성
        const systemPrompt = generateSystemPrompt(project)

        return NextResponse.json({
            success: true,
            project,
            systemPrompt,
            initialMessage: getInitialMessage(projectType)
        })
    } catch (error) {
        console.error('Coding project init error:', error)
        return NextResponse.json(
            { error: '프로젝트 초기화에 실패했습니다.' },
            { status: 500 }
        )
    }
}

function getProjectTitle(type: string): string {
    const titles: Record<string, string> = {
        'simple-web': '간단한 웹 프로젝트',
        'fullstack': '풀스택 앱 프로젝트',
        'native-app': '네이티브 앱 프로젝트',
        'github-project': 'GitHub 프로젝트',
        'high-performance': '고성능 컴퓨팅 프로젝트',
        'ssh-server': 'SSH 원격 개발',
        'ai-suggest': 'AI 추천 프로젝트'
    }
    return titles[type] || '새 코딩 프로젝트'
}

function getProjectDescription(type: string): string {
    const descriptions: Record<string, string> = {
        'simple-web': 'HTML, CSS, JavaScript로 웹사이트를 만듭니다.',
        'fullstack': '프론트엔드와 백엔드를 포함한 풀스택 애플리케이션을 개발합니다.',
        'native-app': 'React Native 또는 Flutter로 모바일 앱을 개발합니다.',
        'github-project': '기존 GitHub 저장소를 연결하여 개발합니다.',
        'high-performance': '머신러닝, 데이터 처리를 위한 고성능 환경에서 개발합니다.',
        'ssh-server': '자체 서버에 SSH로 연결하여 원격 개발합니다.',
        'ai-suggest': 'AI가 최적의 프로젝트 구조를 추천합니다.'
    }
    return descriptions[type] || '새로운 코딩 프로젝트를 시작합니다.'
}

function getInitialMessage(type: string): string {
    const messages: Record<string, string> = {
        'simple-web': '안녕하세요! 간단한 웹사이트를 만들어볼까요? 어떤 종류의 웹사이트를 만들고 싶으신가요? (예: 포트폴리오, 랜딩 페이지, 블로그 등)',
        'fullstack': '풀스택 애플리케이션을 시작하겠습니다. 어떤 앱을 만들고 싶으신가요? 기능 요구사항을 알려주시면 최적의 기술 스택을 추천해드릴게요.',
        'native-app': '모바일 앱 개발을 시작하겠습니다. iOS, Android 중 어떤 플랫폼을 타겟으로 하시나요? 아니면 둘 다 지원하는 크로스 플랫폼 앱을 원하시나요?',
        'github-project': 'GitHub 프로젝트를 연결해주세요. 저장소 URL을 입력하시거나 연결하고 싶은 프로젝트에 대해 알려주세요.',
        'high-performance': '고성능 샌드박스 환경이 준비되었습니다. 머신러닝, 데이터 분석, 또는 복잡한 연산 중 어떤 작업을 하실 건가요?',
        'ssh-server': 'SSH 서버 연결을 설정하겠습니다. 서버 주소와 인증 정보를 안전하게 입력해주세요.',
        'ai-suggest': '어떤 것을 만들고 싶으신지 자유롭게 설명해주세요. 아이디어만 있어도 괜찮아요! AI가 최적의 프로젝트 구조와 기술 스택을 추천해드릴게요.'
    }
    return messages[type] || '무엇을 만들고 싶으신가요?'
}

function generateSystemPrompt(project: CodingProject): string {
    const basePrompt = `당신은 GlowUS AI 코딩 어시스턴트입니다. 사용자가 "${project.title}" 프로젝트를 진행하고 있습니다.

프로젝트 정보:
- 유형: ${project.type}
- 설명: ${project.description}
- 설정: ${JSON.stringify(project.config, null, 2)}

당신의 역할:
1. 사용자의 요구사항을 이해하고 최적의 코드를 작성합니다.
2. 코드를 작성할 때는 항상 <artifact type="code" language="[언어]" filename="[파일명]"> 태그를 사용합니다.
3. 여러 파일이 필요한 경우 각 파일을 별도의 artifact로 제공합니다.
4. 설명은 한국어로, 코드 주석도 한국어로 작성합니다.
5. 실시간 미리보기가 가능한 코드를 우선적으로 제공합니다.

프로젝트 유형별 특화 지침:`

    const typeSpecificPrompts: Record<string, string> = {
        'simple-web': `
- HTML, CSS, JavaScript를 사용한 웹 개발에 집중합니다.
- 반응형 디자인과 모던 CSS를 적용합니다.
- 필요시 React나 Vue 컴포넌트도 제안합니다.
- 라이브 프리뷰 기능을 최대한 활용합니다.`,
        'fullstack': `
- Next.js, TypeScript를 기본으로 사용합니다.
- API 라우트와 데이터베이스 연동을 포함합니다.
- 인증, 권한 관리 기능을 고려합니다.
- 배포 가능한 프로덕션 수준의 코드를 작성합니다.`,
        'native-app': `
- React Native 또는 Flutter 코드를 작성합니다.
- 네이티브 기능(카메라, GPS 등) 활용을 안내합니다.
- 크로스 플랫폼 호환성을 고려합니다.
- 앱스토어 배포 과정을 안내합니다.`,
        'github-project': `
- 기존 코드베이스를 분석하고 이해합니다.
- Git 워크플로우를 따릅니다.
- PR 및 코드 리뷰 관행을 적용합니다.
- 기존 코드 스타일과 패턴을 유지합니다.`,
        'high-performance': `
- Python, Jupyter 노트북을 활용합니다.
- 데이터 처리 및 시각화 라이브러리를 사용합니다.
- 머신러닝 모델 학습 및 추론을 지원합니다.
- 성능 최적화 기법을 적용합니다.`,
        'ssh-server': `
- 원격 서버 개발 환경을 설정합니다.
- 보안 연결 및 인증을 관리합니다.
- 포트 포워딩 및 터널링을 설정합니다.
- 원격 디버깅 환경을 구성합니다.`,
        'ai-suggest': `
- 사용자의 아이디어를 구체화합니다.
- 최적의 기술 스택을 추천합니다.
- 프로젝트 구조를 설계합니다.
- 단계별 개발 계획을 제안합니다.`
    }

    return basePrompt + (typeSpecificPrompts[project.type] || '')
}

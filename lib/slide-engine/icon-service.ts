/**
 * Icon Service - 서버 사이드에서 직접 아이콘 검색
 *
 * API 라우트에서 다른 API를 fetch하는 대신 직접 함수 호출
 */

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

// 한글 키워드 → 아이콘 이름 매핑
const KEYWORD_ICON_MAP: Record<string, string[]> = {
  // 비즈니스/금융
  '성장': ['FaArrowTrendUp', 'LuTrendingUp'],
  '하락': ['FaArrowTrendDown', 'LuTrendingDown'],
  '돈': ['FaMoneyBillWave', 'LuBanknote'],
  '투자': ['FaChartLine', 'LuLineChart'],
  '시장': ['FaStore', 'LuStore'],
  '매출': ['FaChartBar', 'LuBarChart'],
  '수익': ['FaCoins', 'LuCoins'],

  // 팀/사람
  '팀': ['FaPeopleGroup', 'LuUsers'],
  '사람': ['FaUser', 'LuUser'],
  '고객': ['FaUserTie', 'LuUserCheck'],
  '리더': ['FaCrown', 'LuCrown'],
  '채용': ['FaUserPlus', 'LuUserPlus'],

  // 기술/IT
  'AI': ['FaBrain', 'LuBrain'],
  '인공지능': ['FaBrain', 'LuBrain'],
  '데이터': ['FaDatabase', 'LuDatabase'],
  '클라우드': ['FaCloud', 'LuCloud'],
  '서버': ['FaServer', 'LuServer'],
  '코드': ['FaCode', 'LuCode'],
  '개발': ['FaLaptopCode', 'LuCodeXml'],
  '앱': ['FaMobileScreen', 'LuSmartphone'],
  '웹': ['FaGlobe', 'LuGlobe'],
  '보안': ['FaShield', 'LuShield'],
  '자동화': ['FaRobot', 'LuBot'],

  // 문제/솔루션
  '문제': ['FaTriangleExclamation', 'LuAlertTriangle'],
  '경고': ['FaExclamation', 'LuAlertCircle'],
  '솔루션': ['FaLightbulb', 'LuLightbulb'],
  '해결': ['FaCheck', 'LuCheckCircle'],
  '아이디어': ['FaLightbulb', 'LuSparkles'],
  '혁신': ['FaRocket', 'LuRocket'],

  // 목표/성과
  '목표': ['FaBullseye', 'LuTarget'],
  '달성': ['FaTrophy', 'LuTrophy'],
  '성공': ['FaMedal', 'LuMedal'],
  '마일스톤': ['FaFlag', 'LuFlag'],

  // 프로세스
  '프로세스': ['FaArrowsRotate', 'LuRefreshCw'],
  '단계': ['FaListOl', 'LuListOrdered'],
  '연결': ['FaLink', 'LuLink'],
  '통합': ['FaPuzzlePiece', 'LuPuzzle'],

  // 시간
  '시간': ['FaClock', 'LuClock'],
  '일정': ['FaCalendar', 'LuCalendar'],
  '로드맵': ['FaRoad', 'LuMap'],

  // 커뮤니케이션
  '연락': ['FaEnvelope', 'LuMail'],
  '이메일': ['FaEnvelope', 'LuMail'],
  '전화': ['FaPhone', 'LuPhone'],

  // 기타
  '설정': ['FaGear', 'LuSettings'],
  '검색': ['FaMagnifyingGlass', 'LuSearch'],
  '저장': ['FaFloppyDisk', 'LuSave'],
  '확인': ['FaCheck', 'LuCheck'],
}

// 영어 키워드 매핑
const ENGLISH_KEYWORD_MAP: Record<string, string[]> = {
  'growth': ['FaArrowTrendUp', 'LuTrendingUp'],
  'team': ['FaPeopleGroup', 'LuUsers'],
  'money': ['FaMoneyBillWave', 'LuBanknote'],
  'chart': ['FaChartLine', 'LuLineChart'],
  'data': ['FaDatabase', 'LuDatabase'],
  'cloud': ['FaCloud', 'LuCloud'],
  'security': ['FaShield', 'LuShield'],
  'ai': ['FaBrain', 'LuBrain'],
  'problem': ['FaTriangleExclamation', 'LuAlertTriangle'],
  'solution': ['FaLightbulb', 'LuLightbulb'],
  'target': ['FaBullseye', 'LuTarget'],
  'success': ['FaTrophy', 'LuTrophy'],
  'email': ['FaEnvelope', 'LuMail'],
  'phone': ['FaPhone', 'LuPhone'],
  'rocket': ['FaRocket', 'LuRocket'],
}

export interface IconResult {
  name: string
  library: string
  svg: string
  base64: string
}

// 키워드로 아이콘 이름 찾기
function findIconsByKeyword(keyword: string): string[] {
  const normalizedKeyword = keyword.toLowerCase().trim()

  // 한글 키워드 검색
  if (KEYWORD_ICON_MAP[keyword]) {
    return KEYWORD_ICON_MAP[keyword]
  }

  // 영어 키워드 검색
  if (ENGLISH_KEYWORD_MAP[normalizedKeyword]) {
    return ENGLISH_KEYWORD_MAP[normalizedKeyword]
  }

  // 부분 일치 검색
  for (const [key, icons] of Object.entries(KEYWORD_ICON_MAP)) {
    if (key.includes(keyword) || keyword.includes(key)) {
      return icons
    }
  }

  // 기본 아이콘
  return ['LuCircle', 'LuSquare']
}

// 라이브러리 접두사 추출
function getLibraryPrefix(iconName: string): string {
  if (iconName.startsWith('Fa')) return 'fa6'
  if (iconName.startsWith('Lu')) return 'lu'
  if (iconName.startsWith('Hi')) return 'hi2'
  if (iconName.startsWith('Bi')) return 'bi'
  if (iconName.startsWith('Md')) return 'md'
  return 'lu'
}

// 아이콘 컴포넌트 동적 로드
async function loadIconComponent(iconName: string): Promise<React.ComponentType<any> | null> {
  try {
    const lib = getLibraryPrefix(iconName)

    let module: any
    switch (lib) {
      case 'fa6':
        module = await import('react-icons/fa6')
        break
      case 'lu':
        module = await import('react-icons/lu')
        break
      case 'hi2':
        module = await import('react-icons/hi2')
        break
      case 'bi':
        module = await import('react-icons/bi')
        break
      case 'md':
        module = await import('react-icons/md')
        break
      default:
        module = await import('react-icons/lu')
    }

    return module[iconName] || null
  } catch (error) {
    console.error(`[IconService] Failed to load icon: ${iconName}`, error)
    return null
  }
}

/**
 * 키워드로 아이콘 검색 (서버 사이드 직접 호출)
 */
export async function searchIcons(
  keyword: string,
  options: { size?: number; color?: string; limit?: number } = {}
): Promise<IconResult[]> {
  const { size = 48, color = '#4F46E5', limit = 3 } = options

  const iconNames = findIconsByKeyword(keyword).slice(0, limit)
  const results: IconResult[] = []

  for (const iconName of iconNames) {
    const IconComponent = await loadIconComponent(iconName)

    if (IconComponent) {
      try {
        const svgString = renderToStaticMarkup(
          createElement(IconComponent, { size, color })
        )

        const base64 = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`

        results.push({
          name: iconName,
          library: getLibraryPrefix(iconName),
          svg: svgString,
          base64,
        })
      } catch (error) {
        console.warn(`[IconService] Failed to render ${iconName}:`, error)
      }
    }
  }

  return results
}

/**
 * 슬라이드 콘텐츠에서 키워드 추출
 */
export function extractKeywordsFromText(text: string): string[] {
  // 한글 명사 추출
  const koreanNouns = text.match(/[가-힣]{2,}/g) || []
  // 영어 단어 추출
  const englishWords = text.match(/[a-zA-Z]{3,}/g) || []

  return [...new Set([...koreanNouns, ...englishWords])].slice(0, 5)
}

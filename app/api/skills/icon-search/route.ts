/**
 * Icon Search API - react-icons 기반 아이콘 검색
 *
 * 슬라이드에서 사용할 아이콘을 키워드로 검색하여 SVG로 반환
 * - 40+ 아이콘 라이브러리 지원
 * - 키워드 → 아이콘 자동 매칭
 * - SVG/Base64 포맷 반환
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

// 동적 import를 위한 아이콘 라이브러리 매핑
const ICON_LIBRARIES = {
  fa6: () => import('react-icons/fa6'),
  hi2: () => import('react-icons/hi2'),
  bi: () => import('react-icons/bi'),
  md: () => import('react-icons/md'),
  io5: () => import('react-icons/io5'),
  lu: () => import('react-icons/lu'),
  ri: () => import('react-icons/ri'),
  tb: () => import('react-icons/tb'),
  bs: () => import('react-icons/bs'),
  ai: () => import('react-icons/ai'),
  fi: () => import('react-icons/fi'),
  gi: () => import('react-icons/gi'),
  go: () => import('react-icons/go'),
  gr: () => import('react-icons/gr'),
  pi: () => import('react-icons/pi'),
  si: () => import('react-icons/si'),
  ti: () => import('react-icons/ti'),
  vsc: () => import('react-icons/vsc'),
  cg: () => import('react-icons/cg'),
  ci: () => import('react-icons/ci'),
}

// 한글 키워드 → 영어 + 아이콘 이름 매핑
const KEYWORD_ICON_MAP: Record<string, string[]> = {
  // 비즈니스/금융
  '성장': ['FaArrowTrendUp', 'HiArrowTrendingUp', 'BiTrendingUp', 'LuTrendingUp'],
  '하락': ['FaArrowTrendDown', 'HiArrowTrendingDown', 'BiTrendingDown'],
  '돈': ['FaMoneyBillWave', 'BiMoney', 'LuBanknote', 'RiMoneyDollarCircleLine'],
  '투자': ['FaChartLine', 'BiLineChart', 'LuLineChart', 'TbChartLine'],
  '시장': ['FaStore', 'BiStore', 'LuStore', 'MdStorefront'],
  '매출': ['FaChartBar', 'BiBarChart', 'LuBarChart', 'TbChartBar'],
  '수익': ['FaCoins', 'BiCoin', 'LuCoins', 'GiCoins'],
  '비용': ['FaCalculator', 'BiCalculator', 'LuCalculator'],
  '예산': ['FaWallet', 'BiWallet', 'LuWallet'],

  // 팀/사람
  '팀': ['FaPeopleGroup', 'HiUserGroup', 'BiGroup', 'LuUsers'],
  '사람': ['FaUser', 'HiUser', 'BiUser', 'LuUser'],
  '고객': ['FaUserTie', 'BiUserPin', 'LuUserCheck'],
  '리더': ['FaCrown', 'BiCrown', 'LuCrown', 'GiCrown'],
  '직원': ['FaUsersCog', 'HiUsers', 'LuUsersRound'],
  '채용': ['FaUserPlus', 'HiUserPlus', 'LuUserPlus'],

  // 기술/IT
  'AI': ['FaBrain', 'BiBot', 'LuBrain', 'TbBrain', 'GiBrain'],
  '인공지능': ['FaBrain', 'BiBot', 'LuBrain', 'TbBrain'],
  '데이터': ['FaDatabase', 'BiData', 'LuDatabase', 'TbDatabase'],
  '클라우드': ['FaCloud', 'BiCloud', 'LuCloud', 'TbCloud'],
  '서버': ['FaServer', 'BiServer', 'LuServer', 'TbServer'],
  '코드': ['FaCode', 'BiCode', 'LuCode', 'TbCode'],
  '개발': ['FaLaptopCode', 'BiCodeBlock', 'LuCodeXml'],
  '앱': ['FaMobileScreen', 'BiMobile', 'LuSmartphone'],
  '웹': ['FaGlobe', 'BiGlobe', 'LuGlobe', 'TbWorld'],
  '보안': ['FaShield', 'BiShield', 'LuShield', 'TbShield'],
  '자동화': ['FaRobot', 'BiBot', 'LuBot', 'TbRobot'],
  'API': ['FaPlug', 'BiPlug', 'LuPlug', 'TbApi'],

  // 문제/솔루션
  '문제': ['FaTriangleExclamation', 'BiError', 'LuAlertTriangle', 'MdError'],
  '경고': ['FaExclamation', 'BiErrorCircle', 'LuAlertCircle'],
  '솔루션': ['FaLightbulb', 'BiLightbulb', 'LuLightbulb', 'TbBulb'],
  '해결': ['FaCheck', 'BiCheckCircle', 'LuCheckCircle', 'MdCheckCircle'],
  '아이디어': ['FaLightbulb', 'BiIdeaAlt', 'LuSparkles'],
  '혁신': ['FaRocket', 'BiRocket', 'LuRocket', 'TbRocket'],

  // 목표/성과
  '목표': ['FaBullseye', 'BiTargetLock', 'LuTarget', 'TbTarget'],
  '달성': ['FaTrophy', 'BiTrophy', 'LuTrophy', 'GiTrophy'],
  '성공': ['FaMedal', 'BiMedal', 'LuMedal', 'GiMedal'],
  '성과': ['FaAward', 'BiAward', 'LuAward'],
  '마일스톤': ['FaFlag', 'BiFlag', 'LuFlag', 'TbFlag'],

  // 프로세스/워크플로우
  '프로세스': ['FaArrowsRotate', 'BiCycle', 'LuRefreshCw', 'TbArrowsExchange'],
  '단계': ['FaListOl', 'BiListOl', 'LuListOrdered'],
  '플로우': ['FaArrowRight', 'BiRightArrow', 'LuArrowRight'],
  '연결': ['FaLink', 'BiLink', 'LuLink', 'TbLink'],
  '통합': ['FaPuzzlePiece', 'BiPuzzle', 'LuPuzzle'],
  '동기화': ['FaSync', 'BiSync', 'LuRefreshCcw'],

  // 시간/일정
  '시간': ['FaClock', 'BiTime', 'LuClock', 'TbClock'],
  '일정': ['FaCalendar', 'BiCalendar', 'LuCalendar', 'TbCalendar'],
  '로드맵': ['FaRoad', 'BiMap', 'LuMap', 'TbRoad'],
  '타임라인': ['FaTimeline', 'BiGitCommit', 'LuGitBranch'],

  // 커뮤니케이션
  '연락': ['FaEnvelope', 'BiEnvelope', 'LuMail', 'TbMail'],
  '이메일': ['FaEnvelope', 'BiEnvelope', 'LuMail'],
  '전화': ['FaPhone', 'BiPhone', 'LuPhone', 'TbPhone'],
  '채팅': ['FaComments', 'BiChat', 'LuMessageCircle'],
  '미팅': ['FaVideo', 'BiVideo', 'LuVideo'],

  // 문서/파일
  '문서': ['FaFileAlt', 'BiFile', 'LuFile', 'TbFile'],
  '보고서': ['FaChartPie', 'BiPieChart', 'LuPieChart'],
  '계약': ['FaFileSignature', 'BiFileBlank', 'LuFileText'],
  '발표': ['FaPresentation', 'BiSlideshow', 'LuPresentation'],

  // 위치/지역
  '위치': ['FaLocationDot', 'BiCurrentLocation', 'LuMapPin'],
  '글로벌': ['FaGlobe', 'BiWorld', 'LuGlobe2', 'TbWorld'],
  '국내': ['FaMapMarked', 'BiMap', 'LuMap'],

  // 기타
  '설정': ['FaGear', 'BiCog', 'LuSettings', 'TbSettings'],
  '검색': ['FaMagnifyingGlass', 'BiSearch', 'LuSearch'],
  '알림': ['FaBell', 'BiBell', 'LuBell'],
  '즐겨찾기': ['FaStar', 'BiStar', 'LuStar'],
  '좋아요': ['FaHeart', 'BiHeart', 'LuHeart'],
  '공유': ['FaShare', 'BiShare', 'LuShare2'],
  '다운로드': ['FaDownload', 'BiDownload', 'LuDownload'],
  '업로드': ['FaUpload', 'BiUpload', 'LuUpload'],
  '저장': ['FaFloppyDisk', 'BiSave', 'LuSave'],
  '삭제': ['FaTrash', 'BiTrash', 'LuTrash2'],
  '편집': ['FaPen', 'BiEdit', 'LuPencil'],
  '추가': ['FaPlus', 'BiPlus', 'LuPlus'],
  '확인': ['FaCheck', 'BiCheck', 'LuCheck'],
  '취소': ['FaXmark', 'BiX', 'LuX'],
}

// 영어 키워드 매핑 추가
const ENGLISH_KEYWORD_MAP: Record<string, string[]> = {
  'growth': ['FaArrowTrendUp', 'HiArrowTrendingUp', 'BiTrendingUp'],
  'team': ['FaPeopleGroup', 'HiUserGroup', 'BiGroup', 'LuUsers'],
  'money': ['FaMoneyBillWave', 'BiMoney', 'LuBanknote'],
  'chart': ['FaChartLine', 'BiLineChart', 'LuLineChart'],
  'data': ['FaDatabase', 'BiData', 'LuDatabase'],
  'cloud': ['FaCloud', 'BiCloud', 'LuCloud'],
  'security': ['FaShield', 'BiShield', 'LuShield'],
  'ai': ['FaBrain', 'BiBot', 'LuBrain'],
  'problem': ['FaTriangleExclamation', 'BiError', 'LuAlertTriangle'],
  'solution': ['FaLightbulb', 'BiLightbulb', 'LuLightbulb'],
  'target': ['FaBullseye', 'BiTargetLock', 'LuTarget'],
  'success': ['FaTrophy', 'BiTrophy', 'LuTrophy'],
  'email': ['FaEnvelope', 'BiEnvelope', 'LuMail'],
  'phone': ['FaPhone', 'BiPhone', 'LuPhone'],
  'settings': ['FaGear', 'BiCog', 'LuSettings'],
  'search': ['FaMagnifyingGlass', 'BiSearch', 'LuSearch'],
  'user': ['FaUser', 'HiUser', 'BiUser', 'LuUser'],
  'rocket': ['FaRocket', 'BiRocket', 'LuRocket'],
  'star': ['FaStar', 'BiStar', 'LuStar'],
  'heart': ['FaHeart', 'BiHeart', 'LuHeart'],
  'check': ['FaCheck', 'BiCheck', 'LuCheck'],
  'warning': ['FaExclamation', 'BiErrorCircle', 'LuAlertCircle'],
}

// 아이콘 이름에서 라이브러리 접두사 추출
function getLibraryPrefix(iconName: string): string {
  const prefixMap: Record<string, string> = {
    'Fa': 'fa6',
    'Hi': 'hi2',
    'Bi': 'bi',
    'Md': 'md',
    'Io': 'io5',
    'Lu': 'lu',
    'Ri': 'ri',
    'Tb': 'tb',
    'Bs': 'bs',
    'Ai': 'ai',
    'Fi': 'fi',
    'Gi': 'gi',
    'Go': 'go',
    'Gr': 'gr',
    'Pi': 'pi',
    'Si': 'si',
    'Ti': 'ti',
    'Vsc': 'vsc',
    'Cg': 'cg',
    'Ci': 'ci',
  }

  for (const [prefix, lib] of Object.entries(prefixMap)) {
    if (iconName.startsWith(prefix)) {
      return lib
    }
  }
  return 'lu' // 기본값: Lucide
}

// 아이콘 컴포넌트 가져오기
async function getIconComponent(iconName: string): Promise<React.ComponentType<any> | null> {
  try {
    const libPrefix = getLibraryPrefix(iconName)
    const loader = ICON_LIBRARIES[libPrefix as keyof typeof ICON_LIBRARIES]

    if (!loader) {
      console.warn(`[IconSearch] Unknown library for icon: ${iconName}`)
      return null
    }

    const lib = await loader()
    const Icon = (lib as any)[iconName]

    if (!Icon) {
      console.warn(`[IconSearch] Icon not found: ${iconName} in ${libPrefix}`)
      return null
    }

    return Icon
  } catch (error) {
    console.error(`[IconSearch] Error loading icon ${iconName}:`, error)
    return null
  }
}

// 키워드로 아이콘 검색
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

  // 부분 일치 검색 (한글)
  for (const [key, icons] of Object.entries(KEYWORD_ICON_MAP)) {
    if (key.includes(keyword) || keyword.includes(key)) {
      return icons
    }
  }

  // 부분 일치 검색 (영어)
  for (const [key, icons] of Object.entries(ENGLISH_KEYWORD_MAP)) {
    if (key.includes(normalizedKeyword) || normalizedKeyword.includes(key)) {
      return icons
    }
  }

  // 기본 아이콘 반환
  return ['LuCircle', 'LuSquare', 'LuTriangle']
}

export interface IconSearchRequest {
  keyword: string
  size?: number
  color?: string
  limit?: number
  library?: string  // 특정 라이브러리만 검색
}

export interface IconResult {
  name: string
  library: string
  svg: string
  base64: string
  viewBox: string
}

export async function POST(request: NextRequest) {
  try {
    const body: IconSearchRequest = await request.json()
    const {
      keyword,
      size = 48,
      color = '#000000',
      limit = 5,
      library
    } = body

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: '키워드가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`[IconSearch] 🔍 Searching icons for: "${keyword}"`)

    // 키워드로 아이콘 이름 찾기
    let iconNames = findIconsByKeyword(keyword)

    // 특정 라이브러리 필터링
    if (library) {
      iconNames = iconNames.filter(name => {
        const lib = getLibraryPrefix(name)
        return lib === library
      })
    }

    // 제한 적용
    iconNames = iconNames.slice(0, limit)

    // 아이콘 렌더링
    const icons: IconResult[] = []

    for (const iconName of iconNames) {
      const IconComponent = await getIconComponent(iconName)

      if (IconComponent) {
        try {
          // React 컴포넌트 → SVG 문자열
          const svgString = renderToStaticMarkup(
            createElement(IconComponent, { size, color })
          )

          // viewBox 추출
          const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/)
          const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24'

          // Base64 인코딩
          const base64 = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`

          icons.push({
            name: iconName,
            library: getLibraryPrefix(iconName),
            svg: svgString,
            base64,
            viewBox,
          })
        } catch (renderError) {
          console.warn(`[IconSearch] Failed to render ${iconName}:`, renderError)
        }
      }
    }

    console.log(`[IconSearch] ✅ Found ${icons.length} icons for "${keyword}"`)

    return NextResponse.json({
      success: true,
      keyword,
      count: icons.length,
      icons,
    })

  } catch (error: any) {
    console.error('[IconSearch] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '아이콘 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET - API 정보
export async function GET() {
  return NextResponse.json({
    service: 'Icon Search',
    description: 'react-icons 기반 아이콘 검색 API',
    capabilities: [
      '40+ 아이콘 라이브러리 지원',
      '한글/영어 키워드 검색',
      'SVG/Base64 포맷 반환',
      '커스텀 사이즈/색상 지원',
    ],
    libraries: Object.keys(ICON_LIBRARIES),
    exampleKeywords: {
      korean: Object.keys(KEYWORD_ICON_MAP).slice(0, 20),
      english: Object.keys(ENGLISH_KEYWORD_MAP),
    },
    parameters: {
      keyword: { type: 'string', required: true, description: '검색 키워드 (한글/영어)' },
      size: { type: 'number', default: 48, description: '아이콘 크기 (px)' },
      color: { type: 'string', default: '#000000', description: '아이콘 색상 (hex)' },
      limit: { type: 'number', default: 5, description: '반환할 아이콘 수' },
      library: { type: 'string', required: false, description: '특정 라이브러리만 검색' },
    },
  })
}

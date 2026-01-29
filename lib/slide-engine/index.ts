/**
 * Slide Engine - 통합 슬라이드 생성 모듈
 *
 * 서버 사이드에서 직접 함수 호출로 슬라이드 리소스 생성
 * - 아이콘 검색 (react-icons)
 * - 이미지 검색 (Unsplash/Pexels)
 * - 콘텐츠 생성 (LLM)
 * - 이미지 타입 분석
 */

// Icon Service
export {
  searchIcons,
  extractKeywordsFromText,
  type IconResult,
} from './icon-service'

// Image Service
export {
  searchImages,
  searchSingleImage,
  fetchSlideImage,
  type ImageResult,
  type ImageSearchOptions,
  type SlideImageResult,
} from './image-service'

// Content Service
export {
  generateSlideStructure,
  generateSlideContent,
  type SlideContent,
  type GeneratedPresentation,
} from './content-service'

// Slide Image Engine
export {
  detectImageType,
  getImageSource,
  extractKeywords,
  fetchIcons,
  fetchStockImages,
  generateAIImage,
  getImagesForSlide,
  enrichPresentationWithImages,
  THEME_COLORS,
  type ImageType,
  type ImageStrategy,
  type SlideImageResult as ImageEngineResult,
  type SlideContentInput,
  type ThemeName,
} from './slide-image-engine'

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

export async function POST(req: Request) {
  try {
    const { slideTitle, slideContent, slideNumber, totalSlides } = await req.json()

    if (!slideTitle) {
      return NextResponse.json({ error: '슬라이드 제목이 필요합니다' }, { status: 400 })
    }

    const client = getGeminiClient()

    // Gemini 2.0 Flash with image generation (Nano Banana)
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.8,
      }
    })

    // 슬라이드 타입에 맞는 이미지 프롬프트 생성
    const isFirstSlide = slideNumber === 1
    const isLastSlide = slideNumber === totalSlides

    let imageStyle = ''
    if (isFirstSlide) {
      imageStyle = 'a professional title slide background with abstract geometric shapes, gradient colors, modern business presentation style'
    } else if (isLastSlide) {
      imageStyle = 'a clean summary or conclusion slide visual with checkmarks, achievement icons, professional business style'
    } else {
      imageStyle = 'a minimal business infographic illustration, clean vector style diagram or chart'
    }

    const contentSummary = Array.isArray(slideContent)
      ? slideContent.slice(0, 3).join(', ')
      : slideContent || ''

    const imagePrompt = `Create a professional business presentation slide illustration for: "${slideTitle}".
Content context: ${contentSummary}
Style: ${imageStyle}
Requirements:
- Clean, minimal design suitable for professional presentations
- No text in the image (text will be overlaid separately)
- Use modern, corporate color palette (blues, teals, purples)
- Flat design or subtle gradients
- 16:9 aspect ratio suitable for slides
- High quality, crisp edges`

    // 이미지 생성 요청
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: imagePrompt }]
      }],
      generationConfig: {
        responseModalities: ['image', 'text'],
      } as any
    })

    const response = result.response

    // 이미지 데이터 추출
    let imageData: string | null = null
    let mimeType = 'image/png'

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if ((part as any).inlineData) {
          const inlineData = (part as any).inlineData
          imageData = inlineData.data
          mimeType = inlineData.mimeType || 'image/png'
          break
        }
      }
      if (imageData) break
    }

    if (!imageData) {
      // 이미지 생성 실패시 placeholder 반환
      return NextResponse.json({
        success: true,
        imageUrl: null,
        placeholder: true,
        message: '이미지 생성을 건너뛰었습니다'
      })
    }

    return NextResponse.json({
      success: true,
      imageUrl: `data:${mimeType};base64,${imageData}`,
      placeholder: false
    })

  } catch (error) {
    console.error('Slide image generation error:', error)
    return NextResponse.json({
      success: true,
      imageUrl: null,
      placeholder: true,
      error: '이미지 생성 중 오류가 발생했습니다'
    })
  }
}

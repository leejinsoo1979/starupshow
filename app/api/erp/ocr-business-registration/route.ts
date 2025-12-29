import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// POST: 사업자등록증 이미지에서 정보 추출
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // 파일을 base64로 변환
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // OpenAI Vision API로 OCR 수행
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `이 사업자등록증 이미지에서 다음 정보를 추출해주세요. JSON 형식으로만 응답해주세요.

추출할 필드:
- name: 상호(법인명)
- business_number: 사업자등록번호 (XXX-XX-XXXXX 형식)
- corporate_number: 법인등록번호 (XXXXXX-XXXXXXX 형식, 있는 경우만)
- ceo_name: 대표자(성명)
- address: 사업장 소재지
- business_type: 업태
- business_category: 종목(업종)
- establishment_date: 개업연월일 (YYYY-MM-DD 형식)
- phone: 전화번호 (있는 경우)

응답 예시:
{
  "name": "주식회사 테스트",
  "business_number": "123-45-67890",
  "corporate_number": "110111-1234567",
  "ceo_name": "홍길동",
  "address": "서울특별시 강남구 테헤란로 123",
  "business_type": "서비스업",
  "business_category": "소프트웨어 개발",
  "establishment_date": "2020-01-15",
  "phone": "02-1234-5678"
}

이미지에서 찾을 수 없는 필드는 null로 설정해주세요.
반드시 유효한 JSON만 응답하세요. 다른 텍스트 없이 JSON 객체만 반환해주세요.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content || '{}'

    // JSON 파싱 시도
    let extractedData
    try {
      // JSON 블록에서 추출 (```json ... ``` 형식 처리)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content]
      const jsonStr = jsonMatch[1] || content
      extractedData = JSON.parse(jsonStr.trim())
    } catch {
      console.error('[OCR] JSON 파싱 실패:', content)
      return NextResponse.json(
        { success: false, error: 'OCR 결과 파싱에 실패했습니다.', raw: content },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    })
  } catch (error) {
    console.error('[ERP OCR] Error:', error)
    return NextResponse.json(
      { success: false, error: 'OCR 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

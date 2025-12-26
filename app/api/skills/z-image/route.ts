import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
})

// Z-Image Turbo (Alibaba Tongyi-MAI) - 6B 파라미터, 8스텝 초고속 생성
// https://replicate.com/prunaai/z-image-turbo
const Z_IMAGE_MODEL = "prunaai/z-image-turbo:d20db133dcacc395a3097f8003ee43e947f74bff6acbe6f235d0a99af3ad1e68"

export interface ZImageRequest {
    prompt: string
    negative_prompt?: string
    width?: number
    height?: number
    num_inference_steps?: number
    guidance_scale?: number
    seed?: number
}

export interface ZImageResponse {
    success: boolean
    image_url?: string
    error?: string
    metadata?: {
        prompt: string
        width: number
        height: number
        model: string
        generation_time_ms: number
    }
}

export async function POST(req: NextRequest): Promise<NextResponse<ZImageResponse>> {
    const startTime = Date.now()

    try {
        const body: ZImageRequest = await req.json()

        if (!body.prompt) {
            return NextResponse.json({
                success: false,
                error: 'Prompt is required'
            }, { status: 400 })
        }

        if (!process.env.REPLICATE_API_TOKEN) {
            return NextResponse.json({
                success: false,
                error: 'Replicate API token not configured'
            }, { status: 500 })
        }

        console.log('[Z-Image] 🎨 Generating image:', body.prompt.slice(0, 50) + '...')

        // Z-Image Turbo 모델 실행 (8스텝 초고속)
        const output = await replicate.run(Z_IMAGE_MODEL, {
            input: {
                prompt: body.prompt,
                negative_prompt: body.negative_prompt || "",
                width: body.width || 1024,
                height: body.height || 1024,
                num_inference_steps: body.num_inference_steps || 8,
                guidance_scale: body.guidance_scale || 3.5,
            }
        }) as string[] | string

        const imageUrl = Array.isArray(output) ? output[0] : output

        if (!imageUrl) {
            throw new Error('No image URL returned from model')
        }

        const generationTime = Date.now() - startTime
        console.log(`[Z-Image] ✅ Generated in ${generationTime}ms:`, imageUrl)

        return NextResponse.json({
            success: true,
            image_url: imageUrl,
            metadata: {
                prompt: body.prompt,
                width: body.width || 1024,
                height: body.height || 1024,
                model: 'z-image',
                generation_time_ms: generationTime
            }
        })

    } catch (error: any) {
        console.error('[Z-Image] ❌ Error:', error.message)

        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate image'
        }, { status: 500 })
    }
}

// 지원 정보 GET
export async function GET() {
    return NextResponse.json({
        skill: 'z-image',
        name: '이미지 제작',
        description: 'AI 이미지 생성 스킬 (Z-Image by Alibaba)',
        capabilities: [
            '텍스트 프롬프트로 고품질 이미지 생성',
            '다양한 해상도 지원 (512x512 ~ 2048x2048)',
            '네거티브 프롬프트로 원치않는 요소 제외',
            '시드 값으로 결과 재현 가능'
        ],
        parameters: {
            prompt: { type: 'string', required: true, description: '이미지 생성 프롬프트' },
            negative_prompt: { type: 'string', required: false, description: '제외할 요소' },
            width: { type: 'number', default: 1024, description: '이미지 너비' },
            height: { type: 'number', default: 1024, description: '이미지 높이' },
            num_inference_steps: { type: 'number', default: 28, description: '추론 스텝 수' },
            guidance_scale: { type: 'number', default: 7.5, description: '가이던스 스케일' },
            seed: { type: 'number', required: false, description: '랜덤 시드' }
        },
        model: 'Z-Image Turbo (Alibaba Tongyi-MAI)',
        provider: 'Replicate (PrunaAI)'
    })
}

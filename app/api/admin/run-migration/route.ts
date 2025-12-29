import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 인증 확인 (간단한 시크릿 키 체크)
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== 'run-erp-migration-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // companies 테이블 스키마 확인
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('id, business_registration_url')
      .limit(1)

    if (checkError && checkError.message.includes('business_registration_url')) {
      // 컬럼이 없으면 Supabase Dashboard에서 추가 필요
      return NextResponse.json({
        success: false,
        message: 'Column does not exist. Please run this SQL in Supabase Dashboard:',
        sql: 'ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_registration_url TEXT;'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Column business_registration_url already exists',
      sample: existingCompany
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

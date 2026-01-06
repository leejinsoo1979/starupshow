// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST: 로고 업로드
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 })
    }

    // 이미지 타입 체크
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 })
    }

    // 회사 조회 또는 생성
    let companyId: string | null = null

    // 1. 프로필에서 company_id 찾기
    const { data: profile } = await adminSupabase
      .from('company_support_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profile?.company_id) {
      companyId = profile.company_id
    } else {
      // 2. user_id로 회사 찾기
      const { data: company } = await adminSupabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (company) {
        companyId = company.id
      } else {
        // 3. 회사 생성
        const { data: newCompany, error: companyError } = await adminSupabase
          .from('companies')
          .insert({ user_id: user.id, name: 'My Company' })
          .select()
          .single()

        if (companyError) {
          throw companyError
        }

        companyId = newCompany.id

        // 프로필에 연결 (프로필이 있으면)
        if (profile) {
          await adminSupabase
            .from('company_support_profiles')
            .update({ company_id: companyId })
            .eq('user_id', user.id)
        }
      }
    }

    // 파일 확장자 추출
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `${companyId}/logo.${ext}`

    // 기존 로고 삭제 (있으면)
    const { data: existingCompany } = await adminSupabase
      .from('companies')
      .select('logo_url')
      .eq('id', companyId)
      .single()

    if (existingCompany?.logo_url) {
      // 기존 파일 경로 추출
      const oldPath = existingCompany.logo_url.split('/company-files/')[1]
      if (oldPath) {
        await adminSupabase.storage
          .from('company-files')
          .remove([oldPath])
      }
    }

    // 파일 버퍼 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('company-files')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error('파일 업로드 실패: ' + uploadError.message)
    }

    // 공개 URL 가져오기
    const { data: publicUrlData } = adminSupabase.storage
      .from('company-files')
      .getPublicUrl(fileName)

    const logoUrl = publicUrlData.publicUrl

    // 회사 테이블에 로고 URL 저장
    const { error: updateError } = await adminSupabase
      .from('companies')
      .update({ logo_url: logoUrl })
      .eq('id', companyId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      logo_url: logoUrl,
      message: '로고가 업로드되었습니다.'
    })

  } catch (error: any) {
    console.error('[CompanyProfile Logo] POST Error:', error)
    return NextResponse.json(
      { error: error.message || '로고 업로드 실패' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: 로고 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 회사 조회
    let companyId: string | null = null

    const { data: profile } = await adminSupabase
      .from('company_support_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profile?.company_id) {
      companyId = profile.company_id
    } else {
      const { data: company } = await adminSupabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (company) {
        companyId = company.id
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: '회사 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 기존 로고 URL 가져오기
    const { data: existingCompany } = await adminSupabase
      .from('companies')
      .select('logo_url')
      .eq('id', companyId)
      .single()

    if (existingCompany?.logo_url) {
      // Storage에서 파일 삭제
      const path = existingCompany.logo_url.split('/company-files/')[1]
      if (path) {
        await adminSupabase.storage
          .from('company-files')
          .remove([path])
      }
    }

    // 회사 테이블에서 로고 URL 제거
    const { error: updateError } = await adminSupabase
      .from('companies')
      .update({ logo_url: null })
      .eq('id', companyId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: '로고가 삭제되었습니다.'
    })

  } catch (error: any) {
    console.error('[CompanyProfile Logo] DELETE Error:', error)
    return NextResponse.json(
      { error: error.message || '로고 삭제 실패' },
      { status: 500 }
    )
  }
}

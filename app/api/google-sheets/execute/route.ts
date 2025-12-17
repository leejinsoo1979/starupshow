import { NextRequest, NextResponse } from 'next/server'
import {
  getSheetsClient,
  setCellValues,
  getCellValues,
  columnIndexToLetter,
} from '@/lib/google-sheets'

/**
 * Google Sheets Integration Executor
 * 서비스 계정을 사용하여 Google Sheets 액션 실행
 * (Agent Integration에서 사용)
 */
export async function POST(request: NextRequest) {
  try {
    const { action, config } = await request.json()

    if (!action || !config) {
      return NextResponse.json(
        { success: false, error: 'action과 config가 필요합니다' },
        { status: 400 }
      )
    }

    const sheets = getSheetsClient()

    switch (action) {
      case 'append-row': {
        const { spreadsheetId, sheetName, values } = config
        if (!spreadsheetId || !sheetName || !values) {
          return NextResponse.json(
            { success: false, error: 'spreadsheetId, sheetName, values가 필요합니다' },
            { status: 400 }
          )
        }

        // 현재 데이터 범위 확인
        const range = `${sheetName}!A:A`
        const existingData = await getCellValues(spreadsheetId, range)
        const nextRow = (existingData?.length || 0) + 1

        // 값 파싱
        let parsedValues: unknown[]
        try {
          parsedValues = typeof values === 'string' ? JSON.parse(values) : values
        } catch {
          parsedValues = [values]
        }

        // 행 추가
        const appendRange = `${sheetName}!A${nextRow}`
        await setCellValues(spreadsheetId, appendRange, [parsedValues as string[]])

        return NextResponse.json({
          success: true,
          data: { row: nextRow, values: parsedValues },
        })
      }

      case 'read-rows': {
        const { spreadsheetId, sheetName, range } = config
        if (!spreadsheetId || !sheetName) {
          return NextResponse.json(
            { success: false, error: 'spreadsheetId, sheetName이 필요합니다' },
            { status: 400 }
          )
        }

        const fullRange = range ? `${sheetName}!${range}` : `${sheetName}!A1:Z1000`
        const data = await getCellValues(spreadsheetId, fullRange)

        return NextResponse.json({
          success: true,
          data: { rows: data || [], count: data?.length || 0 },
        })
      }

      case 'update-row': {
        const { spreadsheetId, sheetName, range, values } = config
        if (!spreadsheetId || !sheetName || !range || !values) {
          return NextResponse.json(
            { success: false, error: 'spreadsheetId, sheetName, range, values가 필요합니다' },
            { status: 400 }
          )
        }

        // 값 파싱
        let parsedValues: unknown[][]
        try {
          const parsed = typeof values === 'string' ? JSON.parse(values) : values
          parsedValues = Array.isArray(parsed[0]) ? parsed : [parsed]
        } catch {
          parsedValues = [[values]]
        }

        const fullRange = `${sheetName}!${range}`
        await setCellValues(spreadsheetId, fullRange, parsedValues as string[][])

        return NextResponse.json({
          success: true,
          data: { range: fullRange, values: parsedValues },
        })
      }

      case 'find-rows': {
        const { spreadsheetId, sheetName, column, value } = config
        if (!spreadsheetId || !sheetName || !column || value === undefined) {
          return NextResponse.json(
            { success: false, error: 'spreadsheetId, sheetName, column, value가 필요합니다' },
            { status: 400 }
          )
        }

        // 전체 데이터 읽기
        const fullRange = `${sheetName}!A1:Z1000`
        const allData = await getCellValues(spreadsheetId, fullRange)

        if (!allData || allData.length === 0) {
          return NextResponse.json({
            success: true,
            data: { rows: [], count: 0 },
          })
        }

        // 컬럼 인덱스 찾기
        const colIndex = column.toUpperCase().charCodeAt(0) - 65

        // 값 검색
        const matchingRows = allData
          .map((row, index) => ({ row, rowNumber: index + 1 }))
          .filter(({ row }) => row[colIndex]?.toString() === value.toString())

        return NextResponse.json({
          success: true,
          data: {
            rows: matchingRows.map(r => r.row),
            rowNumbers: matchingRows.map(r => r.rowNumber),
            count: matchingRows.length,
          },
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `지원하지 않는 액션: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Google Sheets execute error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}

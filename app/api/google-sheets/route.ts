export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import {
    getSheetsClientWithToken,
    createSpreadsheetWithToken,
    setCellValuesWithToken,
    batchUpdateWithToken,
    getFirstSheetId,
    formatCellsRequest,
    mergeCellsRequest,
    unmergeCellsRequest,
    setColumnWidthRequest,
    setRowHeightRequest,
    setBordersRequest,
    hexToRgb,
    columnIndexToLetter
} from '@/lib/google-sheets'
import { sheets_v4 } from 'googleapis'

// POST: 새 스프레드시트 생성 또는 액션 실행
export async function POST(request: NextRequest) {
    try {
        // X-Google-Token 헤더에서 access token 가져오기
        const accessToken = request.headers.get('X-Google-Token')
        if (!accessToken) {
            return NextResponse.json({ error: 'Google Sheets 연동이 필요합니다' }, { status: 401 })
        }
        const body = await request.json()
        const { action, spreadsheetId, sheetId, data } = body

        switch (action) {
            case 'create': {
                const title = data?.title || '새 스프레드시트'
                const result = await createSpreadsheetWithToken(accessToken, title)
                console.log('[create] Created spreadsheet:', result.spreadsheetId, '| sheetId:', result.sheetId)
                return NextResponse.json({ spreadsheetId: result.spreadsheetId, sheetId: result.sheetId })
            }

            case 'set_values': {
                if (!spreadsheetId || !data?.range || !data?.values) {
                    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
                }
                await setCellValuesWithToken(accessToken, spreadsheetId, data.range, data.values)
                return NextResponse.json({ success: true })
            }

            case 'get_values': {
                if (!spreadsheetId || !data?.range) {
                    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
                }
                const sheets = getSheetsClientWithToken(accessToken)
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: data.range,
                })
                return NextResponse.json({ values: response.data.values || null })
            }

            case 'batch_update': {
                if (!spreadsheetId || !data?.requests) {
                    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
                }
                await batchUpdateWithToken(accessToken, spreadsheetId, data.requests)
                return NextResponse.json({ success: true })
            }

            case 'execute_actions': {
                // AI가 생성한 액션들을 실행
                if (!spreadsheetId || !data?.actions) {
                    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
                }

                // 실제 시트 ID 가져오기 (sheetId가 제공되지 않으면 첫 번째 시트 사용)
                const actualSheetId = sheetId !== null && sheetId !== undefined
                    ? sheetId
                    : await getFirstSheetId(accessToken, spreadsheetId)

                console.log('[execute_actions] sheetId from request:', sheetId, '| actualSheetId:', actualSheetId)

                const requests: sheets_v4.Schema$Request[] = []
                const valueUpdates: { range: string; values: any[][] }[] = []

                for (const act of data.actions) {
                    switch (act.type) {
                        case 'set_cells': {
                            if (act.data?.cells) {
                                for (const cell of act.data.cells) {
                                    const { row, col, value, format } = cell
                                    const colLetter = columnIndexToLetter(col)
                                    const range = `Sheet1!${colLetter}${row + 1}`

                                    if (value !== undefined) {
                                        valueUpdates.push({
                                            range,
                                            values: [[value]]
                                        })
                                    }

                                    if (format) {
                                        const cellFormat: any = {}

                                        if (format.backgroundColor) {
                                            cellFormat.backgroundColor = hexToRgb(format.backgroundColor)
                                        }
                                        if (format.fontColor) {
                                            cellFormat.textFormat = cellFormat.textFormat || {}
                                            cellFormat.textFormat.foregroundColor = hexToRgb(format.fontColor)
                                        }
                                        if (format.bold !== undefined) {
                                            cellFormat.textFormat = cellFormat.textFormat || {}
                                            cellFormat.textFormat.bold = format.bold
                                        }
                                        if (format.italic !== undefined) {
                                            cellFormat.textFormat = cellFormat.textFormat || {}
                                            cellFormat.textFormat.italic = format.italic
                                        }
                                        if (format.fontSize) {
                                            cellFormat.textFormat = cellFormat.textFormat || {}
                                            cellFormat.textFormat.fontSize = format.fontSize
                                        }
                                        if (format.horizontalAlign) {
                                            const alignMap: Record<string, string> = {
                                                'left': 'LEFT',
                                                'center': 'CENTER',
                                                'right': 'RIGHT'
                                            }
                                            cellFormat.horizontalAlignment = alignMap[format.horizontalAlign] || 'LEFT'
                                        }
                                        if (format.verticalAlign) {
                                            const alignMap: Record<string, string> = {
                                                'top': 'TOP',
                                                'middle': 'MIDDLE',
                                                'bottom': 'BOTTOM'
                                            }
                                            cellFormat.verticalAlignment = alignMap[format.verticalAlign] || 'MIDDLE'
                                        }

                                        if (Object.keys(cellFormat).length > 0) {
                                            requests.push(formatCellsRequest(
                                                actualSheetId,
                                                row,
                                                row + 1,
                                                col,
                                                col + 1,
                                                cellFormat
                                            ))
                                        }
                                    }
                                }
                            }
                            break
                        }

                        case 'merge_cells': {
                            if (act.data?.range) {
                                const { row, column } = act.data.range
                                requests.push(mergeCellsRequest(
                                    actualSheetId,
                                    row[0],
                                    row[1] + 1,
                                    column[0],
                                    column[1] + 1
                                ))
                            }
                            break
                        }

                        case 'unmerge_cells': {
                            if (act.data?.range) {
                                const { row, column } = act.data.range
                                requests.push(unmergeCellsRequest(
                                    actualSheetId,
                                    row[0],
                                    row[1] + 1,
                                    column[0],
                                    column[1] + 1
                                ))
                            }
                            break
                        }

                        case 'set_col_width': {
                            if (act.data?.widths) {
                                for (const [col, width] of Object.entries(act.data.widths)) {
                                    const colIndex = parseInt(col)
                                    requests.push(setColumnWidthRequest(
                                        actualSheetId,
                                        colIndex,
                                        colIndex + 1,
                                        width as number
                                    ))
                                }
                            }
                            break
                        }

                        case 'set_row_height': {
                            if (act.data?.heights) {
                                for (const [row, height] of Object.entries(act.data.heights)) {
                                    const rowIndex = parseInt(row)
                                    requests.push(setRowHeightRequest(
                                        actualSheetId,
                                        rowIndex,
                                        rowIndex + 1,
                                        height as number
                                    ))
                                }
                            }
                            break
                        }

                        case 'set_borders': {
                            if (act.data?.range) {
                                const { row, column } = act.data.range
                                const color = act.data.color ? hexToRgb(act.data.color) : { red: 0, green: 0, blue: 0 }
                                requests.push(setBordersRequest(
                                    actualSheetId,
                                    row[0],
                                    row[1] + 1,
                                    column[0],
                                    column[1] + 1,
                                    act.data.style || 'SOLID',
                                    color
                                ))
                            }
                            break
                        }
                    }
                }

                // 값 업데이트 실행
                if (valueUpdates.length > 0) {
                    const sheets = getSheetsClientWithToken(accessToken)
                    await sheets.spreadsheets.values.batchUpdate({
                        spreadsheetId,
                        requestBody: {
                            valueInputOption: 'USER_ENTERED',
                            data: valueUpdates
                        }
                    })
                }

                // 서식 업데이트 실행
                if (requests.length > 0) {
                    await batchUpdateWithToken(accessToken, spreadsheetId, requests)
                }

                return NextResponse.json({ success: true })
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }
    } catch (error) {
        console.error('Google Sheets API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

// GET: 스프레드시트 정보 가져오기
export async function GET(request: NextRequest) {
    try {
        // X-Google-Token 헤더에서 access token 가져오기
        const accessToken = request.headers.get('X-Google-Token')
        if (!accessToken) {
            return NextResponse.json({ error: 'Google Sheets 연동이 필요합니다' }, { status: 401 })
        }
        const searchParams = request.nextUrl.searchParams
        const spreadsheetId = searchParams.get('spreadsheetId')
        const range = searchParams.get('range') || 'Sheet1!A1:Z100'

        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 })
        }

        const sheets = getSheetsClientWithToken(accessToken)
        const [metadataResponse, valuesResponse] = await Promise.all([
            sheets.spreadsheets.get({ spreadsheetId }),
            sheets.spreadsheets.values.get({ spreadsheetId, range })
        ])

        return NextResponse.json({
            metadata: metadataResponse.data,
            values: valuesResponse.data.values || []
        })
    } catch (error) {
        console.error('Google Sheets API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

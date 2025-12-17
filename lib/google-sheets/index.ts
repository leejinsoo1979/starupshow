import { google, sheets_v4 } from 'googleapis'

// Google Sheets API 서비스

// OAuth 액세스 토큰으로 Sheets 클라이언트 생성
export function getSheetsClientWithToken(accessToken: string): sheets_v4.Sheets {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    return google.sheets({ version: 'v4', auth })
}

// OAuth 액세스 토큰으로 새 스프레드시트 생성
export async function createSpreadsheetWithToken(accessToken: string, title: string): Promise<{ spreadsheetId: string, sheetId: number }> {
    const sheets = getSheetsClientWithToken(accessToken)
    const response = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
            sheets: [{
                properties: {
                    title: 'Sheet1',
                    sheetId: 0,
                    gridProperties: {
                        rowCount: 100,
                        columnCount: 26,
                    }
                }
            }]
        }
    })
    const sheetId = response.data.sheets?.[0]?.properties?.sheetId ?? 0
    return { spreadsheetId: response.data.spreadsheetId!, sheetId }
}

// 스프레드시트의 첫 번째 시트 ID 가져오기
export async function getFirstSheetId(accessToken: string, spreadsheetId: string): Promise<number> {
    const sheets = getSheetsClientWithToken(accessToken)
    const response = await sheets.spreadsheets.get({ spreadsheetId })
    return response.data.sheets?.[0]?.properties?.sheetId ?? 0
}

// OAuth 액세스 토큰으로 셀 값 설정
export async function setCellValuesWithToken(
    accessToken: string,
    spreadsheetId: string,
    range: string,
    values: any[][]
) {
    const sheets = getSheetsClientWithToken(accessToken)
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
    })
}

// OAuth 액세스 토큰으로 배치 업데이트
export async function batchUpdateWithToken(
    accessToken: string,
    spreadsheetId: string,
    requests: sheets_v4.Schema$Request[]
) {
    const sheets = getSheetsClientWithToken(accessToken)
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
    })
}

// ============================================================================
// 레거시 함수들 (서비스 계정용 - 백업)
// ============================================================================

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]

// 서비스 계정 인증 (환경변수에서 credentials 읽기)
function getAuthClient() {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!credentials) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다')
    }

    const key = JSON.parse(credentials)
    const auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: SCOPES,
    })

    return auth
}

// Sheets API 클라이언트 가져오기 (서비스 계정)
export function getSheetsClient(): sheets_v4.Sheets {
    const auth = getAuthClient()
    return google.sheets({ version: 'v4', auth })
}

// 새 스프레드시트 생성 (서비스 계정)
export async function createSpreadsheet(title: string): Promise<string> {
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
            sheets: [{
                properties: {
                    title: 'Sheet1',
                    gridProperties: {
                        rowCount: 100,
                        columnCount: 26,
                    }
                }
            }]
        }
    })
    return response.data.spreadsheetId!
}

// 셀 값 설정
export async function setCellValues(
    spreadsheetId: string,
    range: string,
    values: any[][]
) {
    const sheets = getSheetsClient()
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
    })
}

// 셀 값 가져오기
export async function getCellValues(
    spreadsheetId: string,
    range: string
): Promise<any[][] | null> {
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    })
    return response.data.values || null
}

// 배치 업데이트 (서식, 병합, 크기 조정 등)
export async function batchUpdate(
    spreadsheetId: string,
    requests: sheets_v4.Schema$Request[]
) {
    const sheets = getSheetsClient()
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
    })
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 열 인덱스를 A, B, C... 형식으로 변환
export function columnIndexToLetter(index: number): string {
    let letter = ''
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter
        index = Math.floor(index / 26) - 1
    }
    return letter
}

// A, B, C...를 열 인덱스로 변환
export function letterToColumnIndex(letter: string): number {
    let index = 0
    for (let i = 0; i < letter.length; i++) {
        index = index * 26 + (letter.charCodeAt(i) - 64)
    }
    return index - 1
}

// ============================================================================
// Google Sheets API 요청 빌더들
// ============================================================================

// 셀 서식 설정
export function formatCellsRequest(
    sheetId: number,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
    format: {
        backgroundColor?: { red: number; green: number; blue: number }
        textFormat?: {
            bold?: boolean
            italic?: boolean
            fontSize?: number
            foregroundColor?: { red: number; green: number; blue: number }
        }
        horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT'
        verticalAlignment?: 'TOP' | 'MIDDLE' | 'BOTTOM'
    }
): sheets_v4.Schema$Request {
    return {
        repeatCell: {
            range: {
                sheetId,
                startRowIndex: startRow,
                endRowIndex: endRow,
                startColumnIndex: startCol,
                endColumnIndex: endCol,
            },
            cell: {
                userEnteredFormat: format,
            },
            fields: 'userEnteredFormat',
        },
    }
}

// 셀 병합
export function mergeCellsRequest(
    sheetId: number,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
    mergeType: 'MERGE_ALL' | 'MERGE_ROWS' | 'MERGE_COLUMNS' = 'MERGE_ALL'
): sheets_v4.Schema$Request {
    return {
        mergeCells: {
            range: {
                sheetId,
                startRowIndex: startRow,
                endRowIndex: endRow,
                startColumnIndex: startCol,
                endColumnIndex: endCol,
            },
            mergeType,
        },
    }
}

// 셀 병합 해제
export function unmergeCellsRequest(
    sheetId: number,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number
): sheets_v4.Schema$Request {
    return {
        unmergeCells: {
            range: {
                sheetId,
                startRowIndex: startRow,
                endRowIndex: endRow,
                startColumnIndex: startCol,
                endColumnIndex: endCol,
            },
        },
    }
}

// 열 너비 설정
export function setColumnWidthRequest(
    sheetId: number,
    startCol: number,
    endCol: number,
    width: number
): sheets_v4.Schema$Request {
    return {
        updateDimensionProperties: {
            range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: startCol,
                endIndex: endCol,
            },
            properties: {
                pixelSize: width,
            },
            fields: 'pixelSize',
        },
    }
}

// 행 높이 설정
export function setRowHeightRequest(
    sheetId: number,
    startRow: number,
    endRow: number,
    height: number
): sheets_v4.Schema$Request {
    return {
        updateDimensionProperties: {
            range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: startRow,
                endIndex: endRow,
            },
            properties: {
                pixelSize: height,
            },
            fields: 'pixelSize',
        },
    }
}

// 테두리 설정
export function setBordersRequest(
    sheetId: number,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
    borderStyle: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE' = 'SOLID',
    color: { red: number; green: number; blue: number } = { red: 0, green: 0, blue: 0 }
): sheets_v4.Schema$Request {
    const border = {
        style: borderStyle,
        color,
    }
    return {
        updateBorders: {
            range: {
                sheetId,
                startRowIndex: startRow,
                endRowIndex: endRow,
                startColumnIndex: startCol,
                endColumnIndex: endCol,
            },
            top: border,
            bottom: border,
            left: border,
            right: border,
            innerHorizontal: border,
            innerVertical: border,
        },
    }
}

// HEX 색상을 RGB (0-1 범위)로 변환
export function hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) {
        return { red: 0, green: 0, blue: 0 }
    }
    return {
        red: parseInt(result[1], 16) / 255,
        green: parseInt(result[2], 16) / 255,
        blue: parseInt(result[3], 16) / 255,
    }
}

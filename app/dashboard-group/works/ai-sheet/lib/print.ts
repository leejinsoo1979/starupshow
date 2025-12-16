// 인쇄 설정 및 기능

export interface PrintSettings {
    orientation: 'portrait' | 'landscape'
    paperSize: 'A4' | 'A3' | 'Letter' | 'Legal'
    margins: {
        top: number
        bottom: number
        left: number
        right: number
    }
    scaling: number // 1-200%
    fitToPage: boolean
    fitToWidth?: number // 페이지 수
    fitToHeight?: number // 페이지 수
    printArea?: {
        startRow: number
        endRow: number
        startCol: number
        endCol: number
    }
    printTitles?: {
        repeatRows?: [number, number] // 반복할 행 범위
        repeatCols?: [number, number] // 반복할 열 범위
    }
    gridlines: boolean
    headers: boolean // 행/열 머리글
    blackAndWhite: boolean
    centerHorizontally: boolean
    centerVertically: boolean
    pageOrder: 'downThenOver' | 'overThenDown'
    header?: string
    footer?: string
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
    orientation: 'portrait',
    paperSize: 'A4',
    margins: {
        top: 20,
        bottom: 20,
        left: 15,
        right: 15
    },
    scaling: 100,
    fitToPage: false,
    gridlines: true,
    headers: false,
    blackAndWhite: false,
    centerHorizontally: false,
    centerVertically: false,
    pageOrder: 'downThenOver'
}

// 용지 크기 (mm)
export const PAPER_SIZES = {
    A4: { width: 210, height: 297 },
    A3: { width: 297, height: 420 },
    Letter: { width: 216, height: 279 },
    Legal: { width: 216, height: 356 }
}

// 열 번호를 문자로 변환
function colToLetter(col: number): string {
    let letter = ''
    while (col >= 0) {
        letter = String.fromCharCode(65 + (col % 26)) + letter
        col = Math.floor(col / 26) - 1
    }
    return letter
}

// 인쇄용 HTML 생성
export function generatePrintHTML(
    data: any[][],
    settings: PrintSettings,
    sheetName: string = 'Sheet1'
): string {
    const { orientation, paperSize, margins, scaling, gridlines, headers, centerHorizontally, centerVertically, printArea, header, footer } = settings
    const paper = PAPER_SIZES[paperSize]

    // 인쇄 영역 결정
    let startRow = 0, endRow = data.length - 1
    let startCol = 0, endCol = data[0]?.length - 1 || 0

    if (printArea) {
        startRow = printArea.startRow
        endRow = printArea.endRow
        startCol = printArea.startCol
        endCol = printArea.endCol
    }

    // 데이터가 있는 범위 자동 감지
    if (!printArea) {
        let maxRow = 0, maxCol = 0
        for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < (data[r]?.length || 0); c++) {
                if (data[r][c] !== null && data[r][c] !== undefined && data[r][c] !== '') {
                    maxRow = Math.max(maxRow, r)
                    maxCol = Math.max(maxCol, c)
                }
            }
        }
        endRow = Math.max(maxRow, 0)
        endCol = Math.max(maxCol, 0)
    }

    // 테이블 생성
    let tableHTML = '<table class="print-table">'

    // 열 머리글
    if (headers) {
        tableHTML += '<thead><tr><th class="row-header"></th>'
        for (let c = startCol; c <= endCol; c++) {
            tableHTML += `<th class="col-header">${colToLetter(c)}</th>`
        }
        tableHTML += '</tr></thead>'
    }

    tableHTML += '<tbody>'
    for (let r = startRow; r <= endRow; r++) {
        tableHTML += '<tr>'
        if (headers) {
            tableHTML += `<td class="row-header">${r + 1}</td>`
        }
        for (let c = startCol; c <= endCol; c++) {
            const value = data[r]?.[c] ?? ''
            tableHTML += `<td>${escapeHTML(String(value))}</td>`
        }
        tableHTML += '</tr>'
    }
    tableHTML += '</tbody></table>'

    // 페이지 크기 계산 (mm to px, 96dpi 기준)
    const mmToPx = 3.78
    const pageWidth = orientation === 'portrait' ? paper.width : paper.height
    const pageHeight = orientation === 'portrait' ? paper.height : paper.width

    const contentWidth = pageWidth - margins.left - margins.right
    const contentHeight = pageHeight - margins.top - margins.bottom

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${sheetName} - 인쇄</title>
    <style>
        @page {
            size: ${paperSize} ${orientation};
            margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
            font-size: ${Math.round(11 * scaling / 100)}pt;
            color: #000;
            background: #fff;
            ${centerHorizontally ? 'display: flex; justify-content: center;' : ''}
            ${centerVertically ? 'align-items: center; min-height: 100vh;' : ''}
        }

        .print-container {
            width: 100%;
            ${scaling !== 100 ? `transform: scale(${scaling / 100}); transform-origin: top left;` : ''}
        }

        .print-header {
            text-align: center;
            padding-bottom: 10px;
            border-bottom: 1px solid #ccc;
            margin-bottom: 10px;
        }

        .print-footer {
            text-align: center;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            margin-top: 10px;
            position: fixed;
            bottom: ${margins.bottom}mm;
            left: ${margins.left}mm;
            right: ${margins.right}mm;
        }

        .print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .print-table td,
        .print-table th {
            ${gridlines ? 'border: 1px solid #000;' : 'border: none;'}
            padding: 4px 6px;
            text-align: left;
            vertical-align: middle;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
        }

        .row-header,
        .col-header {
            background-color: #e0e0e0;
            text-align: center;
            font-weight: bold;
            width: 40px;
            min-width: 40px;
        }

        .col-header {
            width: auto;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .no-print {
                display: none !important;
            }
        }

        @media screen {
            body {
                background: #f0f0f0;
                padding: 20px;
            }

            .print-container {
                background: #fff;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                padding: 20px;
                max-width: ${contentWidth * mmToPx}px;
                margin: 0 auto;
            }

            .print-actions {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                gap: 10px;
                z-index: 1000;
            }

            .print-actions button {
                padding: 10px 20px;
                font-size: 14px;
                cursor: pointer;
                border: none;
                border-radius: 4px;
            }

            .print-btn {
                background: #217346;
                color: white;
            }

            .close-btn {
                background: #666;
                color: white;
            }
        }
    </style>
</head>
<body>
    <div class="print-actions no-print">
        <button class="print-btn" onclick="window.print()">인쇄</button>
        <button class="close-btn" onclick="window.close()">닫기</button>
    </div>

    <div class="print-container">
        ${header ? `<div class="print-header">${escapeHTML(header)}</div>` : ''}
        ${tableHTML}
        ${footer ? `<div class="print-footer">${escapeHTML(footer)}</div>` : ''}
    </div>

    <script>
        // 자동 인쇄 (선택적)
        // window.onload = function() { window.print(); }
    </script>
</body>
</html>
`
    return html
}

function escapeHTML(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

// 인쇄 미리보기 창 열기
export function openPrintPreview(
    data: any[][],
    settings: PrintSettings,
    sheetName?: string
): Window | null {
    const html = generatePrintHTML(data, settings, sheetName)
    const printWindow = window.open('', '_blank', 'width=900,height=700')

    if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
    }

    return printWindow
}

// 바로 인쇄
export function printSheet(
    data: any[][],
    settings: PrintSettings,
    sheetName?: string
): void {
    const html = generatePrintHTML(data, settings, sheetName)
    const printWindow = window.open('', '_blank')

    if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()

        // 약간의 지연 후 인쇄 실행
        setTimeout(() => {
            printWindow.print()
        }, 500)
    }
}

// PDF 내보내기용 (html2pdf 등 라이브러리 사용 시)
export function getPrintableElement(
    data: any[][],
    settings: PrintSettings
): HTMLElement {
    const html = generatePrintHTML(data, settings)
    const container = document.createElement('div')
    container.innerHTML = html
    return container
}

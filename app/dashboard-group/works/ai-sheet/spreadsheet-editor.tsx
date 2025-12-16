"use client"

import { forwardRef, useEffect, useRef, useImperativeHandle, useState } from "react"
import { Workbook } from "@fortune-sheet/react"
import "@fortune-sheet/react/dist/index.css"

interface SpreadsheetEditorProps {
    data: any[][]
    onChange: (data: any[][]) => void
}

// Helper function to convert 2D array to Fortune-sheet celldata format
function convertToCelldata(data: any[][]): any[] {
    const celldata: any[] = []
    data.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value !== '' && value !== null && value !== undefined) {
                celldata.push({
                    r,
                    c,
                    v: { v: value, m: String(value) }
                })
            }
        })
    })
    return celldata
}

const SpreadsheetEditor = forwardRef<any, SpreadsheetEditorProps>(({ data, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [sheetData, setSheetData] = useState<any[]>([{
        name: "Sheet1",
        color: "",
        status: 1,
        order: 0,
        celldata: [],
        config: {},
        index: 0,
    }])
    const [sheetKey, setSheetKey] = useState(0)
    const prevDataRef = useRef<string>('')

    // Update sheetData when data prop changes
    useEffect(() => {
        const celldata = convertToCelldata(data)
        const dataHash = JSON.stringify(celldata.slice(0, 10)) // Simple hash of first 10 cells

        console.log('SpreadsheetEditor: data changed, celldata count:', celldata.length)

        // Only update if data actually changed
        if (dataHash !== prevDataRef.current) {
            prevDataRef.current = dataHash

            if (celldata.length > 0) {
                console.log('SpreadsheetEditor: Updating sheetData with new celldata')
                console.log('Sample celldata:', celldata.slice(0, 3))

                // Update sheet data and force re-mount by changing key
                setSheetData([{
                    name: "Sheet1",
                    color: "",
                    status: 1,
                    order: 0,
                    celldata,
                    config: {},
                    index: 0,
                }])

                // Use setTimeout to ensure state update is committed before key change
                setTimeout(() => {
                    console.log('SpreadsheetEditor: Changing key to force re-mount')
                    setSheetKey(prev => prev + 1)
                }, 50)
            }
        }
    }, [data])

    useImperativeHandle(ref, () => ({
        getData: () => {
            const result: any[][] = Array(50).fill(null).map(() => Array(26).fill(''))
            sheetData[0].celldata.forEach((cell: any) => {
                if (cell.r < 50 && cell.c < 26) {
                    result[cell.r][cell.c] = cell.v?.v || cell.v?.m || ''
                }
            })
            return result
        },
        setData: (newData: any[][]) => {
            onChange(newData)
        }
    }))

    const handleChange = (newData: any[]) => {
        // Convert to 2D array and notify parent
        const sheet = newData[0]
        if (!sheet?.celldata) return

        const result: any[][] = Array(50).fill(null).map(() => Array(26).fill(''))
        sheet.celldata.forEach((cell: any) => {
            if (cell.r < 50 && cell.c < 26) {
                result[cell.r][cell.c] = cell.v?.v || cell.v?.m || ''
            }
        })
        onChange(result)
    }

    return (
        <div ref={containerRef} className="h-full w-full fortune-sheet-container">
            <Workbook
                key={sheetKey}
                data={sheetData}
                onChange={handleChange}
                lang="ko"
                showToolbar={false}
                showFormulaBar={false}
                showSheetTabs={true}
                allowEdit={true}
                row={50}
                column={26}
            />
            <style jsx global>{`
                .fortune-sheet-container {
                    height: 100%;
                    width: 100%;
                    background: white !important;
                }

                .fortune-sheet-container .luckysheet {
                    height: 100% !important;
                }

                .fortune-sheet-container .fortune-sheet-container-wrapper {
                    height: 100% !important;
                    background: white !important;
                }

                /* Force light mode - override dark mode */
                .fortune-sheet-container,
                .fortune-sheet-container * {
                    color-scheme: light !important;
                }

                /* Sheet tabs - always light */
                .luckysheet-sheet-area {
                    background: #f1f5f9 !important;
                    border-top: 1px solid #e2e8f0 !important;
                }

                .luckysheet-sheet-content {
                    background: white !important;
                }

                /* Cell styling */
                .luckysheet-cell-selected {
                    border: 2px solid #3b82f6 !important;
                }

                /* Ensure all text is dark */
                .luckysheet-sheet-area button,
                .luckysheet-sheet-area span {
                    color: #374151 !important;
                }
            `}</style>
        </div>
    )
})

SpreadsheetEditor.displayName = 'SpreadsheetEditor'

export default SpreadsheetEditor

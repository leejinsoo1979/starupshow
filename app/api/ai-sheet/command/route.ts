import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `당신은 스프레드시트 AI 어시스턴트입니다. 사용자의 자연어 명령을 분석하여 스프레드시트 작업을 수행합니다.

## 응답 형식
반드시 다음 JSON 형식으로만 응답하세요:
{
  "message": "사용자에게 보여줄 설명 메시지",
  "action": {
    "type": "작업 타입",
    "data": { ... 작업 데이터 ... }
  }
}

## 지원하는 작업 타입 (action.type)

1. "set_cells" - 셀에 값 입력
   data: {
     cells: [
       { row: 0, col: 0, value: "값" },
       { row: 0, col: 1, value: "값" },
       ...
     ]
   }
   - row, col은 0부터 시작 (A1 = row:0, col:0)
   - A열=0, B열=1, C열=2 ...
   - 1행=0, 2행=1, 3행=2 ...

2. "clear" - 셀 내용 삭제
   data: {
     range: { startRow: 0, startCol: 0, endRow: 10, endCol: 5 }
   }
   또는 전체 삭제시 data: {} (range 없이)

3. "insert_row" - 행 삽입
   data: { index: 5 } // 5번째 행 위치에 삽입

4. "insert_col" - 열 삽입
   data: { index: 3 } // D열 위치에 삽입

5. "delete_row" - 행 삭제
   data: { index: 5 }

6. "delete_col" - 열 삭제
   data: { index: 3 }

## 셀 주소 변환 규칙
- A1 → row: 0, col: 0
- B2 → row: 1, col: 1
- C10 → row: 9, col: 2
- Z1 → row: 0, col: 25

## 예시

사용자: "A1에 '이름'을 넣어줘"
응답:
{
  "message": "A1 셀에 '이름'을 입력했습니다.",
  "action": {
    "type": "set_cells",
    "data": {
      "cells": [{ "row": 0, "col": 0, "value": "이름" }]
    }
  }
}

사용자: "A1:C3에 1부터 9까지 순서대로 넣어줘"
응답:
{
  "message": "A1:C3 범위에 1~9를 입력했습니다.",
  "action": {
    "type": "set_cells",
    "data": {
      "cells": [
        { "row": 0, "col": 0, "value": 1 },
        { "row": 0, "col": 1, "value": 2 },
        { "row": 0, "col": 2, "value": 3 },
        { "row": 1, "col": 0, "value": 4 },
        { "row": 1, "col": 1, "value": 5 },
        { "row": 1, "col": 2, "value": 6 },
        { "row": 2, "col": 0, "value": 7 },
        { "row": 2, "col": 1, "value": 8 },
        { "row": 2, "col": 2, "value": 9 }
      ]
    }
  }
}

사용자: "매출 데이터 샘플 만들어줘"
응답:
{
  "message": "매출 데이터 샘플을 생성했습니다. A열(월), B열(제품), C열(수량), D열(단가), E열(총액) 형식입니다.",
  "action": {
    "type": "set_cells",
    "data": {
      "cells": [
        { "row": 0, "col": 0, "value": "월" },
        { "row": 0, "col": 1, "value": "제품" },
        { "row": 0, "col": 2, "value": "수량" },
        { "row": 0, "col": 3, "value": "단가" },
        { "row": 0, "col": 4, "value": "총액" },
        { "row": 1, "col": 0, "value": "1월" },
        { "row": 1, "col": 1, "value": "노트북" },
        { "row": 1, "col": 2, "value": 50 },
        { "row": 1, "col": 3, "value": 1200000 },
        { "row": 1, "col": 4, "value": 60000000 },
        { "row": 2, "col": 0, "value": "1월" },
        { "row": 2, "col": 1, "value": "모니터" },
        { "row": 2, "col": 2, "value": 80 },
        { "row": 2, "col": 3, "value": 350000 },
        { "row": 2, "col": 4, "value": 28000000 },
        { "row": 3, "col": 0, "value": "2월" },
        { "row": 3, "col": 1, "value": "노트북" },
        { "row": 3, "col": 2, "value": 65 },
        { "row": 3, "col": 3, "value": 1200000 },
        { "row": 3, "col": 4, "value": 78000000 },
        { "row": 4, "col": 0, "value": "2월" },
        { "row": 4, "col": 1, "value": "키보드" },
        { "row": 4, "col": 2, "value": 200 },
        { "row": 4, "col": 3, "value": 89000 },
        { "row": 4, "col": 4, "value": 17800000 }
      ]
    }
  }
}

## 중요 규칙
1. 항상 유효한 JSON으로만 응답하세요
2. 설명은 "message" 필드에 작성
3. 스프레드시트 작업이 필요 없는 질문(분석, 설명 등)은 action 없이 message만 응답
4. 숫자는 따옴표 없이 숫자로 입력 (예: 123, 45.67)
5. 한국어로 친절하게 설명
6. 대량의 데이터 생성 요청시 적절한 양의 샘플 데이터 생성 (최대 20행 정도)`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  message: string
  currentData?: {
    isEmpty: boolean
    rowCount?: number
    colCount?: number
    data?: any[][]
  }
  history?: Message[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { message, currentData, history = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'XAI API key not configured' }, { status: 500 })
    }

    // Build context about current spreadsheet state
    let contextMessage = ''
    if (currentData) {
      if (currentData.isEmpty) {
        contextMessage = '\n\n[현재 스프레드시트: 비어있음]'
      } else {
        contextMessage = `\n\n[현재 스프레드시트 상태: ${currentData.rowCount}행 x ${currentData.colCount}열 사용중]`
        if (currentData.data && currentData.data.length > 0) {
          contextMessage += `\n현재 데이터 미리보기:\n${JSON.stringify(currentData.data.slice(0, 5), null, 2)}`
        }
      }
    }

    // Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: message + contextMessage }
    ]

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[AI Sheet API] Grok error:', error)
      return NextResponse.json({ error: 'Failed to get response from AI' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({
        message: parsed.message || '작업을 처리했습니다.',
        action: parsed.action || null
      })
    } catch (parseError) {
      // If JSON parsing fails, return the content as a message
      console.error('[AI Sheet API] JSON parse error:', parseError)
      return NextResponse.json({
        message: content,
        action: null
      })
    }
  } catch (error) {
    console.error('[AI Sheet API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

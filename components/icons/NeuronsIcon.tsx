'use client'

import { SVGProps } from 'react'

export function NeuronsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* 머리 옆모습 실루엣 (오른쪽 바라봄) */}
      <path d="M6 9c0-4 3-7 7-7 3 0 5 2 6 4.5.5 1.5.5 3-.5 4.5l-1 1.5c-.3.5-.5 1-.5 1.5v2c0 .5-.2 1-.5 1.5l-.5.5h-2l-1 2c-.3.5-.7 1-1.5 1H9c-.5 0-1-.3-1.3-.7L6.5 18c-.3-.5-.5-1-.5-1.5V15c0-.5-.2-1-.5-1.5L5 12.5c-.6-1-1-2-1-3.5z" />

      {/* 얼굴 디테일 (이마-코-입) */}
      <path d="M17 8.5c.5.5.8 1.2.8 2 0 .5-.2 1-.5 1.2l-.8.8-.5 1" strokeWidth="1" />

      {/* 뉴런 노드들 - 뇌 안쪽 */}
      <circle cx="8" cy="6.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="11" cy="5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13" cy="8.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="10" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="11" cy="11" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="9" cy="13" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="15" r="0.5" fill="currentColor" stroke="none" />

      {/* 뉴런 연결선 */}
      <path d="M8 6.5L11 5L13.5 6" strokeWidth="0.6" fill="none" />
      <path d="M8 6.5L10 8L13 8.5" strokeWidth="0.6" fill="none" />
      <path d="M11 5L10 8" strokeWidth="0.6" fill="none" />
      <path d="M13.5 6L13 8.5" strokeWidth="0.6" fill="none" />
      <path d="M10 8L8.5 10L11 11" strokeWidth="0.6" fill="none" />
      <path d="M13 8.5L11 11" strokeWidth="0.6" fill="none" />
      <path d="M8.5 10L9 13" strokeWidth="0.6" fill="none" />
      <path d="M11 11L9 13L10.5 15" strokeWidth="0.6" fill="none" />
    </svg>
  )
}

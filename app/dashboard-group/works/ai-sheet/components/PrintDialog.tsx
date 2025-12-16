'use client'

import { useState } from 'react'
import { X, Printer, FileText, Grid3X3, AlignCenter, AlignVerticalSpaceAround } from 'lucide-react'
import type { PrintSettings } from '../lib/print'
import { DEFAULT_PRINT_SETTINGS, PAPER_SIZES, openPrintPreview, printSheet } from '../lib/print'

interface PrintDialogProps {
    isOpen: boolean
    onClose: () => void
    data: any[][]
    sheetName?: string
}

export function PrintDialog({ isOpen, onClose, data, sheetName = 'Sheet1' }: PrintDialogProps) {
    const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
    const [activeTab, setActiveTab] = useState<'page' | 'margins' | 'header'>('page')

    if (!isOpen) return null

    const handlePrint = () => {
        printSheet(data, settings, sheetName)
        onClose()
    }

    const handlePreview = () => {
        openPrintPreview(data, settings, sheetName)
    }

    const updateSettings = (updates: Partial<PrintSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }))
    }

    const updateMargins = (key: keyof PrintSettings['margins'], value: number) => {
        setSettings(prev => ({
            ...prev,
            margins: { ...prev.margins, [key]: value }
        }))
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-[#217346]">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        인쇄 설정
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-gray-50">
                    <button
                        onClick={() => setActiveTab('page')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'page'
                                ? 'bg-white border-b-2 border-[#217346] text-[#217346]'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        페이지 설정
                    </button>
                    <button
                        onClick={() => setActiveTab('margins')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'margins'
                                ? 'bg-white border-b-2 border-[#217346] text-[#217346]'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        여백
                    </button>
                    <button
                        onClick={() => setActiveTab('header')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'header'
                                ? 'bg-white border-b-2 border-[#217346] text-[#217346]'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        머리글/바닥글
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {activeTab === 'page' && (
                        <div className="space-y-6">
                            {/* 용지 방향 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    용지 방향
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => updateSettings({ orientation: 'portrait' })}
                                        className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                                            settings.orientation === 'portrait'
                                                ? 'border-[#217346] bg-green-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="w-8 h-12 border-2 border-current rounded mb-2" />
                                        <span className="text-sm">세로</span>
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ orientation: 'landscape' })}
                                        className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                                            settings.orientation === 'landscape'
                                                ? 'border-[#217346] bg-green-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="w-12 h-8 border-2 border-current rounded mb-2" />
                                        <span className="text-sm">가로</span>
                                    </button>
                                </div>
                            </div>

                            {/* 용지 크기 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    용지 크기
                                </label>
                                <select
                                    value={settings.paperSize}
                                    onChange={(e) => updateSettings({ paperSize: e.target.value as PrintSettings['paperSize'] })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#217346] focus:border-[#217346]"
                                >
                                    <option value="A4">A4 (210 x 297 mm)</option>
                                    <option value="A3">A3 (297 x 420 mm)</option>
                                    <option value="Letter">Letter (216 x 279 mm)</option>
                                    <option value="Legal">Legal (216 x 356 mm)</option>
                                </select>
                            </div>

                            {/* 배율 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    배율: {settings.scaling}%
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="200"
                                    value={settings.scaling}
                                    onChange={(e) => updateSettings({ scaling: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>50%</span>
                                    <span>100%</span>
                                    <span>200%</span>
                                </div>
                            </div>

                            {/* 인쇄 옵션 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    인쇄 옵션
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.gridlines}
                                            onChange={(e) => updateSettings({ gridlines: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-[#217346] focus:ring-[#217346]"
                                        />
                                        <Grid3X3 className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm">눈금선 인쇄</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.headers}
                                            onChange={(e) => updateSettings({ headers: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-[#217346] focus:ring-[#217346]"
                                        />
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm">행/열 머리글 인쇄</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.blackAndWhite}
                                            onChange={(e) => updateSettings({ blackAndWhite: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-[#217346] focus:ring-[#217346]"
                                        />
                                        <span className="text-sm">흑백 인쇄</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'margins' && (
                        <div className="space-y-6">
                            {/* 여백 입력 */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        위쪽 (mm)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.margins.top}
                                        onChange={(e) => updateMargins('top', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#217346]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        아래쪽 (mm)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.margins.bottom}
                                        onChange={(e) => updateMargins('bottom', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#217346]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        왼쪽 (mm)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.margins.left}
                                        onChange={(e) => updateMargins('left', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#217346]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        오른쪽 (mm)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.margins.right}
                                        onChange={(e) => updateMargins('right', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#217346]"
                                    />
                                </div>
                            </div>

                            {/* 페이지 중앙 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    페이지 중앙
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.centerHorizontally}
                                            onChange={(e) => updateSettings({ centerHorizontally: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-[#217346] focus:ring-[#217346]"
                                        />
                                        <AlignCenter className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm">가로 방향 중앙</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={settings.centerVertically}
                                            onChange={(e) => updateSettings({ centerVertically: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-[#217346] focus:ring-[#217346]"
                                        />
                                        <AlignVerticalSpaceAround className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm">세로 방향 중앙</span>
                                    </label>
                                </div>
                            </div>

                            {/* 미리 설정 여백 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    여백 미리 설정
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            margins: { top: 25, bottom: 25, left: 20, right: 20 }
                                        }))}
                                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                                    >
                                        보통
                                    </button>
                                    <button
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            margins: { top: 19, bottom: 19, left: 18, right: 18 }
                                        }))}
                                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                                    >
                                        좁게
                                    </button>
                                    <button
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            margins: { top: 25, bottom: 25, left: 38, right: 38 }
                                        }))}
                                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                                    >
                                        넓게
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'header' && (
                        <div className="space-y-6">
                            {/* 머리글 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    머리글
                                </label>
                                <input
                                    type="text"
                                    value={settings.header || ''}
                                    onChange={(e) => updateSettings({ header: e.target.value })}
                                    placeholder="문서 상단에 표시할 내용"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#217346]"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    예: 회사명, 문서 제목 등
                                </p>
                            </div>

                            {/* 바닥글 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    바닥글
                                </label>
                                <input
                                    type="text"
                                    value={settings.footer || ''}
                                    onChange={(e) => updateSettings({ footer: e.target.value })}
                                    placeholder="문서 하단에 표시할 내용"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#217346]"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    예: 페이지 번호, 날짜 등
                                </p>
                            </div>

                            {/* 빠른 삽입 버튼 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    바닥글 빠른 삽입
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => updateSettings({ footer: sheetName })}
                                        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                                    >
                                        시트 이름
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ footer: new Date().toLocaleDateString('ko-KR') })}
                                        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                                    >
                                        오늘 날짜
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ footer: `${sheetName} - ${new Date().toLocaleDateString('ko-KR')}` })}
                                        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                                    >
                                        시트 + 날짜
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
                    <button
                        onClick={handlePreview}
                        className="px-4 py-2 text-[#217346] border border-[#217346] rounded-lg hover:bg-green-50 flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        미리 보기
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            취소
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-6 py-2 bg-[#217346] text-white rounded-lg hover:bg-[#1a5c38] flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            인쇄
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

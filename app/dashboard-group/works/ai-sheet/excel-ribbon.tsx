"use client"

import { useState } from "react"
import {
    Undo2,
    Redo2,
    Scissors,
    Copy,
    ClipboardPaste,
    Paintbrush,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    ChevronDown,
    Plus,
    Trash2,
    Filter,
    Search,
    Table,
    Grid3X3,
    Settings,
    Percent,
    Type,
    Palette,
    Square,
    Sigma,
    WrapText,
    Columns,
    LayoutGrid,
    FileSpreadsheet,
    Eraser,
    ArrowDownAZ,
    Sparkles,
    Check,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ExcelRibbonProps {
    onAction: (action: string, data?: any) => void
}

type TabType = "홈" | "삽입" | "페이지 레이아웃" | "수식" | "데이터" | "보기" | "설정"

export default function ExcelRibbon({ onAction }: ExcelRibbonProps) {
    const [activeTab, setActiveTab] = useState<TabType>("홈")
    const [fontFamily, setFontFamily] = useState("Calibri")
    const [fontSize, setFontSize] = useState("11")
    const [cellRef, setCellRef] = useState("A1")

    const tabs: TabType[] = ["홈", "삽입", "페이지 레이아웃", "수식", "데이터", "보기", "설정"]

    // 그룹 구분선
    const GroupDivider = () => (
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
    )

    // 그룹 컨테이너
    const RibbonGroup = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
        <div className={cn("flex flex-col h-[85px]", className)}>
            <div className="flex items-start gap-1 px-2 pt-1 flex-1">
                {children}
            </div>
            <div className="text-[11px] text-gray-600 text-center py-1 border-t border-gray-200 bg-gray-50/50">
                {title}
            </div>
        </div>
    )

    // 큰 버튼 (붙여넣기, 삽입 등)
    const LargeButton = ({
        icon: Icon,
        label,
        onClick,
        dropdown = false,
        iconColor = "text-gray-700"
    }: {
        icon: any
        label: string
        onClick?: () => void
        dropdown?: boolean
        iconColor?: string
    }) => (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center px-2 py-1 hover:bg-blue-100 rounded min-w-[50px] h-[58px]"
        >
            <Icon className={cn("w-7 h-7 mb-0.5", iconColor)} />
            <span className="text-[11px] text-gray-700 flex items-center gap-0.5">
                {label}
                {dropdown && <ChevronDown className="w-3 h-3" />}
            </span>
        </button>
    )

    // 작은 아이콘 버튼
    const SmallIconButton = ({
        icon: Icon,
        title,
        onClick,
        active = false,
        iconColor = "text-gray-700",
        className = ""
    }: {
        icon: any
        title: string
        onClick?: () => void
        active?: boolean
        iconColor?: string
        className?: string
    }) => (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "p-1.5 hover:bg-blue-100 rounded",
                active && "bg-blue-200",
                className
            )}
        >
            <Icon className={cn("w-4 h-4", iconColor)} />
        </button>
    )

    // 텍스트 + 드롭다운 버튼
    const TextDropdownButton = ({
        icon: Icon,
        label,
        onClick,
        iconColor = "text-gray-700"
    }: {
        icon: any
        label: string
        onClick?: () => void
        iconColor?: string
    }) => (
        <button
            onClick={onClick}
            className="flex items-center gap-1 px-1.5 py-1 hover:bg-blue-100 rounded text-[11px] text-gray-700"
        >
            <Icon className={cn("w-4 h-4", iconColor)} />
            <span>{label}</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>
    )

    const renderHomeTab = () => (
        <div className="flex items-stretch h-full">
            {/* 실행 취소/다시 실행 */}
            <div className="flex items-center gap-1 px-2">
                <button className="p-1 hover:bg-blue-100 rounded" title="실행 취소">
                    <Undo2 className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-1 hover:bg-blue-100 rounded" title="다시 실행">
                    <Redo2 className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <GroupDivider />

            {/* 클립보드 */}
            <RibbonGroup title="클립보드">
                <div className="flex items-start gap-1">
                    <LargeButton icon={ClipboardPaste} label="붙여넣기" dropdown iconColor="text-amber-600" />
                    <div className="flex flex-col gap-0.5 pt-1">
                        <SmallIconButton icon={Scissors} title="잘라내기" />
                        <SmallIconButton icon={Copy} title="복사" />
                        <SmallIconButton icon={Paintbrush} title="서식 복사" iconColor="text-amber-500" />
                    </div>
                </div>
            </RibbonGroup>

            <GroupDivider />

            {/* 글꼴 */}
            <RibbonGroup title="글꼴">
                <div className="flex flex-col gap-1 pt-1">
                    <div className="flex items-center gap-1">
                        <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="h-[22px] px-1 text-[11px] border border-gray-300 rounded w-[100px] bg-white text-gray-800"
                        >
                            <option>Calibri</option>
                            <option>Arial</option>
                            <option>맑은 고딕</option>
                            <option>굴림</option>
                            <option>바탕</option>
                        </select>
                        <select
                            value={fontSize}
                            onChange={(e) => setFontSize(e.target.value)}
                            className="h-[22px] px-1 text-[11px] border border-gray-300 rounded w-[45px] bg-white text-gray-800"
                        >
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map(size => (
                                <option key={size}>{size}</option>
                            ))}
                        </select>
                        <button className="p-0.5 hover:bg-blue-100 rounded text-gray-600" title="글꼴 크기 늘림">
                            <span className="text-[11px] font-bold">A</span><span className="text-[9px]">▲</span>
                        </button>
                        <button className="p-0.5 hover:bg-blue-100 rounded text-gray-600" title="글꼴 크기 줄임">
                            <span className="text-[11px] font-bold">A</span><span className="text-[9px]">▼</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <SmallIconButton icon={Bold} title="굵게" />
                        <SmallIconButton icon={Italic} title="기울임꼴" />
                        <SmallIconButton icon={Underline} title="밑줄" />
                        <SmallIconButton icon={Strikethrough} title="취소선" />
                        <div className="w-px h-4 bg-gray-300 mx-0.5" />
                        <button className="p-1.5 hover:bg-blue-100 rounded flex flex-col items-center" title="테두리">
                            <Square className="w-4 h-4 text-gray-700" />
                        </button>
                        <div className="w-px h-4 bg-gray-300 mx-0.5" />
                        <button className="p-1.5 hover:bg-blue-100 rounded flex flex-col items-center" title="채우기 색">
                            <Palette className="w-4 h-4 text-yellow-500" />
                            <div className="w-4 h-1 bg-yellow-400 -mt-0.5" />
                        </button>
                        <button className="p-1.5 hover:bg-blue-100 rounded flex flex-col items-center" title="글꼴 색">
                            <Type className="w-4 h-4 text-gray-700" />
                            <div className="w-4 h-1 bg-red-500 -mt-0.5" />
                        </button>
                    </div>
                </div>
            </RibbonGroup>

            <GroupDivider />

            {/* 맞춤 */}
            <RibbonGroup title="맞춤">
                <div className="flex flex-col gap-1 pt-1">
                    <div className="flex items-center gap-0.5">
                        <SmallIconButton icon={AlignVerticalJustifyStart} title="위쪽 맞춤" />
                        <SmallIconButton icon={AlignVerticalJustifyCenter} title="가운데 맞춤" />
                        <SmallIconButton icon={AlignVerticalJustifyEnd} title="아래쪽 맞춤" />
                        <div className="w-px h-4 bg-gray-300 mx-0.5" />
                        <button className="p-1.5 hover:bg-blue-100 rounded flex items-center gap-0.5 text-[10px] text-gray-700" title="자동 줄 바꿈">
                            <WrapText className="w-4 h-4" />
                            자동 줄 바꿈
                        </button>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <SmallIconButton icon={AlignLeft} title="왼쪽 맞춤" />
                        <SmallIconButton icon={AlignCenter} title="가운데 맞춤" />
                        <SmallIconButton icon={AlignRight} title="오른쪽 맞춤" />
                        <div className="w-px h-4 bg-gray-300 mx-0.5" />
                        <button className="p-1.5 hover:bg-blue-100 rounded flex items-center gap-0.5 text-[10px] text-gray-700" title="병합하고 가운데 맞춤">
                            <LayoutGrid className="w-4 h-4" />
                            병합하고 가운데 맞춤
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </RibbonGroup>

            <GroupDivider />

            {/* 표시 형식 */}
            <RibbonGroup title="표시 형식">
                <div className="flex flex-col gap-1 pt-1">
                    <select className="h-[22px] px-1 text-[11px] border border-gray-300 rounded w-[90px] bg-white text-gray-800">
                        <option>일반</option>
                        <option>숫자</option>
                        <option>통화</option>
                        <option>회계</option>
                        <option>날짜</option>
                        <option>백분율</option>
                        <option>텍스트</option>
                    </select>
                    <div className="flex items-center gap-0.5">
                        <button className="px-1.5 py-1 hover:bg-blue-100 rounded text-[11px] text-gray-700" title="백분율 스타일">%</button>
                        <button className="px-1.5 py-1 hover:bg-blue-100 rounded text-[11px] text-gray-700" title="쉼표 스타일">,</button>
                        <div className="w-px h-4 bg-gray-300 mx-0.5" />
                        <button className="px-1 py-1 hover:bg-blue-100 rounded text-[10px] text-gray-700" title="소수 자릿수 늘림">.00→.000</button>
                        <button className="px-1 py-1 hover:bg-blue-100 rounded text-[10px] text-gray-700" title="소수 자릿수 줄임">.00→.0</button>
                    </div>
                </div>
            </RibbonGroup>

            <GroupDivider />

            {/* 스타일 */}
            <RibbonGroup title="스타일">
                <div className="flex items-start gap-1 pt-1">
                    <LargeButton icon={Table} label="조건부 서식" dropdown iconColor="text-orange-500" />
                    <LargeButton icon={Grid3X3} label="표 서식" dropdown iconColor="text-blue-500" />
                    <LargeButton icon={FileSpreadsheet} label="셀 스타일" dropdown iconColor="text-green-500" />
                    <LargeButton icon={Columns} label="셀 편집기" iconColor="text-purple-500" />
                </div>
            </RibbonGroup>

            <GroupDivider />

            {/* 셀 */}
            <RibbonGroup title="셀">
                <div className="flex items-start gap-1 pt-1">
                    <LargeButton icon={Plus} label="삽입" dropdown iconColor="text-green-600" onClick={() => onAction('insert')} />
                    <LargeButton icon={Trash2} label="삭제" dropdown iconColor="text-red-500" onClick={() => onAction('delete')} />
                    <LargeButton icon={Settings} label="서식" dropdown iconColor="text-blue-600" />
                </div>
            </RibbonGroup>

            <GroupDivider />

            {/* 편집 */}
            <RibbonGroup title="편집">
                <div className="flex items-start gap-2 pt-1">
                    <div className="flex flex-col gap-0.5">
                        <TextDropdownButton icon={Sigma} label="합계" iconColor="text-blue-600" />
                        <TextDropdownButton icon={Sparkles} label="채우기" iconColor="text-amber-500" />
                        <TextDropdownButton icon={Eraser} label="지우기" />
                    </div>
                    <div className="flex flex-col gap-1 pt-0.5">
                        <button className="flex items-center gap-1 px-2 py-1 hover:bg-blue-100 rounded">
                            <ArrowDownAZ className="w-5 h-5 text-blue-600" />
                            <span className="text-[11px] text-gray-700">정렬 및 필터</span>
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 hover:bg-blue-100 rounded">
                            <Search className="w-5 h-5 text-gray-600" />
                            <span className="text-[11px] text-gray-700">찾기</span>
                        </button>
                    </div>
                </div>
            </RibbonGroup>
        </div>
    )

    return (
        <div className="bg-white border-b border-gray-300 select-none">
            {/* 탭 바 */}
            <div className="flex items-center bg-[#f3f3f3] border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-[12px] font-medium transition-colors relative",
                            activeTab === tab
                                ? "bg-white text-green-700 border-t-2 border-t-green-600"
                                : "text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* 리본 콘텐츠 */}
            <div className="bg-[#f8f9fa] min-h-[94px]">
                {activeTab === "홈" && renderHomeTab()}
                {activeTab === "삽입" && (
                    <div className="flex items-center h-[85px] px-4">
                        <RibbonGroup title="표">
                            <div className="flex gap-1 pt-1">
                                <LargeButton icon={Table} label="피벗 테이블" iconColor="text-green-600" />
                                <LargeButton icon={Grid3X3} label="표" iconColor="text-blue-500" />
                            </div>
                        </RibbonGroup>
                    </div>
                )}
                {activeTab === "페이지 레이아웃" && (
                    <div className="flex items-center justify-center h-[85px] text-gray-500 text-sm">
                        페이지 레이아웃 도구
                    </div>
                )}
                {activeTab === "수식" && (
                    <div className="flex items-center h-[85px] px-4">
                        <RibbonGroup title="함수 라이브러리">
                            <div className="flex gap-1 pt-1">
                                <LargeButton icon={Sigma} label="함수 삽입" iconColor="text-blue-600" />
                                <LargeButton icon={Sigma} label="자동 합계" dropdown iconColor="text-green-600" />
                            </div>
                        </RibbonGroup>
                    </div>
                )}
                {activeTab === "데이터" && (
                    <div className="flex items-center h-[85px] px-4">
                        <RibbonGroup title="정렬 및 필터">
                            <div className="flex gap-1 pt-1">
                                <LargeButton icon={ArrowDownAZ} label="오름차순" iconColor="text-blue-600" onClick={() => onAction('sort', 'asc')} />
                                <LargeButton icon={ArrowDownAZ} label="내림차순" iconColor="text-blue-600" onClick={() => onAction('sort', 'desc')} />
                                <LargeButton icon={Filter} label="필터" iconColor="text-amber-500" onClick={() => onAction('filter')} />
                            </div>
                        </RibbonGroup>
                    </div>
                )}
                {activeTab === "보기" && (
                    <div className="flex items-center justify-center h-[85px] text-gray-500 text-sm">
                        보기 옵션
                    </div>
                )}
                {activeTab === "설정" && (
                    <div className="flex items-center justify-center h-[85px] text-gray-500 text-sm">
                        설정 옵션
                    </div>
                )}
            </div>

            {/* 수식 입력줄 */}
            <div className="flex items-center bg-white border-t border-gray-200 h-[26px]">
                <div className="w-[80px] px-2 border-r border-gray-300 text-[11px] text-center font-medium text-gray-700 flex items-center justify-center h-full bg-gray-50">
                    {cellRef}
                </div>
                <div className="flex items-center px-2 border-r border-gray-300 h-full gap-1">
                    <button className="p-0.5 hover:bg-gray-200 rounded" title="취소">
                        <X className="w-3 h-3 text-gray-500" />
                    </button>
                    <button className="p-0.5 hover:bg-gray-200 rounded" title="입력">
                        <Check className="w-3 h-3 text-gray-500" />
                    </button>
                    <span className="text-gray-400 text-[12px] italic px-1">fx</span>
                </div>
                <input
                    type="text"
                    className="flex-1 px-2 text-[12px] h-full outline-none bg-white text-gray-800"
                    placeholder=""
                />
            </div>
        </div>
    )
}

// 사이드바 타입 정의

export interface NestedMenuItem {
  name: string
  href?: string
  icon?: any
  children?: NestedMenuItem[]
}

export interface Category {
  id: string
  name: string
  icon: any
  items: NestedMenuItem[]
}

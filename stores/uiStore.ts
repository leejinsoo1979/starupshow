import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeCategory: string | null
  commitModalOpen: boolean
  taskModalOpen: boolean
  selectedTaskId: string | null
  emailSidebarWidth: number
  isResizingEmail: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveCategory: (category: string | null) => void
  openCommitModal: () => void
  closeCommitModal: () => void
  openTaskModal: (taskId?: string) => void
  closeTaskModal: () => void
  setEmailSidebarWidth: (width: number) => void
  setIsResizingEmail: (resizing: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeCategory: null,
  commitModalOpen: false,
  taskModalOpen: false,
  selectedTaskId: null,
  emailSidebarWidth: 400,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  openCommitModal: () => set({ commitModalOpen: true }),
  closeCommitModal: () => set({ commitModalOpen: false }),
  openTaskModal: (taskId) => set({ taskModalOpen: true, selectedTaskId: taskId || null }),
  closeTaskModal: () => set({ taskModalOpen: false, selectedTaskId: null }),
  setEmailSidebarWidth: (width) => set({ emailSidebarWidth: width }),
  isResizingEmail: false,
  setIsResizingEmail: (resizing) => set({ isResizingEmail: resizing }),
}))

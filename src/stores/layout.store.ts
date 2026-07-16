import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LayoutState {
  isSidebarCollapsed: boolean
  toggleSidebarCollapsed: () => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: 'layout-storage',
    }
  )
)

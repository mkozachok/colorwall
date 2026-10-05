import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type AppMode = 'VIEW' | 'CREATE_ROUTE' | 'ADMIN_MAPPING'
export type HoldRole = 'START' | 'HAND' | 'FOOT' | 'TOP'
export type ProgressStatus = 'SENT' | 'PROJECTING'

export interface Hold {
  id: string
  x: number
  y: number
  radius: number
}

export interface RouteHold {
  holdId: string
  role: HoldRole
}

export interface ClimbingRoute {
  id: string
  name: string
  grade: string
  rating: number
  holds: RouteHold[]
}

export interface RouteProgress {
  routeId: string
  status: ProgressStatus
  date: string
}

interface AppState {
  holds: Hold[]
  routes: ClimbingRoute[]
  progress: RouteProgress[]
  wallImage: string | null
  appMode: AppMode
  addHold: (hold: Omit<Hold, 'id'> & { id?: string }) => string
  updateHold: (id: string, updates: Partial<Omit<Hold, 'id'>>) => void
  removeHold: (id: string) => void
  saveRoute: (route: Omit<ClimbingRoute, 'id'> & { id?: string }) => string
  removeRoute: (id: string) => void
  updateProgress: (routeId: string, status: ProgressStatus) => void
  clearProgress: (routeId: string) => void
  setWallImage: (image: string | null) => void
  replaceWallImage: (image: string) => void
  clearWallMapping: () => void
  setAppMode: (mode: AppMode) => void
}

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      holds: [],
      routes: [],
      progress: [],
      wallImage: '/IMG_0525.jpg',
      appMode: 'VIEW',

      addHold: (hold) => {
        const id = hold.id ?? makeId()
        set((state) => ({ holds: [...state.holds, { ...hold, id }] }))
        return id
      },
      updateHold: (id, updates) => set((state) => ({
        holds: state.holds.map((hold) => hold.id === id ? { ...hold, ...updates } : hold),
      })),
      removeHold: (id) => set((state) => ({
        holds: state.holds.filter((hold) => hold.id !== id),
        routes: state.routes.map((route) => ({ ...route, holds: route.holds.filter((item) => item.holdId !== id) })),
      })),
      saveRoute: (route) => {
        const id = route.id ?? makeId()
        set((state) => ({ routes: [...state.routes.filter((item) => item.id !== id), { ...route, id }] }))
        return id
      },
      removeRoute: (id) => set((state) => ({
        routes: state.routes.filter((route) => route.id !== id),
        progress: state.progress.filter((item) => item.routeId !== id),
      })),
      updateProgress: (routeId, status) => set((state) => ({
        progress: [...state.progress.filter((item) => item.routeId !== routeId), { routeId, status, date: new Date().toISOString() }],
      })),
      clearProgress: (routeId) => set((state) => ({ progress: state.progress.filter((item) => item.routeId !== routeId) })),
      setWallImage: (wallImage) => set({ wallImage }),
      replaceWallImage: (wallImage) => set({ wallImage, holds: [], routes: [], progress: [] }),
      clearWallMapping: () => set({ holds: [], routes: [], progress: [] }),
      setAppMode: (appMode) => set({ appMode }),
    }),
    {
      name: 'colorwall-storage-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ holds: state.holds, routes: state.routes, progress: state.progress, wallImage: state.wallImage }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<AppState>),
        appMode: 'VIEW',
      }),
    },
  ),
)

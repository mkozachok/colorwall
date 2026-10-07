import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type AppMode = 'VIEW' | 'CREATE_ROUTE' | 'ADMIN_MAPPING'
export type HoldRole = 'START' | 'HAND' | 'FOOT' | 'TOP'
export type ProgressStatus = 'SENT' | 'PROJECTING'

export interface Wall {
  id: string
  name: string
  image: string
}

export interface Hold {
  id: string
  wallId: string
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
  wallId: string
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
  walls: Wall[]
  activeWallId: string
  holds: Hold[]
  routes: ClimbingRoute[]
  progress: RouteProgress[]
  appMode: AppMode
  addWall: (wall: Omit<Wall, 'id'> & { id?: string }) => string
  setActiveWall: (wallId: string) => void
  renameWall: (wallId: string, name: string) => void
  addHold: (hold: Omit<Hold, 'id'> & { id?: string }) => string
  updateHold: (id: string, updates: Partial<Omit<Hold, 'id'>>) => void
  removeHold: (id: string) => void
  saveRoute: (route: Omit<ClimbingRoute, 'id'> & { id?: string }) => string
  removeRoute: (id: string) => void
  updateProgress: (routeId: string, status: ProgressStatus) => void
  clearProgress: (routeId: string) => void
  replaceWallImage: (wallId: string, image: string) => void
  clearWallMapping: (wallId: string) => void
  setAppMode: (mode: AppMode) => void
}

export const DEFAULT_WALL_ID = 'wall-default'
const DEFAULT_WALL: Wall = { id: DEFAULT_WALL_ID, name: 'Основна стіна', image: '/IMG_0525.jpg' }
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      walls: [DEFAULT_WALL],
      activeWallId: DEFAULT_WALL.id,
      holds: [],
      routes: [],
      progress: [],
      appMode: 'VIEW',

      addWall: (wall) => {
        const id = wall.id ?? makeId()
        set((state) => ({ walls: [...state.walls, { ...wall, id }], activeWallId: id }))
        return id
      },
      setActiveWall: (activeWallId) => set((state) => state.walls.some((wall) => wall.id === activeWallId) ? { activeWallId } : state),
      renameWall: (wallId, name) => set((state) => ({ walls: state.walls.map((wall) => wall.id === wallId ? { ...wall, name } : wall) })),
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
      replaceWallImage: (wallId, image) => set((state) => {
        const removedRouteIds = new Set(state.routes.filter((route) => route.wallId === wallId).map((route) => route.id))
        return {
          walls: state.walls.map((wall) => wall.id === wallId ? { ...wall, image } : wall),
          holds: state.holds.filter((hold) => hold.wallId !== wallId),
          routes: state.routes.filter((route) => route.wallId !== wallId),
          progress: state.progress.filter((item) => !removedRouteIds.has(item.routeId)),
        }
      }),
      clearWallMapping: (wallId) => set((state) => {
        const removedRouteIds = new Set(state.routes.filter((route) => route.wallId === wallId).map((route) => route.id))
        return {
          holds: state.holds.filter((hold) => hold.wallId !== wallId),
          routes: state.routes.filter((route) => route.wallId !== wallId),
          progress: state.progress.filter((item) => !removedRouteIds.has(item.routeId)),
        }
      }),
      setAppMode: (appMode) => set({ appMode }),
    }),
    {
      name: 'colorwall-storage-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ walls: state.walls, activeWallId: state.activeWallId, holds: state.holds, routes: state.routes, progress: state.progress }),
      merge: (persistedState, currentState) => {
        const legacy = persistedState as (Partial<AppState> & {
          wallImage?: string | null
          holds?: Array<Omit<Hold, 'wallId'> & Partial<Pick<Hold, 'wallId'>>>
          routes?: Array<Omit<ClimbingRoute, 'wallId'> & Partial<Pick<ClimbingRoute, 'wallId'>>>
        }) | undefined
        const walls = legacy?.walls?.length ? legacy.walls : [{ ...DEFAULT_WALL, image: legacy?.wallImage || DEFAULT_WALL.image }]
        const fallbackWallId = walls[0].id
        const activeWallId = walls.some((wall) => wall.id === legacy?.activeWallId) ? legacy!.activeWallId! : fallbackWallId
        return {
          ...currentState,
          walls,
          activeWallId,
          holds: (legacy?.holds ?? currentState.holds).map((hold) => ({ ...hold, wallId: hold.wallId ?? fallbackWallId })),
          routes: (legacy?.routes ?? currentState.routes).map((route) => ({ ...route, wallId: route.wallId ?? fallbackWallId })),
          progress: legacy?.progress ?? currentState.progress,
          appMode: 'VIEW',
        }
      },
    },
  ),
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DevoteeUser } from '../types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  deviceId: string
  user: DevoteeUser | null
  isLoggedIn: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: DevoteeUser) => void
  logout: () => void
}

function genDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      deviceId: genDeviceId(),
      user: null,
      isLoggedIn: false,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh, isLoggedIn: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false }),
    }),
    {
      name: 'jainerp-devotee-auth',
      partialize: state => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        deviceId: state.deviceId,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
)

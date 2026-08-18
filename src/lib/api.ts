import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      // A deleted or disabled account can never be refreshed back into life,
      // so don't try — clear the session and let the app route to sign-in.
      // Without this the user sat through a doomed refresh round-trip before
      // being logged out anyway.
      if (err.response?.data?.error?.code === 'ACCOUNT_DELETED') {
        useAuthStore.getState().logout()
        return Promise.reject(err)
      }
      try {
        const { refreshToken, deviceId, setTokens, logout } = useAuthStore.getState()
        if (!refreshToken) { logout(); return Promise.reject(err) }
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
          device_id: deviceId,
        })
        const newToken = data.data?.access_token
        if (newToken) {
          setTokens(newToken, refreshToken)
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        }
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(err)
  }
)

export function fmtPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parsePaise(rupees: string | number): number {
  return Math.round(Number(rupees) * 100)
}

export function currentFY(): string {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${String(year + 1).slice(-2)}`
}

export function apiError(e: unknown): string {
  const err = e as { response?: { data?: { error?: { message?: string } } } }
  return err.response?.data?.error?.message || 'Something went wrong'
}

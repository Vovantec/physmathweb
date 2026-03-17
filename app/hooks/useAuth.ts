// app/hooks/useAuth.ts
// Путь: app/hooks/useAuth.ts
//
// Использование:
//   const { user, loading } = useAuth()
//
// При каждой загрузке страницы:
//  1. Вызывает /api/auth/me — проверяет куку на сервере
//  2. Если кука невалидна — очищает localStorage и разлогинивает
//  3. Если валидна — синхронизирует данные в localStorage

'use client'
import { useState, useEffect, useCallback } from 'react'

export interface AuthUser {
  id:      string   // telegramId
  dbId:    string   // User.id
  name:    string | null
  photo:   string | null
  isAdmin: boolean
}

interface UseAuthResult {
  user:    AuthUser | null
  loading: boolean
  logout:  () => void
  setUser: (u: AuthUser) => void
}

export function useAuth(): UseAuthResult {
  const [user, setUserState]   = useState<AuthUser | null>(null)
  const [loading, setLoading]  = useState(true)

  const clearAuth = useCallback(() => {
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_photo')
    localStorage.removeItem('user_is_admin')
    localStorage.removeItem('user')
    setUserState(null)
  }, [])

  const persistUser = useCallback((u: AuthUser) => {
    localStorage.setItem('user_id',       u.id)
    localStorage.setItem('user_name',     u.name    ?? '')
    localStorage.setItem('user_photo',    u.photo   ?? '')
    localStorage.setItem('user_is_admin', u.isAdmin ? 'true' : 'false')
    setUserState(u)
  }, [])

  useEffect(() => {
    let cancelled = false

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })

        if (cancelled) return

        if (res.status === 401) {
          // Session invalid — wipe localStorage so UI shows login screen
          clearAuth()
          setLoading(false)
          return
        }

        const data = await res.json()

        if (cancelled) return

        if (data.authenticated && data.user) {
          persistUser(data.user)
        } else {
          clearAuth()
        }
      } catch {
        // Network error — fall back to localStorage to avoid flickering
        // but don't trust it for more than one session
        const storedId = localStorage.getItem('user_id')
        if (storedId) {
          setUserState({
            id:      storedId,
            dbId:    storedId,
            name:    localStorage.getItem('user_name')    || null,
            photo:   localStorage.getItem('user_photo')   || null,
            isAdmin: localStorage.getItem('user_is_admin') === 'true',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    verify()
    return () => { cancelled = true }
  }, [clearAuth, persistUser])

  const logout = useCallback(async () => {
    // Clear cookie server-side
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    clearAuth()
  }, [clearAuth])

  const setUser = useCallback((u: AuthUser) => {
    persistUser(u)
  }, [persistUser])

  return { user, loading, logout, setUser }
}
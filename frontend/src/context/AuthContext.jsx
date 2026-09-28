import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem('ct_user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  const login = useCallback(async (username, password) => {
    const form = new URLSearchParams({ username, password })
    const { data } = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    const userData = {
      token:     data.access_token,
      role:      data.role,
      full_name: data.full_name,
    }
    localStorage.setItem('ct_user', JSON.stringify(userData))
    localStorage.setItem('ct_token', data.access_token)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ct_user')
    localStorage.removeItem('ct_token')
    setUser(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)

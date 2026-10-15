import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.get()))

  // Restore the session from a saved token on page load.
  useEffect(() => {
    if (!tokenStore.get()) return
    api
      .get('/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const startSession = useCallback(({ token, user }) => {
    tokenStore.set(token)
    setUser(user)
    return user
  }, [])

  const login = useCallback(
    async (username, password) => startSession((await api.post('/login', { username, password })).data),
    [startSession],
  )

  const loginWithGoogle = useCallback(
    async (credential) => startSession((await api.post('/auth/google', { credential })).data),
    [startSession],
  )

  const register = useCallback(async (form) => startSession((await api.post('/register', form)).data), [startSession])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } finally {
      tokenStore.clear()
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

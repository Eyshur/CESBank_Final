import axios from 'axios'

const TOKEN_KEY = 'cesbank_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 20000,
  headers: { Accept: 'application/json' },
})

// Send the Sanctum bearer token with every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// An expired or revoked token sends the user back to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear()
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

/**
 * The most useful message from a failed request: the first validation error,
 * then the server's message, then a generic fallback.
 */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (data?.errors) return Object.values(data.errors)[0][0]
  if (data?.message) return data.message
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the Laravel API running?'
  return fallback
}

export default api

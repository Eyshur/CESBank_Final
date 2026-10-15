import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './ui'

/** Only signed-in users (optionally of certain roles) get past this route. */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()

  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

/** Login / register pages: a signed-in user goes straight to the dashboard. */
export function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) return <Loading />
  if (user) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

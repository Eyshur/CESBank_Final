import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Transactions from './pages/Transactions'
import Loans from './pages/Loans'
import Reports from './pages/Reports'
import ActivityLog from './pages/ActivityLog'
import Profile from './pages/Profile'
import { ROLES } from './utils/format'

const STAFF = [ROLES.ADMIN, ROLES.EMPLOYEE]

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/loans" element={<Loans />} />
                <Route path="/profile" element={<Profile />} />

                <Route element={<ProtectedRoute roles={STAFF} />}>
                  <Route path="/users" element={<Users />} />
                  <Route path="/users/:id" element={<UserDetail />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>

                <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
                  <Route path="/activity" element={<ActivityLog />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import AuthLayout from '../components/AuthLayout'
import GoogleLoginButton from '../components/GoogleLoginButton'
import { ErrorBanner, Field, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      await action()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    run(() => login(form.username, form.password))
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Sign in to continue to CESBank.">
      <ErrorBanner>{error}</ErrorBanner>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username or email">
          <input className="input" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner />} Sign in
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleLoginButton onCredential={(credential) => run(() => loginWithGoogle(credential))} onError={setError} />

      <p className="mt-6 text-center text-sm text-muted">
        New to CESBank?{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

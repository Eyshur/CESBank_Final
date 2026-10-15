import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import AuthLayout from '../components/AuthLayout'
import GoogleLoginButton from '../components/GoogleLoginButton'
import { ErrorBanner, Field, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const EMPTY = { first_name: '', last_name: '', username: '', email: '', contact_no: '', password: '', password_confirmation: '' }

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

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
    if (form.password !== form.password_confirmation) return setError('Passwords do not match.')
    run(() => register(form))
  }

  return (
    <AuthLayout title="Create your account" subtitle="Open a customer profile. A teller will set up your bank accounts.">
      <ErrorBanner>{error}</ErrorBanner>
      <GoogleLoginButton text="signup_with" onCredential={(credential) => run(() => loginWithGoogle(credential))} onError={setError} />

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or sign up with a username <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="First name"><input className="input" value={form.first_name} onChange={set('first_name')} required /></Field>
        <Field label="Last name"><input className="input" value={form.last_name} onChange={set('last_name')} required /></Field>
        <Field label="Username" className="col-span-2"><input className="input" value={form.username} onChange={set('username')} required minLength={4} /></Field>
        <Field label="Email" className="col-span-2"><input className="input" type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Contact no." className="col-span-2"><input className="input" value={form.contact_no} onChange={set('contact_no')} /></Field>
        <Field label="Password"><input className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} /></Field>
        <Field label="Confirm"><input className="input" type="password" value={form.password_confirmation} onChange={set('password_confirmation')} required /></Field>
        <button className="btn-primary col-span-2 mt-2" disabled={busy}>
          {busy && <Spinner />} Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

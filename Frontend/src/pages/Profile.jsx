import { useState } from 'react'
import api, { errorMessage } from '../api/client'
import { Badge, ErrorBanner, Field, PageHeader, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Profile() {
  const { user, setUser } = useAuth()
  const notify = useToast()
  const c = user.customer

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your sign-in details and personal information." />
      <div className="grid gap-4 lg:grid-cols-5">
        <ProfileForm user={user} customer={c} onSaved={(data) => { setUser(data.user); notify(data.message) }} />
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <div className="section-title">Account</div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Username</dt><dd className="font-medium">{user.username}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Role</dt><dd><Badge>{user.role}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Google account</dt><dd>{user.has_google ? 'Linked' : 'Not linked'}</dd></div>
            </dl>
          </div>
          <PasswordForm hasPassword={user.has_password} onSaved={(message) => notify(message)} />
        </div>
      </div>
    </>
  )
}

function ProfileForm({ user, customer, onSaved }) {
  const [form, setForm] = useState({
    email: user.email ?? '',
    first_name: customer?.first_name ?? '', last_name: customer?.last_name ?? '',
    birthdate: customer?.birthdate ?? '', gender: customer?.gender ?? '',
    contact_no: customer?.contact_no ?? '', address: customer?.address ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.put('/me/profile', form)
      onSaved(data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5 lg:col-span-3">
      <div className="section-title">Personal information</div>
      <ErrorBanner>{error}</ErrorBanner>
      <Field label="Email"><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
      {customer && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name"><input className="input" value={form.first_name} onChange={set('first_name')} required /></Field>
          <Field label="Last name"><input className="input" value={form.last_name} onChange={set('last_name')} required /></Field>
          <Field label="Birthdate"><input className="input" type="date" value={form.birthdate} onChange={set('birthdate')} /></Field>
          <Field label="Gender">
            <select className="input" value={form.gender} onChange={set('gender')}>
              <option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Contact no."><input className="input" value={form.contact_no} onChange={set('contact_no')} /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={set('address')} /></Field>
        </div>
      )}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Save profile</button>
      </div>
    </form>
  )
}

function PasswordForm({ hasPassword, onSaved }) {
  const empty = { current_password: '', password: '', password_confirmation: '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.put('/me/password', form)
      setForm(empty)
      onSaved(data.message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="section-title">{hasPassword ? 'Change password' : 'Set a password'}</div>
      {!hasPassword && <p className="text-xs text-muted">You signed up with Google. Set a password to also sign in with your username.</p>}
      <ErrorBanner>{error}</ErrorBanner>
      {hasPassword && <Field label="Current password"><input className="input" type="password" value={form.current_password} onChange={set('current_password')} required /></Field>}
      <Field label="New password"><input className="input" type="password" value={form.password} onChange={set('password')} minLength={8} required /></Field>
      <Field label="Confirm new password"><input className="input" type="password" value={form.password_confirmation} onChange={set('password_confirmation')} required /></Field>
      <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Update password</button>
    </form>
  )
}

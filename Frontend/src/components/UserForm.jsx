import { useState } from 'react'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utils/format'
import { ErrorBanner, Field, Spinner } from './ui'

const blank = (isAdmin) => ({
  username: '', email: '', password: '',
  role: isAdmin ? '' : ROLES.CUSTOMER, status: 'Active',
  first_name: '', last_name: '', birthdate: '', gender: '', contact_no: '', address: '',
})

const fromUser = (user) => ({
  username: user.username, email: user.email ?? '', password: '', role: user.role, status: user.status,
  first_name: user.customer?.first_name ?? '', last_name: user.customer?.last_name ?? '',
  birthdate: user.customer?.birthdate ?? '', gender: user.customer?.gender ?? '',
  contact_no: user.customer?.contact_no ?? '', address: user.customer?.address ?? '',
})

/**
 * Create or edit a user. Administrators choose the role; Employees can only register Customers
 * (the API enforces that too).
 */
export default function UserForm({ user, onSaved, onCancel }) {
  const { user: actor } = useAuth()
  const isAdmin = actor.role === ROLES.ADMIN
  const [form, setForm] = useState(user ? fromUser(user) : blank(isAdmin))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const isCustomer = form.role === ROLES.CUSTOMER

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setError('')
    try {
      const { data } = user ? await api.put(`/users/${user.id}`, form) : await api.post('/users', form)
      onSaved(data)
    } catch (err) {
      setErrors(Object.fromEntries(Object.entries(err.response?.data?.errors ?? {}).map(([k, v]) => [k, v[0]])))
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <ErrorBanner>{error}</ErrorBanner>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Username" error={errors.username}><input className="input" value={form.username} onChange={set('username')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label={user ? 'New password (leave blank to keep)' : 'Password'} error={errors.password} className="sm:col-span-2">
          <input className="input" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <Field label="Role" error={errors.role}>
          {isAdmin ? (
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="" hidden>Select role…</option>
              <option>{ROLES.ADMIN}</option>
              <option>{ROLES.EMPLOYEE}</option>
              <option>{ROLES.CUSTOMER}</option>
            </select>
          ) : (
            <input className="input" value={ROLES.CUSTOMER} disabled />
          )}
        </Field>
        <Field label="Status" error={errors.status}>
          <select className="input" value={form.status} onChange={set('status')} disabled={!isAdmin}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </Field>
      </div>

      {isCustomer && (
        <>
          <hr className="my-4 border-line" />
          <p className="section-title">Customer profile</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" error={errors.first_name}><input className="input" value={form.first_name} onChange={set('first_name')} /></Field>
            <Field label="Last name" error={errors.last_name}><input className="input" value={form.last_name} onChange={set('last_name')} /></Field>
            <Field label="Birthdate" error={errors.birthdate}><input className="input" type="date" value={form.birthdate} onChange={set('birthdate')} /></Field>
            <Field label="Gender" error={errors.gender}>
              <select className="input" value={form.gender} onChange={set('gender')}>
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Contact no." error={errors.contact_no}><input className="input" value={form.contact_no} onChange={set('contact_no')} /></Field>
            <Field label="Address" error={errors.address}><input className="input" value={form.address} onChange={set('address')} /></Field>
          </div>
        </>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner />} {user ? 'Save changes' : 'Create user'}</button>
      </div>
    </form>
  )
}

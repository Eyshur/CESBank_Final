import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import UserForm from '../components/UserForm'
import { Badge, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { date, fullName, money, ROLES } from '../utils/format'

export default function UserDetail() {
  const { id } = useParams()
  const notify = useToast()
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [opening, setOpening] = useState(false)

  const load = useCallback(() => {
    api.get(`/users/${id}`).then((res) => setUser(res.data)).catch((err) => setError(errorMessage(err)))
  }, [id])

  useEffect(load, [load])

  const toggleAccount = async (account) => {
    try {
      const { data } = await api.patch(`/accounts/${account.id}/status`, { status: account.status === 'Active' ? 'Inactive' : 'Active' })
      notify(data.message)
      load()
    } catch (err) {
      notify(errorMessage(err), 'error')
    }
  }

  if (error) return <ErrorBanner>{error}</ErrorBanner>
  if (!user) return <Loading />

  const customer = user.customer

  return (
    <>
      <Link to="/users" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to users</Link>
      <PageHeader
        title={customer ? fullName(customer) : user.username}
        subtitle={`@${user.username} · joined ${date(user.created_at)}`}
        actions={<button className="btn-outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <div className="section-title">Profile</div>
          <dl className="space-y-2 text-sm">
            <Row label="Role"><Badge>{user.role}</Badge></Row>
            <Row label="Status"><Badge>{user.status}</Badge></Row>
            <Row label="Email">{user.email || '—'}</Row>
            {customer && (
              <>
                <Row label="Birthdate">{date(customer.birthdate)}</Row>
                <Row label="Gender">{customer.gender || '—'}</Row>
                <Row label="Contact">{customer.contact_no || '—'}</Row>
                <Row label="Address">{customer.address || '—'}</Row>
              </>
            )}
          </dl>
        </div>

        {user.role === ROLES.CUSTOMER && customer && (
          <div className="card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="section-title mb-0">Bank accounts</div>
              <button className="btn-primary px-3 py-1.5" onClick={() => setOpening(true)}><Plus className="size-4" /> Open account</button>
            </div>
            {customer.accounts.length === 0 ? (
              <EmptyState>No bank accounts yet.</EmptyState>
            ) : (
              <table className="table">
                <thead><tr><th>Number</th><th>Type</th><th className="text-right">Balance</th><th>Status</th><th>Opened</th></tr></thead>
                <tbody>
                  {customer.accounts.map((a) => (
                    <tr key={a.id}>
                      <td className="figure">{a.account_number}</td>
                      <td>{a.account_type}</td>
                      <td className="figure text-right">{money(a.balance)}</td>
                      <td><button onClick={() => toggleAccount(a)} title="Click to toggle"><Badge>{a.status}</Badge></button></td>
                      <td className="text-muted">{date(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="section-title mt-6">Loan applications</div>
            {customer.loans.length === 0 ? (
              <EmptyState>No loan applications.</EmptyState>
            ) : (
              <table className="table">
                <thead><tr><th>#</th><th className="text-right">Amount</th><th>Term</th><th>Status</th><th>Applied</th></tr></thead>
                <tbody>
                  {customer.loans.map((l) => (
                    <tr key={l.id}>
                      <td className="figure">{l.id}</td>
                      <td className="figure text-right">{money(l.loan_amount)}</td>
                      <td>{l.loan_term} mo</td>
                      <td><Badge>{l.status}</Badge></td>
                      <td className="text-muted">{date(l.application_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <Modal open={editing} title={`Edit ${user.username}`} onClose={() => setEditing(false)} width="max-w-2xl">
        {editing && (
          <UserForm
            user={user}
            onSaved={(data) => { notify(data.message); setEditing(false); load() }}
            onCancel={() => setEditing(false)}
          />
        )}
      </Modal>

      <Modal open={opening} title="Open a bank account" onClose={() => setOpening(false)} width="max-w-md">
        {opening && customer && (
          <OpenAccountForm customerId={customer.id} onDone={(message) => { notify(message); setOpening(false); load() }} onCancel={() => setOpening(false)} />
        )}
      </Modal>
    </>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function OpenAccountForm({ customerId, onDone, onCancel }) {
  const [form, setForm] = useState({ account_type: 'Savings', opening_balance: '0' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post(`/customers/${customerId}/accounts`, form)
      onDone(data.message)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorBanner>{error}</ErrorBanner>
      <Field label="Account type">
        <select className="input" value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
          <option>Savings</option>
          <option>Current</option>
        </select>
      </Field>
      <Field label="Opening balance (₱)">
        <input className="input" type="number" min="0" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Open account</button>
      </div>
    </form>
  )
}

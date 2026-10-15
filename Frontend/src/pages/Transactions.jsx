import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import { Badge, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Pagination, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import usePaginated from '../hooks/usePaginated'
import { dateTime, fullName, isStaff, money } from '../utils/format'

export default function Transactions() {
  const { user } = useAuth()
  const notify = useToast()
  const staff = isStaff(user)
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState({ search: '', type: '', from: '', to: '' })
  const { rows, meta, loading, error, setPage, reload } = usePaginated('/transactions', filters)
  const [viewing, setViewing] = useState(null)
  const creating = params.get('new') === '1'

  const closeCreate = () => setParams({})

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={staff ? 'Every deposit, withdrawal and transfer.' : 'Your account history.'}
        actions={<button className="btn-primary" onClick={() => setParams({ new: '1' })}><Plus className="size-4" /> {staff ? 'New Transaction' : 'Send money'}</button>}
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          {staff && (
            <div className="relative min-w-52 flex-1">
              <Search className="absolute top-2.5 left-3 size-4 text-muted" />
              <input className="input pl-9" placeholder="Account number or customer name…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </div>
          )}
          <select className="input w-auto" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            <option>Deposit</option>
            <option>Withdraw</option>
            <option>Transfer</option>
          </select>
          <input type="date" className="input w-auto" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} aria-label="From date" />
          <input type="date" className="input w-auto" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} aria-label="To date" />
        </div>

        <ErrorBanner>{error}</ErrorBanner>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState>No transactions found.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Ref #</th><th>Date</th><th>Account</th>{staff && <th>Customer</th>}<th>Type</th><th className="text-right">Amount</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => setViewing(t.id)} className="cursor-pointer hover:bg-bg">
                    <td className="figure text-muted">{String(t.id).padStart(6, '0')}</td>
                    <td className="text-muted">{dateTime(t.transaction_date)}</td>
                    <td className="figure">{t.account?.account_number}</td>
                    {staff && <td>{fullName(t.account?.customer)}</td>}
                    <td><Badge>{t.transaction_type}</Badge></td>
                    <td className="figure text-right">{money(t.amount)}</td>
                    <td className="max-w-56 truncate text-muted">
                      {t.receiver && <span className="figure">↔ {t.receiver.account_number} </span>}
                      {t.remarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <Modal open={creating} title={staff ? 'New transaction' : 'Send money'} onClose={closeCreate}>
        {creating && (
          <TransactionForm
            staff={staff}
            onDone={(message) => { notify(message); closeCreate(); reload() }}
            onCancel={closeCreate}
          />
        )}
      </Modal>

      <Modal open={Boolean(viewing)} title="Transaction receipt" onClose={() => setViewing(null)} width="max-w-md">
        {viewing && <Receipt id={viewing} />}
      </Modal>
    </>
  )
}

function TransactionForm({ staff, onDone, onCancel }) {
  const [accounts, setAccounts] = useState(null)
  const [form, setForm] = useState({ account_id: '', transaction_type: staff ? 'Deposit' : 'Transfer', amount: '', receiver_account_number: '', remarks: '' })
  const [recipient, setRecipient] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/accounts').then((res) => setAccounts(res.data)).catch((err) => setError(errorMessage(err)))
  }, [])

  // Show who owns the destination account once a full 10-digit number is typed.
  useEffect(() => {
    if (!/^\d{10}$/.test(form.receiver_account_number)) return
    api
      .get(`/accounts/lookup/${form.receiver_account_number}`)
      .then((res) => setRecipient(res.data))
      .catch(() => setRecipient({ notFound: true }))
  }, [form.receiver_account_number])

  const set = (key) => (e) => {
    if (key === 'receiver_account_number') setRecipient(null)
    setForm({ ...form, [key]: e.target.value })
  }
  const source = accounts?.find((a) => String(a.id) === String(form.account_id))
  const isTransfer = form.transaction_type === 'Transfer'

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/transactions', form)
      onDone(data.message)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (!accounts) return error ? <ErrorBanner>{error}</ErrorBanner> : <Loading />
  if (accounts.length === 0) return <EmptyState>There are no active accounts to transact on.</EmptyState>

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorBanner>{error}</ErrorBanner>
      {staff && (
        <div className="grid grid-cols-3 gap-2">
          {['Deposit', 'Withdraw', 'Transfer'].map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => setForm({ ...form, transaction_type: type })}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${form.transaction_type === type ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:bg-bg'}`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      <Field label={isTransfer ? 'From account' : 'Account'}>
        <select className="input" value={form.account_id} onChange={set('account_id')} required>
          <option value="">Select account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_number} · {a.account_type}{staff ? ` · ${fullName(a.customer)}` : ''}
            </option>
          ))}
        </select>
        {source && <span className="mt-1 block text-xs text-muted">Available balance: <span className="figure">{money(source.balance)}</span></span>}
      </Field>

      {isTransfer && (
        <Field label="To account number">
          <input className="input figure" inputMode="numeric" maxLength={10} placeholder="10-digit account number" value={form.receiver_account_number} onChange={set('receiver_account_number')} required />
          {recipient && (
            <span className={`mt-1 block text-xs ${recipient.notFound ? 'text-danger' : 'text-success'}`}>
              {recipient.notFound ? 'No active account with that number.' : `${recipient.holder} · ${recipient.account_type}`}
            </span>
          )}
        </Field>
      )}

      <Field label="Amount (₱)">
        <input className="input figure" type="number" min="1" step="0.01" value={form.amount} onChange={set('amount')} required />
      </Field>
      <Field label="Remarks (optional)">
        <input className="input" maxLength={255} value={form.remarks} onChange={set('remarks')} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy || recipient?.notFound}>{busy && <Spinner />} Submit {form.transaction_type}</button>
      </div>
    </form>
  )
}

function Receipt({ id }) {
  const [t, setT] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/transactions/${id}`).then((res) => setT(res.data)).catch((err) => setError(errorMessage(err)))
  }, [id])

  if (error) return <ErrorBanner>{error}</ErrorBanner>
  if (!t) return <Loading />

  const rows = [
    ['Reference #', <span key="ref" className="figure">{String(t.id).padStart(6, '0')}</span>],
    ['Date', dateTime(t.transaction_date)],
    ['Type', <Badge key="type">{t.transaction_type}</Badge>],
    ['Account', <span key="acc" className="figure">{t.account.account_number}</span>],
    ['Account holder', fullName(t.account.customer)],
    t.receiver && ['Counterparty account', <span key="rcv" className="figure">{t.receiver.account_number}</span>],
    ['Remarks', t.remarks || '—'],
    t.processor && ['Processed by', t.processor.username],
  ].filter(Boolean)

  return (
    <div>
      <div className="mb-4 rounded-lg bg-bg py-5 text-center">
        <div className="text-sm text-muted">Amount</div>
        <div className="figure text-3xl font-semibold">{money(t.amount)}</div>
      </div>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <button className="btn-outline no-print mt-5 w-full" onClick={() => window.print()}>Print receipt</button>
    </div>
  )
}

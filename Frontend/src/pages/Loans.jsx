import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Plus, X } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import { Badge, ConfirmModal, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Pagination, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import usePaginated from '../hooks/usePaginated'
import { date, fullName, isStaff, money } from '../utils/format'

const STANDARD_RATE = 5

export default function Loans() {
  const { user } = useAuth()
  const notify = useToast()
  const staff = isStaff(user)
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const { rows, meta, loading, error, setPage, reload } = usePaginated('/loans', { status })
  const [deciding, setDeciding] = useState(null) // { loan, status }
  const [busy, setBusy] = useState(false)
  const creating = params.get('new') === '1'

  const decide = async () => {
    setBusy(true)
    try {
      const { data } = await api.patch(`/loans/${deciding.loan.id}/status`, { status: deciding.status })
      notify(data.message)
      reload()
    } catch (err) {
      notify(errorMessage(err), 'error')
    } finally {
      setBusy(false)
      setDeciding(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Loans"
        subtitle={staff ? 'Review and decide on loan applications.' : 'Your loan applications.'}
        actions={<button className="btn-primary" onClick={() => setParams({ new: '1' })}><Plus className="size-4" /> {staff ? 'New Application' : 'Apply for a Loan'}</button>}
      />

      <div className="card">
        <div className="flex gap-1 border-b border-line p-3">
          {['', 'Pending', 'Accepted', 'Declined'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === s ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-bg'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        <ErrorBanner>{error}</ErrorBanner>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState>No loan applications here.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>{staff && <th>Customer</th>}<th className="text-right">Amount</th><th>Rate</th><th>Term</th>
                  <th className="text-right">Monthly</th><th>Applied</th><th>Status</th>{staff && <th className="text-right">Decision</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((loan) => (
                  <tr key={loan.id}>
                    <td className="figure text-muted">{loan.id}</td>
                    {staff && <td>{fullName(loan.customer)}</td>}
                    <td className="figure text-right">{money(loan.loan_amount)}</td>
                    <td className="figure">{Number(loan.interest_rate).toFixed(2)}%</td>
                    <td>{loan.loan_term} mo</td>
                    <td className="figure text-right">{money(loan.monthly_payment)}</td>
                    <td className="text-muted">{date(loan.application_date)}</td>
                    <td><Badge>{loan.status}</Badge></td>
                    {staff && (
                      <td>
                        {loan.status === 'Pending' ? (
                          <div className="flex justify-end gap-1">
                            <button className="btn-success px-2 py-1" onClick={() => setDeciding({ loan, status: 'Accepted' })} title="Approve"><Check className="size-4" /></button>
                            <button className="btn-danger px-2 py-1" onClick={() => setDeciding({ loan, status: 'Declined' })} title="Decline"><X className="size-4" /></button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-muted">Decided</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <Modal open={creating} title={staff ? 'New loan application' : 'Apply for a loan'} onClose={() => setParams({})}>
        {creating && (
          <LoanForm
            staff={staff}
            onDone={(message) => { notify(message); setParams({}); reload() }}
            onCancel={() => setParams({})}
          />
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(deciding)}
        title={deciding?.status === 'Accepted' ? 'Approve loan' : 'Decline loan'}
        message={deciding && `${deciding.status === 'Accepted' ? 'Approve' : 'Decline'} application #${deciding.loan.id} for ${money(deciding.loan.loan_amount)} from ${fullName(deciding.loan.customer)}? This can't be changed afterwards.`}
        confirmLabel={deciding?.status === 'Accepted' ? 'Approve' : 'Decline'}
        tone={deciding?.status === 'Accepted' ? 'btn-success' : 'btn-danger'}
        busy={busy}
        onConfirm={decide}
        onClose={() => setDeciding(null)}
      />
    </>
  )
}

/** Same amortization formula as the Loan model, for the live estimate. */
function monthlyPayment(amount, ratePercent, months) {
  const p = Number(amount)
  const n = Number(months)
  const r = Number(ratePercent) / 100 / 12
  if (!p || !n) return 0
  return r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n))
}

function LoanForm({ staff, onDone, onCancel }) {
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({ customer_id: '', loan_amount: '', loan_term: '12', interest_rate: String(STANDARD_RATE) })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (staff) api.get('/loan-customers').then((res) => setCustomers(res.data)).catch((err) => setError(errorMessage(err)))
  }, [staff])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const monthly = monthlyPayment(form.loan_amount, form.interest_rate, form.loan_term)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = staff ? form : { loan_amount: form.loan_amount, loan_term: form.loan_term }
    try {
      const { data } = await api.post('/loans', payload)
      onDone(data.message)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorBanner>{error}</ErrorBanner>
      {staff && (
        <Field label="Customer">
          <select className="input" value={form.customer_id} onChange={set('customer_id')} required>
            <option value="">Select customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loan amount (₱)">
          <input className="input figure" type="number" min="1000" step="0.01" value={form.loan_amount} onChange={set('loan_amount')} required />
        </Field>
        <Field label="Term (months)">
          <input className="input figure" type="number" min="1" max="360" value={form.loan_term} onChange={set('loan_term')} required />
        </Field>
      </div>
      <Field label="Interest rate (% per year)">
        <input className="input figure" type="number" min="0" max="100" step="0.01" value={form.interest_rate} onChange={set('interest_rate')} readOnly={!staff} required />
        {!staff && <span className="mt-1 block text-xs text-muted">Standard rate — set by the bank.</span>}
      </Field>

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-bg p-3 text-sm">
        <div><div className="text-muted">Est. monthly payment</div><div className="figure text-lg font-semibold">{money(monthly)}</div></div>
        <div><div className="text-muted">Total payable</div><div className="figure text-lg font-semibold">{money(monthly * Number(form.loan_term || 0))}</div></div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Submit application</button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { FileText, Landmark, Printer, Receipt } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import { Badge, EmptyState, ErrorBanner, Field, PageHeader, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { date, dateTime, firstOfMonth, fullName, money, number, today } from '../utils/format'

/**
 * Generates a report and shows it as a printable document.
 * "Print / Save as PDF" uses the browser's print dialog; the sidebar and controls are hidden in print.
 */
export default function Reports() {
  const [txFilters, setTxFilters] = useState({ from: firstOfMonth(), to: today(), type: '' })
  const [accType, setAccType] = useState('')
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const generate = async (kind, params) => {
    setBusy(kind)
    setError('')
    try {
      const { data } = await api.get(`/reports/${kind}`, { params })
      setReport({ kind, ...data })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <div className="no-print">
        <PageHeader title="Reports" subtitle="Generate printable reports for transactions and accounts." />
        <ErrorBanner>{error}</ErrorBanner>
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); generate('transactions', txFilters) }}>
            <h2 className="flex items-center gap-2 font-semibold"><Receipt className="size-5 text-accent" /> Transactions report</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><input type="date" className="input" value={txFilters.from} onChange={(e) => setTxFilters({ ...txFilters, from: e.target.value })} required /></Field>
              <Field label="To"><input type="date" className="input" value={txFilters.to} onChange={(e) => setTxFilters({ ...txFilters, to: e.target.value })} required /></Field>
            </div>
            <Field label="Transaction type">
              <select className="input" value={txFilters.type} onChange={(e) => setTxFilters({ ...txFilters, type: e.target.value })}>
                <option value="">All transactions</option>
                <option>Deposit</option>
                <option>Withdraw</option>
                <option>Transfer</option>
              </select>
            </Field>
            <button className="btn-primary w-full" disabled={busy}>{busy === 'transactions' ? <Spinner /> : <FileText className="size-4" />} Generate</button>
          </form>

          <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); generate('accounts', { type: accType }) }}>
            <h2 className="flex items-center gap-2 font-semibold"><Landmark className="size-5 text-accent" /> Accounts report</h2>
            <Field label="Account type">
              <select className="input" value={accType} onChange={(e) => setAccType(e.target.value)}>
                <option value="">All accounts</option>
                <option>Savings</option>
                <option>Current</option>
              </select>
            </Field>
            <p className="text-sm text-muted">Lists every account with its holder, balance and status, plus totals by type.</p>
            <button className="btn-primary w-full" disabled={busy}>{busy === 'accounts' ? <Spinner /> : <FileText className="size-4" />} Generate</button>
          </form>
        </div>
      </div>

      {report && (report.kind === 'transactions' ? <TransactionsReport report={report} /> : <AccountsReport report={report} />)}
    </>
  )
}

function ReportFrame({ title, subtitle, generatedAt, children }) {
  const { user } = useAuth()
  return (
    <div className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-semibold text-accent"><Landmark className="size-5" /> CESBank</div>
          <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <div className="text-right text-xs text-muted">
          <div>Generated {dateTime(generatedAt)}</div>
          <div>by {user.username}</div>
          <button className="btn-outline no-print mt-2" onClick={() => window.print()}><Printer className="size-4" /> Print / Save as PDF</button>
        </div>
      </div>
      {children}
    </div>
  )
}

function TransactionsReport({ report }) {
  const { filters, rows, totals } = report
  return (
    <ReportFrame generatedAt={report.generated_at} title="Transactions Report" subtitle={`${date(filters.from)} – ${date(filters.to)} · ${filters.type || 'All types'}`}>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {Object.entries(totals).map(([type, t]) => (
          <div key={type} className="rounded-lg border border-line p-3">
            <div className="text-sm text-muted">{type} · {number(t.count)}</div>
            <div className="figure text-lg font-semibold">{money(t.amount)}</div>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState>No transactions in this period.</EmptyState>
      ) : (
        <table className="table">
          <thead><tr><th>Date</th><th>Account</th><th>Customer</th><th>Type</th><th className="text-right">Amount</th><th>Remarks</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{dateTime(t.transaction_date)}</td>
                <td className="figure">{t.account.account_number}</td>
                <td>{fullName(t.account.customer)}</td>
                <td><Badge>{t.transaction_type}</Badge></td>
                <td className="figure text-right">{money(t.amount)}</td>
                <td className="text-muted">{t.remarks || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportFrame>
  )
}

function AccountsReport({ report }) {
  const { filters, rows, totals } = report
  return (
    <ReportFrame generatedAt={report.generated_at} title="Accounts Report" subtitle={filters.type ? `${filters.type} accounts` : 'All accounts'}>
      <table className="table mb-6">
        <thead><tr><th>Type</th><th>Status</th><th className="text-right">Accounts</th><th className="text-right">Total balance</th></tr></thead>
        <tbody>
          {totals.map((t) => (
            <tr key={`${t.account_type}-${t.status}`}>
              <td>{t.account_type}</td>
              <td><Badge>{t.status}</Badge></td>
              <td className="figure text-right">{number(t.total_count)}</td>
              <td className="figure text-right">{money(t.total_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <EmptyState>No accounts found.</EmptyState>
      ) : (
        <table className="table">
          <thead><tr><th>Account</th><th>Type</th><th>Holder</th><th className="text-right">Balance</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="figure">{a.account_number}</td>
                <td>{a.account_type}</td>
                <td>{fullName(a.customer)}</td>
                <td className="figure text-right">{money(a.balance)}</td>
                <td><Badge>{a.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportFrame>
  )
}

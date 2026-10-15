import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, Banknote, HandCoins, Hash, Plus, Users, Wallet } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import { Badge, EmptyState, ErrorBanner, Loading, PageHeader, StatCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { dateTime, money, number, ROLES } from '../utils/format'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data)).catch((err) => setError(errorMessage(err)))
  }, [])

  if (error) return <ErrorBanner>{error}</ErrorBanner>
  if (!data) return <Loading />

  if (user.role === ROLES.ADMIN) return <AdminDashboard data={data} />
  if (user.role === ROLES.EMPLOYEE) return <TellerDashboard data={data} />
  return <CustomerDashboard data={data} />
}

function AdminDashboard({ data }) {
  const { stats } = data
  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="A snapshot of CESBank right now."
        actions={<Link to="/users" className="btn-primary"><Users className="size-4" /> Manage Users</Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Customers" value={number(stats.customers)} tone="text-accent" icon={Users} />
        <StatCard label="Active Accounts" value={number(stats.active_accounts)} icon={Hash} />
        <StatCard label="Total Deposits Held" value={money(stats.total_balance)} tone="text-success" icon={Wallet} />
        <StatCard label="Pending Loans" value={number(stats.pending_loans)} tone="text-warning" icon={HandCoins} />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <div className="section-title">Transaction volume · last 14 days</div>
          <VolumeChart rows={data.daily_volume} />
        </div>
        <div className="card p-4 lg:col-span-2">
          <div className="section-title">Recent activity</div>
          {data.recent_activity.length === 0 ? (
            <EmptyState>No activity recorded yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {data.recent_activity.map((log) => (
                <li key={log.id} className="py-2 text-sm">
                  <div>
                    <span className="font-medium">{log.user?.username}</span> <span className="text-muted">{log.action}</span>
                  </div>
                  <div className="figure text-xs text-muted">{dateTime(log.log_time)}</div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/activity" className="mt-2 inline-block text-sm text-accent hover:underline">View full log →</Link>
        </div>
      </div>
    </>
  )
}

function TellerDashboard({ data }) {
  const { stats } = data
  return (
    <>
      <PageHeader
        title="Today at the counter"
        subtitle="Deposits, withdrawals and transfers processed today."
        actions={<Link to="/transactions?new=1" className="btn-primary"><Plus className="size-4" /> New Transaction</Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Deposits Today" value={money(stats.deposits_today)} tone="text-success" icon={ArrowDownLeft} />
        <StatCard label="Withdrawals Today" value={money(stats.withdrawals_today)} tone="text-danger" icon={ArrowUpRight} />
        <StatCard label="Transactions Today" value={number(stats.transactions_today)} icon={Banknote} />
        <StatCard label="Pending Loans" value={number(stats.pending_loans)} tone="text-warning" icon={HandCoins} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="section-title">Volume · last 7 days</div>
          <VolumeChart rows={data.daily_volume} />
        </div>
        <RecentTransactions rows={data.recent_transactions} />
      </div>
    </>
  )
}

function CustomerDashboard({ data }) {
  if (!data.customer) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">Your profile isn&apos;t linked to a customer record yet</h1>
        <p className="mt-2 text-sm text-muted">Please visit a branch or contact support so we can finish setting up your account.</p>
      </div>
    )
  }

  const { stats, accounts } = data
  return (
    <>
      <PageHeader
        title={`Welcome back, ${data.customer.first_name}`}
        subtitle="Here's where things stand across your accounts."
        actions={
          <>
            <Link to="/transactions?new=1" className="btn-primary"><ArrowUpRight className="size-4" /> Send money</Link>
            <Link to="/loans?new=1" className="btn-outline"><HandCoins className="size-4" /> Apply for a loan</Link>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Balance" value={money(stats.total_balance)} tone="text-accent" icon={Wallet} />
        <StatCard label="Active Accounts" value={number(stats.active_accounts)} icon={Hash} />
        <StatCard label="Pending Loan Applications" value={number(stats.pending_loans)} tone="text-warning" icon={HandCoins} />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-2">
          <div className="section-title">My accounts</div>
          {accounts.length === 0 ? (
            <EmptyState>You don&apos;t have a bank account yet. Visit a teller to open one.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {accounts.map((acc) => (
                <li key={acc.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="figure font-medium">{acc.account_number}</div>
                    <div className="text-xs text-muted">{acc.account_type} account</div>
                  </div>
                  <div className="text-right">
                    <div className="figure font-semibold">{money(acc.balance)}</div>
                    <Badge>{acc.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:col-span-3">
          <RecentTransactions rows={data.recent_transactions} />
        </div>
      </div>
    </>
  )
}

function RecentTransactions({ rows }) {
  return (
    <div className="card p-4">
      <div className="section-title">Recent transactions</div>
      {rows.length === 0 ? (
        <EmptyState>No transactions yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Account</th><th>Type</th><th className="text-right">Amount</th><th className="text-right">When</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="figure">{t.account?.account_number}</td>
                  <td><Badge>{t.transaction_type}</Badge></td>
                  <td className="figure text-right">{money(t.amount)}</td>
                  <td className="text-right text-xs text-muted">{dateTime(t.transaction_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link to="/transactions" className="mt-3 inline-block text-sm text-accent hover:underline">All transactions →</Link>
    </div>
  )
}

function VolumeChart({ rows }) {
  const chartRows = rows.map((r) => ({ ...r, label: new Date(r.day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) }))
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartRows} margin={{ left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3E7ED" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
          <Tooltip formatter={(v) => money(v)} cursor={{ fill: '#F7F8FA' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Deposit" fill="#1C8A5D" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Withdraw" fill="#D63A3A" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Transfer" fill="#1F4FD8" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

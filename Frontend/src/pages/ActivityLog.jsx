import { useState } from 'react'
import { Search } from 'lucide-react'
import { Badge, EmptyState, ErrorBanner, Loading, PageHeader, Pagination } from '../components/ui'
import usePaginated from '../hooks/usePaginated'
import { dateTime } from '../utils/format'

export default function ActivityLog() {
  const [search, setSearch] = useState('')
  const { rows, meta, loading, error, setPage } = usePaginated('/activity-logs', { search })

  return (
    <>
      <PageHeader title="Activity Log" subtitle="Audit trail of every sign-in and change made in the system." />
      <div className="card">
        <div className="border-b border-line p-3">
          <div className="relative max-w-sm">
            <Search className="absolute top-2.5 left-3 size-4 text-muted" />
            <input className="input pl-9" placeholder="Search user or action…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <ErrorBanner>{error}</ErrorBanner>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState>No activity found.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>When</th><th>User</th><th>Role</th><th>Action</th></tr></thead>
              <tbody>
                {rows.map((log) => (
                  <tr key={log.id}>
                    <td className="figure text-xs whitespace-nowrap text-muted">{dateTime(log.log_time)}</td>
                    <td className="font-medium">{log.user?.username}</td>
                    <td>{log.user && <Badge>{log.user.role}</Badge>}</td>
                    <td>{log.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>
    </>
  )
}

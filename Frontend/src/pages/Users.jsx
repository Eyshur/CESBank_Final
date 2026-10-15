import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import api, { errorMessage } from '../api/client'
import UserForm from '../components/UserForm'
import { Badge, ConfirmModal, EmptyState, ErrorBanner, Loading, Modal, PageHeader, Pagination } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import usePaginated from '../hooks/usePaginated'
import { date, fullName, ROLES } from '../utils/format'

export default function Users() {
  const { user: actor } = useAuth()
  const notify = useToast()
  const isAdmin = actor.role === ROLES.ADMIN
  const [filters, setFilters] = useState({ search: '', role: '', status: '' })
  const { rows, meta, loading, error, setPage, reload } = usePaginated('/users', filters)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, user = edit
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const saved = (data) => {
    notify(data.message)
    setEditing(null)
    reload()
  }

  const toggleStatus = async (u) => {
    try {
      const { data } = await api.patch(`/users/${u.id}/status`, { status: u.status === 'Active' ? 'Inactive' : 'Active' })
      notify(data.message)
      reload()
    } catch (err) {
      notify(errorMessage(err), 'error')
    }
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      const { data } = await api.delete(`/users/${deleting.id}`)
      notify(data.message)
      reload()
    } catch (err) {
      notify(errorMessage(err), 'error')
    } finally {
      setBusy(false)
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Users & Customers' : 'Customers'}
        subtitle={isAdmin ? 'Manage staff logins and customer profiles.' : 'Register customers and open their accounts.'}
        actions={<button className="btn-primary" onClick={() => setEditing({})}><Plus className="size-4" /> {isAdmin ? 'Add User' : 'Add Customer'}</button>}
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute top-2.5 left-3 size-4 text-muted" />
            <input className="input pl-9" placeholder="Search name, username or email…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </div>
          {isAdmin && (
            <select className="input w-auto" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
              <option value="">All roles</option>
              <option>{ROLES.ADMIN}</option>
              <option>{ROLES.EMPLOYEE}</option>
              <option>{ROLES.CUSTOMER}</option>
            </select>
          )}
          <select className="input w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Any status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <ErrorBanner>{error}</ErrorBanner>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState>No users match these filters.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.username}</td>
                    <td>{u.customer ? fullName(u.customer) : <span className="text-muted">—</span>}</td>
                    <td className="text-muted">{u.email || '—'}</td>
                    <td><Badge>{u.role}</Badge></td>
                    <td>
                      {isAdmin && u.id !== actor.id ? (
                        <button onClick={() => toggleStatus(u)} title="Click to toggle"><Badge>{u.status}</Badge></button>
                      ) : (
                        <Badge>{u.status}</Badge>
                      )}
                    </td>
                    <td className="text-muted">{date(u.created_at)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Link to={`/users/${u.id}`} className="rounded p-1.5 text-muted hover:bg-bg hover:text-accent" title="View"><Eye className="size-4" /></Link>
                        <button onClick={() => setEditing(u)} className="rounded p-1.5 text-muted hover:bg-bg hover:text-accent" title="Edit"><Pencil className="size-4" /></button>
                        {isAdmin && u.id !== actor.id && (
                          <button onClick={() => setDeleting(u)} className="rounded p-1.5 text-muted hover:bg-bg hover:text-danger" title="Delete"><Trash2 className="size-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <Modal open={editing !== null} title={editing?.id ? `Edit ${editing.username}` : 'Add user'} onClose={() => setEditing(null)} width="max-w-2xl">
        {editing !== null && <UserForm key={editing.id ?? 'new'} user={editing.id ? editing : null} onSaved={saved} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete user"
        message={`Permanently delete ${deleting?.username}? Customers with accounts or loans can't be deleted — deactivate them instead.`}
        confirmLabel="Delete"
        tone="btn-danger"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

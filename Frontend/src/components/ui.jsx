import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, tone = 'text-ink', icon: Icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        {label}
        {Icon && <Icon className="size-4" />}
      </div>
      <div className={`figure mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  )
}

const BADGE_TONES = {
  Active: 'bg-success/10 text-success',
  Accepted: 'bg-success/10 text-success',
  Deposit: 'bg-success/10 text-success',
  Inactive: 'bg-muted/15 text-muted',
  Declined: 'bg-danger/10 text-danger',
  Withdraw: 'bg-danger/10 text-danger',
  Pending: 'bg-warning/15 text-warning',
  Transfer: 'bg-accent/10 text-accent',
  Administrator: 'bg-accent-ink/10 text-accent-ink',
  Employee: 'bg-accent/10 text-accent',
  Customer: 'bg-success/10 text-success',
}

export function Badge({ children }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[children] || 'bg-bg text-muted'}`}>
      {children}
    </span>
  )
}

export function Field({ label, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

export function Spinner({ className = '' }) {
  return <Loader2 className={`size-4 animate-spin ${className}`} />
}

export function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted">
      <Spinner /> Loading…
    </div>
  )
}

export function EmptyState({ children }) {
  return <p className="py-10 text-center text-sm text-muted">{children}</p>
}

export function ErrorBanner({ children }) {
  if (!children) return null
  return <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{children}</div>
}

export function Modal({ open, title, onClose, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" className={`card w-full ${width} p-5`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:bg-bg" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', tone = 'btn-primary', busy, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={onClose} width="max-w-md">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className={tone} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner />} {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

/** Prev / next controls for a Laravel paginator response. */
export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-line px-3 py-3 text-sm text-muted">
      <span>
        Showing {meta.from}–{meta.to} of {meta.total}
      </span>
      <div className="flex gap-1">
        <button className="btn-outline px-2 py-1" disabled={meta.current_page === 1} onClick={() => onPage(meta.current_page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <button className="btn-outline px-2 py-1" disabled={meta.current_page === meta.last_page} onClick={() => onPage(meta.current_page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

import { Landmark } from 'lucide-react'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-accent-ink p-10 text-white lg:flex">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <Landmark className="size-6" /> CESBank
        </div>
        <div>
          <h2 className="text-3xl leading-tight font-semibold">Banking that keeps a clean ledger.</h2>
          <p className="mt-3 max-w-md text-white/70">
            Accounts, transfers and loans in one place — for customers, tellers and administrators.
          </p>
        </div>
        <p className="text-sm text-white/50">© {new Date().getFullYear()} CESBank</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-accent lg:hidden">
            <Landmark className="size-6" /> CESBank
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}

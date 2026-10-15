import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, FileBarChart, HandCoins, History, Landmark, LayoutDashboard, LogOut, Menu, UserCircle, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Badge } from './ui'
import { ROLES } from '../utils/format'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users & Customers', icon: Users, roles: [ROLES.ADMIN, ROLES.EMPLOYEE] },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/loans', label: 'Loans', icon: HandCoins },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: [ROLES.ADMIN, ROLES.EMPLOYEE] },
  { to: '/activity', label: 'Activity Log', icon: History, roles: [ROLES.ADMIN] },
  { to: '/profile', label: 'My Profile', icon: UserCircle },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const links = NAV.filter((item) => !item.roles || item.roles.includes(user.role))

  const signOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold text-accent">
            <Landmark className="size-6" /> CESBank
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-bg hover:text-ink'}`
              }
            >
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full" />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent uppercase">
                {user.username[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.username}</div>
              <Badge>{user.role}</Badge>
            </div>
            <button onClick={signOut} className="rounded p-2 text-muted hover:bg-bg hover:text-danger" title="Sign out" aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}

      <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <span className="font-display font-semibold text-accent">CESBank</span>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}

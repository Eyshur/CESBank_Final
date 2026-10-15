const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

export const money = (value) => peso.format(Number(value || 0))

export const number = (value) => Number(value || 0).toLocaleString('en-PH')

export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'

export const date = (value) =>
  value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export const today = () => new Date().toLocaleDateString('en-CA')

export const firstOfMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA')
}

export const fullName = (customer) => (customer ? `${customer.first_name} ${customer.last_name}`.trim() : '—')

export const displayName = (user) => (user?.customer ? user.customer.first_name : user?.username)

export const ROLES = { ADMIN: 'Administrator', EMPLOYEE: 'Employee', CUSTOMER: 'Customer' }

export const isStaff = (user) => user?.role === ROLES.ADMIN || user?.role === ROLES.EMPLOYEE

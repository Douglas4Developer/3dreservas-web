import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navigation = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/leads', label: 'Interesses' },
  { to: '/admin/reservas', label: 'Reservas' },
  { to: '/admin/contratos', label: 'Contratos' },
]

export default function AdminLayout() {
  const { user, logout, isDemoMode } = useAuth()

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <div className="brand-mark brand-mark--sidebar">
            <span className="brand-mark__accent">3D</span>Reservas
          </div>
          <p className="sidebar-caption">Operação comercial e administrativa do 3Deventos.</p>
        </div>

        <nav className="admin-nav">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user-card">
          <p className="sidebar-user-card__title">Sessão</p>
          <strong>{user?.email ?? 'Administrador'}</strong>
          <small>{isDemoMode ? 'Ambiente demo' : 'Supabase Auth'}</small>
          <button className="button button-secondary button-full" onClick={() => logout()}>
            Sair
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <h2>3DReservas</h2>
            <p>Agenda, interessados, contratos e pagamentos em uma única operação.</p>
          </div>
        </header>
        <div className="admin-page-wrapper">
          <Outlet />
        </div>
      </section>
    </div>
  )
}

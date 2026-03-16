import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navigationGroups = [
  {
    title: 'Visão geral',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'DS' },
      { to: '/admin/calendario', label: 'Calendário', icon: 'CL' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { to: '/admin/leads', label: 'Leads', icon: 'LD' },
      { to: '/admin/reservas', label: 'Reservas', icon: 'RV' },
      { to: '/admin/contratos', label: 'Contratos', icon: 'CT' },
      { to: '/admin/midia', label: 'Mídia', icon: 'MD' },
    ],
  },
]

export default function AdminLayout() {
  const { user, logout, isDemoMode } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className={`admin-shell ${sidebarCollapsed ? 'admin-shell--collapsed' : ''}`}>
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'admin-sidebar-overlay--visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__top">
          <div className="admin-sidebar__brand-row">
            <div>
              <div
                className="brand-mark brand-mark--sidebar"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <img
                  src="/logopng.png"
                  alt="3DReservas"
                  style={{ height: '44px', width: 'auto' }}
                />
                <div style={{ minWidth: 0 }}>
                  <p
                    className="sidebar-caption"
                    style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.3 }}
                  >
                    Operação comercial, agenda, pagamentos e vitrine do 3Deventos.
                  </p>
                </div>
              </div>
            </div>

            <button
              className="sidebar-icon-button sidebar-icon-button--desktop"
              type="button"
              aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              {sidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          <nav className="admin-nav">
            {navigationGroups.map((group) => (
              <div key={group.title} className="admin-nav__group">
                <p className="admin-nav__group-title">{group.title}</p>
                <div className="admin-nav__items">
                  {group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} end={item.to === '/admin'} onClick={() => setSidebarOpen(false)}>
                      <span className="admin-nav__icon">{item.icon}</span>
                      <span className="admin-nav__label">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

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
          <div className="admin-topbar__main">
            <div className="admin-topbar__actions">
              <button className="sidebar-icon-button sidebar-icon-button--mobile" type="button" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegação">
                ☰
              </button>
              <div>
                <h2>3DReservas</h2>
                <p>Painel mais limpo, responsivo e focado na operação diária do espaço.</p>
              </div>
            </div>

            <div className="admin-topbar__status">
              <span className="status-chip">{isDemoMode ? 'Modo demo' : 'Online'}</span>
            </div>
          </div>
        </header>
        <div className="admin-page-wrapper">
          <Outlet />
        </div>
      </section>
    </div>
  )
}

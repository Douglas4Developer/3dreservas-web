import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const allItems = useMemo(
    () => navigationGroups.flatMap((group) => group.items),
    [],
  )

  const currentItem = useMemo(
    () =>
      allItems.find((item) =>
        item.to === '/admin'
          ? location.pathname === '/admin'
          : location.pathname.startsWith(item.to),
      ) ?? allItems[0],
    [allItems, location.pathname],
  )

  const mobileQuickItems = useMemo(
    () => [
      allItems.find((item) => item.to === '/admin'),
      allItems.find((item) => item.to === '/admin/calendario'),
      allItems.find((item) => item.to === '/admin/reservas'),
      allItems.find((item) => item.to === '/admin/contratos'),
    ].filter(Boolean),
    [allItems],
  )

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [sidebarOpen])

  return (
    <div className={`admin-shell ${sidebarCollapsed ? 'admin-shell--collapsed' : ''}`}>
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'admin-sidebar-overlay--visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}
        aria-hidden={!sidebarOpen && typeof window !== 'undefined' ? undefined : undefined}
      >
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
                    Desenvolvido por Douglas S.S. Ferreira 3Deventos.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-sidebar__brand-actions">
              <button
                className="sidebar-icon-button sidebar-icon-button--mobile-close"
                type="button"
                aria-label="Fechar menu"
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
              <button
                className="sidebar-icon-button sidebar-icon-button--desktop"
                type="button"
                aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
                onClick={() => setSidebarCollapsed((value) => !value)}
              >
                {sidebarCollapsed ? '›' : '‹'}
              </button>
            </div>
          </div>

          <nav className="admin-nav" aria-label="Navegação do painel">
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
              <button
                className="sidebar-icon-button sidebar-icon-button--mobile"
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir navegação"
                aria-expanded={sidebarOpen}
              >
                ☰
              </button>
              <div>
                <span className="admin-topbar__eyebrow">Painel administrativo</span>
                <h2>{currentItem?.label ?? '3DReservas'}</h2>
                <p>Painel mais limpo, responsivo e focado na operação diária do espaço.</p>
              </div>
            </div>

            <div className="admin-topbar__status">
              <span className="status-chip">{isDemoMode ? 'Modo demo' : 'Online'}</span>
            </div>
          </div>

          <nav className="admin-mobile-tabs" aria-label="Atalhos rápidos do painel">
            {mobileQuickItems.map((item) => (
              <NavLink key={item!.to} to={item!.to} end={item!.to === '/admin'}>
                <span>{item!.label}</span>
              </NavLink>
            ))}
          </nav>
        </header>
        <div className="admin-page-wrapper">
          <Outlet />
        </div>
        <div className="admin-bottom-nav-spacer" aria-hidden="true" />

        <nav className="admin-bottom-nav" aria-label="Navegação principal mobile">
          {mobileQuickItems.map((item) => (
            <NavLink key={item!.to} to={item!.to} end={item!.to === '/admin'}>
              <span className="admin-bottom-nav__icon">{item!.icon}</span>
              <span className="admin-bottom-nav__label">{item!.label}</span>
            </NavLink>
          ))}
        </nav>
      </section>
    </div>
  )
}

import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/supabase'

const navigation = [
  { to: '/', label: 'Início' },
  { to: '/espaco', label: 'O espaço' },
  { to: '/galeria', label: 'Galeria' },
  { to: '/disponibilidade', label: 'Disponibilidade' },
  { to: '/como-funciona', label: 'Como funciona' },
  { to: '/admin', label: 'Painel' },
]

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  const whatsappUrl = 'https://api.whatsapp.com/send/?phone=556284876724&text&type=phone_number&app_absent=0'

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="container public-header__inner public-header__inner--responsive">
          <Link to="/" className="brand-mark">
            <img src="/logopng.png" alt="3DReservas" style={{ height: '50px' }} />
          </Link>

          <nav className="public-nav public-nav--desktop">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`public-mobile-menu ${menuOpen ? 'public-mobile-menu--open' : ''}`}>
          <button className="public-mobile-menu__backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
          <div className="public-mobile-menu__panel">
            <div className="public-mobile-menu__header">
              <img src="/logopng.png" alt="3DReservas" style={{ height: '50px' }} />
              <button type="button" className="nav-toggle nav-toggle--active" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
                <span />
                <span />
                <span />
              </button>
            </div>

            <nav className="public-mobile-menu__nav">
              {navigation.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <div className="demo-banner">
          Modo demonstração ativo. Configure o arquivo <code>.env.local</code> com as chaves do Supabase para usar dados reais.
        </div>
      ) : null}

      <main>
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="container public-footer__inner">
          <div>
            <img src="/logopng.png" alt="3DReservas" style={{ height: '32px' }} />
            <p>Vitrine, agenda, pagamento, contrato e acompanhamento da reserva em um só lugar.</p>
          </div>
          <div>
            <p>3Deventos • Goiânia • Site desenvolvido por DOUGLAS S S FERREIRA. </p>
            <p>Experiência pensada para converter consultas em reservas.</p>
          </div>
        </div>
      </footer>

      <div className="floating-cta-bar" aria-label="Ações rápidas do site">
        <Link className="button" to="/disponibilidade">
          Consultar disponibilidade
        </Link>
        <a className="button button-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
          Falar no WhatsApp
        </a>
      </div>
    </div>
  )
}

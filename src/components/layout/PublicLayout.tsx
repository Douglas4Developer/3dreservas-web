/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/supabase'

const navigation = [
  { to: '/', label: 'Início', shortLabel: 'Início', description: 'Visão geral do espaço' },
  { to: '/espaco', label: 'O espaço', shortLabel: 'Espaço', description: 'Conheça a estrutura' },
  { to: '/galeria', label: 'Galeria', shortLabel: 'Galeria', description: 'Veja fotos reais' },
  { to: '/disponibilidade', label: 'Disponibilidade', shortLabel: 'Datas', description: 'Consulte as datas' },
  { to: '/como-funciona', label: 'Como reservar', shortLabel: 'Reservar', description: 'Entenda os próximos passos' },
]

const transactionalPrefixes = ['/minha-reserva', '/proposta', '/contrato']

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const menuPanelRef = useRef<HTMLDivElement | null>(null)

  const whatsappUrl = 'https://api.whatsapp.com/send/?phone=556284876724&text=Olá! Quero consultar uma data para o meu evento.&type=phone_number&app_absent=0'

  const isTransactionalFlow = useMemo(
    () => transactionalPrefixes.some((prefix) => location.pathname.startsWith(prefix)),
    [location.pathname],
  )

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return

    const frame = window.requestAnimationFrame(() => {
      const firstLink = menuPanelRef.current?.querySelector<HTMLAnchorElement>('.public-mobile-menu__nav a')
      firstLink?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [menuOpen])

  return (
    <div className={`public-shell ${menuOpen ? 'public-shell--menu-open' : ''}`}>
      <header className="public-header">
        <div className="container public-header__inner public-header__inner--responsive">
          <Link to="/" className="brand-mark" onClick={() => setMenuOpen(false)} aria-label="Ir para a página inicial">
            <img src="/logopng.png" alt="3DReservas" className="public-brand-logo" />
          </Link>

          {!isTransactionalFlow ? (
            <>
              <nav className="public-nav public-nav--desktop" aria-label="Navegação principal do site">
                {navigation.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="public-nav__actions public-nav__actions--desktop">
                <a className="button button-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <Link className="button" to="/disponibilidade">
                  Ver datas
                </Link>
              </div>

              <button
                type="button"
                className={`nav-toggle ${menuOpen ? 'nav-toggle--active' : ''}`}
                aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={menuOpen}
                aria-controls="public-mobile-menu-panel"
                aria-haspopup="dialog"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <span />
                <span />
                <span />
              </button>
            </>
          ) : null}
        </div>

        {!isTransactionalFlow ? (
          <div className="public-mobile-tabs" aria-label="Navegação rápida do site">
            <div className="container public-mobile-tabs__scroll">
              {navigation.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className="public-mobile-tabs__link">
                  {item.shortLabel}
                </NavLink>
              ))}
            </div>
          </div>
        ) : null}

        {!isTransactionalFlow ? (
          <div className={`public-mobile-menu ${menuOpen ? 'public-mobile-menu--open' : ''}`} aria-hidden={!menuOpen}>
            <button className="public-mobile-menu__backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
            <div
              ref={menuPanelRef}
              className="public-mobile-menu__panel"
              id="public-mobile-menu-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
            >
              <div className="public-mobile-menu__header">
                <div>
                  <strong>Navegação</strong>
                  <p>Escolha uma área para conhecer o espaço, ver fotos e consultar a sua data.</p>
                </div>
                <button
                  type="button"
                  className="public-mobile-menu__close"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                >
                  ✕
                </button>
              </div>

              <nav className="public-mobile-menu__nav" aria-label="Menu mobile do site">
                {navigation.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)}>
                    <span className="public-mobile-menu__nav-copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <span className="public-mobile-menu__nav-arrow" aria-hidden="true">→</span>
                  </NavLink>
                ))}
              </nav>

              <div className="public-mobile-menu__actions">
                <Link className="button" to="/disponibilidade" onClick={() => setMenuOpen(false)}>
                  Ver datas disponíveis
                </Link>
                <a className="button button-secondary" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        ) : null}
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
        <div className="container public-footer__inner public-footer__inner--enhanced">
          <div>
            <img src="/logopng.png" alt="3DReservas" className="public-brand-logo public-brand-logo--footer" />
            <p>Um espaço preparado para celebrar aniversários, encontros, confraternizações e momentos especiais com conforto.</p>
          </div>
          <div>
            <p>3Deventos • Goiânia • Jardim Bonanza</p>
            <p>Consulte a disponibilidade online e fale direto no WhatsApp para fechar sua data.</p>
            <Link className="public-admin-link" to="/admin">
              Acesso administrativo
            </Link>
          </div>
        </div>
      </footer>

      {!isTransactionalFlow ? (
        <div className={`floating-cta-bar ${menuOpen ? 'floating-cta-bar--hidden' : ''}`} aria-label="Ações rápidas do site">
          <Link className="button" to="/disponibilidade">
            Consultar disponibilidade
          </Link>
          <a className="button button-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
            Falar no WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  )
}

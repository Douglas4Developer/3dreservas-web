import { Link, NavLink, Outlet } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/supabase'

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="container public-header__inner">
          <Link to="/" className="brand-mark">
            <span className="brand-mark__accent">3D</span>Reservas
          </Link>
          <nav className="public-nav">
            <NavLink to="/">Início</NavLink>
            <NavLink to="/espaco">O espaço</NavLink>
            <NavLink to="/galeria">Galeria</NavLink>
            <NavLink to="/disponibilidade">Disponibilidade</NavLink>
            <NavLink to="/como-funciona">Como funciona</NavLink>
            <NavLink to="/admin">Painel</NavLink>
          </nav>
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
            <strong>3DReservas</strong>
            <p>Gestão de reservas, pagamentos, contratos, galeria do espaço e agenda do 3Deventos.</p>
          </div>
          <div>
            <p>Desenvolvido por DOUGLAS FERREIRA</p>
            <p>Plataforma exclusiva para gerenciamento de reservas.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

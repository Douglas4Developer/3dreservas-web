import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div>
      <section className="hero-section">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">SaaS operacional do 3Deventos</span>
            <h1>Agenda, contratos, pagamentos e reservas do seu espaço em um só lugar.</h1>
            <p className="hero-copy">
              O 3DReservas profissionaliza a operação do 3Deventos com calendário em tempo real,
              captação de interessados, reserva com bloqueio temporário, contrato e link seguro para o cliente.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/disponibilidade">
                Ver disponibilidade
              </Link>
              <Link className="button button-secondary" to="/admin/login">
                Acessar painel
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h2>Fluxo operacional do MVP</h2>
            <ol>
              <li>Cliente consulta calendário público.</li>
              <li>Envia interesse para uma data.</li>
              <li>Admin analisa e converte em reserva.</li>
              <li>Data fica bloqueada até confirmação da entrada.</li>
              <li>Contrato fica disponível por link seguro.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container card-grid card-grid--three">
          <article className="card feature-card">
            <h3>Vitrine pública</h3>
            <p>Calendário em tempo real, formulário de interesse e consulta da reserva por token seguro.</p>
          </article>
          <article className="card feature-card">
            <h3>Painel administrativo</h3>
            <p>Interesses, reservas, pagamentos pendentes, contratos e visão rápida de ocupação.</p>
          </article>
          <article className="card feature-card">
            <h3>Evolução pronta</h3>
            <p>Preparado para integrar Mercado Pago, WhatsApp e geração de PDF em Edge Functions.</p>
          </article>
        </div>
      </section>
    </div>
  )
}

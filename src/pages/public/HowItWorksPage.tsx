import { Link } from 'react-router-dom'

const steps = [
  {
    title: '1. Consulte a agenda',
    body: 'Veja online quais datas combinam com o seu evento e avance com mais segurança na escolha.',
  },
  {
    title: '2. Fale com a gente',
    body: 'Envie seus dados para alinhar detalhes, valores, regras de uso e o formato ideal da sua locação.',
  },
  {
    title: '3. Confirme a data',
    body: 'Depois da aprovação, a reserva segue para confirmação e organização da entrada.',
  },
  {
    title: '4. Evento com mais tranquilidade',
    body: 'Tudo fica mais claro para você aproveitar seu momento sabendo que a data foi bem organizada.',
  },
]

export default function HowItWorksPage() {
  return (
    <section className="section-block public-page-section">
      <div className="container stack-lg">
        <div className="public-page-hero public-page-hero--compact">
          <div>
            <span className="eyebrow">Como reservar</span>
            <h1 className="public-page-title">Um caminho simples, claro e direto para fechar sua data</h1>
            <p className="public-page-subtitle">O cliente entende rápido o processo, sente segurança e avança com menos dúvidas.</p>
          </div>
          <div className="public-hero-actions">
            <Link className="button" to="/disponibilidade">
              Consultar disponibilidade
            </Link>
          </div>
        </div>

        <div className="public-bento public-bento--steps">
          {steps.map((step) => (
            <article key={step.title} className="card public-bento-card public-bento-card--glass feature-card">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

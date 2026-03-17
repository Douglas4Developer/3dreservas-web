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
    <section className="section-block">
      <div className="container stack-lg">
        <div className="page-header">
          <div>
            <h1>Como reservar seu evento</h1>
            <p>Um processo simples e direto para você escolher a data e avançar com mais confiança.</p>
          </div>
        </div>

        <div className="card-grid card-grid--three">
          {steps.map((step) => (
            <article key={step.title} className="card feature-card">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

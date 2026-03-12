const steps = [
  {
    title: '1. Cliente consulta datas',
    body: 'O site mostra a agenda em tempo real e já deixa claro quando uma data está livre, bloqueada ou reservada.',
  },
  {
    title: '2. Interesse e proposta',
    body: 'Depois do interesse, o administrador avalia e gera a proposta com valor da entrada e prazo de pagamento.',
  },
  {
    title: '3. Pagamento da entrada',
    body: 'Enquanto o link de pagamento estiver válido, a data fica bloqueada. Pagamento aprovado confirma a reserva.',
  },
  {
    title: '4. Contrato e assinatura',
    body: 'O contrato é gerado automaticamente, liberado para o cliente e depois para o administrador assinar.',
  },
]

export default function HowItWorksPage() {
  return (
    <section className="section-block">
      <div className="container stack-lg">
        <div className="page-header">
          <div>
            <h1>Como funciona o processo de reserva</h1>
            <p>Esta página explica o fluxo comercial e ajuda a reduzir dúvidas antes do fechamento.</p>
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

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../../components/ui/LoadingState'
import { fetchPublicMedia } from '../../services/media.service'
import type { SpaceMedia } from '../../types/database'

const amenities = [
  'Piscina coberta, aquecida, com LEDs, cascata e 2 hidromassagens',
  'Área gourmet com churrasqueira e teto coberto',
  '10 mesas com cadeiras, aparador, freezer e geladeira',
  '2 fogões industriais, cozinha, quartos e banheiros',
  'Som ambiente distribuído pelo espaço e Wi‑Fi disponível',
  'Funcionamento por diária, com pacote personalizado para mais de um dia',
]

export default function SpacePage() {
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicMedia().then(setMedia).finally(() => setLoading(false))
  }, [])

  const heroImage = useMemo(() => media.find((item) => item.type === 'image'), [media])

  return (
    <section className="section-block">
      <div className="container stack-lg">
        <div className="page-header">
          <div>
            <h1>Conheça o 3Deventos</h1>
            <p>Uma página comercial dedicada ao espaço ajuda o cliente a decidir antes mesmo do primeiro contato.</p>
          </div>
          <Link className="button" to="/disponibilidade">
            Consultar disponibilidade
          </Link>
        </div>

        {loading ? (
          <LoadingState label="Carregando apresentação do espaço..." />
        ) : (
          <div className="page-grid page-grid--public">
            <article className="card details-card">
              {heroImage?.external_url ? <img src={heroImage.external_url} alt={heroImage.title} className="hero-banner-image" /> : null}
              <h2>Estrutura completa para receber eventos</h2>
              <p>
                O objetivo dessa página é mostrar o espaço de forma comercial e clara: o que está incluído,
                como funciona a locação e por que o cliente deve avançar para a proposta.
              </p>
              <div className="amenities-grid">
                {amenities.map((item) => (
                  <div key={item} className="line-card line-card--soft">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <aside className="card details-card">
              <h2>Informações rápidas</h2>
              <ul className="check-list">
                <li>Calendário online com datas livres e indisponíveis</li>
                <li>Negociação com proposta e bloqueio temporário</li>
                <li>Pagamento da entrada por link seguro</li>
                <li>Contrato liberado somente após pagamento</li>
                <li>Consulta da reserva e do contrato por link individual</li>
              </ul>
              <Link className="button" to="/como-funciona">
                Ver como funciona a reserva
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}

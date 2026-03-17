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
            <p>Um espaço preparado para receber seu evento com conforto, estrutura e um visual que encanta já no primeiro olhar.</p>
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
              <h2>Estrutura completa para momentos especiais</h2>
              <p>
                Ideal para aniversários, encontros, confraternizações e celebrações em família, com áreas de apoio que tornam a experiência mais prática para você e seus convidados.
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
              <h2>Por que esse espaço chama atenção</h2>
              <ul className="check-list">
                <li>Ambiente pronto para receber bem e impressionar nas fotos</li>
                <li>Estrutura confortável para eventos de um dia ou mais</li>
                <li>Consulta de datas online para facilitar sua escolha</li>
                <li>Atendimento rápido para tirar dúvidas e alinhar detalhes</li>
                <li>Reserva organizada para dar mais segurança na confirmação</li>
              </ul>
              <Link className="button" to="/galeria">
                Ver mais fotos
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}

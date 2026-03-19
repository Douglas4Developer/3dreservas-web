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

const reasons = [
  'Ambiente bonito para receber bem e render boas fotos',
  'Estrutura confortável para eventos de um dia ou mais',
  'Consulta de datas online para agilizar a decisão',
  'Reserva organizada para gerar mais segurança na confirmação',
]

export default function SpacePage() {
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicMedia().then(setMedia).finally(() => setLoading(false))
  }, [])

  const heroImage = useMemo(() => media.find((item) => item.type === 'image' && item.external_url), [media])

  return (
    <section className="section-block public-page-section">
      <div className="container stack-lg">
        <div className="public-page-hero">
          <div>
            <span className="eyebrow">O espaço</span>
            <h1 className="public-page-title">Estrutura completa para momentos especiais</h1>
            <p className="public-page-subtitle">
              Um ambiente confortável, bonito e funcional para aniversários, encontros, confraternizações e celebrações em família.
            </p>
          </div>
          <div className="public-hero-actions">
            <Link className="button" to="/disponibilidade">
              Consultar disponibilidade
            </Link>
            <Link className="button button-secondary" to="/galeria">
              Ver mais fotos
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Carregando apresentação do espaço..." />
        ) : (
          <div className="public-bento public-bento--space">
            <article className="card public-bento-card public-bento-card--hero">
              {heroImage?.external_url ? (
                <img src={heroImage.external_url} alt={heroImage.title} className="public-hero-photo" loading="eager" />
              ) : null}
              <div className="stack-list">
                <h2>O espaço já impressiona antes mesmo do primeiro contato</h2>
                <p>
                  Quem acessa a página entende rápido o valor do local: conforto, apoio para convidados, boa apresentação e praticidade para organizar o evento.
                </p>
              </div>
            </article>

            <article className="card public-bento-card public-bento-card--glass">
              <span className="eyebrow">Destaques</span>
              <div className="public-chip-list public-chip-list--soft">
                {amenities.slice(0, 4).map((item) => (
                  <span key={item} className="public-chip public-chip--soft">
                    {item}
                  </span>
                ))}
              </div>
            </article>

            <article className="card public-bento-card public-bento-card--glass">
              <h3>O que está incluso</h3>
              <div className="public-check-list">
                {amenities.map((item) => (
                  <div key={item} className="public-check-list__item">
                    <span className="public-check-list__icon">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="card public-bento-card public-bento-card--glass">
              <h3>Por que o cliente decide mais rápido</h3>
              <div className="public-check-list">
                {reasons.map((item) => (
                  <div key={item} className="public-check-list__item">
                    <span className="public-check-list__icon">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  )
}

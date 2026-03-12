import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../../components/ui/LoadingState'
import { fetchPublicMedia } from '../../services/media.service'
import type { SpaceMedia } from '../../types/database'

const highlights = [
  'Piscina coberta e aquecida com cascata e hidros',
  'Área gourmet com churrasqueira e apoio para alimentos',
  'Quartos, colchonetes, Wi‑Fi e estrutura pronta para eventos',
  'Calendário em tempo real, pagamento, contrato e consulta segura',
]

export default function HomePage() {
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicMedia()
      .then((items) => setMedia(items))
      .finally(() => setLoading(false))
  }, [])

  const featuredImages = useMemo(
    () => media.filter((item) => item.type === 'image').slice(0, 3),
    [media],
  )
  const featuredVideo = useMemo(() => media.find((item) => item.type === 'video'), [media])

  return (
    <div>
      <section className="hero-section hero-section--immersive">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Espaço de eventos 3Deventos</span>
            <h1>Apresente o espaço, venda melhor e feche reservas com pagamento e contrato.</h1>
            <p className="hero-copy">
              O 3DReservas junta vitrine pública, agenda em tempo real, proposta, checkout da entrada,
              contrato e assinatura em um único fluxo para o seu espaço.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/disponibilidade">
                Ver datas disponíveis
              </Link>
              <Link className="button button-secondary" to="/espaco">
                Conhecer o espaço
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h2>Fluxo operacional da nova fase</h2>
            <ol>
              <li>Cliente visualiza fotos, vídeo e calendário.</li>
              <li>Admin aprova proposta e gera link de pagamento.</li>
              <li>Entrada confirmada atualiza a reserva automaticamente.</li>
              <li>Contrato é gerado e assinatura é liberada.</li>
              <li>Cliente acompanha tudo por link seguro.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container">
          <div className="card-grid card-grid--three">
            {highlights.map((highlight) => (
              <article key={highlight} className="card feature-card">
                <h3>{highlight}</h3>
                <p>Preparado para operação comercial, apresentação do espaço e fechamento digital da reserva.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container stack-lg">
          <div className="page-header">
            <div>
              <h1>Apresentação do espaço</h1>
              <p>Use fotos reais, vídeo-tour e informações práticas para aumentar conversão.</p>
            </div>
            <Link className="button button-secondary" to="/galeria">
              Ver galeria completa
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Carregando mídia do espaço..." />
          ) : (
            <div className="media-preview-grid">
              {featuredImages.map((item) => (
                <article key={item.id} className="card media-card">
                  {item.external_url ? <img src={item.external_url} alt={item.title} className="media-card__image" /> : null}
                  <div className="media-card__body">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}

          {featuredVideo?.external_url ? (
            <article className="card video-card">
              <div>
                <h3>{featuredVideo.title}</h3>
                <p>{featuredVideo.description}</p>
              </div>
              <div className="video-embed">
                <iframe
                  src={featuredVideo.external_url}
                  title={featuredVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageLightbox, type LightboxItem } from '../../components/ui/ImageLightbox'
import { LoadingState } from '../../components/ui/LoadingState'
import { getMonthBoundaries } from '../../lib/format'
import { getPublicCalendar } from '../../services/calendar.service'
import { fetchPublicMedia } from '../../services/media.service'
import type { CalendarDay, SpaceMedia } from '../../types/database'

const trustItems = ['Jardim Bonanza • Goiânia', 'Contrato digital', 'Pagamento de entrada', 'Disponibilidade em tempo real']

const benefits = [
  {
    title: 'Piscina coberta e aquecida',
    description: 'Ambiente com cascata, hidros e iluminação para destacar seu evento em qualquer clima.',
  },
  {
    title: 'Área gourmet pronta',
    description: 'Churrasqueira, apoio para alimentos e espaço confortável para confraternizações.',
  },
  {
    title: 'Estrutura completa',
    description: 'Quartos, colchonetes, Wi‑Fi, cozinha e apoio para eventos familiares e corporativos.',
  },
  {
    title: 'Reserva com segurança',
    description: 'Consulta de datas, proposta, pagamento da entrada e contrato no mesmo fluxo.',
  },
]

const steps = [
  { title: 'Veja as datas', description: 'Consulte a agenda em tempo real e identifique rapidamente o melhor dia.' },
  { title: 'Escolha o dia', description: 'Envie seu interesse com nome, WhatsApp e informações básicas do evento.' },
  { title: 'Receba proposta e pagamento', description: 'A proposta é aprovada e o link da entrada é enviado com segurança.' },
  { title: 'Assine o contrato', description: 'Após a confirmação da entrada, o contrato fica disponível para assinatura.' },
]

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatShortDate(dateIso: string) {
  const [year, month, day] = dateIso.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export default function HomePage() {
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [calendarEntries, setCalendarEntries] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    const referenceDate = new Date()
    const boundaries = getMonthBoundaries(referenceDate)

    Promise.all([fetchPublicMedia(), getPublicCalendar(boundaries)])
      .then(([items, calendar]) => {
        setMedia(items)
        setCalendarEntries(calendar)
      })
      .finally(() => setLoading(false))
  }, [])

  const imageItems = useMemo(() => media.filter((item) => item.type === 'image' && item.external_url), [media])
  const videoItem = useMemo(() => media.find((item) => item.type === 'video' && item.external_url), [media])

  const heroImages = useMemo(() => {
    const featured = imageItems.filter((item) => item.is_featured)
    return (featured.length > 0 ? featured : imageItems).slice(0, 4)
  }, [imageItems])

  const galleryPreview = useMemo(() => imageItems.slice(0, 6), [imageItems])

  const lightboxItems = useMemo<LightboxItem[]>(() => {
    return imageItems.map((item) => ({
      id: item.id,
      src: item.external_url!,
      title: item.title,
      description: item.description,
    }))
  }, [imageItems])

  useEffect(() => {
    if (heroImages.length <= 1) return

    const intervalId = window.setInterval(() => {
      setActiveHeroIndex((value) => (value + 1) % heroImages.length)
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [heroImages.length])

  const safeHeroIndex = heroImages.length > 0 ? activeHeroIndex % heroImages.length : 0
  const activeHeroImage = heroImages[safeHeroIndex] ?? imageItems[0]

  const availabilitySummary = useMemo(() => {
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const blockedStatuses = new Set(['bloqueio_temporario', 'aguardando_pagamento', 'reservado'])
    const blockedDates = new Set(
      calendarEntries.filter((item) => blockedStatuses.has(item.status)).map((item) => item.event_date),
    )

    const nextDates: string[] = []
    for (let offset = 0; offset < 45 && nextDates.length < 3; offset += 1) {
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + offset)
      const isoDate = toLocalIsoDate(nextDate)
      if (!blockedDates.has(isoDate)) nextDates.push(isoDate)
    }

    return {
      openDays: Math.max(daysInMonth - blockedDates.size, 0),
      pendingDays: calendarEntries.filter((item) => item.status === 'aguardando_pagamento' || item.status === 'bloqueio_temporario').length,
      reservedDays: calendarEntries.filter((item) => item.status === 'reservado').length,
      nextDates,
    }
  }, [calendarEntries])

  function handleOpenLightbox(itemId: string) {
    const index = lightboxItems.findIndex((item) => item.id === itemId)
    if (index >= 0) setLightboxIndex(index)
  }

  return (
    <div>
      <section className="hero-section hero-section--immersive">
        <div className="container stack-lg">
          <div className="trust-strip">
            {trustItems.map((item) => (
              <span key={item} className="trust-strip__item">
                {item}
              </span>
            ))}
          </div>

          <div className="hero-grid hero-grid--showcase">
            <div className="hero-copy-block">
              <span className="eyebrow">Espaço de eventos 3Deventos</span>
              <h1>Reserve um espaço bonito, completo e pronto para receber seu evento sem complicação.</h1>
              <p className="hero-copy hero-copy--large">
                Veja fotos reais, consulte datas disponíveis e avance com proposta, pagamento da entrada e contrato em um fluxo simples.
              </p>

              <div className="hero-actions hero-actions--stack-mobile">
                <Link className="button" to="/disponibilidade">
                  Ver datas disponíveis
                </Link>
                <Link className="button button-secondary" to="/galeria">
                  Ver fotos do espaço
                </Link>
              </div>

              <div className="hero-benefits">
                {benefits.map((item) => (
                  <div key={item.title} className="hero-benefits__item">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-showcase card">
              {activeHeroImage?.external_url ? (
                <button
                  className="hero-showcase__visual"
                  type="button"
                  onClick={() => handleOpenLightbox(activeHeroImage.id)}
                  aria-label={`Expandir foto ${activeHeroImage.title}`}
                >
                  <img src={activeHeroImage.external_url} alt={activeHeroImage.title} className="hero-banner-image" />
                  <span className="hero-showcase__badge">Clique para expandir</span>
                </button>
              ) : (
                <div className="hero-showcase__placeholder">
                  <strong>Adicione fotos em destaque</strong>
                  <p>Assim que você publicar imagens na mídia do espaço, elas aparecerão aqui em destaque.</p>
                </div>
              )}

              {heroImages.length > 0 ? (
                <div className="hero-showcase__content">
                  <div>
                    <strong>{activeHeroImage?.title ?? 'Seu espaço em destaque'}</strong>
                    <p>{activeHeroImage?.description ?? 'Mostre as melhores áreas do espaço com fotos de alta qualidade.'}</p>
                  </div>

                  <div className="hero-thumbs" role="tablist" aria-label="Mini carrossel de fotos">
                    {heroImages.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`hero-thumbs__item ${index === safeHeroIndex ? 'hero-thumbs__item--active' : ''}`}
                        onClick={() => setActiveHeroIndex(index)}
                        aria-label={`Ver foto ${item.title}`}
                      >
                        <img src={item.external_url ?? ''} alt={item.title} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section-block section-block--tight-top">
        <div className="container stack-lg">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Por que o cliente entende rápido</span>
              <h2>Uma vitrine pensada para converter reservas</h2>
            </div>
            <p>
              Em poucos segundos o visitante entende o que o espaço oferece, vê fotos reais e encontra o próximo passo para reservar.
            </p>
          </div>

          <div className="card-grid card-grid--four">
            {benefits.map((item) => (
              <article key={item.title} className="card feature-card feature-card--premium">
                <span className="feature-card__tag">Destaque</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container stack-lg">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Como funciona</span>
              <h2>Processo claro do primeiro clique até o contrato</h2>
            </div>
            <Link className="button button-secondary" to="/como-funciona">
              Ver fluxo completo
            </Link>
          </div>

          <div className="card-grid card-grid--four">
            {steps.map((step, index) => (
              <article key={step.title} className="card step-card">
                <span className="step-card__number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container stack-lg">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Galeria em destaque</span>
              <h2>Fotos grandes, navegação intuitiva e opção de expandir</h2>
            </div>
            <Link className="button button-secondary" to="/galeria">
              Ver galeria completa
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Carregando fotos do espaço..." />
          ) : galleryPreview.length === 0 ? (
            <article className="card empty-state-card">
              <strong>Nenhuma foto publicada ainda.</strong>
              <p>Publique as melhores imagens na área administrativa para transformar a vitrine do espaço.</p>
            </article>
          ) : (
            <div className="gallery-preview-grid gallery-preview-grid--home">
              {galleryPreview.map((item, index) => (
                <article key={item.id} className={`card media-card media-card--interactive ${index === 0 ? 'media-card--hero' : ''}`}>
                  <button type="button" className="media-card__button" onClick={() => handleOpenLightbox(item.id)}>
                    <img src={item.external_url ?? ''} alt={item.title} className="media-card__image" />
                    <span className="media-card__overlay">
                      <strong>{item.title}</strong>
                      <span>Expandir foto</span>
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}

          {videoItem?.external_url ? (
            <article className="card video-card video-card--featured">
              <div>
                <span className="eyebrow">Tour do espaço</span>
                <h3>{videoItem.title}</h3>
                <p>{videoItem.description}</p>
              </div>
              <div className="video-embed">
                <iframe
                  src={videoItem.external_url}
                  title={videoItem.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="section-block">
        <div className="container availability-highlight">
          <div className="availability-highlight__content">
            <span className="eyebrow">Disponibilidade rápida</span>
            <h2>O cliente pode consultar a agenda e agir na hora certa</h2>
            <p>
              Mostre disponibilidade atualizada, destaque datas mais disputadas e direcione a pessoa para o formulário de interesse ou para o WhatsApp.
            </p>
            <div className="availability-highlight__actions">
              <Link className="button" to="/disponibilidade">
                Consultar agenda completa
              </Link>
              <Link className="button button-secondary" to="/espaco">
                Conhecer o espaço
              </Link>
            </div>
          </div>

          <div className="availability-highlight__panel card">
            <div className="availability-metrics">
              <article>
                <strong>{availabilitySummary.openDays}</strong>
                <span>dias livres neste mês</span>
              </article>
              <article>
                <strong>{availabilitySummary.pendingDays}</strong>
                <span>datas em negociação</span>
              </article>
              <article>
                <strong>{availabilitySummary.reservedDays}</strong>
                <span>datas já reservadas</span>
              </article>
            </div>

            <div className="next-dates-card">
              <strong>Próximas datas sugeridas</strong>
              <div className="next-dates-card__list">
                {availabilitySummary.nextDates.length > 0 ? (
                  availabilitySummary.nextDates.map((date) => <span key={date}>{formatShortDate(date)}</span>)
                ) : (
                  <span>Consulte a agenda completa</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container">
          <div className="conversion-banner">
            <div>
              <span className="eyebrow">Pronto para reservar</span>
              <h2>Leve o visitante para a ação com menos dúvidas e mais confiança</h2>
              <p>
                Uma vitrine comercial forte, fotos em tela cheia, disponibilidade clara e fluxo simples ajudam o espaço a fechar mais reservas.
              </p>
            </div>
            <div className="conversion-banner__actions">
              <Link className="button" to="/disponibilidade">
                Consultar disponibilidade
              </Link>
              <Link className="button button-secondary" to="/galeria">
                Ver galeria completa
              </Link>
            </div>
          </div>
        </div>
      </section>

      {lightboxIndex !== null ? (
        <ImageLightbox items={lightboxItems} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </div>
  )
}

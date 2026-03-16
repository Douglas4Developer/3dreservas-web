import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageLightbox, type LightboxItem } from '../../components/ui/ImageLightbox'
import { LoadingState } from '../../components/ui/LoadingState'
import { getMonthBoundaries } from '../../lib/format'
import { getPublicCalendar } from '../../services/calendar.service'
import { fetchPublicMedia } from '../../services/media.service'
import type { CalendarDay, SpaceMedia } from '../../types/database'
import './HomePage.css'

const trustItems = ['Jardim Bonanza • Goiânia', 'Contrato digital', 'Pagamento de entrada', 'Atendimento rápido']

const highlights = [
  'Piscina coberta e aquecida',
  'Área gourmet com churrasqueira',
  'Quartos, colchonetes e apoio completo',
  'Reserva com proposta, entrada e contrato',
]

const essentials = [
  {
    title: 'Estrutura que vende o espaço rápido',
    description: 'Piscina coberta, área gourmet, cozinha de apoio, quartos e ambiente preparado para eventos.',
  },
  {
    title: 'Fotos reais do seu banco',
    description: 'A capa e a galeria continuam buscando suas imagens publicadas no banco, sem trocar por placeholders fixos.',
  },
  {
    title: 'Fluxo simples para reservar',
    description: 'O visitante entende o espaço, consulta a agenda e avança para o próximo passo sem excesso de informação.',
  },
]

const bookingSteps = [
  {
    title: 'Veja a disponibilidade',
    description: 'O cliente acessa a agenda e entende rápido quais datas fazem sentido para o evento.',
  },
  {
    title: 'Fale e receba a proposta',
    description: 'A conversa continua pelo canal de atendimento com regras, valores e confirmação da entrada.',
  },
  {
    title: 'Feche com segurança',
    description: 'Depois da confirmação, o contrato segue de forma organizada e profissional.',
  },
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
    let ignore = false

    async function loadPage() {
      setLoading(true)
      const boundaries = getMonthBoundaries(new Date())

      const [mediaResult, calendarResult] = await Promise.allSettled([
        fetchPublicMedia(),
        getPublicCalendar(boundaries),
      ])

      if (ignore) return

      if (mediaResult.status === 'fulfilled') {
        setMedia(mediaResult.value)
      } else {
        setMedia([])
      }

      if (calendarResult.status === 'fulfilled') {
        setCalendarEntries(calendarResult.value)
      } else {
        setCalendarEntries([])
      }

      setLoading(false)
    }

    loadPage()

    return () => {
      ignore = true
    }
  }, [])

  const imageItems = useMemo(() => media.filter((item) => item.type === 'image' && item.external_url), [media])

  const heroImages = useMemo(() => {
    const featured = imageItems.filter((item) => item.is_featured)
    return (featured.length > 0 ? featured : imageItems).slice(0, 5)
  }, [imageItems])

  const galleryPreview = useMemo(() => {
    if (imageItems.length <= 1) return imageItems
    return imageItems.slice(0, 4)
  }, [imageItems])

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
      setActiveHeroIndex((current) => (current + 1) % heroImages.length)
    }, 4500)

    return () => window.clearInterval(intervalId)
  }, [heroImages.length])

  useEffect(() => {
    if (activeHeroIndex > 0 && activeHeroIndex >= heroImages.length) {
      setActiveHeroIndex(0)
    }
  }, [activeHeroIndex, heroImages.length])

  const activeHeroImage = heroImages[activeHeroIndex] ?? imageItems[0] ?? null

  const nextAvailableDates = useMemo(() => {
    const blockedStatuses = new Set(['bloqueio_temporario', 'aguardando_pagamento', 'reservado'])
    const blockedDates = new Set(
      calendarEntries.filter((item) => blockedStatuses.has(item.status)).map((item) => item.event_date),
    )

    const suggestedDates: string[] = []
    const today = new Date()

    for (let offset = 0; offset < 60 && suggestedDates.length < 4; offset += 1) {
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + offset)
      const isoDate = toLocalIsoDate(nextDate)

      if (!blockedDates.has(isoDate)) {
        suggestedDates.push(isoDate)
      }
    }

    return suggestedDates
  }, [calendarEntries])

  function handleOpenLightbox(itemId: string) {
    const index = lightboxItems.findIndex((item) => item.id === itemId)
    if (index >= 0) setLightboxIndex(index)
  }

  return (
    <main className="home-landing-clean">
      <section className="hl-hero">
        <div className="hl-shell hl-hero__grid">
          <div className="hl-copy">
            <div className="hl-trust-strip" aria-label="Pontos principais do espaço">
              {trustItems.map((item) => (
                <span key={item} className="hl-pill">
                  {item}
                </span>
              ))}
            </div>

            <span className="hl-eyebrow">Espaço de eventos 3Deventos</span>

            <h1 className="hl-title">Seu espaço apresentado de forma moderna, direta e com foco em reserva.</h1>

            <p className="hl-subtitle">
              Menos blocos, menos distração e mais clareza: fotos reais do espaço, benefício visível e caminho simples
              para o cliente consultar disponibilidade.
            </p>

            <div className="hl-actions">
              <Link className="hl-btn hl-btn--primary" to="/disponibilidade">
                Ver datas disponíveis
              </Link>
              <Link className="hl-btn hl-btn--secondary" to="/galeria">
                Ver fotos do espaço
              </Link>
            </div>

            <div className="hl-quick-points">
              {highlights.map((item) => (
                <div key={item} className="hl-quick-points__item">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="hl-hero-media">
            {loading ? (
              <article className="hl-media-card hl-media-card--loading">
                <LoadingState label="Carregando fotos do espaço..." />
              </article>
            ) : activeHeroImage?.external_url ? (
              <article className="hl-media-card">
                <button
                  type="button"
                  className="hl-media-card__main"
                  onClick={() => handleOpenLightbox(activeHeroImage.id)}
                  aria-label={`Expandir foto ${activeHeroImage.title}`}
                >
                  <img src={activeHeroImage.external_url} alt={activeHeroImage.title} className="hl-media-card__image" />
                  <span className="hl-media-card__tag">Clique para ampliar</span>
                </button>

                <div className="hl-media-card__caption">
                  <div>
                    <strong>{activeHeroImage.title}</strong>
                    <p>{activeHeroImage.description ?? 'Foto publicada na galeria do espaço.'}</p>
                  </div>
                </div>

                {heroImages.length > 1 ? (
                  <div className="hl-thumbs" role="tablist" aria-label="Fotos em destaque do espaço">
                    {heroImages.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`hl-thumbs__item ${index === activeHeroIndex ? 'hl-thumbs__item--active' : ''}`}
                        onClick={() => setActiveHeroIndex(index)}
                        aria-label={`Mostrar foto ${item.title}`}
                      >
                        <img src={item.external_url ?? ''} alt={item.title} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ) : (
              <article className="hl-media-card hl-media-card--empty">
                <strong>Adicione imagens em destaque</strong>
                <p>Assim que você publicar fotos ativas na mídia do espaço, elas aparecerão aqui automaticamente.</p>
              </article>
            )}
          </div>
        </div>
      </section>

      <section className="hl-section">
        <div className="hl-shell">
          <div className="hl-section__header hl-section__header--compact">
            <div>
              <span className="hl-eyebrow">O essencial</span>
              <h2>Uma página mais limpa, profissional e intuitiva</h2>
            </div>
          </div>

          <div className="hl-card-grid hl-card-grid--three">
            {essentials.map((item) => (
              <article key={item.title} className="hl-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hl-section hl-section--soft">
        <div className="hl-shell hl-availability">
          <div>
            <span className="hl-eyebrow">Disponibilidade rápida</span>
            <h2>Leve o cliente para a agenda sem sobrecarregar a tela inicial</h2>
            <p>
              Em vez de muitos números e quadros, mostre apenas uma chamada clara para a consulta e algumas datas
              sugeridas para acelerar a decisão.
            </p>
          </div>

          <div className="hl-availability__panel">
            <strong>Próximas datas sugeridas</strong>
            <div className="hl-date-list">
              {nextAvailableDates.length > 0 ? (
                nextAvailableDates.map((date) => <span key={date}>{formatShortDate(date)}</span>)
              ) : (
                <span>Consulte a agenda completa</span>
              )}
            </div>
            <Link className="hl-btn hl-btn--primary hl-btn--full" to="/disponibilidade">
              Consultar agenda completa
            </Link>
          </div>
        </div>
      </section>

      <section className="hl-section">
        <div className="hl-shell">
          <div className="hl-section__header">
            <div>
              <span className="hl-eyebrow">Como funciona</span>
              <h2>Um fluxo simples do interesse até a reserva</h2>
            </div>
            <Link className="hl-inline-link" to="/como-funciona">
              Ver detalhes
            </Link>
          </div>

          <div className="hl-card-grid hl-card-grid--three">
            {bookingSteps.map((item, index) => (
              <article key={item.title} className="hl-card hl-card--step">
                <span className="hl-step-number">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hl-section">
        <div className="hl-shell">
          <div className="hl-section__header">
            <div>
              <span className="hl-eyebrow">Galeria</span>
              <h2>Fotos grandes e limpas, vindas direto do banco</h2>
            </div>
            <Link className="hl-inline-link" to="/galeria">
              Ver galeria completa
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Carregando galeria..." />
          ) : galleryPreview.length === 0 ? (
            <article className="hl-card hl-card--empty">
              <strong>Nenhuma imagem publicada ainda.</strong>
              <p>Publique as melhores fotos na área administrativa para preencher esta vitrine automaticamente.</p>
            </article>
          ) : (
            <div className="hl-gallery-grid">
              {galleryPreview.map((item, index) => (
                <article key={item.id} className={`hl-gallery-card ${index === 0 ? 'hl-gallery-card--large' : ''}`}>
                  <button type="button" className="hl-gallery-card__button" onClick={() => handleOpenLightbox(item.id)}>
                    <img src={item.external_url ?? ''} alt={item.title} className="hl-gallery-card__image" />
                    <span className="hl-gallery-card__overlay">
                      <strong>{item.title}</strong>
                      <span>Expandir foto</span>
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="hl-section hl-section--cta">
        <div className="hl-shell">
          <article className="hl-cta-card">
            <div>
              <span className="hl-eyebrow hl-eyebrow--light">Pronto para reservar</span>
              <h2>Uma landing page enxuta ajuda o visitante a decidir mais rápido</h2>
              <p>
                Esta versão mantém suas fotos reais, reduz o excesso de conteúdo e destaca apenas o que realmente ajuda a converter reserva.
              </p>
            </div>

            <div className="hl-actions hl-actions--cta">
              <Link className="hl-btn hl-btn--light" to="/disponibilidade">
                Consultar disponibilidade
              </Link>
              <Link className="hl-btn hl-btn--ghost" to="/espaco">
                Conhecer o espaço
              </Link>
            </div>
          </article>
        </div>
      </section>

      {lightboxIndex !== null ? (
        <ImageLightbox items={lightboxItems} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </main>
  )
}

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageLightbox, type LightboxItem } from '../../components/ui/ImageLightbox'
import { getFeaturedHeroVideo, getPosterImage, getVideoMimeType } from '../../lib/media'
import { getMonthBoundaries } from '../../lib/format'
import { getPublicCalendar } from '../../services/calendar.service'
import { fetchPublicMedia } from '../../services/media.service'
import type { CalendarDay, SpaceMedia } from '../../types/database'
import './HomePage.css'

const trustItems = ['Jardim Bonanza • Goiânia', 'Piscina coberta e aquecida', 'Atendimento rápido', 'Reserva com segurança']

const highlights = [
  'Área gourmet com churrasqueira',
  'Quartos, colchonetes e apoio completo',
  'Som ambiente e Wi‑Fi disponíveis',
  'Ideal para aniversários, encontros e confraternizações',
]

const essentials = [
  {
    title: 'Escolha um espaço que impressiona',
    description: 'Ambiente bonito, confortável e pronto para receber seus convidados com mais praticidade.',
  },
  {
    title: 'Veja fotos reais antes de decidir',
    description: 'A vitrine continua puxando as imagens reais do seu banco para o cliente enxergar o espaço como ele é.',
  },
  {
    title: 'Consulte a data sem complicação',
    description: 'O visitante entende rápido se a data está livre e já consegue seguir para atendimento.',
  },
]

const bookingSteps = [
  {
    title: 'Escolha a melhor data',
    description: 'Veja a agenda online e filtre rapidamente o que funciona melhor para o seu evento.',
  },
  {
    title: 'Peça seu atendimento',
    description: 'Envie seus dados e receba retorno para alinhar detalhes, valores e condições.',
  },
  {
    title: 'Confirme com tranquilidade',
    description: 'Depois da aprovação, sua reserva segue com organização, entrada e contrato.',
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [heroVideoFailed, setHeroVideoFailed] = useState(false)
  const [heroVideoReady, setHeroVideoReady] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadPage() {
      setLoading(true)
      const boundaries = getMonthBoundaries(new Date())

      const [mediaResult, calendarResult] = await Promise.allSettled([fetchPublicMedia(), getPublicCalendar(boundaries)])

      if (ignore) return

      setMedia(mediaResult.status === 'fulfilled' ? mediaResult.value : [])
      setCalendarEntries(calendarResult.status === 'fulfilled' ? calendarResult.value : [])
      setLoading(false)
    }

    loadPage()

    return () => {
      ignore = true
    }
  }, [])

  const imageItems = useMemo(() => media.filter((item) => item.type === 'image' && item.external_url), [media])

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

  const heroVideo = useMemo(() => getFeaturedHeroVideo(media), [media])
  const heroPoster = useMemo(() => getPosterImage(media), [media])
  const heroPosterUrl = heroPoster?.external_url ?? '/landing/hero.svg'

  useEffect(() => {
    setHeroVideoFailed(false)
    setHeroVideoReady(false)
  }, [heroVideo?.id])

  const nextAvailableDates = useMemo(() => {
    const blockedStatuses = new Set(['bloqueio_temporario', 'aguardando_pagamento', 'reservado'])
    const blockedDates = new Set(calendarEntries.filter((item) => blockedStatuses.has(item.status)).map((item) => item.event_date))

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
      <section className="hl-hero hl-hero--immersive">
        <div className="hl-hero__media-layer" aria-hidden="true">
          <div
            className={`hl-hero__poster hl-hero__poster--layer ${heroVideo?.external_url && !heroVideoFailed && heroVideoReady ? 'hl-hero__poster--hidden' : ''}`}
            style={{ backgroundImage: `url(${heroPosterUrl})` }}
          />

          {heroVideo?.external_url && !heroVideoFailed ? (
            <video
              key={heroVideo.id}
              className={`hl-hero__video ${heroVideoReady ? 'hl-hero__video--ready' : ''}`}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster={heroPosterUrl}
              onCanPlay={() => setHeroVideoReady(true)}
              onLoadedData={() => setHeroVideoReady(true)}
              onError={() => setHeroVideoFailed(true)}
            >
              <source src={heroVideo.external_url} type={getVideoMimeType(heroVideo.external_url)} />
            </video>
          ) : null}

          <div className="hl-hero__overlay" />
        </div>

        <div className="hl-shell hl-hero__grid hl-hero__grid--immersive">
          <div className="hl-copy hl-copy--hero">
            <div className="hl-trust-strip" aria-label="Pontos principais do espaço">
              {trustItems.map((item) => (
                <span key={item} className="hl-pill">
                  {item}
                </span>
              ))}
            </div>

            <span className="hl-eyebrow hl-eyebrow--light">Espaço de eventos 3Deventos</span>

            <h1 className="hl-title">Seu evento começa com uma primeira impressão inesquecível.</h1>

            <p className="hl-subtitle hl-subtitle--hero">
              Hero dinâmico com vídeo publicado no Supabase, fotos reais do espaço e um caminho simples para consultar disponibilidade e falar com a gente.
            </p>

            <div className="hl-actions">
              <Link className="hl-btn hl-btn--primary-light" to="/disponibilidade">
                Ver datas disponíveis
              </Link>
              <Link className="hl-btn hl-btn--glass" to="/galeria">
                Ver fotos do espaço
              </Link>
            </div>

            <div className="hl-quick-points hl-quick-points--hero">
              {highlights.map((item) => (
                <div key={item} className="hl-quick-points__item">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="hl-hero-bento">
            <article className="hl-glass-card">
              <span className="hl-glass-card__eyebrow">Disponibilidade</span>
              <h2>Próximas datas sugeridas</h2>
              <div className="hl-date-list hl-date-list--hero">
                {nextAvailableDates.length > 0 ? nextAvailableDates.map((date) => <span key={date}>{formatShortDate(date)}</span>) : <span>Consulte o calendário</span>}
              </div>
              <Link to="/disponibilidade" className="hl-inline-link hl-inline-link--light">
                Abrir calendário completo
              </Link>
            </article>

            <article className="hl-glass-card hl-glass-card--compact">
              <span className="hl-glass-card__eyebrow">Mídia dinâmica</span>
              <h3>{heroVideo && !heroVideoFailed ? heroVideo.title : heroPoster?.title ?? 'Hero com imagem padrão'}</h3>
              <p>
                {heroVideo && !heroVideoFailed
                  ? 'O vídeo do cabeçalho está vindo da sua mídia publicada. Se ele falhar, a página troca automaticamente para a imagem poster.'
                  : 'Nenhum vídeo ativo foi encontrado. A home usa a melhor imagem publicada como poster sem quebrar o layout.'}
              </p>
              <div className="hl-actions hl-actions--stack-mobile">
                <Link className="hl-btn hl-btn--glass" to="/espaco">
                  Conhecer o espaço
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="hl-section">
        <div className="hl-shell">
          <div className="hl-section__header hl-section__header--compact">
            <div>
              <span className="hl-eyebrow">Por que escolher</span>
              <h2>Um espaço completo</h2>
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
            <span className="hl-eyebrow">Disponibilidade</span>
            <h2>Consulte datas antes mesmo do primeiro contato</h2>
            <p>
              Ver a disponibilidade online transmite confiança e acelera a decisão. O cliente enxerga o cenário e já
              avança com muito mais clareza.
            </p>
          </div>

          <article className="hl-availability__panel">
            <strong>Próximas datas sugeridas</strong>
            <div className="hl-date-list">
              {nextAvailableDates.length > 0 ? nextAvailableDates.map((date) => <span key={date}>{formatShortDate(date)}</span>) : <span>Consulte o calendário</span>}
            </div>
            <Link to="/disponibilidade" className="hl-inline-link">
              Abrir calendário completo
            </Link>
          </article>
        </div>
      </section>

      <section className="hl-section">
        <div className="hl-shell">
          <div className="hl-section__header">
            <div>
              <span className="hl-eyebrow">Como reservar</span>
              <h2>Uma jornada simples para sair da visita até a confirmação</h2>
            </div>
          </div>

          <div className="hl-card-grid hl-card-grid--three">
            {bookingSteps.map((step, index) => (
              <article key={step.title} className="hl-card hl-card--step">
                <span className="hl-step-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hl-section hl-section--soft">
        <div className="hl-shell">
          <div className="hl-section__header">
            <div>
              <span className="hl-eyebrow">Galeria</span>
              <h2>Veja o espaço com fotos reais</h2>
            </div>
            <Link to="/galeria" className="hl-inline-link">
              Abrir galeria completa
            </Link>
          </div>

          {loading ? null : galleryPreview.length > 0 ? (
            <div className="hl-gallery-grid">
              {galleryPreview.map((item, index) => (
                <article key={item.id} className={`hl-gallery-card ${index === 0 ? 'hl-gallery-card--large' : ''}`}>
                  <button type="button" className="hl-gallery-card__button" onClick={() => handleOpenLightbox(item.id)}>
                    <img src={item.external_url ?? ''} alt={item.title} className="hl-media-card__image" />
                    <div className="hl-gallery-card__overlay">
                      <strong>{item.title}</strong>
                      <span>{item.description ?? 'Ambiente do espaço'}</span>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <article className="hl-card hl-card--empty">
              <h3>Confira agora o que oferecemos</h3>
            </article>
          )}
        </div>
      </section>

      <section className="hl-section">
        <div className="hl-shell">
          <article className="hl-cta-card">
            <div>
              <span className="hl-eyebrow hl-eyebrow--light">Pronto para reservar?</span>
              <h2>Escolha uma data, veja as fotos e fale com a gente para fechar seu evento.</h2>
              <p>Seu evento merece o melhor!</p>
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

      {lightboxIndex !== null ? <ImageLightbox items={lightboxItems} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} /> : null}
    </main>
  )
}

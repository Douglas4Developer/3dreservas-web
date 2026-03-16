import { useEffect, useMemo, useState } from 'react'
import { ImageLightbox, type LightboxItem } from '../../components/ui/ImageLightbox'
import { LoadingState } from '../../components/ui/LoadingState'
import { fetchPublicMedia } from '../../services/media.service'
import type { SpaceMedia } from '../../types/database'

export default function GalleryPage() {
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchPublicMedia().then(setMedia).finally(() => setLoading(false))
  }, [])

  const imageItems = useMemo(() => media.filter((item) => item.type === 'image' && item.external_url), [media])
  const videoItems = useMemo(() => media.filter((item) => item.type === 'video' && item.external_url), [media])

  const lightboxItems = useMemo<LightboxItem[]>(() => {
    return imageItems.map((item) => ({
      id: item.id,
      src: item.external_url!,
      title: item.title,
      description: item.description,
    }))
  }, [imageItems])

  function handleExpand(itemId: string) {
    const index = lightboxItems.findIndex((item) => item.id === itemId)
    if (index >= 0) setLightboxIndex(index)
  }

  return (
    <section className="section-block">
      <div className="container stack-lg">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Galeria do espaço</span>
            <h1>Fotos em destaque com experiência melhor no celular e no desktop</h1>
            <p>
              O visitante consegue navegar por imagens maiores, expandir em tela cheia e percorrer a galeria com toques, setas e miniaturas.
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Carregando galeria..." />
        ) : (
          <>
            {imageItems.length > 0 ? (
              <div className="gallery-preview-grid gallery-preview-grid--gallery-page">
                {imageItems.map((item, index) => (
                  <article key={item.id} className={`card media-card media-card--interactive ${index === 0 ? 'media-card--hero' : ''}`}>
                    <button type="button" className="media-card__button" onClick={() => handleExpand(item.id)}>
                      <img src={item.external_url ?? ''} alt={item.title} className="media-card__image" />
                      <span className="media-card__overlay">
                        <strong>{item.title}</strong>
                        <span>{item.description ?? 'Expandir imagem'}</span>
                      </span>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <article className="card empty-state-card">
                <strong>Nenhuma imagem publicada ainda.</strong>
                <p>Cadastre fotos da piscina, área gourmet e estrutura do espaço para fortalecer a decisão do cliente.</p>
              </article>
            )}

            {videoItems.length > 0 ? (
              <div className="stack-lg">
                <div className="section-heading section-heading--compact">
                  <div>
                    <span className="eyebrow">Vídeos</span>
                    <h2>Apresentações em vídeo</h2>
                  </div>
                </div>

                <div className="card-grid card-grid--two">
                  {videoItems.map((item) => (
                    <article key={item.id} className="card video-card video-card--featured">
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                      <div className="video-embed">
                        <iframe src={item.external_url ?? ''} title={item.title} allowFullScreen />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {lightboxIndex !== null ? (
        <ImageLightbox items={lightboxItems} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </section>
  )
}

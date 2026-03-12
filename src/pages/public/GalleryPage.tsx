import { useEffect, useState } from 'react'
import { LoadingState } from '../../components/ui/LoadingState'
import { fetchPublicMedia } from '../../services/media.service'
import type { SpaceMedia } from '../../types/database'

export default function GalleryPage() {
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicMedia().then(setMedia).finally(() => setLoading(false))
  }, [])

  return (
    <section className="section-block">
      <div className="container stack-lg">
        <div className="page-header">
          <div>
            <h1>Galeria do espaço</h1>
            <p>Fotos e vídeos para apoiar a negociação e valorizar a experiência do cliente.</p>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Carregando galeria..." />
        ) : (
          <div className="gallery-grid">
            {media.map((item) => (
              <article key={item.id} className="card media-card">
                {item.type === 'video' && item.external_url ? (
                  <div className="video-embed video-embed--compact">
                    <iframe src={item.external_url} title={item.title} allowFullScreen />
                  </div>
                ) : item.external_url ? (
                  <img src={item.external_url} alt={item.title} className="media-card__image" />
                ) : null}
                <div className="media-card__body">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

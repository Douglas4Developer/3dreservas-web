import { useEffect, useMemo, useState } from 'react'

export interface LightboxItem {
  id: string
  src: string
  title: string
  description?: string | null
}

interface ImageLightboxProps {
  items: LightboxItem[]
  initialIndex: number
  onClose: () => void
}

export function ImageLightbox({ items, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setCurrentIndex((value) => (value + 1) % items.length)
      if (event.key === 'ArrowLeft') setCurrentIndex((value) => (value - 1 + items.length) % items.length)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [items.length, onClose])

  const currentItem = useMemo(() => items[currentIndex], [currentIndex, items])

  if (!currentItem) return null

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null)
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX
    const distance = touchStartX - touchEndX

    if (distance > 40) {
      setCurrentIndex((value) => (value + 1) % items.length)
    }

    if (distance < -40) {
      setCurrentIndex((value) => (value - 1 + items.length) % items.length)
    }

    setTouchStartX(null)
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visualização ampliada da galeria">
      <button className="lightbox__backdrop" type="button" aria-label="Fechar galeria" onClick={onClose} />

      <div className="lightbox__panel" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <button className="lightbox__close" type="button" aria-label="Fechar" onClick={onClose}>
          ×
        </button>

        <div className="lightbox__media-shell">
          {items.length > 1 ? (
            <button
              className="lightbox__nav lightbox__nav--prev"
              type="button"
              aria-label="Imagem anterior"
              onClick={() => setCurrentIndex((value) => (value - 1 + items.length) % items.length)}
            >
              ‹
            </button>
          ) : null}

          <img className="lightbox__image" src={currentItem.src} alt={currentItem.title} />

          {items.length > 1 ? (
            <button
              className="lightbox__nav lightbox__nav--next"
              type="button"
              aria-label="Próxima imagem"
              onClick={() => setCurrentIndex((value) => (value + 1) % items.length)}
            >
              ›
            </button>
          ) : null}
        </div>

        <div className="lightbox__footer">
          <div>
            <div className="lightbox__counter">
              {currentIndex + 1} / {items.length}
            </div>
            <strong>{currentItem.title}</strong>
            {currentItem.description ? <p>{currentItem.description}</p> : null}
          </div>

          {items.length > 1 ? (
            <div className="lightbox__thumbs">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`lightbox__thumb ${index === currentIndex ? 'lightbox__thumb--active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Abrir imagem ${index + 1}`}
                >
                  <img src={item.src} alt={item.title} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

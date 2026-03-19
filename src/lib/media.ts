import type { SpaceMedia } from '../types/database'

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|m4v|mov)(?:$|[?#])/i

export function isDirectVideoUrl(url?: string | null): boolean {
  if (!url) return false

  if (DIRECT_VIDEO_PATTERN.test(url)) return true

  try {
    const parsedUrl = new URL(url)
    return DIRECT_VIDEO_PATTERN.test(parsedUrl.pathname)
  } catch {
    return false
  }
}

export function getVideoMimeType(url?: string | null) {
  if (!url) return 'video/mp4'
  const normalized = url.toLowerCase()
  if (normalized.includes('.webm')) return 'video/webm'
  if (normalized.includes('.ogg')) return 'video/ogg'
  if (normalized.includes('.mov')) return 'video/quicktime'
  if (normalized.includes('.m4v')) return 'video/x-m4v'
  return 'video/mp4'
}

export function getFeaturedHeroVideo(items: SpaceMedia[]) {
  const activeVideos = items.filter((item) => item.type === 'video' && item.external_url && item.active)
  const featuredVideos = activeVideos.filter((item) => item.is_featured)
  const orderedVideos = (featuredVideos.length > 0 ? featuredVideos : activeVideos).sort((a, b) => a.display_order - b.display_order)

  return orderedVideos.find((item) => isDirectVideoUrl(item.external_url)) ?? null
}

export function getPosterImage(items: SpaceMedia[]) {
  const imageItems = items.filter((item) => item.type === 'image' && item.external_url && item.active)
  const featuredImages = imageItems.filter((item) => item.is_featured)
  const orderedImages = (featuredImages.length > 0 ? featuredImages : imageItems).sort((a, b) => a.display_order - b.display_order)

  return orderedImages[0] ?? null
}

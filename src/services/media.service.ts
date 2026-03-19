import { mockSpace, mockSpaceMedia } from '../lib/mock'
import { sanitizeFileName } from '../lib/format'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { SpaceMedia, UpsertSpaceMediaInput } from '../types/database'

function sortMedia(items: SpaceMedia[]) {
  return [...items].sort((a, b) => a.display_order - b.display_order)
}

async function resolveDefaultSpaceId(spaceId?: string) {
  if (spaceId) return spaceId
  if (!isSupabaseConfigured || !supabase) return mockSpace.id

  const { data, error } = await supabase.from('spaces').select('id').eq('slug', '3deventos').maybeSingle()
  if (error) throw error
  return data?.id ?? mockSpace.id
}

function resolveMediaUrl(item: SpaceMedia) {
  if (!item.storage_path || !supabase) return item.external_url
  return supabase.storage.from('space-media').getPublicUrl(item.storage_path).data.publicUrl
}

export async function fetchPublicMedia(spaceId?: string): Promise<SpaceMedia[]> {
  const resolvedSpaceId = await resolveDefaultSpaceId(spaceId)

  if (!isSupabaseConfigured || !supabase) {
    return sortMedia(mockSpaceMedia.filter((item) => item.space_id === resolvedSpaceId && item.active))
  }

  const { data, error } = await supabase
    .from('space_media')
    .select('*')
    .eq('space_id', resolvedSpaceId)
    .eq('active', true)
    .order('display_order', { ascending: true })

  if (error) throw error

  return ((data ?? []) as SpaceMedia[]).map((item) => ({
    ...item,
    external_url: item.external_url ?? resolveMediaUrl(item),
  }))
}

export async function fetchAdminMedia(spaceId?: string): Promise<SpaceMedia[]> {
  const resolvedSpaceId = await resolveDefaultSpaceId(spaceId)

  if (!isSupabaseConfigured || !supabase) {
    return sortMedia(mockSpaceMedia.filter((item) => item.space_id === resolvedSpaceId))
  }

  const { data, error } = await supabase
    .from('space_media')
    .select('*')
    .eq('space_id', resolvedSpaceId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return ((data ?? []) as SpaceMedia[]).map((item) => ({
    ...item,
    external_url: item.external_url ?? resolveMediaUrl(item),
  }))
}

export async function saveExternalMedia(input: UpsertSpaceMediaInput): Promise<SpaceMedia> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: `media-${Date.now()}`,
      description: input.description ?? null,
      storage_path: null,
      external_url: input.external_url ?? null,
      thumbnail_path: input.thumbnail_path ?? null,
      display_order: input.display_order ?? 0,
      active: input.active ?? true,
      is_featured: input.is_featured ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...input,
    }
  }

  const payload = {
    ...input,
    description: input.description ?? null,
    external_url: input.external_url ?? null,
    thumbnail_path: input.thumbnail_path ?? null,
    display_order: input.display_order ?? 0,
    active: input.active ?? true,
    is_featured: input.is_featured ?? false,
  }

  if (input.id) {
    const { data, error } = await supabase.from('space_media').update(payload).eq('id', input.id).select('*').single()
    if (error) throw error
    return data as SpaceMedia
  }

  const { data, error } = await supabase.from('space_media').insert(payload).select('*').single()
  if (error) throw error
  return data as SpaceMedia
}

export async function uploadImageMedia(params: {
  file: File
  spaceId: string
  title: string
  description?: string
  displayOrder?: number
  active?: boolean
  isFeatured?: boolean
}): Promise<SpaceMedia> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: `media-upload-${Date.now()}`,
      space_id: params.spaceId,
      type: 'image',
      title: params.title,
      description: params.description ?? null,
      storage_path: null,
      external_url: URL.createObjectURL(params.file),
      thumbnail_path: null,
      display_order: params.displayOrder ?? 0,
      active: params.active ?? true,
      is_featured: params.isFeatured ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const extension = params.file.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}-${sanitizeFileName(params.file.name.replace(/\.[^.]+$/, ''))}.${extension}`
  const storagePath = `${params.spaceId}/${fileName}`

  const { error: uploadError } = await supabase.storage.from('space-media').upload(storagePath, params.file, {
    upsert: false,
  })

  if (uploadError) throw uploadError

  const publicUrl = supabase.storage.from('space-media').getPublicUrl(storagePath).data.publicUrl

  const { data, error } = await supabase
    .from('space_media')
    .insert({
      space_id: params.spaceId,
      type: 'image',
      title: params.title,
      description: params.description ?? null,
      storage_path: storagePath,
      external_url: publicUrl,
      display_order: params.displayOrder ?? 0,
      active: params.active ?? true,
      is_featured: params.isFeatured ?? false,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as SpaceMedia
}

export async function uploadVideoMedia(params: {
  file: File
  spaceId: string
  title: string
  description?: string
  displayOrder?: number
  active?: boolean
  isFeatured?: boolean
}): Promise<SpaceMedia> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: `media-video-upload-${Date.now()}`,
      space_id: params.spaceId,
      type: 'video',
      title: params.title,
      description: params.description ?? null,
      storage_path: null,
      external_url: URL.createObjectURL(params.file),
      thumbnail_path: null,
      display_order: params.displayOrder ?? 0,
      active: params.active ?? true,
      is_featured: params.isFeatured ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const extension = params.file.name.split('.').pop() || 'mp4'
  const fileName = `${Date.now()}-${sanitizeFileName(params.file.name.replace(/\.[^.]+$/, ''))}.${extension}`
  const storagePath = `${params.spaceId}/${fileName}`

  const { error: uploadError } = await supabase.storage.from('space-media').upload(storagePath, params.file, {
    upsert: false,
  })

  if (uploadError) throw uploadError

  const publicUrl = supabase.storage.from('space-media').getPublicUrl(storagePath).data.publicUrl

  const { data, error } = await supabase
    .from('space_media')
    .insert({
      space_id: params.spaceId,
      type: 'video',
      title: params.title,
      description: params.description ?? null,
      storage_path: storagePath,
      external_url: publicUrl,
      display_order: params.displayOrder ?? 0,
      active: params.active ?? true,
      is_featured: params.isFeatured ?? false,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as SpaceMedia
}

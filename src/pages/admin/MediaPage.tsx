import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { subscribeToTables } from '../../lib/realtime'
import { deleteMedia, fetchAdminMedia, resolveDefaultSpaceId, saveExternalMedia, uploadImageMedia } from '../../services/media.service'
import type { SpaceMedia } from '../../types/database'

interface ImageFormState {
  title: string
  description: string
  display_order: string
  file: File | null
  is_featured: boolean
  active: boolean
}

interface VideoFormState {
  title: string
  description: string
  external_url: string
  display_order: string
  is_featured: boolean
  active: boolean
}

export default function MediaPage() {
  const [spaceId, setSpaceId] = useState('')
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [imageForm, setImageForm] = useState<ImageFormState>({
    title: '',
    description: '',
    display_order: '0',
    file: null,
    is_featured: false,
    active: true,
  })
  const [videoForm, setVideoForm] = useState<VideoFormState>({
    title: '',
    description: '',
    external_url: '',
    display_order: '0',
    is_featured: false,
    active: true,
  })

  async function loadData() {
    setLoading(true)
    try {
      const [resolvedSpaceId, mediaData] = await Promise.all([resolveDefaultSpaceId(), fetchAdminMedia()])
      setSpaceId(resolvedSpaceId)
      setMedia(mediaData)
      setError(null)
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao carregar mídias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => subscribeToTables(['space_media'], () => void loadData()), [])

  const imagePreview = useMemo(() => (imageForm.file ? URL.createObjectURL(imageForm.file) : null), [imageForm.file])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    setImageForm((current) => ({
      ...current,
      file,
      title: current.title || file.name.replace(/\.[^.]+$/, ''),
    }))
  }

  async function handleImageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!imageForm.file) {
      setError('Selecione uma imagem para publicar.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await uploadImageMedia({
        file: imageForm.file,
        spaceId,
        title: imageForm.title,
        description: imageForm.description || undefined,
        displayOrder: Number(imageForm.display_order || 0),
        active: imageForm.active,
        isFeatured: imageForm.is_featured,
      })
      setSuccess('Imagem publicada com sucesso. O registro no banco foi criado automaticamente.')
      setImageForm({ title: '', description: '', display_order: '0', file: null, is_featured: false, active: true })
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao publicar imagem.')
    } finally {
      setSaving(false)
    }
  }

  async function handleVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await saveExternalMedia({
        space_id: spaceId,
        type: 'video',
        title: videoForm.title,
        description: videoForm.description || undefined,
        external_url: videoForm.external_url,
        display_order: Number(videoForm.display_order || 0),
        active: videoForm.active,
        is_featured: videoForm.is_featured,
      })
      setSuccess('Vídeo salvo com sucesso.')
      setVideoForm({ title: '', description: '', external_url: '', display_order: '0', is_featured: false, active: true })
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao salvar vídeo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickSave(item: SpaceMedia, patch: Partial<SpaceMedia>) {
    setEditingId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await saveExternalMedia({
        id: item.id,
        space_id: item.space_id,
        type: item.type,
        title: patch.title ?? item.title,
        description: patch.description ?? item.description ?? undefined,
        storage_path: item.storage_path ?? undefined,
        external_url: patch.external_url ?? item.external_url ?? undefined,
        thumbnail_path: item.thumbnail_path ?? undefined,
        display_order: patch.display_order ?? item.display_order,
        active: patch.active ?? item.active,
        is_featured: patch.is_featured ?? item.is_featured,
      })
      setSuccess('Mídia atualizada com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao atualizar mídia.')
    } finally {
      setEditingId(null)
    }
  }

  async function handleDelete(item: SpaceMedia) {
    const confirmed = window.confirm(`Remover a mídia "${item.title}"?`)
    if (!confirmed) return
    setEditingId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await deleteMedia(item)
      setSuccess('Mídia removida com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao remover mídia.')
    } finally {
      setEditingId(null)
    }
  }

  return (
    <div className="stack-lg">
      <PageHeader
        title="Mídia do espaço"
        description="Upload com arrastar e soltar, edição rápida, destaque da home e organização da galeria pública."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="dashboard-grid media-page-grid">
        <article className="card form-card">
          <h3>Nova imagem</h3>
          <div
            className={`dropzone ${dragOver ? 'dropzone--active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <strong>Arraste uma foto aqui</strong>
            <span>ou selecione um arquivo manualmente</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
            />
          </div>

          {imagePreview ? <img className="hero-banner-image" src={imagePreview} alt="Prévia da imagem" /> : null}

          <form className="form-grid" onSubmit={handleImageSubmit}>
            <label>
              Título
              <input value={imageForm.title} onChange={(event) => setImageForm((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label>
              Descrição
              <textarea rows={3} value={imageForm.description} onChange={(event) => setImageForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div className="inline-form-grid">
              <label>
                Ordem
                <input type="number" value={imageForm.display_order} onChange={(event) => setImageForm((current) => ({ ...current, display_order: event.target.value }))} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={imageForm.is_featured} onChange={(event) => setImageForm((current) => ({ ...current, is_featured: event.target.checked }))} />
                Destacar na home
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={imageForm.active} onChange={(event) => setImageForm((current) => ({ ...current, active: event.target.checked }))} />
                Ativa
              </label>
            </div>
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Publicando...' : 'Publicar imagem'}
            </button>
          </form>
        </article>

        <article className="card form-card">
          <h3>Novo vídeo externo</h3>
          <p>Para vídeos, use URL de embed do YouTube ou Vimeo. O bucket continua focado em imagens.</p>
          <form className="form-grid" onSubmit={handleVideoSubmit}>
            <label>
              Título
              <input value={videoForm.title} onChange={(event) => setVideoForm((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label>
              Descrição
              <textarea rows={3} value={videoForm.description} onChange={(event) => setVideoForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              URL embed
              <input value={videoForm.external_url} onChange={(event) => setVideoForm((current) => ({ ...current, external_url: event.target.value }))} required />
            </label>
            <div className="inline-form-grid">
              <label>
                Ordem
                <input type="number" value={videoForm.display_order} onChange={(event) => setVideoForm((current) => ({ ...current, display_order: event.target.value }))} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={videoForm.is_featured} onChange={(event) => setVideoForm((current) => ({ ...current, is_featured: event.target.checked }))} />
                Destacar na home
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={videoForm.active} onChange={(event) => setVideoForm((current) => ({ ...current, active: event.target.checked }))} />
                Ativo
              </label>
            </div>
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar vídeo'}
            </button>
          </form>
        </article>
      </div>

      <article className="card table-card">
        <h3>Mídias cadastradas</h3>
        <p className="table-helper">As mídias públicas aparecem porque existem no bucket e também possuem registro na tabela <strong>space_media</strong>.</p>
        {loading ? (
          <p>Carregando mídias...</p>
        ) : media.length === 0 ? (
          <p>Nenhuma mídia publicada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Título</th>
                <th>Ordem</th>
                <th>Configurações</th>
                <th>Preview</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {media.map((item) => (
                <tr key={item.id}>
                  <td>{item.type === 'image' ? 'Imagem' : 'Vídeo'}</td>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="table-helper">{item.description ?? '-'}</div>
                  </td>
                  <td>{item.display_order}</td>
                  <td>
                    <div className="stack-list compact-stack">
                      <span>{item.is_featured ? 'Destaque da home' : 'Galeria comum'}</span>
                      <span>{item.active ? 'Ativa' : 'Oculta'}</span>
                    </div>
                  </td>
                  <td>
                    {item.external_url ? (
                      <a href={item.external_url} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void handleQuickSave(item, { active: !item.active })}
                        disabled={editingId === item.id}
                      >
                        {item.active ? 'Ocultar' : 'Ativar'}
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          const nextTitle = window.prompt('Novo título da mídia:', item.title)
                          if (!nextTitle) return
                          void handleQuickSave(item, { title: nextTitle })
                        }}
                        disabled={editingId === item.id}
                      >
                        Editar título
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          const nextOrder = window.prompt('Nova ordem de exibição:', String(item.display_order))
                          if (nextOrder == null) return
                          void handleQuickSave(item, { display_order: Number(nextOrder) })
                        }}
                        disabled={editingId === item.id}
                      >
                        Alterar ordem
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void handleQuickSave(item, { is_featured: !item.is_featured })}
                        disabled={editingId === item.id}
                      >
                        {item.is_featured ? 'Remover destaque' : 'Destacar'}
                      </button>
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={editingId === item.id}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  )
}

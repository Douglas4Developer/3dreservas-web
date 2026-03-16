import { useEffect, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { getDefaultSpaceId } from '../../services/leads.service'
import { fetchAdminMedia, saveExternalMedia, uploadImageMedia } from '../../services/media.service'
import type { SpaceMedia } from '../../types/database'

export default function MediaPage() {
  const [spaceId, setSpaceId] = useState('')
  const [media, setMedia] = useState<SpaceMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    external_url: '',
    display_order: '0',
    is_featured: true,
  })
  const [imageForm, setImageForm] = useState({
    title: '',
    description: '',
    display_order: '0',
    is_featured: true,
    file: null as File | null,
  })

  async function loadData() {
    setLoading(true)
    try {
      const nextSpaceId = await getDefaultSpaceId()
      setSpaceId(nextSpaceId)
      const items = await fetchAdminMedia(nextSpaceId)
      setMedia(items)
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

  async function handleVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      await saveExternalMedia({
        space_id: spaceId,
        type: 'video',
        title: videoForm.title,
        description: videoForm.description || undefined,
        external_url: videoForm.external_url,
        display_order: Number(videoForm.display_order || '0'),
        active: true,
        is_featured: videoForm.is_featured,
      })
      setSuccess('Vídeo cadastrado com sucesso.')
      setVideoForm({ title: '', description: '', external_url: '', display_order: '0', is_featured: true })
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao salvar vídeo.')
    }
  }

  async function handleImageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      if (!imageForm.file) {
        throw new Error('Selecione uma imagem antes de enviar.')
      }

      await uploadImageMedia({
        file: imageForm.file,
        spaceId,
        title: imageForm.title,
        description: imageForm.description || undefined,
        displayOrder: Number(imageForm.display_order || '0'),
        active: true,
        isFeatured: imageForm.is_featured,
      })
      setSuccess('Imagem publicada com sucesso.')
      setImageForm({ title: '', description: '', display_order: '0', is_featured: true, file: null })
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao publicar imagem.')
    }
  }

  return (
    <div className="stack-lg">
      <PageHeader title="Mídia do espaço" description="Gerencie fotos, vídeos, ordem de exibição e itens em destaque da vitrine pública." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <div className="dashboard-grid">
        <article className="card form-card">
          <h3>Nova imagem</h3>
          <form className="form-grid" onSubmit={handleImageSubmit}>
            <label>
              Título
              <input value={imageForm.title} onChange={(event) => setImageForm((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label>
              Descrição
              <textarea rows={3} value={imageForm.description} onChange={(event) => setImageForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              Ordem de exibição
              <input type="number" value={imageForm.display_order} onChange={(event) => setImageForm((current) => ({ ...current, display_order: event.target.value }))} />
            </label>
            <label>
              Arquivo
              <input type="file" accept="image/*" onChange={(event) => setImageForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} required />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={imageForm.is_featured} onChange={(event) => setImageForm((current) => ({ ...current, is_featured: event.target.checked }))} />
              Destacar na home
            </label>
            <button className="button" type="submit">
              Publicar imagem
            </button>
          </form>
        </article>

        <article className="card form-card">
          <h3>Novo vídeo externo</h3>
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
            <label>
              Ordem de exibição
              <input type="number" value={videoForm.display_order} onChange={(event) => setVideoForm((current) => ({ ...current, display_order: event.target.value }))} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={videoForm.is_featured} onChange={(event) => setVideoForm((current) => ({ ...current, is_featured: event.target.checked }))} />
              Destacar na home
            </label>
            <button className="button" type="submit">
              Salvar vídeo
            </button>
          </form>
        </article>
      </div>

      <article className="card table-card">
        <h3>Mídias cadastradas</h3>
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
                <th>Destaque</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {media.map((item) => (
                <tr key={item.id}>
                  <td data-label="Tipo">{item.type}</td>
                  <td data-label="Título">
                    <strong>{item.title}</strong>
                    <div className="table-helper">{item.description ?? '-'}</div>
                  </td>
                  <td data-label="Ordem">{item.display_order}</td>
                  <td data-label="Destaque">{item.is_featured ? 'Sim' : 'Não'}</td>
                  <td data-label="Preview">
                    {item.external_url ? (
                      <a className="button button-secondary" href={item.external_url} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    ) : (
                      <span className="table-helper">Sem link</span>
                    )}
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

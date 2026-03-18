import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, formatDateRange, formatDateTime } from '../../lib/format'
import { fetchReservationLookupByToken } from '../../services/reservations.service'
import { registerPublicSignature } from '../../services/signatures.service'
import type { ReservationLookup } from '../../types/database'

export default function ContractPage() {
  const { token = '' } = useParams()
  const [lookup, setLookup] = useState<ReservationLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [form, setForm] = useState({ signer_name: '', signer_document: '' })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  async function loadLookup() {
    try {
      const data = await fetchReservationLookupByToken(token)
      setLookup(data)
      if (!data) setError('Contrato não encontrado.')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao carregar contrato.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLookup()
  }, [token])

  function setupCanvas() {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const rect = wrapper.getBoundingClientRect()
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = Math.max(Math.floor(rect.width * ratio), 1)
    canvas.height = Math.max(Math.floor(220 * ratio), 1)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = '220px'

    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, rect.width, 220)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2.2
    context.strokeStyle = '#0f172a'
  }

  useEffect(() => {
    if (loading) return
    setupCanvas()
    const onResize = () => setupCanvas()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [loading])

  const clientSignature = useMemo(
    () => lookup?.signatures.find((item) => item.signer_role === 'client') ?? null,
    [lookup],
  )

  function getPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function persistCanvasPreview() {
    const canvas = canvasRef.current
    if (!canvas) return
    setSignatureDataUrl(canvas.toDataURL('image/png'))
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const point = getPoint(event)
    if (!canvas || !context || !point) return

    event.preventDefault()
    isDrawingRef.current = true
    lastPointRef.current = point
    canvas.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.lineTo(point.x + 0.01, point.y + 0.01)
    context.stroke()
    setHasDrawn(true)
    persistCanvasPreview()
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const point = getPoint(event)
    const lastPoint = lastPointRef.current
    if (!canvas || !context || !point || !lastPoint) return

    event.preventDefault()
    context.beginPath()
    context.moveTo(lastPoint.x, lastPoint.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPointRef.current = point
    setHasDrawn(true)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    event.preventDefault()
    isDrawingRef.current = false
    lastPointRef.current = null
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    persistCanvasPreview()
  }

  function clearSignature() {
    setupCanvas()
    setHasDrawn(false)
    setSignatureDataUrl(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      if (!signatureDataUrl) {
        throw new Error('Desenhe a assinatura antes de enviar o contrato.')
      }

      await registerPublicSignature({
        token,
        signer_name: form.signer_name,
        signer_document: form.signer_document || undefined,
        signature_data_url: signatureDataUrl,
      })
      setSuccess('Assinatura registrada com sucesso. O administrador poderá concluir o contrato na sequência.')
      setForm({ signer_name: '', signer_document: '' })
      clearSignature()
      await loadLookup()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Não foi possível registrar a assinatura.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="section-block">
        <div className="container card">Carregando contrato...</div>
      </section>
    )
  }

  if (error || !lookup) {
    return (
      <section className="section-block">
        <div className="container card alert alert-error">{error ?? 'Contrato não encontrado.'}</div>
      </section>
    )
  }

  return (
    <section className="section-block">
      <div className="container page-grid page-grid--public">
        <article className="card details-card">
          <div className="line-card">
            <div>
              <h1>Contrato da reserva</h1>
              <p>
                Período: {formatDateRange(lookup.reservation.event_date, lookup.reservation.end_date)} • Total atualizado:{' '}
                {formatCurrency(lookup.reservation.total_amount)}
              </p>
            </div>
            {lookup.contract ? <StatusBadge status={lookup.contract.status} /> : null}
          </div>

          <div className="contract-preview">
            {lookup.contract?.html_content ? (
              <div dangerouslySetInnerHTML={{ __html: lookup.contract.html_content }} />
            ) : lookup.contract?.final_file_path || lookup.contract?.file_path ? (
              <a className="button button-secondary" href={lookup.contract.final_file_path ?? lookup.contract.file_path ?? '#'} target="_blank" rel="noreferrer">
                Abrir versão publicada do contrato
              </a>
            ) : (
              <p>O conteúdo do contrato ainda está sendo preparado.</p>
            )}
          </div>

          {lookup.addendums.length > 0 ? (
            <div className="stack-list" style={{ marginTop: 24 }}>
              <h2>Histórico de aditivos</h2>
              {lookup.addendums.map((addendum) => (
                <div className="line-card" key={addendum.id}>
                  <div>
                    <strong>Aditivo #{addendum.addendum_number}</strong>
                    <p>{formatDateRange(lookup.reservation.event_date, addendum.new_end_date)}</p>
                  </div>
                  <span className="status-badge status-reservado">+{formatCurrency(addendum.extra_amount)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <aside className="card details-card">
          <h2>Assinaturas</h2>
          <div className="stack-list">
            {lookup.signatures.map((signature) => {
              const preview = typeof signature.evidence_json?.signature_data_url === 'string' ? signature.evidence_json.signature_data_url : null
              return (
                <div className="signature-card" key={signature.id}>
                  <div className="line-card">
                    <div>
                      <strong>{signature.signer_name}</strong>
                      <p>{formatDateTime(signature.signed_at)}</p>
                    </div>
                    <span className="status-badge status-assinado">{signature.signer_role}</span>
                  </div>
                  {preview ? <img className="signature-preview-image" src={preview} alt={`Assinatura de ${signature.signer_name}`} /> : null}
                </div>
              )
            })}
          </div>

          {clientSignature ? (
            <div className="alert alert-success">Assinatura do cliente já registrada.</div>
          ) : (
            <form className="form-grid" onSubmit={handleSubmit}>
              <label>
                Nome completo
                <input
                  value={form.signer_name}
                  onChange={(event) => setForm((current) => ({ ...current, signer_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                CPF ou documento
                <input
                  value={form.signer_document}
                  onChange={(event) => setForm((current) => ({ ...current, signer_document: event.target.value }))}
                />
              </label>

              <div className="signature-card">
                <div>
                  <strong>Assinatura desenhada</strong>
                  <p>Assine no quadro abaixo usando o dedo ou o mouse.</p>
                </div>
                <div ref={wrapperRef}>
                  <canvas
                    ref={canvasRef}
                    className="signature-canvas"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                </div>
                <div className="contract-action-row">
                  <button className="button button-secondary" type="button" onClick={clearSignature}>
                    Limpar assinatura
                  </button>
                  <span className="table-helper">{hasDrawn ? 'Assinatura capturada.' : 'Ainda não assinou.'}</span>
                </div>
                {signatureDataUrl ? (
                  <div className="signature-preview-card">
                    <strong>Prévia</strong>
                    <img className="signature-preview-image" src={signatureDataUrl} alt="Prévia da assinatura" />
                  </div>
                ) : null}
              </div>

              {error ? <div className="alert alert-error">{error}</div> : null}
              {success ? <div className="alert alert-success">{success}</div> : null}
              <button className="button" type="submit" disabled={submitting || !signatureDataUrl}>
                {submitting ? 'Registrando...' : 'Assinar contrato'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  )
}

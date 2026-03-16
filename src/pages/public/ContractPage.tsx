import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDateTime } from '../../lib/format'
import { fetchReservationLookupByToken } from '../../services/reservations.service'
import { registerPublicSignature } from '../../services/signatures.service'
import type { ReservationLookup, Signature } from '../../types/database'

function normalizePhone(phone?: string | null) {
  return (phone ?? '').replace(/\D/g, '')
}

function maskIp(ip?: string | null) {
  if (!ip) return 'IP não identificado'
  if (ip.includes(',')) return maskIp(ip.split(',')[0]?.trim() ?? ip)
  const segments = ip.trim().split('.')
  if (segments.length === 4) return `${segments[0]}.${segments[1]}.***.***`
  return ip
}

function getSignatureImage(signature: Signature | null) {
  const image = signature?.evidence_json?.signature_data_url
  return typeof image === 'string' ? image : null
}

export default function ContractPage() {
  const { token = '' } = useParams()
  const [lookup, setLookup] = useState<ReservationLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasSignatureStroke, setHasSignatureStroke] = useState(false)
  const [form, setForm] = useState({ signer_name: '', signer_document: '' })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)

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

  const clientSignature = useMemo(
    () => lookup?.signatures.find((item) => item.signer_role === 'client') ?? null,
    [lookup],
  )

  const contractPdfUrl = lookup?.contract?.final_file_path ?? lookup?.contract?.file_path ?? null
  const shareUrl = contractPdfUrl ?? `${window.location.origin}/contrato/${token}`
  const whatsappUrl = `https://wa.me/55${normalizePhone(lookup?.reservation.customer_phone)}?text=${encodeURIComponent(
    `Olá! Segue o contrato da reserva do 3Deventos: ${shareUrl}`,
  )}`

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2.2
    context.strokeStyle = '#111827'
    setHasSignatureStroke(false)
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const width = canvas.offsetWidth || 640
    const height = 220

    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (!context) return

    context.scale(ratio, ratio)
    clearCanvas()
  }, [clearCanvas])

  useEffect(() => {
    if (clientSignature) return
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [clientSignature, resizeCanvas])

  function getCoordinates(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const coordinates = getCoordinates(event)
    if (!canvas || !context || !coordinates) return

    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(coordinates.x, coordinates.y)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext('2d')
    const coordinates = getCoordinates(event)
    if (!context || !coordinates) return

    context.lineTo(coordinates.x, coordinates.y)
    context.stroke()
    if (!hasSignatureStroke) setHasSignatureStroke(true)
  }

  function finishDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    canvasRef.current?.releasePointerCapture(event.pointerId)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const signatureDataUrl = canvasRef.current?.toDataURL('image/png')
      if (!hasSignatureStroke || !signatureDataUrl) {
        throw new Error('Desenhe sua assinatura no quadro antes de continuar.')
      }

      const result = await registerPublicSignature({
        token,
        signer_name: form.signer_name,
        signer_document: form.signer_document || undefined,
        signature_data_url: signatureDataUrl,
      })

      setSuccess('Assinatura registrada com sucesso. O PDF foi atualizado e a data da reserva ficou bloqueada para edição.')
      setForm({ signer_name: '', signer_document: '' })
      if (result.pdfUrl) {
        window.open(result.pdfUrl, '_blank', 'noopener,noreferrer')
      }
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
              <p>Depois da assinatura, o sistema registra IP, data/hora, atualiza o PDF e trava a data do evento.</p>
            </div>
            {lookup.contract ? <StatusBadge status={lookup.contract.status} /> : null}
          </div>

          <div className="contract-action-row">
            {contractPdfUrl ? (
              <a className="button button-secondary" href={contractPdfUrl} target="_blank" rel="noreferrer">
                Baixar PDF automático
              </a>
            ) : null}
            <a className="button button-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
              Enviar contrato no WhatsApp
            </a>
          </div>

          <div className="contract-preview">
            {lookup.contract?.html_content ? (
              <div dangerouslySetInnerHTML={{ __html: lookup.contract.html_content }} />
            ) : lookup.contract?.file_path ? (
              <a className="button button-secondary" href={lookup.contract.file_path} target="_blank" rel="noreferrer">
                Abrir versão publicada do contrato
              </a>
            ) : (
              <p>O contrato ainda não foi liberado. Se você já pagou a entrada, aguarde a liberação pelo administrador.</p>
            )}
          </div>
        </article>

        <aside className="card details-card">
          <h2>Assinaturas</h2>
          <div className="stack-list">
            {lookup.signatures.map((signature) => (
              <div className="line-card" key={signature.id}>
                <div>
                  <strong>{signature.signer_name}</strong>
                  <p>{formatDateTime(signature.signed_at)}</p>
                  <p className="table-helper">IP: {maskIp(signature.ip_address)}</p>
                </div>
                <span className="status-badge status-assinado">{signature.signer_role}</span>
              </div>
            ))}
          </div>

          {clientSignature ? (
            <div className="stack-list">
              <div className="alert alert-success">
                Assinatura do cliente registrada em {formatDateTime(clientSignature.signed_at)}. A data da reserva já está bloqueada.
              </div>
              {getSignatureImage(clientSignature) ? (
                <div className="signature-preview-card">
                  <span>Assinatura registrada</span>
                  <img src={getSignatureImage(clientSignature) ?? ''} alt="Assinatura do cliente" className="signature-preview-image" />
                </div>
              ) : null}
            </div>
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
                <div className="line-card">
                  <div>
                    <strong>Assinatura desenhada</strong>
                    <p>Assine com mouse ou dedo no celular.</p>
                  </div>
                  <button className="button button-secondary" type="button" onClick={clearCanvas}>
                    Limpar
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  className="signature-canvas"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrawing}
                  onPointerLeave={finishDrawing}
                />
              </div>

              <div className="audit-card">
                <strong>Selo eletrônico</strong>
                <span>Data/hora da assinatura: gerada automaticamente</span>
                <span>IP e navegador: registrados no momento da assinatura</span>
                <span>Data do evento: bloqueada após a assinatura</span>
              </div>

              {error ? <div className="alert alert-error">{error}</div> : null}
              {success ? <div className="alert alert-success">{success}</div> : null}
              <button className="button" type="submit" disabled={submitting}>
                {submitting ? 'Registrando...' : 'Assinar contrato'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  )
}

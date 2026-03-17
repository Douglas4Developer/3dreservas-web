import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
  const [form, setForm] = useState({ signer_name: '', signer_document: '' })

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await registerPublicSignature({
        token,
        signer_name: form.signer_name,
        signer_document: form.signer_document || undefined,
      })
      setSuccess('Assinatura registrada com sucesso. O administrador poderá concluir o contrato na sequência.')
      setForm({ signer_name: '', signer_document: '' })
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
            ) : lookup.contract?.file_path ? (
              <a className="button button-secondary" href={lookup.contract.file_path} target="_blank" rel="noreferrer">
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
            {lookup.signatures.map((signature) => (
              <div className="line-card" key={signature.id}>
                <div>
                  <strong>{signature.signer_name}</strong>
                  <p>{formatDateTime(signature.signed_at)}</p>
                </div>
                <span className="status-badge status-assinado">{signature.signer_role}</span>
              </div>
            ))}
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

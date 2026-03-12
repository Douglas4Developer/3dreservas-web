import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCountdown, formatCurrency, formatDate } from '../../lib/format'
import { fetchReservationLookupByToken } from '../../services/reservations.service'
import type { ReservationLookup } from '../../types/database'

export default function ProposalPage() {
  const { token = '' } = useParams()
  const [lookup, setLookup] = useState<ReservationLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchReservationLookupByToken(token)
      .then((data) => {
        setLookup(data)
        if (!data) setError('Proposta não encontrada.')
      })
      .catch((serviceError) => setError(serviceError.message || 'Erro ao carregar a proposta.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <section className="section-block">
        <div className="container card">Carregando proposta...</div>
      </section>
    )
  }

  if (error || !lookup) {
    return (
      <section className="section-block">
        <div className="container card alert alert-error">{error ?? 'Proposta não encontrada.'}</div>
      </section>
    )
  }

  return (
    <section className="section-block">
      <div className="container page-grid page-grid--public">
        <article className="card details-card">
          <h1>Resumo da proposta</h1>
          <div className="details-grid">
            <div>
              <span>Cliente</span>
              <strong>{lookup.reservation.customer_name}</strong>
            </div>
            <div>
              <span>Data do evento</span>
              <strong>{formatDate(lookup.reservation.event_date)}</strong>
            </div>
            <div>
              <span>Valor total</span>
              <strong>{formatCurrency(lookup.reservation.total_amount)}</strong>
            </div>
            <div>
              <span>Entrada</span>
              <strong>{formatCurrency(lookup.reservation.entry_amount)}</strong>
            </div>
          </div>
          <p>
            Enquanto o pagamento estiver pendente e dentro do prazo, a data fica bloqueada para você finalizar a reserva.
          </p>
        </article>

        <article className="card details-card">
          <h2>Link de pagamento</h2>
          {lookup.activePaymentOrder ? (
            <>
              <div className="line-card">
                <div>
                  <strong>{formatCurrency(lookup.activePaymentOrder.amount)}</strong>
                  <p>Expiração em {formatCountdown(lookup.activePaymentOrder.expires_at)}</p>
                </div>
                <StatusBadge status={lookup.activePaymentOrder.status} />
              </div>
              {lookup.activePaymentOrder.checkout_url ? (
                <a className="button" href={lookup.activePaymentOrder.checkout_url} target="_blank" rel="noreferrer">
                  Pagar entrada
                </a>
              ) : (
                <p>O link ainda está sendo gerado.</p>
              )}
            </>
          ) : (
            <p>Não há checkout pendente para esta proposta.</p>
          )}
        </article>
      </div>
    </section>
  )
}

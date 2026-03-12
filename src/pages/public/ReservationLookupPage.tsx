import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format'
import { fetchReservationLookupByToken } from '../../services/reservations.service'
import type { ReservationLookup } from '../../types/database'

export default function ReservationLookupPage() {
  const { token = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [lookup, setLookup] = useState<ReservationLookup | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchReservationLookupByToken(token)
      .then((data) => {
        setLookup(data)
        if (!data) setError('Nenhuma reserva encontrada para esse link.')
      })
      .catch((serviceError) => setError(serviceError.message || 'Erro ao consultar a reserva.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <section className="section-block">
        <div className="container">
          <div className="card">Carregando reserva...</div>
        </div>
      </section>
    )
  }

  if (error || !lookup) {
    return (
      <section className="section-block">
        <div className="container">
          <div className="card alert alert-error">{error ?? 'Reserva não encontrada.'}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="section-block">
      <div className="container page-grid page-grid--public">
        <article className="card details-card">
          <h1>Consulta da reserva</h1>
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
              <span>Status da reserva</span>
              <StatusBadge status={lookup.reservation.status} />
            </div>
            <div>
              <span>Valor total</span>
              <strong>{formatCurrency(lookup.reservation.total_amount)}</strong>
            </div>
            <div>
              <span>Entrada</span>
              <strong>{formatCurrency(lookup.reservation.entry_amount)}</strong>
            </div>
            <div>
              <span>Última atualização</span>
              <strong>{formatDateTime(lookup.reservation.updated_at)}</strong>
            </div>
          </div>
        </article>

        <article className="card details-card">
          <h2>Pagamento</h2>
          {lookup.payments.length === 0 ? (
            <p>Nenhum pagamento cadastrado ainda.</p>
          ) : (
            <div className="stack-list">
              {lookup.payments.map((payment) => (
                <div className="line-card" key={payment.id}>
                  <div>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <p>
                      {payment.provider ?? 'Sem provedor'} • {payment.provider_reference ?? 'Sem referência'}
                    </p>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
              ))}
            </div>
          )}

          <h2>Contrato</h2>
          {lookup.contract ? (
            <div className="stack-list">
              <div className="line-card">
                <div>
                  <strong>Versão {lookup.contract.version}</strong>
                  <p>Status atual do contrato</p>
                </div>
                <StatusBadge status={lookup.contract.status} />
              </div>
              {lookup.contract.file_path ? (
                <a className="button" href={lookup.contract.file_path} target="_blank" rel="noreferrer">
                  Abrir contrato
                </a>
              ) : (
                <p>O arquivo final ainda não foi publicado.</p>
              )}
            </div>
          ) : (
            <p>Contrato ainda não gerado para esta reserva.</p>
          )}
        </article>
      </div>
    </section>
  )
}

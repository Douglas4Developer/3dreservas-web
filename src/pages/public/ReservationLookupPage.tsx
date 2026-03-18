import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { describeReservationDays, formatCountdown, formatCurrency, formatDateRange, formatDateTime } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { fetchReservationLookupByToken } from '../../services/reservations.service'
import type { ReservationLookup } from '../../types/database'

export default function ReservationLookupPage() {
  const { token = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [lookup, setLookup] = useState<ReservationLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  function showToast(message: string) {
    setToast(message)
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 5000)
  }

  async function loadLookup(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false

    if (!silent) {
      setLoading(true)
    }

    try {
      const data = await fetchReservationLookupByToken(token)

      setLookup((current) => {
        if (current && data) {
          const paymentWasPending = current.payments.some((payment) => payment.status === 'pendente')
          const paymentIsPaid = data.payments.some((payment) => payment.status === 'pago')
          const orderWasPending = current.activePaymentOrder?.status === 'pending'
          const orderIsPaid = data.activePaymentOrder?.status === 'paid'
          const reservationBecameReserved = current.reservation.status !== 'reservado' && data.reservation.status === 'reservado'
          const contractJustBecameAvailable = !current.contract && !!data.contract

          if ((paymentWasPending && paymentIsPaid) || (orderWasPending && orderIsPaid)) {
            showToast('Pagamento confirmado! Sua reserva foi atualizada.')
          } else if (reservationBecameReserved) {
            showToast('Reserva confirmada com sucesso.')
          } else if (contractJustBecameAvailable) {
            showToast('Contrato liberado para visualização e assinatura.')
          }
        }

        return data
      })

      setError(data ? null : 'Nenhuma reserva encontrada para esse link.')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao consultar a reserva.')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadLookup()
  }, [token])

  const shouldUseFastPolling = useMemo(() => {
    if (!lookup) return true

    const hasPendingPaymentOrder = Boolean(lookup.activePaymentOrder && lookup.activePaymentOrder.status === 'pending')
    const hasPendingPayment = lookup.payments.some((payment) => payment.status === 'pendente')
    const contractNotAvailableYet = !lookup.contract

    return hasPendingPaymentOrder || hasPendingPayment || contractNotAvailableYet
  }, [lookup])

  useEffect(() => {
    if (!token) return

    const unsubscribe = subscribeToTables(['reservations', 'payments', 'payment_orders', 'contracts', 'signatures'], () => {
      void loadLookup({ silent: true })
    })

    const runRefresh = () => {
      void loadLookup({ silent: true })
    }

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }

    intervalRef.current = window.setInterval(runRefresh, shouldUseFastPolling ? 2000 : 5000)

    const handleFocus = () => runRefresh()
    const handleVisibilityChange = () => {
      if (!document.hidden) runRefresh()
    }
    const handleOnline = () => runRefresh()

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      unsubscribe()
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [token, shouldUseFastPolling])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

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
        {toast ? <div className="toast-notification toast-notification--success">{toast}</div> : null}

        <article className="card details-card">
          <h1>Consulta da reserva</h1>
          <div className="details-grid">
            <div>
              <span>Cliente</span>
              <strong>{lookup.reservation.customer_name}</strong>
            </div>
            <div>
              <span>Período</span>
              <strong>{formatDateRange(lookup.reservation.event_date, lookup.reservation.end_date)}</strong>
            </div>
            <div>
              <span>Duração</span>
              <strong>{describeReservationDays(lookup.reservation.event_date, lookup.reservation.end_date, lookup.reservation.days_count)}</strong>
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
              <span>Saldo restante</span>
              <strong>{formatCurrency(lookup.reservation.remaining_amount)}</strong>
            </div>
            <div>
              <span>Última atualização</span>
              <strong>{formatDateTime(lookup.reservation.updated_at)}</strong>
            </div>
          </div>
        </article>

        <article className="card details-card">
          <h2>Checkout da entrada</h2>
          {lookup.activePaymentOrder ? (
            <div className="stack-list">
              <div className="line-card">
                <div>
                  <strong>{formatCurrency(lookup.activePaymentOrder.amount)}</strong>
                  <p>Expira em {formatCountdown(lookup.activePaymentOrder.expires_at)}</p>
                </div>
                <StatusBadge status={lookup.activePaymentOrder.status} />
              </div>
              {lookup.activePaymentOrder.checkout_url ? (
                <a className="button" href={lookup.activePaymentOrder.checkout_url} target="_blank" rel="noreferrer">
                  Ir para o pagamento
                </a>
              ) : (
                <p>O link de pagamento ainda está sendo preparado.</p>
              )}
            </div>
          ) : (
            <p>Nenhum checkout pendente para esta reserva.</p>
          )}

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
                  <p>Status atual do documento</p>
                </div>
                <StatusBadge status={lookup.contract.status} />
              </div>
              {lookup.contract.file_path ? (
                <a className="button button-secondary" href={lookup.contract.file_path} target="_blank" rel="noreferrer">
                  Abrir contrato
                </a>
              ) : (
                <p>O arquivo final ainda não foi publicado.</p>
              )}
            </div>
          ) : (
            <p>Contrato ainda não gerado para esta reserva.</p>
          )}

          {lookup.addendums.length > 0 ? (
            <>
              <h2>Aditivos</h2>
              <div className="stack-list">
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
            </>
          ) : null}
        </article>
      </div>
    </section>
  )
}

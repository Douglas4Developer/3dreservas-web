/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCountdown, formatCurrency, formatDate, formatDateTime } from '../../lib/format'
import { fetchReservationLookupByToken } from '../../services/reservations.service'
import type { ReservationLookup, Payment } from '../../types/database'

function getPaymentMethodLabel(payment: Payment) {
  if (payment.payment_method_type === 'bank_transfer') return 'Pix'
  if (payment.payment_method_type === 'credit_card') return 'Cartão de crédito'
  if (payment.payment_method_type === 'debit_card') return 'Cartão de débito'
  if (payment.payment_method_label === 'pix_manual') return 'Pix manual'
  return payment.payment_method_label ?? payment.provider ?? '-'
}

export default function ReservationLookupPage() {
  const { token = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [lookup, setLookup] = useState<ReservationLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  const latestPayment = useMemo(() => {
    if (!lookup?.payments?.length) return null
    return [...lookup.payments].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  }, [lookup])

  async function copyPixCode(code?: string | null) {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

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

  const activeOrder = lookup.activePaymentOrder
  const activeOrderIsPix = activeOrder?.checkout_type === 'pix'

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
              <span>Telefone</span>
              <strong>{lookup.reservation.customer_phone}</strong>
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
              <span>Tipo de evento</span>
              <strong>{lookup.reservation.event_type ?? 'Evento privado'}</strong>
            </div>
            <div>
              <span>Horário</span>
              <strong>
                {lookup.reservation.period_start} às {lookup.reservation.period_end}
              </strong>
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
        </article>

        <article className="card details-card">
          <h2>Pagamento da entrada</h2>

          {activeOrder ? (
            <div className="stack-list">
              <div className="line-card">
                <div>
                  <strong>{formatCurrency(activeOrder.amount)}</strong>
                  <p>Expira em {formatCountdown(activeOrder.expires_at)}</p>
                  <p>
                    Tipo de checkout:{' '}
                    {activeOrder.checkout_type === 'pix' ? 'Pix' : activeOrder.checkout_type === 'card' ? 'Cartão' : 'Pix ou cartão'}
                  </p>
                </div>
                <StatusBadge status={activeOrder.status} />
              </div>

              {activeOrderIsPix ? (
                <div className="pix-payment-card">
                  <h3>Pague com Pix</h3>
                  {activeOrder.qr_code_base64 ? (
                    <img
                      className="pix-qr-image"
                      src={`data:image/png;base64,${activeOrder.qr_code_base64}`}
                      alt="QR Code Pix"
                    />
                  ) : null}
                  {activeOrder.pix_copy_paste ? (
                    <>
                      <label>
                        Código copia e cola
                        <textarea readOnly rows={4} value={activeOrder.pix_copy_paste} />
                      </label>
                      <button className="button" type="button" onClick={() => void copyPixCode(activeOrder.pix_copy_paste)}>
                        {copied ? 'Código copiado!' : 'Copiar código Pix'}
                      </button>
                    </>
                  ) : (
                    <p>O código Pix ainda está sendo preparado.</p>
                  )}
                </div>
              ) : activeOrder.checkout_url ? (
                <a className="button" href={activeOrder.checkout_url} target="_blank" rel="noreferrer">
                  Ir para o pagamento
                </a>
              ) : (
                <p>O link de pagamento ainda está sendo preparado.</p>
              )}
            </div>
          ) : latestPayment ? (
            <div className="alert alert-success">
              Entrada já confirmada.<br />
              Método: {getPaymentMethodLabel(latestPayment)}
            </div>
          ) : (
            <p>Nenhum checkout pendente para esta reserva.</p>
          )}

          <h2>Histórico de pagamentos</h2>
          {lookup.payments.length === 0 ? (
            <p>Nenhum pagamento cadastrado ainda.</p>
          ) : (
            <div className="stack-list">
              {lookup.payments.map((payment) => (
                <div className="line-card" key={payment.id}>
                  <div>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <p>Método: {getPaymentMethodLabel(payment)}</p>
                    <p>Referência: {payment.provider_reference ?? 'Sem referência'}</p>
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
                <a className="button button-secondary" href={lookup.contract.file_path} target="_blank" rel="noreferrer">
                  Abrir contrato
                </a>
              ) : lookup.contract.html_content ? (
                <div className="contract-preview" dangerouslySetInnerHTML={{ __html: lookup.contract.html_content }} />
              ) : (
                <p>O arquivo final ainda não foi publicado.</p>
              )}
            </div>
          ) : (
            <p>Contrato ainda não gerado para esta reserva.</p>
          )}

          <h2>Última atualização</h2>
          <p>{formatDateTime(lookup.reservation.updated_at)}</p>
        </article>
      </div>
    </section>
  )
}

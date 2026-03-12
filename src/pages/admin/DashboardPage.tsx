import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, formatDate } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { fetchDashboardSummary } from '../../services/dashboard.service'
import { fetchPendingPaymentOrders } from '../../services/payment-orders.service'
import { fetchPendingPayments } from '../../services/payments.service'
import { fetchReservations } from '../../services/reservations.service'
import { fetchWhatsappMessages } from '../../services/whatsapp.service'
import type { DashboardSummary, Payment, PaymentOrder, Reservation } from '../../types/database'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [pendingPaymentOrders, setPendingPaymentOrders] = useState<PaymentOrder[]>([])
  const [recentMessagesCount, setRecentMessagesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const [nextSummary, nextReservations, nextPendingPayments, nextPaymentOrders, nextMessages] = await Promise.all([
        fetchDashboardSummary(),
        fetchReservations(),
        fetchPendingPayments(),
        fetchPendingPaymentOrders(),
        fetchWhatsappMessages(),
      ])
      setSummary(nextSummary)
      setReservations(nextReservations.slice(0, 5))
      setPendingPayments(nextPendingPayments)
      setPendingPaymentOrders(nextPaymentOrders.slice(0, 5))
      setRecentMessagesCount(nextMessages.length)
      setError(null)
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(
    () => subscribeToTables(['reservations', 'payments', 'payment_orders', 'contracts', 'whatsapp_messages'], () => void loadData()),
    [],
  )

  return (
    <div className="stack-lg">
      <PageHeader title="Dashboard operacional" description="Visão rápida da agenda, pagamentos, contratos, mídia e comunicação." />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading || !summary ? (
        <div className="card">Carregando indicadores...</div>
      ) : (
        <div className="card-grid card-grid--six">
          <StatCard label="Interesses" value={summary.totalLeads} hint="Leads recebidos" />
          <StatCard label="Reservas" value={summary.totalReservations} hint="Todas as reservas" />
          <StatCard label="Confirmadas" value={summary.confirmedReservations} hint="Status reservado" />
          <StatCard label="Checkouts pendentes" value={summary.activePaymentOrders} hint="Links ativos no momento" />
          <StatCard label="Mídias ativas" value={summary.mediaItems} hint="Fotos e vídeos publicados" />
          <StatCard label="Ocupação" value={`${summary.occupancyRate}%`} hint={`WhatsApp recente: ${recentMessagesCount}`} />
        </div>
      )}

      <div className="dashboard-grid">
        <article className="card">
          <h3>Próximas reservas</h3>
          <div className="stack-list">
            {reservations.length === 0 ? (
              <p>Nenhuma reserva cadastrada.</p>
            ) : (
              reservations.map((reservation) => (
                <div className="line-card" key={reservation.id}>
                  <div>
                    <strong>{reservation.customer_name}</strong>
                    <p>
                      {formatDate(reservation.event_date)} • {formatCurrency(reservation.total_amount)}
                    </p>
                  </div>
                  <StatusBadge status={reservation.status} />
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <h3>Links de pagamento ativos</h3>
          <div className="stack-list">
            {pendingPaymentOrders.length === 0 ? (
              <p>Nenhum checkout pendente no momento.</p>
            ) : (
              pendingPaymentOrders.map((order) => (
                <div className="line-card" key={order.id}>
                  <div>
                    <strong>{formatCurrency(order.amount)}</strong>
                    <p>{order.provider_external_id ?? order.provider}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="card">
        <h3>Pagamentos aguardando ação interna</h3>
        <div className="stack-list">
          {pendingPayments.length === 0 ? (
            <p>Nenhum pagamento pendente no momento.</p>
          ) : (
            pendingPayments.map((payment) => (
              <div className="line-card" key={payment.id}>
                <div>
                  <strong>{formatCurrency(payment.amount)}</strong>
                  <p>{payment.provider_reference ?? payment.provider ?? 'Sem referência'}</p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  )
}

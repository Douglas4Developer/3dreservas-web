import { useEffect, useMemo, useState } from 'react'
import { AdminCalendar } from '../../components/calendar/AdminCalendar'
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
  const [referenceDate, setReferenceDate] = useState(new Date())
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
      setReservations(nextReservations)
      setPendingPayments(nextPendingPayments)
      setPendingPaymentOrders(nextPaymentOrders.slice(0, 6))
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

  const upcomingReservations = useMemo(
    () => [...reservations].sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 6),
    [reservations],
  )

  return (
    <div className="stack-lg">
      <PageHeader
        title="Dashboard estilo Airbnb"
        description="Ocupação do mês, receita prevista, pagamentos ativos, reservas futuras e comunicação recente em uma visão única."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading || !summary ? (
        <div className="card">Carregando indicadores...</div>
      ) : (
        <>
          <div className="card-grid card-grid--six">
            <StatCard label="Ocupação" value={`${summary.occupancyRate}%`} hint={`${summary.bookedDays} dias ocupados / ${summary.availableDays} livres`} />
            <StatCard label="Receita prevista" value={formatCurrency(summary.projectedRevenue)} hint="Total das reservas lançadas" />
            <StatCard label="Entrada confirmada" value={formatCurrency(summary.confirmedRevenue)} hint="Pagamentos aprovados ou confirmados" />
            <StatCard label="Ticket médio" value={formatCurrency(summary.averageTicket)} hint="Média por reserva" />
            <StatCard label="Leads" value={summary.totalLeads} hint={`WhatsApp recente: ${recentMessagesCount}`} />
            <StatCard label="Contratos pendentes" value={summary.pendingContracts} hint={`${summary.pendingPayments} pagamentos aguardando ação`} />
          </div>

          <div className="dashboard-airbnb-grid">
            <article className="card stack-lg">
              <div className="calendar-card__header">
                <div>
                  <h3>Mapa de ocupação</h3>
                  <p>Leitura visual da agenda com todos os status internos do administrativo.</p>
                </div>
                <div className="month-navigation">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setReferenceDate(new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1))}
                  >
                    Mês anterior
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setReferenceDate(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1))}
                  >
                    Próximo mês
                  </button>
                </div>
              </div>
              <AdminCalendar referenceDate={referenceDate} reservations={reservations} />
            </article>

            <div className="stack-lg">
              <article className="card">
                <h3>Próximas reservas</h3>
                <div className="stack-list">
                  {upcomingReservations.length === 0 ? (
                    <p>Nenhuma reserva cadastrada.</p>
                  ) : (
                    upcomingReservations.map((reservation) => (
                      <div className="line-card" key={reservation.id}>
                        <div>
                          <strong>{reservation.customer_name}</strong>
                          <p>
                            {formatDate(reservation.event_date)} • {reservation.event_type ?? 'Evento privado'}
                          </p>
                        </div>
                        <div className="stack-list compact-stack right-align-stack">
                          <StatusBadge status={reservation.status} />
                          <span className="table-helper">{formatCurrency(reservation.total_amount)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="card">
                <h3>Pagamentos online ativos</h3>
                <div className="stack-list">
                  {pendingPaymentOrders.length === 0 ? (
                    <p>Nenhum checkout ou Pix pendente no momento.</p>
                  ) : (
                    pendingPaymentOrders.map((order) => (
                      <div className="line-card" key={order.id}>
                        <div>
                          <strong>{formatCurrency(order.amount)}</strong>
                          <p>
                            {order.checkout_type === 'pix' ? 'Pix dedicado' : order.checkout_type === 'card' ? 'Cartão' : 'Pix ou cartão'}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="card">
                <h3>Aguardando ação interna</h3>
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
          </div>
        </>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AdminDashboardCharts } from '../../components/dashboard/AdminDashboardCharts'
import { formatCurrency, formatDate } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { fetchDashboardSummary } from '../../services/dashboard.service'
import { fetchPendingPaymentOrders } from '../../services/payment-orders.service'
import { fetchPendingPayments } from '../../services/payments.service'
import { fetchReservations } from '../../services/reservations.service'
import { fetchWhatsappMessages } from '../../services/whatsapp.service'
import type { DashboardSummary, Payment, PaymentOrder, Reservation, ReservationStatus } from '../../types/database'

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getMonthKey(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`)
  return `${date.getFullYear()}-${date.getMonth()}`
}


function startOfWeek(date: Date) {
  const value = new Date(date)
  const day = value.getDay()
  const diff = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + diff)
  value.setHours(0, 0, 0, 0)
  return value
}


function getDaysUntil(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateString}T12:00:00`)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function statusLabel(status: ReservationStatus) {
  const map: Record<ReservationStatus, string> = {
    interesse_enviado: 'Interesse',
    bloqueio_temporario: 'Bloqueio',
    aguardando_pagamento: 'Aguardando pagamento',
    reservado: 'Reservado',
    cancelado: 'Cancelado',
  }
  return map[status]
}

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
      setReservations(nextReservations)
      setPendingPayments(nextPendingPayments)
      setPendingPaymentOrders(nextPaymentOrders)
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

  useEffect(() => subscribeToTables(['reservations', 'payments', 'payment_orders', 'contracts', 'whatsapp_messages'], () => void loadData()), [])

  const orderedReservations = useMemo(
    () => [...reservations].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()),
    [reservations],
  )

  const futureReservations = useMemo(() => orderedReservations.filter((item) => getDaysUntil(item.event_date) >= 0), [orderedReservations])
  const nextReservations = futureReservations.slice(0, 5)
  const reservedReservations = orderedReservations.filter((item) => item.status === 'reservado')
  const expectedRevenue = futureReservations.reduce((total, item) => total + (item.total_amount ?? 0), 0)
  const confirmedRevenue = reservedReservations.reduce((total, item) => total + (item.total_amount ?? 0), 0)
  const averageTicket = orderedReservations.length > 0 ? Math.round(confirmedRevenue / Math.max(reservedReservations.length, 1)) : 0
  const upcomingConfirmed = futureReservations.filter((item) => item.status === 'reservado').length
  const nextEvent = nextReservations[0] ?? null

  const statusBreakdown = useMemo(() => {
    const statusOrder: ReservationStatus[] = ['reservado', 'aguardando_pagamento', 'bloqueio_temporario', 'interesse_enviado', 'cancelado']
    const entries: Array<{ status: ReservationStatus; count: number }> = statusOrder.map((status) => ({
      status,
      count: orderedReservations.filter((item) => item.status === status).length,
    }))

    const max = Math.max(...entries.map((item) => item.count), 1)
    return entries.map((item) => ({ ...item, width: `${(item.count / max) * 100}%` }))
  }, [orderedReservations])

  const occupancyByMonth = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const base = new Date()
      base.setDate(1)
      base.setMonth(base.getMonth() + index)
      return {
        key: `${base.getFullYear()}-${base.getMonth()}`,
        label: `${monthLabels[base.getMonth()]} ${String(base.getFullYear()).slice(2)}`,
        totalDays: new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate(),
      }
    })

    return months.map((month) => {
      const reservationsInMonth = orderedReservations.filter((item) => getMonthKey(item.event_date) === month.key && item.status === 'reservado')
      const reservedDays = reservationsInMonth.reduce((total, item) => total + (item.days_count ?? 1), 0)
      const occupancy = Math.min(100, Math.round((reservedDays / month.totalDays) * 100))
      const projectedRevenue = reservationsInMonth.reduce((total, item) => total + (item.total_amount ?? 0), 0)
      return { ...month, reservedDays, occupancy, projectedRevenue }
    })
  }, [orderedReservations])

  const revenueSeries = useMemo(
    () => occupancyByMonth.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.projectedRevenue,
      occupancy: item.occupancy,
    })),
    [occupancyByMonth],
  )

  const statusChartSeries = useMemo(
    () => [
      { status: 'reservado' as ReservationStatus, label: 'Reservado', color: '#2563eb' },
      { status: 'aguardando_pagamento' as ReservationStatus, label: 'Aguardando', color: '#f59e0b' },
      { status: 'bloqueio_temporario' as ReservationStatus, label: 'Bloqueio', color: '#7c3aed' },
      { status: 'interesse_enviado' as ReservationStatus, label: 'Interesse', color: '#10b981' },
      { status: 'cancelado' as ReservationStatus, label: 'Cancelado', color: '#ef4444' },
    ].map((item) => ({
      label: item.label,
      color: item.color,
      count: orderedReservations.filter((reservation) => reservation.status === item.status).length,
    })),
    [orderedReservations],
  )

  const weeklyCreationSeries = useMemo(() => {
    const today = new Date()
    const currentWeek = startOfWeek(today)
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const base = new Date(currentWeek)
      base.setDate(base.getDate() - (7 * (7 - index)))
      const end = new Date(base)
      end.setDate(base.getDate() + 6)
      return {
        key: base.toISOString().slice(0, 10),
        start: base,
        end,
        label: `${String(base.getDate()).padStart(2, '0')}/${String(base.getMonth() + 1).padStart(2, '0')}`,
        shortLabel: `${String(base.getDate()).padStart(2, '0')}/${String(base.getMonth() + 1).padStart(2, '0')}`,
      }
    })

    return weeks.map((week) => ({
      ...week,
      count: orderedReservations.filter((reservation) => {
        const createdAt = new Date(reservation.created_at)
        return createdAt >= week.start && createdAt <= week.end
      }).length,
    }))
  }, [orderedReservations])


  if (loading || !summary) {
    return (
      <div className="stack-lg">
        <PageHeader title="Dashboard operacional" description="Visão rápida da agenda, pagamentos, contratos, mídia e comunicação." />
        <div className="card">Carregando indicadores...</div>
      </div>
    )
  }

  return (
    <div className="stack-lg">
      <PageHeader title="Dashboard operacional" description="Visão estilo Airbnb da ocupação, receita prevista e próximas reservas do espaço." />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card-grid card-grid--six">
        <StatCard label="Interesses" value={summary.totalLeads} hint="Clientes em negociação" />
        <StatCard label="Reservas" value={summary.totalReservations} hint="Todas as reservas" />
        <StatCard label="Confirmadas" value={summary.confirmedReservations} hint="Datas já fechadas" />
        <StatCard label="Receita prevista" value={formatCurrency(expectedRevenue)} hint="Próximos eventos" />
        <StatCard label="Ticket médio" value={formatCurrency(averageTicket)} hint="Reservas confirmadas" />
        <StatCard label="Ocupação" value={`${summary.occupancyRate}%`} hint={`Mensagens recentes: ${recentMessagesCount}`} />
      </div>

      <AdminDashboardCharts revenueSeries={revenueSeries} statusSeries={statusChartSeries} weeklySeries={weeklyCreationSeries} />

      <section className="dashboard-airbnb-grid">
        <article className="card dashboard-spotlight">
          <div className="dashboard-spotlight__header">
            <div>
              <span className="dashboard-kicker">Painel visual de ocupação</span>
              <h3>Como está a agenda dos próximos meses</h3>
            </div>
            <div className="dashboard-spotlight__badge">{upcomingConfirmed} reservas futuras confirmadas</div>
          </div>

          <div className="occupancy-bars">
            {occupancyByMonth.map((item) => (
              <div key={item.key} className="occupancy-bars__item">
                <div className="occupancy-bars__top">
                  <strong>{item.label}</strong>
                  <span>{item.occupancy}%</span>
                </div>
                <div className="occupancy-bars__track">
                  <div className="occupancy-bars__fill" style={{ width: `${Math.max(item.occupancy, 8)}%` }} />
                </div>
                <div className="occupancy-bars__meta">
                  <span>{item.reservedDays} dia(s) ocupados</span>
                  <strong>{formatCurrency(item.projectedRevenue)}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card dashboard-side-metrics">
          <div className="dashboard-side-metrics__grid">
            <div className="dashboard-mini-card">
              <span>Receita confirmada</span>
              <strong>{formatCurrency(confirmedRevenue)}</strong>
              <small>Somente reservas no status reservado</small>
            </div>
            <div className="dashboard-mini-card">
              <span>Checkouts ativos</span>
              <strong>{pendingPaymentOrders.length}</strong>
              <small>Links aguardando pagamento</small>
            </div>
            <div className="dashboard-mini-card">
              <span>Pagamentos pendentes</span>
              <strong>{pendingPayments.length}</strong>
              <small>Aguardando conferência interna</small>
            </div>
            <div className="dashboard-mini-card">
              <span>Próximo evento</span>
              <strong>{nextEvent ? formatDate(nextEvent.event_date) : 'Sem agenda'}</strong>
              <small>{nextEvent ? nextEvent.customer_name : 'Nenhuma reserva futura'}</small>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-airbnb-grid dashboard-airbnb-grid--two-columns">
        <article className="card dashboard-panel-card">
          <div className="dashboard-panel-card__header">
            <div>
              <span className="dashboard-kicker">Distribuição</span>
              <h3>Status das reservas</h3>
            </div>
          </div>

          <div className="status-distribution">
            {statusBreakdown.map((item) => (
              <div key={item.status} className="status-distribution__row">
                <div className="status-distribution__label">
                  <span>{statusLabel(item.status)}</span>
                  <strong>{item.count}</strong>
                </div>
                <div className="status-distribution__track">
                  <div className={`status-distribution__fill status-distribution__fill--${item.status}`} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card dashboard-panel-card">
          <div className="dashboard-panel-card__header">
            <div>
              <span className="dashboard-kicker">Agenda</span>
              <h3>Próximas reservas</h3>
            </div>
          </div>

          <div className="stack-list">
            {nextReservations.length === 0 ? (
              <p>Nenhuma reserva cadastrada.</p>
            ) : (
              nextReservations.map((reservation) => (
                <div className="line-card line-card--elevated" key={reservation.id}>
                  <div>
                    <strong>{reservation.customer_name}</strong>
                    <p>
                      {formatDate(reservation.event_date)} • {formatCurrency(reservation.total_amount)}
                    </p>
                  </div>
                  <div className="dashboard-line-meta">
                    <small>{getDaysUntil(reservation.event_date) === 0 ? 'Hoje' : `Faltam ${getDaysUntil(reservation.event_date)} dia(s)`}</small>
                    <StatusBadge status={reservation.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-airbnb-grid dashboard-airbnb-grid--two-columns">
        <article className="card dashboard-panel-card">
          <div className="dashboard-panel-card__header">
            <div>
              <span className="dashboard-kicker">Financeiro</span>
              <h3>Links de pagamento ativos</h3>
            </div>
          </div>

          <div className="stack-list">
            {pendingPaymentOrders.length === 0 ? (
              <p>Nenhum checkout pendente no momento.</p>
            ) : (
              pendingPaymentOrders.slice(0, 5).map((order) => {
                const reservation = orderedReservations.find((item) => item.id === order.reservation_id)
                return (
                  <div className="line-card line-card--elevated" key={order.id}>
                    <div>
                      <strong>{formatCurrency(order.amount)}</strong>
                      <p>{reservation?.customer_name ?? order.provider_external_id ?? order.provider}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                )
              })
            )}
          </div>
        </article>

        <article className="card dashboard-panel-card">
          <div className="dashboard-panel-card__header">
            <div>
              <span className="dashboard-kicker">Conferência</span>
              <h3>Pagamentos aguardando ação interna</h3>
            </div>
          </div>

          <div className="stack-list">
            {pendingPayments.length === 0 ? (
              <p>Nenhum pagamento pendente no momento.</p>
            ) : (
              pendingPayments.map((payment) => {
                const reservation = orderedReservations.find((item) => item.id === payment.reservation_id)
                return (
                  <div className="line-card line-card--elevated" key={payment.id}>
                    <div>
                      <strong>{formatCurrency(payment.amount)}</strong>
                      <p>{reservation?.customer_name ?? payment.provider_reference ?? payment.provider ?? 'Sem referência'}</p>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                )
              })
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
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
import type { DashboardSummary, Payment, PaymentOrder, Reservation, ReservationStatus } from '../../types/database'

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fullMonthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
type DashboardPeriod = 'first-half' | 'second-half' | 'year'

type SalesTotals = {
  totalAmount: number
  entryAmount: number
  remainingAmount: number
  confirmedCount: number
  pendingCount: number
  leadsCount: number
  cancelledCount: number
  reservedDays: number
}

function getMonthKey(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`)
  return `${date.getFullYear()}-${date.getMonth()}`
}

function getYearFromDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`).getFullYear()
}

function getDaysUntil(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateString}T12:00:00`)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getReservationBalance(reservation: Reservation) {
  if (typeof reservation.remaining_amount === 'number') return reservation.remaining_amount
  const gross = reservation.total_amount ?? 0
  const entry = reservation.entry_amount ?? 0
  return Math.max(gross - entry, 0)
}

function makeMonthSummary(year: number, monthIndex: number, reservations: Reservation[]) {
  const reservationsInMonth = reservations.filter((item) => getMonthKey(item.event_date) === `${year}-${monthIndex}`)
  const confirmed = reservationsInMonth.filter((item) => item.status === 'reservado')
  const pending = reservationsInMonth.filter((item) => item.status === 'aguardando_pagamento' || item.status === 'bloqueio_temporario')
  const leads = reservationsInMonth.filter((item) => item.status === 'interesse_enviado')
  const cancelled = reservationsInMonth.filter((item) => item.status === 'cancelado')
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()
  const reservedDays = confirmed.reduce((total, item) => total + (item.days_count ?? 1), 0)
  const totalAmount = confirmed.reduce((total, item) => total + (item.total_amount ?? 0), 0)
  const entryAmount = confirmed.reduce((total, item) => total + (item.entry_amount ?? 0), 0)
  const remainingAmount = confirmed.reduce((total, item) => total + getReservationBalance(item), 0)
  const occupancy = Math.min(100, Math.round((reservedDays / totalDays) * 100))

  return {
    key: `${year}-${monthIndex}`,
    label: `${monthLabels[monthIndex]} ${String(year).slice(2)}`,
    fullLabel: `${fullMonthLabels[monthIndex]} de ${year}`,
    totalDays,
    reservedDays,
    occupancy,
    totalAmount,
    entryAmount,
    remainingAmount,
    confirmedCount: confirmed.length,
    pendingCount: pending.length,
    leadsCount: leads.length,
    cancelledCount: cancelled.length,
  }
}

function sumSalesTotals(months: ReturnType<typeof makeMonthSummary>[]): SalesTotals {
  return months.reduce(
    (total, month) => ({
      totalAmount: total.totalAmount + month.totalAmount,
      entryAmount: total.entryAmount + month.entryAmount,
      remainingAmount: total.remainingAmount + month.remainingAmount,
      confirmedCount: total.confirmedCount + month.confirmedCount,
      pendingCount: total.pendingCount + month.pendingCount,
      leadsCount: total.leadsCount + month.leadsCount,
      cancelledCount: total.cancelledCount + month.cancelledCount,
      reservedDays: total.reservedDays + month.reservedDays,
    }),
    { totalAmount: 0, entryAmount: 0, remainingAmount: 0, confirmedCount: 0, pendingCount: 0, leadsCount: 0, cancelledCount: 0, reservedDays: 0 },
  )
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
  const currentYear = new Date().getFullYear()
  const currentSemester: DashboardPeriod = new Date().getMonth() < 6 ? 'first-half' : 'second-half'
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [pendingPaymentOrders, setPendingPaymentOrders] = useState<PaymentOrder[]>([])
  const [recentMessagesCount, setRecentMessagesCount] = useState(0)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(currentSemester)
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

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear])
    orderedReservations.forEach((item) => years.add(getYearFromDate(item.event_date)))
    return [...years].sort((a, b) => b - a)
  }, [currentYear, orderedReservations])

  const futureReservations = useMemo(() => orderedReservations.filter((item) => getDaysUntil(item.event_date) >= 0), [orderedReservations])
  const futureReservedReservations = useMemo(() => futureReservations.filter((item) => item.status === 'reservado'), [futureReservations])
  const nextReservations = futureReservedReservations.slice(0, 5)
  const reservedReservations = orderedReservations.filter((item) => item.status === 'reservado')
  const totalUpcomingEvents = futureReservedReservations.reduce((total, item) => total + (item.total_amount ?? 0), 0)
  const upcomingEntryAmount = futureReservedReservations.reduce((total, item) => total + (item.entry_amount ?? 0), 0)
  const upcomingRemainingAmount = futureReservedReservations.reduce((total, item) => total + getReservationBalance(item), 0)
  const confirmedRevenue = reservedReservations.reduce((total, item) => total + (item.total_amount ?? 0), 0)
  const averageTicket = reservedReservations.length > 0 ? Math.round(confirmedRevenue / reservedReservations.length) : 0

  const monthlySales = useMemo(
    () => Array.from({ length: 12 }, (_, monthIndex) => makeMonthSummary(selectedYear, monthIndex, orderedReservations)),
    [orderedReservations, selectedYear],
  )

  const visibleMonthlySales = useMemo(() => {
    if (selectedPeriod === 'first-half') return monthlySales.slice(0, 6)
    if (selectedPeriod === 'second-half') return monthlySales.slice(6, 12)
    return monthlySales
  }, [monthlySales, selectedPeriod])

  const annualSalesTotals = useMemo(() => sumSalesTotals(monthlySales), [monthlySales])
  const visibleSalesTotals = useMemo(() => sumSalesTotals(visibleMonthlySales), [visibleMonthlySales])
  const periodLabel = selectedPeriod === 'first-half' ? '1º semestre' : selectedPeriod === 'second-half' ? '2º semestre' : 'Ano completo'

  const statusBreakdown = useMemo(() => {
    const statusOrder: ReservationStatus[] = ['reservado', 'aguardando_pagamento', 'bloqueio_temporario', 'interesse_enviado', 'cancelado']
    const entries: Array<{ status: ReservationStatus; count: number }> = statusOrder.map((status) => ({
      status,
      count: orderedReservations.filter((item) => item.status === status).length,
    }))

    const max = Math.max(...entries.map((item) => item.count), 1)
    return entries.map((item) => ({ ...item, width: `${(item.count / max) * 100}%` }))
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
        <StatCard label="Total próximos eventos" value={formatCurrency(totalUpcomingEvents)} hint="Somente reservas futuras confirmadas" />
        <StatCard label="Saldo a receber" value={formatCurrency(upcomingRemainingAmount)} hint={`Entradas já consideradas: ${formatCurrency(upcomingEntryAmount)}`} />
        <StatCard label="Ticket médio" value={formatCurrency(averageTicket)} hint="Reservas confirmadas" />
        <StatCard label={`Vendas ${selectedYear}`} value={formatCurrency(annualSalesTotals.totalAmount)} hint={`${annualSalesTotals.confirmedCount} reserva(s) confirmada(s) no ano`} />
        <StatCard label="Ocupação" value={`${summary.occupancyRate}%`} hint={`Mensagens recentes: ${recentMessagesCount}`} />
      </div>

      <section className="card dashboard-filter-card">
        <div>
          <span className="dashboard-kicker">Filtro financeiro</span>
          <h3>Vendas por período</h3>
          <p>Veja o ano completo ou quebre a análise de 6 em 6 meses, sem misturar reservas canceladas na receita.</p>
        </div>
        <div className="dashboard-filter-card__actions">
          <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label="Selecionar ano">
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button className={`button ${selectedPeriod === 'first-half' ? 'button-primary' : 'button-ghost'}`} type="button" onClick={() => setSelectedPeriod('first-half')}>1º semestre</button>
          <button className={`button ${selectedPeriod === 'second-half' ? 'button-primary' : 'button-ghost'}`} type="button" onClick={() => setSelectedPeriod('second-half')}>2º semestre</button>
          <button className={`button ${selectedPeriod === 'year' ? 'button-primary' : 'button-ghost'}`} type="button" onClick={() => setSelectedPeriod('year')}>Ano completo</button>
        </div>
      </section>

      <section className="dashboard-airbnb-grid">
        <article className="card dashboard-spotlight">
          <div className="dashboard-spotlight__header">
            <div>
              <span className="dashboard-kicker">Painel visual de ocupação</span>
              <h3>Como está a agenda em {periodLabel.toLowerCase()}</h3>
            </div>
            <div className="dashboard-spotlight__badge">{visibleSalesTotals.confirmedCount} reserva(s) no período</div>
          </div>

          <div className="occupancy-bars">
            {visibleMonthlySales.map((item) => (
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
                  <strong>{formatCurrency(item.totalAmount)}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card dashboard-side-metrics">
          <div className="dashboard-side-metrics__grid">
            <div className="dashboard-mini-card">
              <span>Total no período</span>
              <strong>{formatCurrency(visibleSalesTotals.totalAmount)}</strong>
              <small>{periodLabel} de {selectedYear}, somente reservas confirmadas</small>
            </div>
            <div className="dashboard-mini-card">
              <span>Saldo do período</span>
              <strong>{formatCurrency(visibleSalesTotals.remainingAmount)}</strong>
              <small>Valor restante separado da entrada/sinal</small>
            </div>
            <div className="dashboard-mini-card">
              <span>Entradas do período</span>
              <strong>{formatCurrency(visibleSalesTotals.entryAmount)}</strong>
              <small>Sinal/entrada das reservas confirmadas</small>
            </div>
            <div className="dashboard-mini-card">
              <span>Total do ano</span>
              <strong>{formatCurrency(annualSalesTotals.totalAmount)}</strong>
              <small>{annualSalesTotals.confirmedCount} reserva(s), {annualSalesTotals.reservedDays} dia(s) ocupados</small>
            </div>
          </div>
        </article>
      </section>

      <section className="card dashboard-panel-card dashboard-monthly-card">
        <div className="dashboard-panel-card__header">
          <div>
            <span className="dashboard-kicker">Venda mensal</span>
            <h3>Resumo organizado por mês</h3>
          </div>
          <div className="dashboard-monthly-card__total">
            <span>Total do ano</span>
            <strong>{formatCurrency(annualSalesTotals.totalAmount)}</strong>
          </div>
        </div>

        <div className="dashboard-monthly-table">
          <div className="dashboard-monthly-table__head">
            <span>Mês</span>
            <span>Reservas</span>
            <span>Total</span>
            <span>Entrada</span>
            <span>Saldo</span>
            <span>Ocupação</span>
            <span>Outros status</span>
          </div>
          {visibleMonthlySales.map((month) => (
            <div key={month.key} className="dashboard-monthly-table__row">
              <strong>{month.fullLabel}</strong>
              <span>{month.confirmedCount} fechada(s)</span>
              <span>{formatCurrency(month.totalAmount)}</span>
              <span>{formatCurrency(month.entryAmount)}</span>
              <span className="dashboard-monthly-table__balance">{formatCurrency(month.remainingAmount)}</span>
              <span>{month.occupancy}% · {month.reservedDays} dia(s)</span>
              <small>{month.pendingCount} pendente(s) · {month.leadsCount} interesse(s) · {month.cancelledCount} cancelada(s)</small>
            </div>
          ))}
        </div>
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
              nextReservations.map((reservation) => {
                const totalAmount = reservation.total_amount ?? 0
                const entryAmount = reservation.entry_amount ?? 0
                const remainingAmount = getReservationBalance(reservation)

                return (
                  <div className="line-card line-card--elevated dashboard-event-card" key={reservation.id}>
                    <div className="dashboard-event-card__top">
                      <div>
                        <strong>{reservation.customer_name}</strong>
                        <p>{formatDate(reservation.event_date)}</p>
                      </div>
                      <div className="dashboard-line-meta">
                        <small>{getDaysUntil(reservation.event_date) === 0 ? 'Hoje' : `Faltam ${getDaysUntil(reservation.event_date)} dia(s)`}</small>
                        <StatusBadge status={reservation.status} />
                      </div>
                    </div>

                    <div className="dashboard-event-card__amounts">
                      <div className="amount-pill">
                        <span>Total</span>
                        <strong>{formatCurrency(totalAmount)}</strong>
                      </div>
                      <div className="amount-pill">
                        <span>Entrada</span>
                        <strong>{formatCurrency(entryAmount)}</strong>
                      </div>
                      <div className="amount-pill amount-pill--highlight">
                        <span>Saldo</span>
                        <strong>{formatCurrency(remainingAmount)}</strong>
                      </div>
                    </div>
                  </div>
                )
              })
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

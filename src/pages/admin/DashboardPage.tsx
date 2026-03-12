import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, formatDate } from '../../lib/format'
import { fetchDashboardSummary } from '../../services/dashboard.service'
import { fetchPendingPayments } from '../../services/payments.service'
import { fetchReservations } from '../../services/reservations.service'
import type { DashboardSummary, Payment, Reservation } from '../../types/database'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDashboardSummary(), fetchReservations(), fetchPendingPayments()])
      .then(([nextSummary, nextReservations, nextPendingPayments]) => {
        setSummary(nextSummary)
        setReservations(nextReservations.slice(0, 5))
        setPendingPayments(nextPendingPayments)
      })
      .catch((serviceError) => setError(serviceError.message || 'Erro ao carregar dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="stack-lg">
      <PageHeader
        title="Dashboard operacional"
        description="Visão rápida da agenda, pagamentos e contratos do 3Deventos."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading || !summary ? (
        <div className="card">Carregando indicadores...</div>
      ) : (
        <div className="card-grid card-grid--five">
          <StatCard label="Interesses" value={summary.totalLeads} hint="Leads recebidos" />
          <StatCard label="Reservas" value={summary.totalReservations} hint="Todas as reservas" />
          <StatCard label="Confirmadas" value={summary.confirmedReservations} hint="Status reservado" />
          <StatCard label="Pagamentos pendentes" value={summary.pendingPayments} hint="Entradas aguardando confirmação" />
          <StatCard label="Ocupação" value={`${summary.occupancyRate}%`} hint="Base simples do MVP" />
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
          <h3>Pagamentos aguardando ação</h3>
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
  )
}

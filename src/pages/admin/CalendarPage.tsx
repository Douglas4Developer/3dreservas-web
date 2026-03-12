import { useEffect, useState } from 'react'
import { AdminCalendar } from '../../components/calendar/AdminCalendar'
import { PageHeader } from '../../components/ui/PageHeader'
import { fetchReservations } from '../../services/reservations.service'
import type { Reservation } from '../../types/database'

export default function CalendarPage() {
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchReservations()
      .then((data) => {
        setReservations(data)
        setError(null)
      })
      .catch((serviceError) => setError(serviceError instanceof Error ? serviceError.message : 'Erro ao carregar calendário.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="stack-lg">
      <PageHeader title="Calendário administrativo" description="Visão interna com todos os status de agenda do 3DReservas." />

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

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <div className="card">Carregando calendário...</div> : <AdminCalendar referenceDate={referenceDate} reservations={reservations} />}
    </div>
  )
}

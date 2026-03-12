import { useMemo } from 'react'
import { buildMonthLabel } from '../../lib/format'
import type { Reservation, ReservationStatus } from '../../types/database'

interface AdminCalendarProps {
  referenceDate: Date
  reservations: Reservation[]
}

const labelMap: Record<ReservationStatus, string> = {
  interesse_enviado: 'Interesse',
  bloqueio_temporario: 'Bloqueio',
  aguardando_pagamento: 'Aguardando pagamento',
  reservado: 'Reservado',
  cancelado: 'Cancelado',
}

export function AdminCalendar({ referenceDate, reservations }: AdminCalendarProps) {
  const monthLabel = buildMonthLabel(referenceDate)

  const calendarDays = useMemo(() => {
    const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
    const startWeekDay = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const items: Array<{ date: string | null; dayNumber: number | null; reservation?: Reservation }> = []

    for (let index = 0; index < startWeekDay; index += 1) items.push({ date: null, dayNumber: null })

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day)
      const isoDate = date.toISOString().slice(0, 10)
      const reservation = reservations.find((item) => item.event_date === isoDate && item.status !== 'cancelado')
      items.push({ date: isoDate, dayNumber: day, reservation })
    }

    return items
  }, [referenceDate, reservations])

  return (
    <div className="calendar-card">
      <div className="calendar-card__header">
        <div>
          <h3>{monthLabel}</h3>
          <p>Visão completa do administrativo com todos os status operacionais.</p>
        </div>
      </div>

      <div className="calendar-grid calendar-grid--header availability-weekdays">
        <span>Dom</span>
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
      </div>

      <div className="calendar-grid calendar-grid--public-month">
        {calendarDays.map((item, index) => {
          if (!item.date) return <div key={`empty-${index}`} className="calendar-day calendar-day--empty" />

          const status = item.reservation?.status
          return (
            <div
              key={item.date}
              className={`calendar-day ${status ? `calendar-day--${status}` : 'calendar-day--disponivel'}`}
            >
              <span className="calendar-day__number">{item.dayNumber}</span>
              <span className="calendar-day__status">{status ? labelMap[status] : 'Disponível'}</span>
              {item.reservation ? (
                <span className="calendar-day__meta">{item.reservation.customer_name}</span>
              ) : (
                <span className="calendar-day__action">Livre</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="calendar-legend">
        <span className="legend-item legend-item--disponivel">Disponível</span>
        <span className="legend-item legend-item--interesse_enviado">Interesse</span>
        <span className="legend-item legend-item--bloqueio_temporario">Bloqueio</span>
        <span className="legend-item legend-item--aguardando_pagamento">Aguardando pagamento</span>
        <span className="legend-item legend-item--reservado">Reservado</span>
        <span className="legend-item legend-item--cancelado">Cancelado</span>
      </div>
    </div>
  )
}

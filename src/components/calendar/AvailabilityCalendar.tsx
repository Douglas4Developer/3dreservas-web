import { useMemo } from 'react'
import { buildMonthLabel } from '../../lib/format'
import type { CalendarDay, ReservationStatus } from '../../types/database'

interface AvailabilityCalendarProps {
  referenceDate: Date
  entries: CalendarDay[]
  selectedDate?: string
  onSelectDate?: (date: string) => void
}

const visibleStatuses: ReservationStatus[] = [
  'interesse_enviado',
  'bloqueio_temporario',
  'aguardando_pagamento',
  'reservado',
  'cancelado',
]

export function AvailabilityCalendar({
  referenceDate,
  entries,
  selectedDate,
  onSelectDate,
}: AvailabilityCalendarProps) {
  const monthLabel = buildMonthLabel(referenceDate)

  const calendarDays = useMemo(() => {
    const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
    const startWeekDay = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const items: Array<{ date: string | null; dayNumber: number | null; status?: ReservationStatus }> = []

    for (let index = 0; index < startWeekDay; index += 1) {
      items.push({ date: null, dayNumber: null })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day)
      const isoDate = date.toISOString().slice(0, 10)
      const entry = entries.find((item) => item.event_date === isoDate)

      items.push({
        date: isoDate,
        dayNumber: day,
        status: entry?.status,
      })
    }

    return items
  }, [referenceDate, entries])

  return (
    <div className="calendar-card">
      <div className="calendar-card__header">
        <div>
          <h3>{monthLabel}</h3>
          <p>Clique em uma data para iniciar o interesse do cliente.</p>
        </div>
      </div>

      <div className="calendar-grid calendar-grid--header">
        <span>Dom</span>
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
      </div>

      <div className="calendar-grid">
        {calendarDays.map((item, index) => {
          if (!item.date) {
            return <div key={`empty-${index}`} className="calendar-day calendar-day--empty" />
          }

          const isSelected = selectedDate === item.date

          return (
            <button
              type="button"
              key={item.date}
              className={`calendar-day ${item.status ? `calendar-day--${item.status}` : 'calendar-day--disponivel'} ${
                isSelected ? 'calendar-day--selected' : ''
              }`}
              onClick={() => onSelectDate?.(item.date!)}
            >
              <span className="calendar-day__number">{item.dayNumber}</span>
              <span className="calendar-day__status">{item.status ? item.status.replace(/_/g, ' ') : 'disponível'}</span>
            </button>
          )
        })}
      </div>

      <div className="calendar-legend">
        <span className="legend-item legend-item--disponivel">Disponível</span>
        {visibleStatuses.map((status) => (
          <span key={status} className={`legend-item legend-item--${status}`}>
            {status.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  )
}

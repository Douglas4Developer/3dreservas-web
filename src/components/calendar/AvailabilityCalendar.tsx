import { useMemo } from 'react'
import { buildMonthLabel } from '../../lib/format'
import type { CalendarDay } from '../../types/database'

interface AvailabilityCalendarProps {
  referenceDate: Date
  entries: CalendarDay[]
  selectedDate?: string
  onSelectDate?: (date: string) => void
}

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

    const items: Array<{ date: string | null; dayNumber: number | null; status?: 'reservado' }> = []

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
        status: entry?.status === 'reservado' ? 'reservado' : undefined,
      })
    }

    return items
  }, [referenceDate, entries])

  return (
    <div className="calendar-card">
      <div className="calendar-card__header">
        <div>
          <h3>{monthLabel}</h3>
          <p>No calendário público aparecem apenas dias disponíveis e reservados.</p>
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
          if (!item.date) {
            return <div key={`empty-${index}`} className="calendar-day calendar-day--empty" />
          }

          const isSelected = selectedDate === item.date
          const isReserved = item.status === 'reservado'

          return (
            <button
              type="button"
              key={item.date}
              className={`calendar-day ${isReserved ? 'calendar-day--reservado' : 'calendar-day--disponivel'} ${
                isSelected ? 'calendar-day--selected' : ''
              }`}
              onClick={() => !isReserved && onSelectDate?.(item.date!)}
              disabled={isReserved}
            >
              <span className="calendar-day__number">{item.dayNumber}</span>
              <span className="calendar-day__status">{isReserved ? 'Reservado' : 'Disponível'}</span>
              {!isReserved ? <span className="calendar-day__action">Toque para selecionar</span> : null}
            </button>
          )
        })}
      </div>

      <div className="calendar-legend">
        <span className="legend-item legend-item--disponivel">Disponível</span>
        <span className="legend-item legend-item--reservado">Reservado</span>
      </div>
    </div>
  )
}

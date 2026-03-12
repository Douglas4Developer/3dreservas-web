import { useMemo } from 'react'
import type { Dayjs } from 'dayjs'
import type { CalendarDay } from '../../types/database'

function buildMonthMatrix(referenceDate: Dayjs) {
  const startOfMonth = referenceDate.startOf('month')
  const endOfMonth = referenceDate.endOf('month')
  const startOfGrid = startOfMonth.startOf('week')
  const endOfGrid = endOfMonth.endOf('week')

  const days: Dayjs[] = []
  for (let cursor = startOfGrid; cursor.isBefore(endOfGrid) || cursor.isSame(endOfGrid, 'day'); cursor = cursor.add(1, 'day')) {
    days.push(cursor)
  }

  const weeks: Dayjs[][] = []
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7))
  }

  return weeks
}

type Props = {
  month: Dayjs
  reservedDays: CalendarDay[];
  onSelectDay?: (date: string) => void
  selectedDate?: string | null
}

export function PublicCalendar({ month, reservedDays, onSelectDay, selectedDate }: Props) {
  const weeks = useMemo(() => buildMonthMatrix(month), [month])
  const reservedMap = useMemo(() => {
    return new Map(reservedDays.map((item) => [item.event_date, item.status]))
  }, [reservedDays])

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="status-badge status-disponivel">Disponível</span>
        <span className="status-badge status-reservado">Reservado</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label) => (
          <strong key={label} style={{ textAlign: 'center', color: '#4f5b7a' }}>{label}</strong>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {weeks.map((week, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {week.map((day) => {
              const dateKey = day.format('YYYY-MM-DD')
              const isReserved = reservedMap.get(dateKey) === 'reservado'
              const isCurrentMonth = day.month() === month.month()
              const isSelected = selectedDate === dateKey

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => onSelectDay?.(dateKey)}
                  disabled={isReserved}
                  style={{
                    minHeight: 76,
                    borderRadius: 16,
                    border: isSelected ? '2px solid #2f6fed' : '1px solid #d7dcec',
                    background: isReserved ? '#ffe3e0' : '#eff7ef',
                    opacity: isCurrentMonth ? 1 : 0.45,
                    cursor: isReserved ? 'not-allowed' : 'pointer',
                    padding: 10,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{day.format('DD')}</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    {isReserved ? 'Reservado' : 'Disponível'}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

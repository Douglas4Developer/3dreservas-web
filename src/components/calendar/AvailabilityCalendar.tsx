import { useEffect, useMemo, useState } from 'react'
import { buildMonthLabel } from '../../lib/format'
import type { CalendarDay, ReservationStatus } from '../../types/database'

interface AvailabilityCalendarProps {
  referenceDate: Date
  entries: CalendarDay[]
  selectedDate?: string
  onSelectDate?: (date: string) => void
}

type CalendarViewMode = 'month' | 'agenda'

interface PublicStatusMeta {
  label: string
  badge: string
  tone: 'disponivel' | 'ocupado' | 'consulta'
  selectable: boolean
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPublicStatusMeta(status?: ReservationStatus): PublicStatusMeta {
  switch (status) {
    case 'interesse_enviado':
    case 'bloqueio_temporario':
      return { label: 'Em análise', badge: 'Consulta', tone: 'consulta', selectable: false }
    case 'aguardando_pagamento':
    case 'reservado':
      return { label: 'Indisponível', badge: 'Ocupado', tone: 'ocupado', selectable: false }
    case 'cancelado':
    default:
      return { label: 'Disponível', badge: 'Livre', tone: 'disponivel', selectable: true }
  }
}

function formatAgendaDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export function AvailabilityCalendar({
  referenceDate,
  entries,
  selectedDate,
  onSelectDate,
}: AvailabilityCalendarProps) {
  const monthLabel = buildMonthLabel(referenceDate)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const syncMode = () => {
      setViewMode((current) => (media.matches && current === 'month' ? 'agenda' : current))
    }

    syncMode()
    media.addEventListener('change', syncMode)
    return () => media.removeEventListener('change', syncMode)
  }, [])

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
      const isoDate = toLocalIsoDate(date)
      const entry = entries.find((item) => item.event_date === isoDate)

      items.push({
        date: isoDate,
        dayNumber: day,
        status: entry?.status,
      })
    }

    return items
  }, [referenceDate, entries])

  const agendaItems = useMemo(() => {
    return calendarDays.filter((item): item is { date: string; dayNumber: number; status?: ReservationStatus } => Boolean(item.date && item.dayNumber))
  }, [calendarDays])

  return (
    <div className="calendar-card availability-calendar-shell">
      <div className="calendar-card__header availability-calendar__toolbar">
        <div>
          <h3>{monthLabel}</h3>
          <p>Escolha uma data livre para iniciar o seu atendimento.</p>
        </div>

        <div className="availability-view-toggle" aria-label="Alternar visualização do calendário">
          <button
            type="button"
            className={`availability-view-toggle__button ${viewMode === 'month' ? 'availability-view-toggle__button--active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Calendário
          </button>
          <button
            type="button"
            className={`availability-view-toggle__button ${viewMode === 'agenda' ? 'availability-view-toggle__button--active' : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            Lista
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <>
          <div className="calendar-grid calendar-grid--header">
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

              const itemDate = item.date
              const isSelected = selectedDate === itemDate
              const meta = getPublicStatusMeta(item.status)

              return (
                <button
                  type="button"
                  key={itemDate}
                  className={`calendar-day calendar-day--${meta.tone} ${isSelected ? 'calendar-day--selected' : ''}`}
                  onClick={() => meta.selectable && onSelectDate?.(itemDate)}
                  disabled={!meta.selectable}
                  aria-pressed={isSelected}
                >
                  <div className="calendar-day__topline">
                    <span className="calendar-day__number">{item.dayNumber}</span>
                    <span className={`calendar-day__dot calendar-day__dot--${meta.tone}`} aria-hidden="true" />
                  </div>
                  <span className="calendar-day__status">{meta.label}</span>
                  <span className={`calendar-day__badge calendar-day__badge--${meta.tone}`}>{meta.badge}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="availability-agenda" aria-live="polite">
          {agendaItems.map((item) => {
            const meta = getPublicStatusMeta(item.status)
            const isSelected = selectedDate === item.date

            return (
              <button
                type="button"
                key={item.date}
                className={`availability-agenda__item ${isSelected ? 'availability-agenda__item--selected' : ''}`}
                onClick={() => meta.selectable && onSelectDate?.(item.date)}
                disabled={!meta.selectable}
              >
                <div className="availability-agenda__meta">
                  <strong>{formatAgendaDate(item.date)}</strong>
                  <span>{meta.label}</span>
                </div>
                <span className={`calendar-day__badge calendar-day__badge--${meta.tone}`}>{meta.badge}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="calendar-legend">
        <span className="legend-item legend-item--disponivel">Disponível</span>
        <span className="legend-item legend-item--interesse_enviado">Em análise</span>
        <span className="legend-item legend-item--reservado">Indisponível</span>
      </div>
    </div>
  )
}

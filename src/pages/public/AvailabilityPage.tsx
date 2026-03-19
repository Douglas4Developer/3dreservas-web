import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AvailabilityCalendar } from '../../components/calendar/AvailabilityCalendar'
import { LoadingState } from '../../components/ui/LoadingState'
import { buildMonthLabel, getMonthBoundaries } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { getPublicCalendar } from '../../services/calendar.service'
import { createLead, getDefaultSpaceId } from '../../services/leads.service'
import type { CalendarDay } from '../../types/database'

interface LeadFormState {
  customer_name: string
  customer_phone: string
  customer_email: string
  desired_date: string
  message: string
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSelectedDate(dateIso: string) {
  const [year, month, day] = dateIso.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(year, month - 1, day))
}

export default function AvailabilityPage() {
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [calendarEntries, setCalendarEntries] = useState<CalendarDay[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<LeadFormState>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    desired_date: '',
    message: '',
  })

  const boundaries = useMemo(() => getMonthBoundaries(referenceDate), [referenceDate])
  const monthLabel = useMemo(() => buildMonthLabel(referenceDate), [referenceDate])

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const [calendar, id] = await Promise.all([getPublicCalendar(boundaries), getDefaultSpaceId()])
      setCalendarEntries(calendar)
      setSpaceId(id)
      setError(null)
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Não foi possível carregar o calendário.')
    } finally {
      setLoading(false)
    }
  }, [boundaries])

  useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

  useEffect(() => {
    return subscribeToTables(['reservations', 'payment_orders'], () => {
      void loadCalendar()
    })
  }, [loadCalendar])

  const suggestedDates = useMemo(() => {
    const blockedStatuses = new Set(['interesse_enviado', 'bloqueio_temporario', 'aguardando_pagamento', 'reservado'])
    const blockedDates = new Set(calendarEntries.filter((item) => blockedStatuses.has(item.status)).map((item) => item.event_date))
    const dates: string[] = []
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)

    for (let offset = 0; offset < 45 && dates.length < 4; offset += 1) {
      const date = new Date(today)
      date.setDate(today.getDate() + offset)
      const isoDate = toLocalIsoDate(date)
      if (!blockedDates.has(isoDate)) {
        dates.push(isoDate)
      }
    }

    return dates
  }, [calendarEntries, referenceDate])

  function handleChange(field: keyof LeadFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    setError(null)

    try {
      if (!form.desired_date) {
        throw new Error('Selecione uma data antes de enviar sua solicitação.')
      }

      await createLead({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || undefined,
        desired_date: form.desired_date,
        message: form.message || undefined,
        space_id: spaceId,
      })

      setFeedback('Solicitação enviada com sucesso. Vamos analisar a data e retornar para você o quanto antes.')
      setForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        desired_date: '',
        message: '',
      })
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao enviar solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section-block public-page-section">
      <div className="container stack-lg">
        <div className="public-page-hero public-page-hero--compact">
          <div>
            <span className="eyebrow">Disponibilidade</span>
            <h1 className="public-page-title">Escolha uma data com clareza em qualquer tamanho de tela</h1>
            <p className="public-page-subtitle">
              Consulte o mês de {monthLabel}, veja rapidamente o que está livre e envie sua solicitação sem depender de contato prévio.
            </p>
          </div>
          <div className="public-chip-list">
            <span className="public-chip">Calendário responsivo</span>
            <span className="public-chip">Lista otimizada no celular</span>
            <span className="public-chip">Solicitação em poucos passos</span>
          </div>
        </div>

        <div className="page-grid page-grid--public availability-layout">
          <div className="stack-lg">
            {loading ? (
              <LoadingState label="Carregando disponibilidade..." />
            ) : (
              <AvailabilityCalendar
                referenceDate={referenceDate}
                entries={calendarEntries}
                selectedDate={form.desired_date}
                onSelectDate={(value) => handleChange('desired_date', value)}
              />
            )}

            <div className="month-navigation month-navigation--glass">
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

          <aside className="card form-card availability-interest-card public-bento-card public-bento-card--glass">
            <div className="stack-list">
              <h2>Pedir atendimento</h2>
              <p>Preencha seus dados para receber retorno sobre a data, condições e próximos passos da reserva.</p>
            </div>

            <div className="selected-date-box" aria-live="polite">
              <span>Data selecionada</span>
              <strong>{form.desired_date ? formatSelectedDate(form.desired_date) : 'Nenhuma data escolhida ainda'}</strong>
              <small>Selecione uma data livre no calendário ou na lista para preencher automaticamente.</small>
            </div>

            <div className="availability-quick-list">
              <strong>Sugestões rápidas</strong>
              <div className="availability-quick-list__items">
                {suggestedDates.length > 0 ? (
                  suggestedDates.map((date) => (
                    <button key={date} type="button" className="availability-quick-list__chip" onClick={() => handleChange('desired_date', date)}>
                      {formatSelectedDate(date)}
                    </button>
                  ))
                ) : (
                  <span className="availability-quick-list__empty">Consulte o calendário para ver outras opções.</span>
                )}
              </div>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
              <label>
                Nome
                <input
                  value={form.customer_name}
                  onChange={(event) => handleChange('customer_name', event.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </label>
              <label>
                Telefone / WhatsApp
                <input
                  value={form.customer_phone}
                  onChange={(event) => handleChange('customer_phone', event.target.value)}
                  inputMode="tel"
                  placeholder="(62) 9 9999-9999"
                  required
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={(event) => handleChange('customer_email', event.target.value)}
                  placeholder="voce@email.com"
                />
              </label>
              <label>
                Data desejada
                <input type="date" value={form.desired_date} onChange={(event) => handleChange('desired_date', event.target.value)} required />
              </label>
              <label>
                Conte mais sobre o evento
                <textarea rows={4} value={form.message} onChange={(event) => handleChange('message', event.target.value)} placeholder="Tipo de evento, número de convidados, dúvida principal..." />
              </label>

              {feedback ? <div className="alert alert-success">{feedback}</div> : null}
              {error ? <div className="alert alert-error">{error}</div> : null}

              <button className="button" type="submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  )
}

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AvailabilityCalendar } from '../../components/calendar/AvailabilityCalendar'
import { LoadingState } from '../../components/ui/LoadingState'
import { getMonthBoundaries } from '../../lib/format'
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

  async function loadCalendar() {
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
  }

  useEffect(() => {
    void loadCalendar()
  }, [boundaries.from, boundaries.to, loadCalendar])

  useEffect(() => subscribeToTables(['reservations', 'payment_orders'], () => void loadCalendar()), [boundaries.from, boundaries.to])

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
    <section className="section-block">
      <div className="container page-grid page-grid--public">
        <div>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <div>
              <h1>Consulte a disponibilidade</h1>
              <p>Escolha a data desejada no calendário e envie sua solicitação para atendimento.</p>
            </div>
          </div>

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
        </div>

        <aside className="card form-card">
          <h2>Pedir atendimento</h2>
          <p>Preencha seus dados para receber retorno sobre a data, condições e próximos passos da reserva.</p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Nome
              <input value={form.customer_name} onChange={(event) => handleChange('customer_name', event.target.value)} required />
            </label>
            <label>
              Telefone / WhatsApp
              <input value={form.customer_phone} onChange={(event) => handleChange('customer_phone', event.target.value)} required />
            </label>
            <label>
              E-mail
              <input type="email" value={form.customer_email} onChange={(event) => handleChange('customer_email', event.target.value)} />
            </label>
            <label>
              Data desejada
              <input type="date" value={form.desired_date} onChange={(event) => handleChange('desired_date', event.target.value)} required />
            </label>
            <label>
              Conte mais sobre o evento
              <textarea rows={4} value={form.message} onChange={(event) => handleChange('message', event.target.value)} />
            </label>

            {feedback ? <div className="alert alert-success">{feedback}</div> : null}
            {error ? <div className="alert alert-error">{error}</div> : null}

            <button className="button" type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          </form>
        </aside>
      </div>
    </section>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCurrency, formatDate } from '../../lib/format'
import { getDefaultSpaceId } from '../../services/leads.service'
import { createReservation, fetchReservations } from '../../services/reservations.service'
import type { Reservation, ReservationStatus } from '../../types/database'

const reservationStatusOptions: ReservationStatus[] = [
  'interesse_enviado',
  'bloqueio_temporario',
  'aguardando_pagamento',
  'reservado',
  'cancelado',
]

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    event_date: '',
    total_amount: '',
    entry_amount: '',
    status: 'interesse_enviado' as ReservationStatus,
    notes: '',
  })

  async function loadData() {
    setLoading(true)
    try {
      const [reservationsData, defaultSpaceId] = await Promise.all([fetchReservations(), getDefaultSpaceId()])
      setReservations(reservationsData)
      setSpaceId(defaultSpaceId)
      setError(null)
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao carregar reservas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess(null)
    setError(null)

    try {
      await createReservation({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || undefined,
        event_date: form.event_date,
        total_amount: form.total_amount ? Number(form.total_amount) : undefined,
        entry_amount: form.entry_amount ? Number(form.entry_amount) : undefined,
        status: form.status,
        notes: form.notes || undefined,
        space_id: spaceId,
      })
      setSuccess('Reserva criada com sucesso.')
      setForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        event_date: '',
        total_amount: '',
        entry_amount: '',
        status: 'interesse_enviado',
        notes: '',
      })
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao criar reserva.')
    }
  }

  return (
    <div className="stack-lg">
      <PageHeader
        title="Reservas"
        description="Gestão de negociações confirmadas, bloqueios temporários e disponibilidade operacional."
      />

      <div className="dashboard-grid">
        <article className="card form-card">
          <h3>Nova reserva manual</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Cliente
              <input value={form.customer_name} onChange={(event) => updateField('customer_name', event.target.value)} required />
            </label>
            <label>
              Telefone
              <input value={form.customer_phone} onChange={(event) => updateField('customer_phone', event.target.value)} required />
            </label>
            <label>
              E-mail
              <input type="email" value={form.customer_email} onChange={(event) => updateField('customer_email', event.target.value)} />
            </label>
            <label>
              Data do evento
              <input type="date" value={form.event_date} onChange={(event) => updateField('event_date', event.target.value)} required />
            </label>
            <label>
              Valor total
              <input type="number" min="0" step="0.01" value={form.total_amount} onChange={(event) => updateField('total_amount', event.target.value)} />
            </label>
            <label>
              Valor da entrada
              <input type="number" min="0" step="0.01" value={form.entry_amount} onChange={(event) => updateField('entry_amount', event.target.value)} />
            </label>
            <label>
              Status inicial
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                {reservationStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Observações
              <textarea rows={4} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
            </label>

            {error ? <div className="alert alert-error">{error}</div> : null}
            {success ? <div className="alert alert-success">{success}</div> : null}

            <button className="button" type="submit">
              Criar reserva
            </button>
          </form>
        </article>

        <article className="card table-card">
          <h3>Agenda operacional</h3>
          {loading ? (
            <p>Carregando reservas...</p>
          ) : reservations.length === 0 ? (
            <p>Nenhuma reserva cadastrada.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Total</th>
                  <th>Entrada</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>
                      <strong>{reservation.customer_name}</strong>
                      <div className="table-helper">{reservation.customer_phone}</div>
                    </td>
                    <td>{formatDate(reservation.event_date)}</td>
                    <td>{formatCurrency(reservation.total_amount)}</td>
                    <td>{formatCurrency(reservation.entry_amount)}</td>
                    <td>
                      <StatusBadge status={reservation.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>
    </div>
  )
}

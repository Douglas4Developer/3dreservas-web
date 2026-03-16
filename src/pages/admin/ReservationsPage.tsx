import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatCountdown, formatCurrency, formatDate } from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { getDefaultSpaceId } from '../../services/leads.service'
import { createPaymentOrder, createPixPayment, fetchPaymentOrders } from '../../services/payment-orders.service'
import { confirmManualPayment } from '../../services/payments.service'
import { createReservation, fetchReservations, updateReservation } from '../../services/reservations.service'
import { fetchContracts } from '../../services/contracts.service'
import { fetchSignatures } from '../../services/signatures.service'
import type { PaymentOrder, Reservation, ReservationStatus } from '../../types/database'

const reservationStatusOptions: ReservationStatus[] = [
  'interesse_enviado',
  'bloqueio_temporario',
  'aguardando_pagamento',
  'reservado',
  'cancelado',
]

const initialForm = {
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  customer_document: '',
  customer_address: '',
  event_type: '',
  event_date: '',
  period_start: '09:00',
  period_end: '23:00',
  total_amount: '',
  entry_amount: '',
  remaining_amount: '',
  cleaning_fee: '100',
  notes: '',
  status: 'interesse_enviado' as ReservationStatus,
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [creatingPaymentFor, setCreatingPaymentFor] = useState<string | null>(null)
  const [confirmingManualFor, setConfirmingManualFor] = useState<string | null>(null)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [pixPreviewOrder, setPixPreviewOrder] = useState<PaymentOrder | null>(null)
  const [copiedPixCode, setCopiedPixCode] = useState(false)
  const [lockedReservationIds, setLockedReservationIds] = useState<string[]>([])
  const [form, setForm] = useState(initialForm)

  async function loadData() {
    setLoading(true)
    try {
      const [reservationsData, defaultSpaceId, paymentOrdersData, contractsData] = await Promise.all([
        fetchReservations(),
        getDefaultSpaceId(),
        fetchPaymentOrders(),
        fetchContracts(),
      ])

      const signatureEntries = await Promise.all(
        contractsData.map(async (contract) => [contract.id, await fetchSignatures(contract.id)] as const),
      )
      const signaturesByContractId = Object.fromEntries(signatureEntries)
      const lockedIds = contractsData
        .filter((contract) => {
          const signatures = signaturesByContractId[contract.id] ?? []
          return Boolean(contract.signed_at) || signatures.length > 0
        })
        .map((contract) => contract.reservation_id)

      setReservations(reservationsData)
      setPaymentOrders(paymentOrdersData)
      setSpaceId(defaultSpaceId)
      setLockedReservationIds(lockedIds)
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

  useEffect(() => subscribeToTables(['reservations', 'payment_orders', 'payments', 'contracts'], () => void loadData()), [])

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingReservation(null)
  }

  const isDateLocked = editingReservation ? lockedReservationIds.includes(editingReservation.id) : false

  function fillFormFromReservation(reservation: Reservation) {
    setEditingReservation(reservation)
    setForm({
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone,
      customer_email: reservation.customer_email ?? '',
      customer_document: reservation.customer_document ?? '',
      customer_address: reservation.customer_address ?? '',
      event_type: reservation.event_type ?? '',
      event_date: reservation.event_date,
      period_start: reservation.period_start,
      period_end: reservation.period_end,
      total_amount: reservation.total_amount?.toString() ?? '',
      entry_amount: reservation.entry_amount?.toString() ?? '',
      remaining_amount: reservation.remaining_amount?.toString() ?? '',
      cleaning_fee: reservation.cleaning_fee?.toString() ?? '100',
      notes: reservation.notes ?? '',
      status: reservation.status,
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSuccess(null)
    setError(null)

    try {
      const payload = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || undefined,
        customer_document: form.customer_document || undefined,
        customer_address: form.customer_address || undefined,
        event_type: form.event_type || undefined,
        event_date: form.event_date,
        period_start: form.period_start,
        period_end: form.period_end,
        total_amount: form.total_amount ? Number(form.total_amount) : undefined,
        entry_amount: form.entry_amount ? Number(form.entry_amount) : undefined,
        remaining_amount: form.remaining_amount ? Number(form.remaining_amount) : undefined,
        cleaning_fee: form.cleaning_fee ? Number(form.cleaning_fee) : undefined,
        status: form.status,
        notes: form.notes || undefined,
        space_id: spaceId,
      }

      if (editingReservation) {
        await updateReservation(editingReservation.id, payload)
        setSuccess('Reserva atualizada com sucesso.')
      } else {
        await createReservation(payload)
        setSuccess('Reserva criada com sucesso.')
      }

      resetForm()
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao salvar reserva.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateCardCheckout(reservation: Reservation) {
    setCreatingPaymentFor(`${reservation.id}-card`)
    setError(null)
    setSuccess(null)
    try {
      const amount = reservation.entry_amount ?? reservation.total_amount ?? 0
      const result = await createPaymentOrder({
        reservationId: reservation.id,
        amount,
        expiresInMinutes: 60,
        title: `Entrada reserva ${reservation.event_date}`,
        checkoutType: 'card',
      })
      setSuccess(result.paymentUrl ? `Checkout de cartão criado: ${result.paymentUrl}` : 'Checkout criado com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao criar checkout de cartão.')
    } finally {
      setCreatingPaymentFor(null)
    }
  }

  async function handleCreatePixPayment(reservation: Reservation) {
    setCreatingPaymentFor(`${reservation.id}-pix`)
    setError(null)
    setSuccess(null)
    try {
      const amount = reservation.entry_amount ?? reservation.total_amount ?? 0
      const result = await createPixPayment({
        reservationId: reservation.id,
        amount,
        expiresInMinutes: 30,
        title: `Entrada da reserva ${reservation.event_date}`,
      })
      setPixPreviewOrder(result.paymentOrder as PaymentOrder)
      setSuccess('Cobrança Pix gerada com sucesso. Exiba o QR Code ao cliente ou use o link seguro.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao gerar Pix.')
    } finally {
      setCreatingPaymentFor(null)
    }
  }

  async function handleConfirmManualPayment(reservation: Reservation) {
    const amount = reservation.entry_amount ?? reservation.total_amount ?? 0
    if (!amount) {
      setError('Defina o valor da entrada ou o valor total antes de confirmar pagamento manual.')
      return
    }

    const confirmationNotes = window.prompt('Observação do pagamento manual (opcional):') ?? ''
    const paymentMethodLabel = window.prompt('Método manual (ex: pix_manual, dinheiro, transferência):', 'pix_manual') ?? 'pix_manual'

    setConfirmingManualFor(reservation.id)
    setError(null)
    setSuccess(null)

    try {
      const result = await confirmManualPayment({
        reservationId: reservation.id,
        amount,
        paymentMethodLabel,
        confirmationNotes,
      })

      setSuccess(`Pagamento manual confirmado. Contrato liberado. Link do cliente: ${result.statusUrl}`)
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao confirmar pagamento manual.')
    } finally {
      setConfirmingManualFor(null)
    }
  }

  async function handleCopyPix() {
    if (!pixPreviewOrder?.pix_copy_paste) return
    await navigator.clipboard.writeText(pixPreviewOrder.pix_copy_paste)
    setCopiedPixCode(true)
    window.setTimeout(() => setCopiedPixCode(false), 1800)
  }

const paymentOrdersMap = useMemo(() => {
  return paymentOrders
    .filter((item) => item.status === 'pending')
    .reduce<Record<string, PaymentOrder>>((accumulator, item) => {
      if (
        !accumulator[item.reservation_id] ||
        accumulator[item.reservation_id].created_at < item.created_at
      ) {
        accumulator[item.reservation_id] = item
      }

      return accumulator
    }, {})
}, [paymentOrders])

  return (
    <div className="stack-lg">
      <PageHeader
        title="Reservas"
        description="Gestão completa do cliente, valores, checkout por cartão, Pix dedicado, pagamento manual e edição dos dados contratuais."
      />

      <div className="dashboard-grid reservations-admin-grid">
        <article className="card form-card">
          <h3>{editingReservation ? 'Editar reserva' : 'Nova reserva manual'}</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="inline-form-grid inline-form-grid--two">
              <label>
                Cliente
                <input value={form.customer_name} onChange={(event) => updateField('customer_name', event.target.value)} required />
              </label>
              <label>
                Telefone / WhatsApp
                <input value={form.customer_phone} onChange={(event) => updateField('customer_phone', event.target.value)} required />
              </label>
            </div>

            <div className="inline-form-grid inline-form-grid--two">
              <label>
                E-mail
                <input type="email" value={form.customer_email} onChange={(event) => updateField('customer_email', event.target.value)} />
              </label>
              <label>
                CPF
                <input value={form.customer_document} onChange={(event) => updateField('customer_document', event.target.value)} />
              </label>
            </div>

            <label>
              Endereço
              <textarea rows={2} value={form.customer_address} onChange={(event) => updateField('customer_address', event.target.value)} />
            </label>

            <div className="inline-form-grid inline-form-grid--three">
              <label>
                Tipo de evento
                <input value={form.event_type} onChange={(event) => updateField('event_type', event.target.value)} placeholder="Aniversário, confraternização..." />
              </label>
              <label>
                Data do evento
                <input type="date" value={form.event_date} onChange={(event) => updateField('event_date', event.target.value)} required disabled={isDateLocked} />
              </label>
              <label>
                Status inicial
                <select value={form.status} onChange={(event) => updateField('status', event.target.value as ReservationStatus)}>
                  {reservationStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="inline-form-grid inline-form-grid--three">
              <label>
                Início
                <input type="time" value={form.period_start} onChange={(event) => updateField('period_start', event.target.value)} disabled={isDateLocked} />
              </label>
              <label>
                Término
                <input type="time" value={form.period_end} onChange={(event) => updateField('period_end', event.target.value)} disabled={isDateLocked} />
              </label>
              <label>
                Taxa de limpeza
                <input type="number" min="0" step="0.01" value={form.cleaning_fee} onChange={(event) => updateField('cleaning_fee', event.target.value)} />
              </label>
            </div>

            <div className="inline-form-grid inline-form-grid--three">
              <label>
                Valor total
                <input type="number" min="0" step="0.01" value={form.total_amount} onChange={(event) => updateField('total_amount', event.target.value)} />
              </label>
              <label>
                Entrada
                <input type="number" min="0" step="0.01" value={form.entry_amount} onChange={(event) => updateField('entry_amount', event.target.value)} />
              </label>
              <label>
                Saldo restante
                <input type="number" min="0" step="0.01" value={form.remaining_amount} onChange={(event) => updateField('remaining_amount', event.target.value)} />
              </label>
            </div>

            <label>
              Observações
              <textarea rows={4} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
            </label>

            {error ? <div className="alert alert-error">{error}</div> : null}
            {success ? <div className="alert alert-success">{success}</div> : null}

            <div className="table-actions">
              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingReservation ? 'Atualizar reserva' : 'Criar reserva'}
              </button>
              {editingReservation ? (
                <button className="button button-secondary" type="button" onClick={resetForm}>
                  Cancelar edição
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="card form-card">
          <h3>Pix dedicado</h3>
          <p>Ao gerar Pix, o sistema cria um QR Code e um código copia e cola. O webhook continua atualizando a reserva automaticamente.</p>
          {pixPreviewOrder ? (
            <div className="pix-payment-card">
              <div className="line-card">
                <div>
                  <strong>{formatCurrency(pixPreviewOrder.amount)}</strong>
                  <p>Expira em {formatCountdown(pixPreviewOrder.expires_at)}</p>
                </div>
                <StatusBadge status={pixPreviewOrder.status} />
              </div>
              {pixPreviewOrder.qr_code_base64 ? (
                <img className="pix-qr-image" src={`data:image/png;base64,${pixPreviewOrder.qr_code_base64}`} alt="QR Code Pix" />
              ) : null}
              {pixPreviewOrder.pix_copy_paste ? (
                <>
                  <label>
                    Código copia e cola
                    <textarea readOnly rows={4} value={pixPreviewOrder.pix_copy_paste} />
                  </label>
                  <button className="button" type="button" onClick={() => void handleCopyPix()}>
                    {copiedPixCode ? 'Código copiado!' : 'Copiar código Pix'}
                  </button>
                </>
              ) : (
                <p>Gere um Pix em uma reserva para ver o QR Code aqui.</p>
              )}
            </div>
          ) : (
            <p>Selecione uma reserva e clique em <strong>Gerar Pix</strong> para abrir o QR Code nesta área.</p>
          )}
        </article>
      </div>

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
                <th>Evento</th>
                <th>Financeiro</th>
                <th>Status</th>
                <th>Checkout ativo</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => {
                const paymentOrder = paymentOrdersMap[reservation.id]
                const amount = reservation.entry_amount ?? reservation.total_amount ?? 0
                return (
                  <tr key={reservation.id}>
                    <td data-label="Cliente">
                      <strong>{reservation.customer_name}</strong>
                      <div className="table-helper">{reservation.customer_phone}</div>
                      <div className="table-helper">{reservation.customer_email ?? 'Sem e-mail'}</div>
                    </td>
                    <td data-label="Evento">
                      <strong>{formatDate(reservation.event_date)}</strong>
                      <div className="table-helper">{reservation.event_type ?? 'Evento privado'}</div>
                      {lockedReservationIds.includes(reservation.id) ? <div className="table-helper">Data travada por assinatura</div> : null}
                    </td>
                    <td data-label="Financeiro">
                      <div className="stack-list compact-stack">
                        <span>Total: {formatCurrency(reservation.total_amount)}</span>
                        <span>Entrada: {formatCurrency(reservation.entry_amount)}</span>
                        <span>Saldo: {formatCurrency(reservation.remaining_amount)}</span>
                      </div>
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={reservation.status} />
                    </td>
                    <td data-label="Checkout ativo">
                      {paymentOrder ? (
                        <div className="stack-list compact-stack">
                          <StatusBadge status={paymentOrder.status} />
                          <span className="table-helper">
                            Tipo: {paymentOrder.checkout_type === 'pix' ? 'Pix' : paymentOrder.checkout_type === 'card' ? 'Cartão' : 'Pix ou cartão'}
                          </span>
                          <span className="table-helper">Expira em {formatCountdown(paymentOrder.expires_at)}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td data-label="Ações">
                      <div className="table-actions">
                        <button className="button button-secondary" type="button" onClick={() => fillFormFromReservation(reservation)}>
                          Editar
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleConfirmManualPayment(reservation)}
                          disabled={confirmingManualFor === reservation.id || !amount}
                        >
                          {confirmingManualFor === reservation.id ? 'Confirmando...' : 'Confirmar entrada manual'}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleCreatePixPayment(reservation)}
                          disabled={creatingPaymentFor === `${reservation.id}-pix` || !amount}
                        >
                          {creatingPaymentFor === `${reservation.id}-pix` ? 'Gerando Pix...' : 'Gerar Pix'}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleCreateCardCheckout(reservation)}
                          disabled={creatingPaymentFor === `${reservation.id}-card` || !amount}
                        >
                          {creatingPaymentFor === `${reservation.id}-card` ? 'Gerando cartão...' : 'Gerar Cartão'}
                        </button>
                        <a
                          className="button button-secondary"
                          href={`/minha-reserva/${reservation.public_link_token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Link do cliente
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </article>
    </div>
  )
}

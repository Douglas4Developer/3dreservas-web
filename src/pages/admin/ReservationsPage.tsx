import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import {
  addDaysToDateString,
  describeReservationDays,
  differenceInDaysInclusive,
  formatCountdown,
  formatCurrency,
  formatDateRange,
} from '../../lib/format'
import { subscribeToTables } from '../../lib/realtime'
import { fetchContracts, getReservationLinks } from '../../services/contracts.service'
import { getDefaultSpaceId } from '../../services/leads.service'
import { createPaymentOrder, createPixPayment, fetchPaymentOrders } from '../../services/payment-orders.service'
import { confirmManualPayment } from '../../services/payments.service'
import { createReservationAddendum } from '../../services/reservation-addendums.service'
import { createReservation, deleteReservation, fetchReservations, updateReservation } from '../../services/reservations.service'
import { fetchSignatures } from '../../services/signatures.service'
import type { PaymentOrder, PaymentOrderStatus, Reservation, ReservationStatus } from '../../types/database'

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
  end_date: '',
  days_count: '1',
  daily_rate: '',
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
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const previousPaymentOrdersRef = useRef<Record<string, PaymentOrderStatus>>({})

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

      const previousStatuses = previousPaymentOrdersRef.current
      const nextStatuses = [...paymentOrdersData]
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .reduce<Record<string, PaymentOrderStatus>>((accumulator, order) => {
          if (!accumulator[order.reservation_id]) {
            accumulator[order.reservation_id] = order.status
          }
          return accumulator
        }, {})

      const justPaidReservation = reservationsData.find((reservation) => {
        const previousStatus = previousStatuses[reservation.id]
        const nextStatus = nextStatuses[reservation.id]
        return previousStatus === 'pending' && nextStatus === 'paid'
      })

      if (justPaidReservation) {
        setSuccess(`Pagamento Pix confirmado para ${justPaidReservation.customer_name}. A reserva foi atualizada automaticamente.`)
      }

      previousPaymentOrdersRef.current = nextStatuses

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

  useEffect(() => subscribeToTables(['reservations', 'payment_orders', 'payments', 'contracts', 'reservation_addendums'], () => void loadData()), [])

  function recalculateFinancialFields(nextForm: typeof initialForm) {
    const daysCount = Math.max(Number(nextForm.days_count || '1'), 1)
    const dailyRate = nextForm.daily_rate ? Number(nextForm.daily_rate) : 0
    const entryAmount = nextForm.entry_amount ? Number(nextForm.entry_amount) : 0
    const totalAmount = dailyRate > 0 ? dailyRate * daysCount : nextForm.total_amount ? Number(nextForm.total_amount) : 0

    return {
      ...nextForm,
      total_amount: totalAmount > 0 ? totalAmount.toString() : nextForm.total_amount,
      remaining_amount: totalAmount > 0 ? Math.max(totalAmount - entryAmount, 0).toString() : nextForm.remaining_amount,
    }
  }

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value }

      if (field === 'event_date') {
        const daysCount = Math.max(Number(next.days_count || '1'), 1)
        next.end_date = value ? addDaysToDateString(value, daysCount - 1) : ''
      }

      if (field === 'days_count') {
        const daysCount = Math.max(Number(value || '1'), 1)
        next.days_count = String(daysCount)
        if (next.event_date) next.end_date = addDaysToDateString(next.event_date, daysCount - 1)
      }

      if (field === 'end_date' && next.event_date && value) {
        next.days_count = String(differenceInDaysInclusive(next.event_date, value))
      }

      if (field === 'daily_rate' || field === 'days_count' || field === 'entry_amount') {
        return recalculateFinancialFields(next)
      }

      return next
    })
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
      end_date: reservation.end_date ?? reservation.event_date,
      days_count: String(reservation.days_count ?? differenceInDaysInclusive(reservation.event_date, reservation.end_date)),
      daily_rate: reservation.daily_rate?.toString() ?? '',
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
        end_date: form.end_date || form.event_date,
        days_count: form.days_count ? Number(form.days_count) : undefined,
        daily_rate: form.daily_rate ? Number(form.daily_rate) : undefined,
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

  async function handleCreateAddendum(reservation: Reservation) {
    const extraDaysText = window.prompt('Quantos dias adicionais deseja incluir?', '1')
    if (!extraDaysText) return

    const extraDays = Number(extraDaysText)
    if (!Number.isFinite(extraDays) || extraDays <= 0) {
      setError('Informe uma quantidade de dias válida para o aditivo.')
      return
    }

    const suggestedAmountPerDay = reservation.daily_rate ?? (reservation.total_amount ?? 0) / Math.max(reservation.days_count ?? 1, 1)
    const amountPerDayText = window.prompt('Valor por dia adicional:', suggestedAmountPerDay ? String(suggestedAmountPerDay) : '0')
    if (!amountPerDayText) return

    const amountPerDay = Number(amountPerDayText)
    if (!Number.isFinite(amountPerDay) || amountPerDay < 0) {
      setError('Informe um valor por dia válido para o aditivo.')
      return
    }

    const notes = window.prompt('Observações do termo aditivo (opcional):', 'Prorrogação da reserva com diária adicional.') ?? ''

    setError(null)
    setSuccess(null)

    try {
      const result = await createReservationAddendum({
        reservationId: reservation.id,
        extraDays,
        amountPerDay,
        notes,
      })

      setSuccess(
        `Aditivo gerado com sucesso. Novo período: ${formatDateRange(result.reservation.event_date, result.reservation.end_date)} • valor adicional: ${formatCurrency(result.addendum.extra_amount)}`,
      )
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao gerar termo aditivo.')
    }
  }

  async function handleCopyPix() {
    if (!pixPreviewOrder?.pix_copy_paste) return
    await navigator.clipboard.writeText(pixPreviewOrder.pix_copy_paste)
    setCopiedPixCode(true)
    window.setTimeout(() => setCopiedPixCode(false), 1800)
  }


  async function handleCopyReservationLink(reservationId: string) {
    try {
      const links = await getReservationLinks(reservationId)
      await navigator.clipboard.writeText(links.statusUrl)
      setSuccess('Link da reserva copiado.')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao copiar link da reserva.')
    }
  }

  async function handleCopyContractLink(reservationId: string) {
    try {
      const links = await getReservationLinks(reservationId)
      if (!links.contractViewUrl) throw new Error('Gere o contrato antes de copiar esse link.')
      await navigator.clipboard.writeText(links.contractViewUrl)
      setSuccess('Link do contrato copiado.')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao copiar link do contrato.')
    }
  }

  async function handleShareReservationLink(reservationId: string) {
    try {
      const links = await getReservationLinks(reservationId)
      window.open(links.reservationWhatsappUrl, '_blank', 'noopener,noreferrer')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao compartilhar link da reserva.')
    }
  }

  async function handleShareContractLink(reservationId: string) {
    try {
      const links = await getReservationLinks(reservationId)
      if (!links.contractWhatsappUrl) throw new Error('Gere o contrato antes de enviar esse link.')
      window.open(links.contractWhatsappUrl, '_blank', 'noopener,noreferrer')
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao compartilhar link do contrato.')
    }
  }

  async function handleDeleteReservation(reservationId: string) {
    const confirmed = window.confirm('Deseja realmente excluir esta reserva? Pagamentos, contratos e links vinculados também serão removidos.')
    if (!confirmed) return

    setDeletingReservationId(reservationId)
    setError(null)
    setSuccess(null)

    try {
      await deleteReservation(reservationId)
      if (editingReservation?.id === reservationId) {
        resetForm()
      }
      setSuccess('Reserva excluída com sucesso.')
      await loadData()
    } catch (serviceError) {
      setError(serviceError instanceof Error ? serviceError.message : 'Erro ao excluir reserva.')
    } finally {
      setDeletingReservationId(null)
    }
  }

  const paymentOrdersMap = useMemo(() => {
    return paymentOrders
      .filter((item) => item.status === 'pending')
      .reduce<Record<string, PaymentOrder>>((accumulator, item) => {
        if (!accumulator[item.reservation_id] || accumulator[item.reservation_id].created_at < item.created_at) {
          accumulator[item.reservation_id] = item
        }

        return accumulator
      }, {})
  }, [paymentOrders])

  const suggestedTotal = useMemo(() => {
    const daysCount = Math.max(Number(form.days_count || '1'), 1)
    const dailyRate = form.daily_rate ? Number(form.daily_rate) : 0
    return dailyRate > 0 ? dailyRate * daysCount : null
  }, [form.daily_rate, form.days_count])

  return (
    <div className="stack-lg">
      <PageHeader
        title="Reservas"
        description="Gestão completa do cliente, valores, período com vários dias, prorrogação por aditivo, checkout por cartão, Pix dedicado e edição dos dados contratuais."
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
                Data inicial
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
                Data final
                <input type="date" value={form.end_date} onChange={(event) => updateField('end_date', event.target.value)} required disabled={isDateLocked} />
              </label>
              <label>
                Quantidade de dias
                <input type="number" min="1" value={form.days_count} onChange={(event) => updateField('days_count', event.target.value)} disabled={isDateLocked} />
              </label>
              <label>
                Valor da diária
                <input type="number" min="0" step="0.01" value={form.daily_rate} onChange={(event) => updateField('daily_rate', event.target.value)} />
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

            {suggestedTotal !== null ? (
              <div className="line-card">
                <div>
                  <strong>Total calculado pela diária</strong>
                  <p>
                    {form.days_count} × {formatCurrency(Number(form.daily_rate || 0))} = {formatCurrency(suggestedTotal)}
                  </p>
                </div>
                <span className="status-badge status-reservado">{form.days_count} dia(s)</span>
              </div>
            ) : null}

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
                <th>Período</th>
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
                    <td data-label="Período">
                      <strong>{formatDateRange(reservation.event_date, reservation.end_date)}</strong>
                      <div className="table-helper">{describeReservationDays(reservation.event_date, reservation.end_date, reservation.days_count)}</div>
                      <div className="table-helper">Diária: {formatCurrency(reservation.daily_rate)}</div>
                      {lockedReservationIds.includes(reservation.id) ? <div className="table-helper">Período travado por assinatura</div> : null}
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
                        <button className="button button-secondary" type="button" onClick={() => void handleCreateAddendum(reservation)}>
                          Gerar aditivo
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
                        <a className="button button-secondary" href={`/minha-reserva/${reservation.public_link_token}`} target="_blank" rel="noreferrer">
                          Abrir reserva
                        </a>
                        <button className="button button-secondary" type="button" onClick={() => void handleCopyReservationLink(reservation.id)}>
                          Copiar reserva
                        </button>
                        <button className="button button-secondary" type="button" onClick={() => void handleShareReservationLink(reservation.id)}>
                          Enviar reserva
                        </button>
                        <button className="button button-secondary" type="button" onClick={() => void handleCopyContractLink(reservation.id)}>
                          Copiar contrato
                        </button>
                        <button className="button button-secondary" type="button" onClick={() => void handleShareContractLink(reservation.id)}>
                          Enviar contrato
                        </button>
                        <button className="button button-secondary" type="button" onClick={() => void handleDeleteReservation(reservation.id)} disabled={deletingReservationId === reservation.id}>
                          {deletingReservationId === reservation.id ? 'Excluindo...' : 'Excluir reserva'}
                        </button>
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

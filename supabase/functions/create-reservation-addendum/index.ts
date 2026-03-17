import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  buildAddendumHtml,
  corsHeaders,
  ensureSecureLink,
  jsonResponse,
  queueOrSendWhatsapp,
  requireAuthenticatedUser,
} from '../_shared/index.ts'

function addDaysToDateString(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return [date.getFullYear(), `${date.getMonth() + 1}`.padStart(2, '0'), `${date.getDate()}`.padStart(2, '0')].join('-')
}

function differenceInDaysInclusive(startDate?: string | null, endDate?: string | null) {
  if (!startDate) return 1
  const effectiveEndDate = endDate || startDate
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${effectiveEndDate}T00:00:00`).getTime()
  return Math.max(Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1, 1)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireAuthenticatedUser(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const reservationId = body.reservationId as string
    const extraDays = Number(body.extraDays)
    const notes = body.notes ?? null
    const amountPerDayInput = body.amountPerDay !== undefined ? Number(body.amountPerDay) : null
    const extraAmountInput = body.extraAmount !== undefined ? Number(body.extraAmount) : null

    if (!reservationId || !Number.isFinite(extraDays) || extraDays <= 0) {
      return jsonResponse({ error: 'reservationId e extraDays válidos são obrigatórios.' }, 400)
    }

    const { data: reservation, error: reservationError } = await adminClient
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (reservationError || !reservation) {
      return jsonResponse({ error: 'Reserva não encontrada.' }, 404)
    }

    const previousEndDate = reservation.end_date ?? reservation.event_date
    const amountPerDay = amountPerDayInput ?? Number(reservation.daily_rate ?? ((Number(reservation.total_amount ?? 0) / Math.max(Number(reservation.days_count ?? 1), 1)) || 0))
    const extraAmount = extraAmountInput ?? amountPerDay * extraDays
    const newEndDate = addDaysToDateString(previousEndDate, extraDays)
    const newDaysCount = differenceInDaysInclusive(reservation.event_date, newEndDate)
    const newTotalAmount = Number(reservation.total_amount ?? 0) + extraAmount
    const entryAmount = Number(reservation.entry_amount ?? 0)
    const newRemainingAmount = Math.max(newTotalAmount - entryAmount, 0)

    const { data: updatedReservation, error: updateReservationError } = await adminClient
      .from('reservations')
      .update({
        end_date: newEndDate,
        days_count: newDaysCount,
        daily_rate: amountPerDay || reservation.daily_rate,
        total_amount: newTotalAmount,
        remaining_amount: newRemainingAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select('*')
      .single()

    if (updateReservationError || !updatedReservation) {
      return jsonResponse({ error: updateReservationError?.message ?? 'Não foi possível atualizar a reserva.' }, 400)
    }

    const { count } = await adminClient
      .from('reservation_addendums')
      .select('*', { count: 'exact', head: true })
      .eq('reservation_id', reservationId)

    const nextAddendumNumber = Number(count ?? 0) + 1

    const { data: latestContract } = await adminClient
      .from('contracts')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const html = buildAddendumHtml({
      reservation: updatedReservation,
      previousEndDate,
      newEndDate,
      extraDays,
      amountPerDay,
      extraAmount,
      newTotalAmount,
      notes,
    })

    const documentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html)).then((buffer) =>
      Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    )

    const { data: contract, error: contractError } = await adminClient
      .from('contracts')
      .insert({
        reservation_id: reservationId,
        version: Number(latestContract?.version ?? 0) + 1,
        status: 'liberado_assinatura',
        html_content: html,
        generated_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
        document_hash: documentHash,
        template_key: 'reservation_addendum_v1',
      })
      .select('*')
      .single()

    if (contractError || !contract) {
      return jsonResponse({ error: contractError?.message ?? 'Não foi possível gerar o contrato do aditivo.' }, 400)
    }

    const { data: addendum, error: addendumError } = await adminClient
      .from('reservation_addendums')
      .insert({
        reservation_id: reservationId,
        contract_id: contract.id,
        addendum_number: nextAddendumNumber,
        previous_end_date: previousEndDate,
        new_end_date: newEndDate,
        extra_days: extraDays,
        amount_per_day: amountPerDay,
        extra_amount: extraAmount,
        notes,
        created_by: auth.user?.id ?? null,
      })
      .select('*')
      .single()

    if (addendumError || !addendum) {
      return jsonResponse({ error: addendumError?.message ?? 'Não foi possível registrar o aditivo.' }, 400)
    }

    const contractViewLink = await ensureSecureLink({
      reservationId,
      type: 'contract_view',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const contractSignLink = await ensureSecureLink({
      reservationId,
      type: 'contract_sign',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const statusLink = await ensureSecureLink({
      reservationId,
      type: 'status',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await queueOrSendWhatsapp({
      reservationId,
      phone: reservation.customer_phone,
      templateName: 'reservation_addendum_ready',
      messageBody: `Olá, ${reservation.customer_name}. O termo aditivo da sua reserva no 3Deventos foi gerado. Acompanhe: ${appUrl}/minha-reserva/${statusLink.token} | Documento: ${appUrl}/contrato/${contractViewLink.token} | Assinatura: ${appUrl}/contrato/${contractSignLink.token}`,
    })

    return jsonResponse({
      ok: true,
      reservation: updatedReservation,
      addendum,
      contract,
      statusUrl: `${appUrl}/minha-reserva/${statusLink.token}`,
      contractViewUrl: `${appUrl}/contrato/${contractViewLink.token}`,
      contractSignUrl: `${appUrl}/contrato/${contractSignLink.token}`,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

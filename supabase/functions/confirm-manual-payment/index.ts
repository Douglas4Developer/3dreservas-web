import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  buildContractHtml,
  corsHeaders,
  ensureSecureLink,
  jsonResponse,
  queueOrSendWhatsapp,
  requireAuthenticatedUser,
} from '../_shared/index.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireAuthenticatedUser(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const reservationId = body.reservationId as string
    const amount = Number(body.amount)
    const paymentMethodLabel = body.paymentMethodLabel ?? 'pix_manual'
    const confirmationNotes = body.confirmationNotes ?? null

    if (!reservationId || !amount || Number.isNaN(amount)) {
      return jsonResponse({ error: 'reservationId e amount são obrigatórios.' }, 400)
    }

    const { data: reservation, error: reservationError } = await adminClient
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (reservationError || !reservation) {
      return jsonResponse({ error: 'Reserva não encontrada.' }, 404)
    }

    await adminClient
      .from('payment_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('reservation_id', reservationId)
      .eq('status', 'pending')

    const { data: existingPayment } = await adminClient
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      await adminClient.from('payments').update({
        amount,
        status: 'pago',
        provider: 'manual',
        provider_reference: `manual-${Date.now()}`,
        payment_method_label: paymentMethodLabel,
        paid_at: new Date().toISOString(),
        confirmed_by: auth.user?.id ?? null,
        confirmation_notes: confirmationNotes,
        updated_at: new Date().toISOString(),
      }).eq('id', existingPayment.id)
    } else {
      await adminClient.from('payments').insert({
        reservation_id: reservationId,
        amount,
        status: 'pago',
        provider: 'manual',
        provider_reference: `manual-${Date.now()}`,
        payment_method_label: paymentMethodLabel,
        paid_at: new Date().toISOString(),
        confirmed_by: auth.user?.id ?? null,
        confirmation_notes: confirmationNotes,
      })
    }

    await adminClient.from('reservations').update({
      status: 'reservado',
      expires_at: null,
      entry_due_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', reservationId)

    const html = buildContractHtml(reservation)
    const documentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html)).then((buffer) =>
      Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    )

    const { data: existingContract } = await adminClient
      .from('contracts')
      .select('*')
      .eq('reservation_id', reservationId)
      .maybeSingle()

    let contract

    if (existingContract) {
      const { data } = await adminClient.from('contracts').update({
        status: 'liberado_assinatura',
        html_content: html,
        generated_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
        document_hash: documentHash,
        template_key: 'default_v1',
        updated_at: new Date().toISOString(),
      }).eq('id', existingContract.id).select('*').single()
      contract = data
    } else {
      const { data } = await adminClient.from('contracts').insert({
        reservation_id: reservationId,
        version: 1,
        status: 'liberado_assinatura',
        html_content: html,
        generated_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
        document_hash: documentHash,
        template_key: 'default_v1',
      }).select('*').single()
      contract = data
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
      templateName: 'manual_payment_confirmed',
      messageBody: `Olá, ${reservation.customer_name}. Confirmamos sua entrada no 3Deventos. Acompanhe sua reserva: ${appUrl}/minha-reserva/${statusLink.token} | Contrato: ${appUrl}/contrato/${contractViewLink.token} | Assinatura: ${appUrl}/contrato/${contractSignLink.token}`,
    })

    return jsonResponse({
      ok: true,
      contract,
      statusUrl: `${appUrl}/minha-reserva/${statusLink.token}`,
      contractViewUrl: `${appUrl}/contrato/${contractViewLink.token}`,
      contractSignUrl: `${appUrl}/contrato/${contractSignLink.token}`,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

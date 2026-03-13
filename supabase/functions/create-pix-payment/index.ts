import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  corsHeaders,
  ensureSecureLink,
  jsonResponse,
  mercadoPagoToken,
  queueOrSendWhatsapp,
  requireAuthenticatedUser,
  supabaseUrl,
} from '../_shared/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireAuthenticatedUser(req)
    if (auth.error) return auth.error

    if (!mercadoPagoToken) {
      return jsonResponse({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' }, 500)
    }

    const body = await req.json()
    const reservationId = body.reservationId as string
    const amount = Number(body.amount)
    const expiresInMinutes = Math.max(10, Math.min(Number(body.expiresInMinutes ?? 30), 1440))

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

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()

    await adminClient
      .from('payment_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('reservation_id', reservation.id)
      .eq('status', 'pending')

    const payerEmail = reservation.customer_email || `checkout+${reservation.id}@3deventos.com`
    const idempotencyKey = crypto.randomUUID()

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: body.description ?? `Entrada da reserva ${reservation.event_date}`,
        payment_method_id: 'pix',
        external_reference: reservation.id,
        notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
        date_of_expiration: expiresAt,
        payer: {
          email: payerEmail,
          first_name: reservation.customer_name?.split(' ')?.[0] ?? 'Cliente',
          last_name: reservation.customer_name?.split(' ')?.slice(1)?.join(' ') ?? '3Deventos',
        },
        metadata: {
          reservation_id: reservation.id,
          checkout_type: 'pix',
        },
      }),
    })

    const mpPayload = await mpResponse.json()
    if (!mpResponse.ok) {
      return jsonResponse({ error: 'Falha ao gerar cobrança Pix.', details: mpPayload }, 502)
    }

    const providerPaymentId = mpPayload.id?.toString?.() ?? null
    const pixCopyPaste = mpPayload.point_of_interaction?.transaction_data?.qr_code ?? null
    const qrCodeBase64 = mpPayload.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    const qrCode = mpPayload.point_of_interaction?.transaction_data?.ticket_url ?? null

    const { data: paymentOrder, error: paymentOrderError } = await adminClient
      .from('payment_orders')
      .insert({
        reservation_id: reservation.id,
        provider: 'mercado_pago',
        provider_external_id: providerPaymentId,
        provider_payment_id: providerPaymentId,
        amount,
        status: 'pending',
        expires_at: expiresAt,
        checkout_type: 'pix',
        pix_qr_code: qrCode,
        pix_copy_paste: pixCopyPaste,
        qr_code_base64: qrCodeBase64,
        created_by: auth.user?.id ?? null,
      })
      .select('*')
      .single()

    if (paymentOrderError) return jsonResponse({ error: paymentOrderError.message }, 400)

    await adminClient.from('reservations').update({
      status: 'aguardando_pagamento',
      entry_due_at: expiresAt,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', reservation.id)

    const { data: openPayment } = await adminClient
      .from('payments')
      .select('*')
      .eq('reservation_id', reservation.id)
      .eq('status', 'pendente')
      .limit(1)
      .maybeSingle()

    if (openPayment) {
      await adminClient.from('payments').update({
        amount,
        provider: 'mercado_pago',
        provider_reference: providerPaymentId,
        payment_method_label: 'pix_checkout',
        payment_method_type: 'bank_transfer',
        updated_at: new Date().toISOString(),
      }).eq('id', openPayment.id)
    } else {
      await adminClient.from('payments').insert({
        reservation_id: reservation.id,
        amount,
        status: 'pendente',
        provider: 'mercado_pago',
        provider_reference: providerPaymentId,
        payment_method_label: 'pix_checkout',
        payment_method_type: 'bank_transfer',
      })
    }

    const statusLink = await ensureSecureLink({
      reservationId: reservation.id,
      type: 'status',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await queueOrSendWhatsapp({
      reservationId: reservation.id,
      phone: reservation.customer_phone,
      templateName: 'payment_link_pix',
      messageBody: `Olá, ${reservation.customer_name}. Seu Pix do 3Deventos foi gerado. Acompanhe a reserva em ${appUrl}/minha-reserva/${statusLink.token}`,
    })

    return jsonResponse({
      paymentOrder,
      pixCopyPaste,
      qrCodeBase64,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

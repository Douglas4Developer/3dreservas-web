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

function sanitizeDocument(document?: string | null) {
  return (document ?? '').replace(/\D/g, '')
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  const firstName = parts[0] ?? 'Cliente'
  const lastName = parts.slice(1).join(' ') || '3DReservas'
  return { firstName, lastName }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await requireAuthenticatedUser(req)
    if (auth.error) return auth.error

    if (!mercadoPagoToken) {
      return jsonResponse({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' }, 500)
    }

    const body = await req.json()
    const reservationId = body.reservationId as string
    const amount = Number(body.amount)
    const expiresInMinutes = Math.max(10, Math.min(Number(body.expiresInMinutes ?? 60), 1440))

    if (!reservationId || !amount || Number.isNaN(amount) || amount <= 0) {
      return jsonResponse({ error: 'reservationId e amount válidos são obrigatórios.' }, 400)
    }

    const { data: reservation, error: reservationError } = await adminClient
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (reservationError || !reservation) {
      return jsonResponse({ error: 'Reserva não encontrada.' }, 404)
    }

    if (!reservation.customer_email) {
      return jsonResponse(
        { error: 'Para gerar Pix em produção, preencha o e-mail do cliente na reserva.' },
        400,
      )
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()
    const { firstName, lastName } = splitName(reservation.customer_name)
    const document = sanitizeDocument((reservation as any).customer_document)

    // Cancela cobranças Pix pendentes anteriores dessa reserva
    await adminClient
      .from('payment_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('reservation_id', reservationId)
      .eq('checkout_type', 'pix')
      .eq('status', 'pending')

    const idempotencyKey = crypto.randomUUID()

    const mpBody: Record<string, unknown> = {
      transaction_amount: amount,
      description: body.title ?? `Entrada da reserva ${reservation.event_date} - Pix`,
      payment_method_id: 'pix',
      external_reference: reservationId,
      notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
      date_of_expiration: expiresAt,
      payer: {
        email: reservation.customer_email,
        first_name: firstName,
        last_name: lastName,
      },
      metadata: {
        reservation_id: reservationId,
        checkout_type: 'pix',
      },
    }

    if (document.length === 11) {
      mpBody.payer = {
        ...(mpBody.payer as Record<string, unknown>),
        identification: {
          type: 'CPF',
          number: document,
        },
      }
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpBody),
    })

    const mpPayload = await mpResponse.json().catch(() => null)

    if (!mpResponse.ok) {
      return jsonResponse(
        {
          error: 'Falha ao gerar cobrança Pix.',
          details: mpPayload,
          hint:
            mpPayload?.message === 'Unauthorized use of live credentials'
              ? 'Confira se o Access Token é de PRODUÇÃO, da aplicação correta de Pagamentos online, da mesma conta recebedora, e se a conta tem Pix/chave Pix habilitada.'
              : null,
        },
        502,
      )
    }

    const paymentId = mpPayload?.id?.toString?.() ?? null
    const qrCode =
      mpPayload?.point_of_interaction?.transaction_data?.qr_code ?? null
    const qrCodeBase64 =
      mpPayload?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    const ticketUrl =
      mpPayload?.point_of_interaction?.transaction_data?.ticket_url ?? null

    const { data: paymentOrder, error: paymentOrderError } = await adminClient
      .from('payment_orders')
      .insert({
        reservation_id: reservationId,
        provider: 'mercado_pago',
        provider_external_id: paymentId,
        provider_payment_id: paymentId,
        checkout_type: 'pix',
        checkout_url: ticketUrl,
        amount,
        status: 'pending',
        expires_at: expiresAt,
        pix_qr_code: qrCode,
        pix_copy_paste: qrCode,
        qr_code_base64: qrCodeBase64,
        created_by: auth.user?.id ?? null,
      })
      .select('*')
      .single()

    if (paymentOrderError) {
      return jsonResponse({ error: paymentOrderError.message }, 400)
    }

    await adminClient
      .from('reservations')
      .update({
        status: 'aguardando_pagamento',
        entry_due_at: expiresAt,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)

    const { data: openPayment } = await adminClient
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .eq('status', 'pendente')
      .limit(1)
      .maybeSingle()

    if (openPayment) {
      await adminClient
        .from('payments')
        .update({
          amount,
          provider: 'mercado_pago',
          provider_reference: paymentId,
          payment_method_type: 'bank_transfer',
          payment_method_id: 'pix',
          updated_at: new Date().toISOString(),
        })
        .eq('id', openPayment.id)
    } else {
      await adminClient.from('payments').insert({
        reservation_id: reservationId,
        amount,
        status: 'pendente',
        provider: 'mercado_pago',
        provider_reference: paymentId,
        payment_method_type: 'bank_transfer',
        payment_method_id: 'pix',
      })
    }

    const statusLink = await ensureSecureLink({
      reservationId,
      type: 'status',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await queueOrSendWhatsapp({
      reservationId,
      phone: reservation.customer_phone,
      templateName: 'payment_link_pix',
      messageBody:
        `Olá, ${reservation.customer_name}. Seu Pix do 3Deventos foi gerado. ` +
        `Acompanhe sua reserva: ${appUrl}/minha-reserva/${statusLink.token}`,
    })

    return jsonResponse({
      paymentOrder,
      paymentId,
      qrCode,
      qrCodeBase64,
      pixCopyPaste: qrCode,
      ticketUrl,
      statusUrl: `${appUrl}/minha-reserva/${statusLink.token}`,
    })
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro interno.' },
      500,
    )
  }
})
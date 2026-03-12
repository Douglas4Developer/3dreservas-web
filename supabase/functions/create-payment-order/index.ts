import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  corsHeaders,
  ensureSecureLink,
  jsonResponse,
  mercadoPagoToken,
  queueOrSendWhatsapp,
  supabaseUrl,
} from '../_shared/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const reservationId = body.reservationId as string
    const amount = Number(body.amount)
    const expiresInMinutes = Math.max(10, Math.min(Number(body.expiresInMinutes ?? 60), 1440))

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

    let providerExternalId: string | null = null
    let checkoutUrl: string | null = null
    let pixQrCode: string | null = null
    let pixCopyPaste: string | null = null

    if (mercadoPagoToken) {
      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              title: body.title ?? `Entrada da reserva ${reservation.event_date}`,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: amount,
            },
          ],
          external_reference: reservation.id,
          metadata: {
            reservation_id: reservation.id,
          },
          notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
          back_urls: {
            success: `${appUrl}/minha-reserva/${reservation.public_link_token}`,
            pending: `${appUrl}/minha-reserva/${reservation.public_link_token}`,
            failure: `${appUrl}/minha-reserva/${reservation.public_link_token}`,
          },
          auto_return: 'approved',
          expires: true,
          expiration_date_to: expiresAt,
        }),
      })

      const mpPayload = await mpResponse.json()
      if (!mpResponse.ok) {
        return jsonResponse({ error: 'Falha ao criar preferência do Mercado Pago.', details: mpPayload }, 502)
      }

      providerExternalId = mpPayload.id ?? null
      checkoutUrl = mpPayload.init_point ?? mpPayload.sandbox_init_point ?? null
    }

    const { data: paymentOrder, error: paymentOrderError } = await adminClient
      .from('payment_orders')
      .insert({
        reservation_id: reservation.id,
        provider: 'mercado_pago',
        provider_external_id: providerExternalId,
        checkout_url: checkoutUrl,
        pix_qr_code: pixQrCode,
        pix_copy_paste: pixCopyPaste,
        amount,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('*')
      .single()

    if (paymentOrderError) {
      return jsonResponse({ error: paymentOrderError.message }, 400)
    }

    await adminClient.from('reservations').update({
      status: 'aguardando_pagamento',
      entry_due_at: expiresAt,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', reservation.id)

    await adminClient.from('payments').insert({
      reservation_id: reservation.id,
      amount,
      status: 'pendente',
      provider: 'mercado_pago',
      provider_reference: providerExternalId,
    })

    const proposalLink = await ensureSecureLink({
      reservationId: reservation.id,
      type: 'proposal',
      expiresAt,
    })
    const paymentLink = await ensureSecureLink({
      reservationId: reservation.id,
      type: 'payment',
      expiresAt,
    })
    const statusLink = await ensureSecureLink({
      reservationId: reservation.id,
      type: 'status',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await queueOrSendWhatsapp({
      reservationId: reservation.id,
      phone: reservation.customer_phone,
      templateName: 'payment_link',
      messageBody: `Olá, ${reservation.customer_name}. Sua proposta do 3Deventos está pronta. Pagamento da entrada: ${checkoutUrl ?? `${appUrl}/proposta/${proposalLink.token}`}. Consulte o status: ${appUrl}/minha-reserva/${statusLink.token}`,
    })

    return jsonResponse({
      paymentOrder,
      paymentUrl: checkoutUrl,
      proposalUrl: `${appUrl}/proposta/${proposalLink.token}`,
      paymentTokenUrl: `${appUrl}/proposta/${paymentLink.token}`,
      statusUrl: `${appUrl}/minha-reserva/${statusLink.token}`,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

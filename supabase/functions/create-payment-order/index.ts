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

type CheckoutType = 'all' | 'pix' | 'card'

function buildPaymentMethods(checkoutType: CheckoutType) {
  if (checkoutType === 'pix') {
    return {
      excluded_payment_types: [
        { id: 'credit_card' },
        { id: 'debit_card' },
        { id: 'ticket' },
        { id: 'account_money' },
      ],
    }
  }

  if (checkoutType === 'card') {
    return {
      excluded_payment_types: [
        { id: 'bank_transfer' },
        { id: 'ticket' },
        { id: 'account_money' },
      ],
    }
  }

  return undefined
}

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
    const expiresInMinutes = Math.max(10, Math.min(Number(body.expiresInMinutes ?? 60), 1440))
    const checkoutType = (body.checkoutType ?? 'all') as CheckoutType

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
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('reservation_id', reservation.id)
      .eq('checkout_type', checkoutType)
      .eq('status', 'pending')

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title:
              body.title ??
              `Entrada da reserva ${reservation.event_date} - ${
                checkoutType === 'pix'
                  ? 'Pix'
                  : checkoutType === 'card'
                    ? 'Cartão'
                    : 'Pix ou cartão'
              }`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: amount,
          },
        ],
        external_reference: reservation.id,
        metadata: {
          reservation_id: reservation.id,
          checkout_type: checkoutType,
        },
        payment_methods: buildPaymentMethods(checkoutType),
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
      return jsonResponse(
        { error: 'Falha ao criar preferência do Mercado Pago.', details: mpPayload },
        502,
      )
    }

    const providerExternalId = mpPayload.id ?? null
    const checkoutUrl = mpPayload.init_point ?? mpPayload.sandbox_init_point ?? null

    const { data: paymentOrder, error: paymentOrderError } = await adminClient
      .from('payment_orders')
      .insert({
        reservation_id: reservation.id,
        provider: 'mercado_pago',
        provider_external_id: providerExternalId,
        checkout_url: checkoutUrl,
        amount,
        status: 'pending',
        expires_at: expiresAt,
        checkout_type: checkoutType,
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
      .eq('id', reservation.id)

    const { data: openPayment } = await adminClient
      .from('payments')
      .select('*')
      .eq('reservation_id', reservation.id)
      .eq('status', 'pendente')
      .limit(1)
      .maybeSingle()

    if (openPayment) {
      await adminClient
        .from('payments')
        .update({
          amount,
          provider: 'mercado_pago',
          provider_reference: providerExternalId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', openPayment.id)
    } else {
      await adminClient.from('payments').insert({
        reservation_id: reservation.id,
        amount,
        status: 'pendente',
        provider: 'mercado_pago',
        provider_reference: providerExternalId,
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
      templateName:
        checkoutType === 'pix'
          ? 'payment_link_pix'
          : checkoutType === 'card'
            ? 'payment_link_card'
            : 'payment_link',
      messageBody: `Olá, ${reservation.customer_name}. Seu link de pagamento do 3Deventos foi gerado (${checkoutType === 'pix' ? 'Pix' : checkoutType === 'card' ? 'Cartão' : 'Pix ou cartão'}): ${checkoutUrl}. Acompanhe sua reserva: ${appUrl}/minha-reserva/${statusLink.token}`,
    })

    return jsonResponse({
      paymentOrder,
      paymentUrl: checkoutUrl,
      checkoutType,
    })
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro interno.' },
      500,
    )
  }
})
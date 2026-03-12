import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  buildContractHtml,
  corsHeaders,
  ensureSecureLink,
  jsonResponse,
  mercadoPagoToken,
  queueOrSendWhatsapp,
} from '../_shared/index.ts'

type MercadoPagoPayment = {
  id?: number | string
  status?: string
  external_reference?: string
  payment_type_id?: string
  payment_method_id?: string
  metadata?: {
    reservation_id?: string
    checkout_type?: string
  }
  order?: {
    id?: string | number
  }
  preference_id?: string
}

function mapPaymentOrderStatus(status?: string) {
  if (status === 'approved') return 'approved'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'rejected' || status === 'refunded' || status === 'charged_back') return 'failed'
  return 'pending'
}

function mapPaymentStatus(status?: string) {
  if (status === 'approved') return 'pago'
  if (status === 'cancelled' || status === 'rejected' || status === 'refunded' || status === 'charged_back') {
    return 'falhou'
  }
  return 'pendente'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    const eventType =
      url.searchParams.get('type') ??
      payload?.type ??
      payload?.action ??
      'unknown'

    const incomingPaymentId =
      url.searchParams.get('data.id') ??
      payload?.data?.id?.toString?.() ??
      payload?.id?.toString?.() ??
      null

    if (!incomingPaymentId || !mercadoPagoToken) {
      return jsonResponse({ received: true, ignored: true })
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${incomingPaymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
      },
    })

    const paymentData: MercadoPagoPayment = await paymentResponse.json()

    if (!paymentResponse.ok) {
      return jsonResponse(
        {
          error: 'Não foi possível consultar o pagamento no Mercado Pago.',
          details: paymentData,
        },
        502,
      )
    }

    const paymentId = paymentData.id?.toString() ?? null
    const paymentMethodType = paymentData.payment_type_id ?? null
    const paymentMethodId = paymentData.payment_method_id ?? null
    const status = paymentData.status ?? 'pending'

    const reservationId =
      paymentData.external_reference ??
      paymentData.metadata?.reservation_id ??
      null

    if (!reservationId) {
      return jsonResponse({ received: true, ignored: true, reason: 'reservation_not_found' })
    }

    const { data: paymentOrder } = await adminClient
      .from('payment_orders')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    await adminClient.from('payment_events').insert({
      payment_order_id: paymentOrder?.id ?? null,
      provider: 'mercado_pago',
      event_type: eventType,
      payload_json: paymentData,
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      success: true,
    })

    if (paymentOrder?.id) {
      await adminClient
        .from('payment_orders')
        .update({
          status: mapPaymentOrderStatus(status),
          provider_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentOrder.id)
    } else {
      await adminClient
        .from('payment_orders')
        .update({
          status: mapPaymentOrderStatus(status),
          provider_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('reservation_id', reservationId)
        .eq('status', 'pending')
    }

    await adminClient
      .from('payments')
      .update({
        status: mapPaymentStatus(status),
        payment_method_type: paymentMethodType,
        payment_method_id: paymentMethodId,
        provider_reference: paymentId,
        paid_at: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('reservation_id', reservationId)
      .eq('status', 'pendente')

    if (status === 'approved') {
      await adminClient
        .from('reservations')
        .update({
          status: 'reservado',
          expires_at: null,
          entry_due_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

      const { data: reservation, error: reservationError } = await adminClient
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single()

      if (reservationError || !reservation) {
        return jsonResponse({
          received: true,
          warning: 'Pagamento aprovado, mas reserva não encontrada para gerar contrato.',
        })
      }

      const html = buildContractHtml(reservation)

      const documentHash = await crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(html))
        .then((buffer) =>
          Array.from(new Uint8Array(buffer))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join(''),
        )

      const { data: existingContract } = await adminClient
        .from('contracts')
        .select('*')
        .eq('reservation_id', reservationId)
        .maybeSingle()

      if (existingContract) {
        await adminClient
          .from('contracts')
          .update({
            status: 'liberado_assinatura',
            html_content: html,
            generated_at: new Date().toISOString(),
            released_at: new Date().toISOString(),
            document_hash: documentHash,
            template_key: 'default_v1',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingContract.id)
      } else {
        await adminClient.from('contracts').insert({
          reservation_id: reservationId,
          version: 1,
          status: 'liberado_assinatura',
          html_content: html,
          generated_at: new Date().toISOString(),
          released_at: new Date().toISOString(),
          document_hash: documentHash,
          template_key: 'default_v1',
        })
      }

      const contractViewLink = await ensureSecureLink({
        reservationId,
        type: 'contract_view',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const contractSignLink = await ensureSecureLink({
        reservationId,
        type: 'contract_sign',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const statusLink = await ensureSecureLink({
        reservationId,
        type: 'status',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const paymentMethodLabel =
        paymentMethodType === 'bank_transfer'
          ? 'Pix'
          : paymentMethodType === 'credit_card'
            ? 'Cartão de crédito'
            : paymentMethodType === 'debit_card'
              ? 'Cartão de débito'
              : 'Pagamento online'

      await queueOrSendWhatsapp({
        reservationId,
        phone: reservation.customer_phone,
        templateName: 'payment_confirmed',
        messageBody:
          `Pagamento aprovado com sucesso via ${paymentMethodLabel}. ` +
          `Sua reserva está confirmada. ` +
          `Status: ${appUrl}/minha-reserva/${statusLink.token} | ` +
          `Contrato: ${appUrl}/contrato/${contractViewLink.token} | ` +
          `Assinatura: ${appUrl}/contrato/${contractSignLink.token}`,
      })
    } else if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(status)) {
      await adminClient
        .from('reservations')
        .update({
          status: 'cancelado',
          expires_at: null,
          entry_due_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

      const { data: reservation } = await adminClient
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single()

      if (reservation) {
        await queueOrSendWhatsapp({
          reservationId,
          phone: reservation.customer_phone,
          templateName: 'payment_failed',
          messageBody:
            'O pagamento da entrada não foi concluído e a data voltou a ficar disponível. ' +
            'Fale com o 3Deventos para reabrir a proposta.',
        })
      }
    }

    return jsonResponse({ received: true })
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro interno.' },
      500,
    )
  }
})
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  buildContractHtml,
  corsHeaders,
  ensureSecureLink,
  generateContractPdfBytes,
  jsonResponse,
  mercadoPagoToken,
  queueOrSendWhatsapp,
  uploadContractPdf,
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

type MercadoPagoMerchantOrder = {
  id?: number | string
  external_reference?: string
  payments?: Array<{
    id?: number | string
    status?: string
  }>
}

function mapPaymentOrderStatus(status?: string) {
  if (status === 'approved') return 'paid'
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

function paymentMethodLabel(paymentMethodType?: string | null) {
  if (paymentMethodType === 'bank_transfer') return 'Pix'
  if (paymentMethodType === 'credit_card') return 'Cartão de crédito'
  if (paymentMethodType === 'debit_card') return 'Cartão de débito'
  return 'Pagamento online'
}

async function throwIfError<T extends { error?: { message?: string } | null }>(promise: Promise<T>) {
  const result = await promise
  if (result.error) {
    throw new Error(result.error.message ?? 'Erro no banco de dados.')
  }
  return result
}

async function fetchMercadoPagoJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    headers: {
      Authorization: `Bearer ${mercadoPagoToken}`,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message ?? `Falha ao consultar ${path} no Mercado Pago.`)
  }

  return payload as T
}

async function resolveIncomingPaymentId(url: URL, payload: any, eventType: string) {
  const directPaymentId =
    url.searchParams.get('data.id') ??
    payload?.data?.id?.toString?.() ??
    payload?.id?.toString?.() ??
    null

  if (!directPaymentId || !mercadoPagoToken) {
    return null
  }

  const normalizedEventType = eventType.toLowerCase()
  const looksLikeMerchantOrder =
    normalizedEventType.includes('merchant_order') ||
    normalizedEventType.includes('merchant-order') ||
    normalizedEventType.includes('topic_merchant_order')

  if (!looksLikeMerchantOrder) {
    return directPaymentId
  }

  const merchantOrder = await fetchMercadoPagoJson<MercadoPagoMerchantOrder>(`/merchant_orders/${directPaymentId}`)
  const approvedPayment = merchantOrder.payments?.find((item) => item.status === 'approved' && item.id)
  const lastPayment = approvedPayment ?? merchantOrder.payments?.find((item) => item.id)

  return lastPayment?.id?.toString?.() ?? null
}

async function upsertReservationContract(reservationId: string, paymentMethodType?: string | null) {
  const { data: reservation, error: reservationError } = await adminClient
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .single()

  if (reservationError || !reservation) {
    return null
  }

  const { data: existingContracts, error: contractFetchError } = await adminClient
    .from('contracts')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('version', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (contractFetchError) {
    throw new Error(contractFetchError.message)
  }

  const existingContract = existingContracts?.[0] ?? null
  const html = buildContractHtml(reservation, existingContract)
  const documentHash = await crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(html))
    .then((buffer) =>
      Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join(''),
    )

  let contract

  if (existingContract) {
    const { data, error } = await adminClient
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
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    contract = data
  } else {
    const { data, error } = await adminClient
      .from('contracts')
      .insert({
        reservation_id: reservationId,
        version: 1,
        status: 'liberado_assinatura',
        html_content: html,
        generated_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
        document_hash: documentHash,
        template_key: 'default_v1',
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    contract = data
  }

  const pdfBytes = await generateContractPdfBytes({
    contract,
    reservation,
    signatures: [],
  })
  const uploadedPdf = await uploadContractPdf(contract.id, contract.version, pdfBytes)

  await throwIfError(
    adminClient
      .from('contracts')
      .update({
        file_path: uploadedPdf.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contract.id),
  )

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

  await queueOrSendWhatsapp({
    reservationId,
    phone: reservation.customer_phone,
    templateName: 'payment_confirmed',
    messageBody:
      `Pagamento aprovado com sucesso via ${paymentMethodLabel(paymentMethodType)}. ` +
      `Sua reserva está confirmada. ` +
      `Status: ${appUrl}/minha-reserva/${statusLink.token} | ` +
      `Contrato: ${appUrl}/contrato/${contractViewLink.token} | ` +
      `Assinatura: ${appUrl}/contrato/${contractSignLink.token}`,
  })

  return {
    reservation,
    contractViewLink,
    contractSignLink,
    statusLink,
  }
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
      payload?.topic ??
      'unknown'

    const incomingPaymentId = await resolveIncomingPaymentId(url, payload, eventType)

    if (!incomingPaymentId || !mercadoPagoToken) {
      return jsonResponse({ received: true, ignored: true })
    }

    const paymentData = await fetchMercadoPagoJson<MercadoPagoPayment>(`/v1/payments/${incomingPaymentId}`)

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

    const { data: paymentOrderByPaymentId, error: paymentOrderByPaymentIdError } = await adminClient
      .from('payment_orders')
      .select('*')
      .eq('provider_payment_id', paymentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentOrderByPaymentIdError) {
      throw new Error(paymentOrderByPaymentIdError.message)
    }

    const { data: paymentOrderByReservation, error: paymentOrderByReservationError } = await adminClient
      .from('payment_orders')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentOrderByReservationError) {
      throw new Error(paymentOrderByReservationError.message)
    }

    const paymentOrder = paymentOrderByPaymentId ?? paymentOrderByReservation ?? null

    await throwIfError(
      adminClient.from('payment_events').insert({
        payment_order_id: paymentOrder?.id ?? null,
        provider: 'mercado_pago',
        event_type: eventType,
        payload_json: paymentData,
        received_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        success: true,
      }),
    )

    if (paymentOrder?.id) {
      await throwIfError(
        adminClient
          .from('payment_orders')
          .update({
            status: mapPaymentOrderStatus(status),
            provider_payment_id: paymentId,
            provider_external_id: paymentOrder.provider_external_id ?? paymentData.preference_id ?? paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentOrder.id),
      )
    } else {
      await throwIfError(
        adminClient
          .from('payment_orders')
          .update({
            status: mapPaymentOrderStatus(status),
            provider_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq('reservation_id', reservationId)
          .eq('status', 'pending'),
      )
    }

    const { data: existingPayment, error: existingPaymentError } = await adminClient
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPaymentError) {
      throw new Error(existingPaymentError.message)
    }

    if (existingPayment) {
      await throwIfError(
        adminClient
          .from('payments')
          .update({
            status: mapPaymentStatus(status),
            payment_method_type: paymentMethodType,
            payment_method_id: paymentMethodId,
            payment_method_label: paymentMethodLabel(paymentMethodType),
            provider: 'mercado_pago',
            provider_reference: paymentId,
            paid_at: status === 'approved' ? new Date().toISOString() : existingPayment.paid_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPayment.id),
      )
    } else {
      await throwIfError(
        adminClient.from('payments').insert({
          reservation_id: reservationId,
          amount: paymentOrder?.amount ?? 0,
          status: mapPaymentStatus(status),
          provider: 'mercado_pago',
          provider_reference: paymentId,
          payment_method_label: paymentMethodLabel(paymentMethodType),
          payment_method_type: paymentMethodType,
          payment_method_id: paymentMethodId,
          paid_at: status === 'approved' ? new Date().toISOString() : null,
        }),
      )
    }

    if (status === 'approved') {
      await throwIfError(
        adminClient
          .from('reservations')
          .update({
            status: 'reservado',
            expires_at: null,
            entry_due_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reservationId),
      )

      await upsertReservationContract(reservationId, paymentMethodType)
    } else if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(status)) {
      await throwIfError(
        adminClient
          .from('reservations')
          .update({
            status: 'cancelado',
            expires_at: null,
            entry_due_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reservationId),
      )
    }

    return jsonResponse({
      received: true,
      paymentId,
      reservationId,
      status,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

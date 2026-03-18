import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  buildContractHtml,
  corsHeaders,
  ensureSecureLink,
  generateContractPdfBytes,
  jsonResponse,
  queueOrSendWhatsapp,
  requireAuthenticatedUser,
  uploadContractPdf,
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

    if (!reservationId || !amount || Number.isNaN(amount) || amount <= 0) {
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

    const now = new Date().toISOString()

    await adminClient
      .from('payment_orders')
      .update({ status: 'cancelled', updated_at: now })
      .eq('reservation_id', reservationId)
      .eq('status', 'pending')

    const { data: existingPayment, error: existingPaymentError } = await adminClient
      .from('payments')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPaymentError) {
      return jsonResponse({ error: existingPaymentError.message }, 400)
    }

    if (existingPayment) {
      const { error } = await adminClient
        .from('payments')
        .update({
          amount,
          status: 'pago',
          provider: 'manual',
          provider_reference: `manual-${Date.now()}`,
          payment_method_label: paymentMethodLabel,
          paid_at: now,
          confirmed_by: auth.user?.id ?? null,
          confirmation_notes: confirmationNotes,
          updated_at: now,
        })
        .eq('id', existingPayment.id)

      if (error) return jsonResponse({ error: error.message }, 400)
    } else {
      const { error } = await adminClient.from('payments').insert({
        reservation_id: reservationId,
        amount,
        status: 'pago',
        provider: 'manual',
        provider_reference: `manual-${Date.now()}`,
        payment_method_label: paymentMethodLabel,
        paid_at: now,
        confirmed_by: auth.user?.id ?? null,
        confirmation_notes: confirmationNotes,
      })

      if (error) return jsonResponse({ error: error.message }, 400)
    }

    const { error: reservationUpdateError } = await adminClient
      .from('reservations')
      .update({
        status: 'reservado',
        expires_at: null,
        entry_due_at: null,
        updated_at: now,
      })
      .eq('id', reservationId)

    if (reservationUpdateError) return jsonResponse({ error: reservationUpdateError.message }, 400)

    const reservationForContract = { ...reservation, status: 'reservado', expires_at: null, entry_due_at: null, updated_at: now }

    const { data: existingContracts, error: existingContractsError } = await adminClient
      .from('contracts')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('version', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingContractsError) {
      return jsonResponse({ error: existingContractsError.message }, 400)
    }

    const existingContract = existingContracts?.[0] ?? null
    const html = buildContractHtml(reservationForContract, existingContract)
    const documentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html)).then((buffer) =>
      Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    )

    let contract

    if (existingContract) {
      const { data, error } = await adminClient.from('contracts').update({
        status: 'liberado_assinatura',
        html_content: html,
        generated_at: now,
        released_at: now,
        document_hash: documentHash,
        template_key: 'default_v1',
        updated_at: now,
      }).eq('id', existingContract.id).select('*').single()
      if (error) return jsonResponse({ error: error.message }, 400)
      contract = data
    } else {
      const { data, error } = await adminClient.from('contracts').insert({
        reservation_id: reservationId,
        version: 1,
        status: 'liberado_assinatura',
        html_content: html,
        generated_at: now,
        released_at: now,
        document_hash: documentHash,
        template_key: 'default_v1',
      }).select('*').single()
      if (error) return jsonResponse({ error: error.message }, 400)
      contract = data
    }

    const pdfBytes = await generateContractPdfBytes({
      contract,
      reservation: reservationForContract,
      signatures: [],
    })
    const uploadedPdf = await uploadContractPdf(contract.id, contract.version, pdfBytes)

    const { data: contractWithPreview, error: fileError } = await adminClient
      .from('contracts')
      .update({
        file_path: uploadedPdf.publicUrl,
        updated_at: now,
      })
      .eq('id', contract.id)
      .select('*')
      .single()

    if (fileError) return jsonResponse({ error: fileError.message }, 400)

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
      contract: contractWithPreview,
      statusUrl: `${appUrl}/minha-reserva/${statusLink.token}`,
      contractViewUrl: `${appUrl}/contrato/${contractViewLink.token}`,
      contractSignUrl: `${appUrl}/contrato/${contractSignLink.token}`,
      previewUrl: uploadedPdf.publicUrl,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

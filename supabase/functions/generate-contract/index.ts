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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireAuthenticatedUser(req)
    if (auth.error) return auth.error

    const { reservationId } = await req.json()
    if (!reservationId) return jsonResponse({ error: 'reservationId é obrigatório.' }, 400)

    const { data: reservation, error: reservationError } = await adminClient
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (reservationError || !reservation) return jsonResponse({ error: 'Reserva não encontrada.' }, 404)

    const { data: existing } = await adminClient
      .from('contracts')
      .select('*')
      .eq('reservation_id', reservation.id)
      .maybeSingle()

    const html = buildContractHtml(reservation, existing)
    const documentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(html)).then((buffer) =>
      Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    )

    let contract
    if (existing) {
      const { data, error } = await adminClient
        .from('contracts')
        .update({
          status: reservation.status === 'reservado' ? 'liberado_assinatura' : 'rascunho',
          html_content: html,
          generated_at: new Date().toISOString(),
          released_at: reservation.status === 'reservado' ? new Date().toISOString() : null,
          document_hash: documentHash,
          template_key: 'default_v1',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) return jsonResponse({ error: error.message }, 400)
      contract = data
    } else {
      const { data, error } = await adminClient
        .from('contracts')
        .insert({
          reservation_id: reservation.id,
          version: 1,
          status: reservation.status === 'reservado' ? 'liberado_assinatura' : 'rascunho',
          html_content: html,
          generated_at: new Date().toISOString(),
          released_at: reservation.status === 'reservado' ? new Date().toISOString() : null,
          document_hash: documentHash,
          template_key: 'default_v1',
        })
        .select('*')
        .single()
      if (error) return jsonResponse({ error: error.message }, 400)
      contract = data
    }

    const pdfBytes = await generateContractPdfBytes({
      contract,
      reservation,
      signatures: [],
    })
    const uploadedPdf = await uploadContractPdf(contract.id, contract.version, pdfBytes)

    const { data: updatedContract, error: updateError } = await adminClient
      .from('contracts')
      .update({
        file_path: uploadedPdf.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contract.id)
      .select('*')
      .single()

    if (updateError) return jsonResponse({ error: updateError.message }, 400)

    const viewLink = await ensureSecureLink({
      reservationId: reservation.id,
      type: 'contract_view',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const signLink = await ensureSecureLink({
      reservationId: reservation.id,
      type: 'contract_sign',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (reservation.status === 'reservado') {
      await queueOrSendWhatsapp({
        reservationId: reservation.id,
        phone: reservation.customer_phone,
        templateName: 'contract_ready',
        messageBody: `Olá, ${reservation.customer_name}. Seu contrato do 3Deventos está pronto. Visualize: ${appUrl}/contrato/${viewLink.token} | Assine: ${appUrl}/contrato/${signLink.token}`,
      })
    }

    return jsonResponse({
      contract: updatedContract,
      viewUrl: `${appUrl}/contrato/${viewLink.token}`,
      signUrl: `${appUrl}/contrato/${signLink.token}`,
      previewUrl: uploadedPdf.publicUrl,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  corsHeaders,
  ensureSecureLink,
  generateContractPdfBytes,
  jsonResponse,
  queueOrSendWhatsapp,
  uploadContractPdf,
} from '../_shared/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const signerRole = (body.signer_role ?? 'client') as 'client' | 'admin'
    const signerName = body.signer_name as string
    const signerDocument = body.signer_document as string | undefined
    const signatureDataUrl = body.signature_data_url as string | undefined

    if (!signerName) return jsonResponse({ error: 'signer_name é obrigatório.' }, 400)
    if (signerRole === 'client' && !signatureDataUrl) {
      return jsonResponse({ error: 'A assinatura desenhada é obrigatória para o cliente.' }, 400)
    }

    let reservationId: string | null = null
    let contractId: string | null = body.contractId ?? null
    let linkId: string | null = null

    if (body.token) {
      const { data: link } = await adminClient
        .from('secure_links')
        .select('*')
        .eq('token', body.token)
        .eq('type', 'contract_sign')
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (!link) return jsonResponse({ error: 'Link de assinatura inválido ou expirado.' }, 404)
      reservationId = link.reservation_id
      linkId = link.id
    }

    if (!reservationId && !contractId) {
      return jsonResponse({ error: 'token ou contractId é obrigatório.' }, 400)
    }

    let contractQuery = adminClient.from('contracts').select('*, reservations(*)')
    contractQuery = contractId ? contractQuery.eq('id', contractId) : contractQuery.eq('reservation_id', reservationId)
    const { data: contract, error: contractError } = await contractQuery.single()

    if (contractError || !contract) return jsonResponse({ error: 'Contrato não encontrado.' }, 404)

    const reservation = contract.reservations
    if (signerRole === 'client') {
      const { data: paidOrder } = await adminClient
        .from('payment_orders')
        .select('*')
        .eq('reservation_id', contract.reservation_id)
        .in('status', ['paid', 'approved'])
        .limit(1)
        .maybeSingle()

      if (!paidOrder && reservation.status !== 'reservado') {
        return jsonResponse({ error: 'O contrato só pode ser assinado após o pagamento confirmado.' }, 400)
      }
    }

    if (signerRole === 'admin') {
      const { data: clientSignature } = await adminClient
        .from('signatures')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('signer_role', 'client')
        .maybeSingle()

      if (!clientSignature) {
        return jsonResponse({ error: 'O administrador só pode assinar após o cliente.' }, 400)
      }
    }

    const headers = Object.fromEntries(req.headers.entries())
    const forwardedFor = headers['x-forwarded-for'] ?? headers['cf-connecting-ip'] ?? null
    const ipAddress = forwardedFor?.split(',')?.[0]?.trim() ?? null
    const userAgent = headers['user-agent'] ?? null

    const { data: signature, error: signatureError } = await adminClient
      .from('signatures')
      .upsert(
        {
          contract_id: contract.id,
          signer_role: signerRole,
          signer_name: signerName,
          signer_document: signerDocument ?? null,
          signed_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          evidence_json: {
            method: signatureDataUrl ? 'drawn_signature' : 'typed_name',
            source: signerRole === 'admin' ? 'panel' : 'secure_link',
            signature_data_url: signatureDataUrl ?? null,
          },
          document_hash: contract.document_hash ?? null,
        },
        { onConflict: 'contract_id,signer_role' },
      )
      .select('*')
      .single()

    if (signatureError) return jsonResponse({ error: signatureError.message }, 400)

    if (linkId) {
      await adminClient.from('secure_links').update({ used_at: new Date().toISOString() }).eq('id', linkId)
    }

    const { data: signatures } = await adminClient
      .from('signatures')
      .select('*')
      .eq('contract_id', contract.id)
      .order('signed_at', { ascending: true })

    const hasClient = signatures?.some((item) => item.signer_role === 'client')
    const hasAdmin = signatures?.some((item) => item.signer_role === 'admin')

    let nextStatus: 'liberado_assinatura' | 'assinado' = 'liberado_assinatura'
    if (hasClient && hasAdmin) {
      nextStatus = 'assinado'
    }

    const pdfBytes = await generateContractPdfBytes({
      contract: {
        ...contract,
        status: nextStatus,
      },
      reservation,
      signatures: (signatures ?? []) as Array<{
        signer_role: 'client' | 'admin'
        signer_name: string
        signer_document?: string | null
        signed_at: string
        ip_address?: string | null
        user_agent?: string | null
        evidence_json?: Record<string, unknown> | null
      }>,
    })

    const uploadedPdf = await uploadContractPdf(contract.id, contract.version, pdfBytes)

    const contractUpdatePayload: Record<string, string | null> = {
      status: nextStatus,
      final_file_path: uploadedPdf.publicUrl,
      updated_at: new Date().toISOString(),
    }

    if (hasClient && hasAdmin) {
      contractUpdatePayload.signed_at = new Date().toISOString()
    }

    await adminClient.from('contracts').update(contractUpdatePayload).eq('id', contract.id)

    if (hasClient && hasAdmin) {
      const viewLink = await ensureSecureLink({
        reservationId: contract.reservation_id,
        type: 'contract_view',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })

      await queueOrSendWhatsapp({
        reservationId: contract.reservation_id,
        phone: reservation.customer_phone,
        templateName: 'contract_signed',
        messageBody: `Contrato finalizado com sucesso. PDF: ${uploadedPdf.publicUrl} | Consulta protegida: ${appUrl}/contrato/${viewLink.token}`,
      })
    }

    return jsonResponse({ signature, contractStatus: nextStatus, pdfUrl: uploadedPdf.publicUrl })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

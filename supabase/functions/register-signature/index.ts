import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  corsHeaders,
  ensureSecureLink,
  jsonResponse,
  queueOrSendWhatsapp,
} from '../_shared/index.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const signerRole = (body.signer_role ?? 'client') as 'client' | 'admin'
    const signerName = body.signer_name as string
    const signerDocument = body.signer_document as string | undefined

    if (!signerName) return jsonResponse({ error: 'signer_name é obrigatório.' }, 400)

    let reservationId: string | null = null
    let contractId: string | null = body.contractId ?? null

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
        .eq('status', 'paid')
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
    const ipAddress = headers['x-forwarded-for'] ?? headers['cf-connecting-ip'] ?? null
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
            method: 'typed_name',
            source: signerRole === 'admin' ? 'panel' : 'secure_link',
          },
          document_hash: contract.document_hash ?? null,
        },
        { onConflict: 'contract_id,signer_role' },
      )
      .select('*')
      .single()

    if (signatureError) return jsonResponse({ error: signatureError.message }, 400)

    const { data: signatures } = await adminClient
      .from('signatures')
      .select('*')
      .eq('contract_id', contract.id)

    const hasClient = signatures?.some((item) => item.signer_role === 'client')
    const hasAdmin = signatures?.some((item) => item.signer_role === 'admin')

    let nextStatus: 'liberado_assinatura' | 'assinado' = 'liberado_assinatura'
    if (hasClient && hasAdmin) {
      nextStatus = 'assinado'
      await adminClient.from('contracts').update({
        status: 'assinado',
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', contract.id)

      const viewLink = await ensureSecureLink({
        reservationId: contract.reservation_id,
        type: 'contract_view',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })

      await queueOrSendWhatsapp({
        reservationId: contract.reservation_id,
        phone: reservation.customer_phone,
        templateName: 'contract_signed',
        messageBody: `Contrato finalizado com sucesso. Consulte a versão vigente em ${appUrl}/contrato/${viewLink.token}`,
      })
    } else {
      await adminClient.from('contracts').update({
        status: 'liberado_assinatura',
        updated_at: new Date().toISOString(),
      }).eq('id', contract.id)
    }

    return jsonResponse({ signature, contractStatus: nextStatus })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

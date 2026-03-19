import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  appUrl,
  corsHeaders,
  ensureSecureLink,
  jsonResponse,
  requireAuthenticatedUser,
  sanitizePhone,
} from '../_shared/index.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireAuthenticatedUser(req)
    if (auth.error) return auth.error

    const { reservationId } = await req.json()
    if (!reservationId) return jsonResponse({ error: 'reservationId é obrigatório.' }, 400)

    const { data: reservation, error } = await adminClient
      .from('reservations')
      .select('id, customer_name, customer_phone')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) return jsonResponse({ error: 'Reserva não encontrada.' }, 404)

    const { data: contract } = await adminClient
      .from('contracts')
      .select('id')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const statusLink = await ensureSecureLink({
      reservationId,
      type: 'status',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const contractViewLink = contract
      ? await ensureSecureLink({
          reservationId,
          type: 'contract_view',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      : null

    const contractSignLink = contract
      ? await ensureSecureLink({
          reservationId,
          type: 'contract_sign',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      : null

    const statusUrl = `${appUrl}/minha-reserva/${statusLink.token}`
    const contractViewUrl = contractViewLink ? `${appUrl}/contrato/${contractViewLink.token}` : null
    const contractSignUrl = contractSignLink ? `${appUrl}/contrato/${contractSignLink.token}` : null

    const reservationMessage = encodeURIComponent(
      `Olá, ${reservation.customer_name}. Aqui está o link da sua reserva no 3Deventos: ${statusUrl}`,
    )
    const contractMessage = contractViewUrl
      ? encodeURIComponent(
          `Olá, ${reservation.customer_name}. Aqui está o seu contrato do 3Deventos: ${contractViewUrl}${contractSignUrl ? ` | Assinatura: ${contractSignUrl}` : ''}`,
        )
      : null

    const normalizedPhone = sanitizePhone(String(reservation.customer_phone ?? ''))

    return jsonResponse({
      statusUrl,
      contractViewUrl,
      contractSignUrl,
      reservationWhatsappUrl: `https://wa.me/${normalizedPhone}?text=${reservationMessage}`,
      contractWhatsappUrl: contractMessage ? `https://wa.me/${normalizedPhone}?text=${contractMessage}` : null,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

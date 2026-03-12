import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
export const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
export const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''
export const appUrl = Deno.env.get('APP_URL') || supabaseUrl
export const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || ''
export const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''

export const adminClient = createClient(supabaseUrl, serviceRoleKey)

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export function sanitizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export function buildContractHtml(reservation: {
  customer_name: string
  customer_email?: string | null
  customer_phone: string
  event_date: string
  total_amount?: number | null
  entry_amount?: number | null
  notes?: string | null
}) {
  return `
    <article style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 840px; margin: 0 auto;">
      <h1 style="font-size: 28px; margin-bottom: 8px;">Contrato de locação do espaço 3Deventos</h1>
      <p>Contrato gerado automaticamente pelo 3DReservas.</p>
      <h2 style="margin-top: 24px;">Dados da reserva</h2>
      <ul>
        <li><strong>Cliente:</strong> ${reservation.customer_name}</li>
        <li><strong>Telefone:</strong> ${reservation.customer_phone}</li>
        <li><strong>E-mail:</strong> ${reservation.customer_email ?? '-'}</li>
        <li><strong>Data do evento:</strong> ${reservation.event_date}</li>
        <li><strong>Valor total:</strong> R$ ${Number(reservation.total_amount ?? 0).toFixed(2)}</li>
        <li><strong>Entrada:</strong> R$ ${Number(reservation.entry_amount ?? 0).toFixed(2)}</li>
      </ul>
      <h2 style="margin-top: 24px;">Regras essenciais</h2>
      <ol>
        <li>A reserva é confirmada após aprovação do pagamento da entrada.</li>
        <li>O contrato só é válido após assinatura do cliente e do administrador.</li>
        <li>O espaço segue as regras operacionais definidas pelo 3Deventos, inclusive limites de horário e uso de som.</li>
      </ol>
      <h2 style="margin-top: 24px;">Observações</h2>
      <p>${reservation.notes ?? 'Sem observações adicionais.'}</p>
      <p style="margin-top: 40px;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    </article>
  `.trim()
}

export async function ensureSecureLink(params: {
  reservationId: string
  type: 'proposal' | 'contract_view' | 'contract_sign' | 'status' | 'payment'
  expiresAt: string
}) {
  const { data: existing } = await adminClient
    .from('secure_links')
    .select('*')
    .eq('reservation_id', params.reservationId)
    .eq('type', params.type)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await adminClient
    .from('secure_links')
    .insert({
      reservation_id: params.reservationId,
      type: params.type,
      expires_at: params.expiresAt,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function queueOrSendWhatsapp(params: {
  reservationId?: string
  leadId?: string
  phone: string
  templateName: string
  messageBody: string
}) {
  const normalizedPhone = sanitizePhone(params.phone)

  if (!whatsappToken || !whatsappPhoneNumberId) {
    const { error } = await adminClient.from('whatsapp_messages').insert({
      reservation_id: params.reservationId ?? null,
      lead_id: params.leadId ?? null,
      phone: params.phone,
      template_name: params.templateName,
      message_body: params.messageBody,
      status: 'queued',
    })

    if (error) throw error
    return { status: 'queued' }
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'text',
      text: { body: params.messageBody },
    }),
  })

  const payload = await response.json()

  const insertPayload = {
    reservation_id: params.reservationId ?? null,
    lead_id: params.leadId ?? null,
    phone: params.phone,
    template_name: params.templateName,
    message_body: params.messageBody,
    status: response.ok ? 'sent' : 'failed',
    provider_message_id: payload.messages?.[0]?.id ?? null,
    sent_at: response.ok ? new Date().toISOString() : null,
    error_message: response.ok ? null : JSON.stringify(payload),
  }

  const { error } = await adminClient.from('whatsapp_messages').insert(insertPayload)
  if (error) throw error

  return {
    status: response.ok ? 'sent' : 'failed',
    payload,
  }
}

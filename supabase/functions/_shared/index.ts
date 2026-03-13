import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
export const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
export const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
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

export async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { error: jsonResponse({ error: 'Authorization header ausente.' }, 401), user: null }
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })

  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await authClient.auth.getUser(token)

  if (error || !data.user) {
    return { error: jsonResponse({ error: 'Usuário não autenticado.' }, 401), user: null }
  }

  return { error: null, user: data.user }
}

export function sanitizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function formatCurrency(value?: number | null) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function buildContractHtml(reservation: {
  customer_name: string
  customer_email?: string | null
  customer_phone: string
  customer_document?: string | null
  customer_address?: string | null
  event_type?: string | null
  event_date: string
  period_start?: string | null
  period_end?: string | null
  total_amount?: number | null
  entry_amount?: number | null
  remaining_amount?: number | null
  cleaning_fee?: number | null
  image_use_authorized?: boolean | null
  venue_address_snapshot?: string | null
  capacity_snapshot?: number | null
  notes?: string | null
}) {
  const totalAmount = Number(reservation.total_amount ?? 0)
  const entryAmount = Number(reservation.entry_amount ?? 0)
  const remainingAmount = Number(reservation.remaining_amount ?? totalAmount - entryAmount)
  const cleaningFee = Number(reservation.cleaning_fee ?? 100)
  const imageClause = reservation.image_use_authorized === false
    ? 'O LOCATÁRIO não autoriza o uso de imagens do evento para fins de divulgação.'
    : 'O LOCATÁRIO autoriza o uso de imagens do evento para fins de divulgação, salvo oposição expressa por escrito.'

  return `
  <article style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.7; max-width: 900px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 28px; margin-bottom: 8px;">CONTRATO DE LOCAÇÃO DE ESPAÇO PARA EVENTOS – 3DEventos</h1>
    <p>Contrato gerado automaticamente pelo 3DReservas com base no modelo operacional do 3Deventos.</p>

    <p><strong>LOCADOR:</strong> Douglas Soares de Souza Ferreira, CPF nº 708.321.121-35, residente em Estrada 114 QD3 LT 13, Chácara São Joaquim, Goiânia – GO.</p>
    <p><strong>LOCATÁRIO:</strong> ${reservation.customer_name}, CPF nº ${reservation.customer_document ?? 'não informado'}, residente em ${reservation.customer_address ?? 'endereço não informado'}, telefone ${reservation.customer_phone}, e-mail ${reservation.customer_email ?? 'não informado'}.</p>

    <h2 style="margin-top: 24px;">1. Objeto</h2>
    <p>O presente contrato tem por objeto a locação do espaço físico 3Deventos, localizado em ${reservation.venue_address_snapshot ?? 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia – GO'}, para realização de evento de natureza ${reservation.event_type ?? 'evento privado'}.</p>

    <h2 style="margin-top: 24px;">2. Prazo da locação</h2>
    <p>A locação será válida para o dia <strong>${reservation.event_date}</strong>, com início às <strong>${reservation.period_start ?? '09:00'}</strong> e término às <strong>${reservation.period_end ?? '23:00'}</strong>.</p>

    <h2 style="margin-top: 24px;">3. Valores e pagamentos</h2>
    <ul>
      <li><strong>Valor total:</strong> ${formatCurrency(totalAmount)}</li>
      <li><strong>Entrada / reserva:</strong> ${formatCurrency(entryAmount)}</li>
      <li><strong>Saldo restante:</strong> ${formatCurrency(remainingAmount)}</li>
      <li><strong>Taxa de limpeza:</strong> ${formatCurrency(cleaningFee)} caso o espaço não seja devolvido nas mesmas condições de limpeza.</li>
      <li>Em caso de atraso de pagamento, aplica-se multa de 2% e juros de mora de 1% ao mês.</li>
      <li>Em caso de desistência por parte do LOCATÁRIO, não haverá devolução de valores já pagos, dada a retenção da data e os custos operacionais do evento.</li>
    </ul>

    <h2 style="margin-top: 24px;">4. Regras de uso do espaço</h2>
    <ol>
      <li>Capacidade máxima do local: <strong>${reservation.capacity_snapshot ?? 100} pessoas</strong>.</li>
      <li>É proibido som automotivo.</li>
      <li>O LOCATÁRIO deve respeitar os limites legais de horário e volume de som.</li>
      <li>É proibido o uso de substâncias inflamáveis.</li>
      <li>O espaço será entregue limpo e deve ser devolvido nas mesmas condições.</li>
      <li>Danos ao imóvel, equipamentos ou mobiliário serão de responsabilidade do LOCATÁRIO.</li>
    </ol>

    <h2 style="margin-top: 24px;">5. Responsabilidades</h2>
    <p>O LOCATÁRIO é responsável pelos participantes do evento, pelas informações prestadas e por qualquer infração legal ou dano decorrente do uso do espaço.</p>

    <h2 style="margin-top: 24px;">6. Disposições gerais</h2>
    <p>${imageClause}</p>
    <p>Fica eleito o foro da comarca de Goiânia – GO para dirimir quaisquer dúvidas oriundas deste contrato.</p>

    <h2 style="margin-top: 24px;">7. Observações adicionais</h2>
    <p>${reservation.notes ?? 'Sem observações adicionais.'}</p>

    <div style="margin-top: 48px; display: grid; gap: 32px; grid-template-columns: 1fr 1fr;">
      <div>
        <p><strong>LOCADOR</strong></p>
        <p>___________________________________</p>
        <p>Douglas Soares de Souza Ferreira</p>
      </div>
      <div>
        <p><strong>LOCATÁRIO</strong></p>
        <p>___________________________________</p>
        <p>${reservation.customer_name}</p>
      </div>
    </div>
    <p style="margin-top: 40px; color: #6b7280;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
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

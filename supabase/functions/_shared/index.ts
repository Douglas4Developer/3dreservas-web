import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'https://esm.sh/pdf-lib@1.17.1'

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

interface ContractPdfReservation {
  customer_name: string
  customer_email?: string | null
  customer_phone: string
  customer_document?: string | null
  customer_address?: string | null
  event_type?: string | null
  event_date: string
  end_date?: string | null
  days_count?: number | null
  daily_rate?: number | null
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
}

interface ContractPdfContract {
  id: string
  version?: number | null
  html_content?: string | null
  lessor_name?: string | null
  lessor_document?: string | null
  lessor_address?: string | null
  forum_city?: string | null
  document_hash?: string | null
  status?: string | null
}

interface ContractPdfSignature {
  signer_role: 'client' | 'admin'
  signer_name: string
  signer_document?: string | null
  signed_at: string
  ip_address?: string | null
  user_agent?: string | null
  evidence_json?: Record<string, unknown> | null
}

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

function formatDateTime(value?: string | null) {
  if (!value) return 'Não informado'
  return new Date(value).toLocaleString('pt-BR')
}

function formatDateOnly(value?: string | null) {
  if (!value) return 'Não informado'
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function differenceInDaysInclusive(startDate?: string | null, endDate?: string | null) {
  if (!startDate) return 1
  const effectiveEndDate = endDate || startDate
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${effectiveEndDate}T00:00:00`).getTime()
  return Math.max(Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1, 1)
}

function formatDateRangeText(startDate?: string | null, endDate?: string | null) {
  if (!startDate) return 'Não informado'
  const effectiveEndDate = endDate || startDate
  if (effectiveEndDate === startDate) return formatDateOnly(startDate)
  return `${formatDateOnly(startDate)} até ${formatDateOnly(effectiveEndDate)}`
}

function stripHtml(html?: string | null) {
  if (!html) return ''
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function buildContractHtml(reservation: ContractPdfReservation) {
  const totalAmount = Number(reservation.total_amount ?? 0)
  const entryAmount = Number(reservation.entry_amount ?? 0)
  const remainingAmount = Number(reservation.remaining_amount ?? totalAmount - entryAmount)
  const cleaningFee = Number(reservation.cleaning_fee ?? 100)
  const daysCount = Number(reservation.days_count ?? differenceInDaysInclusive(reservation.event_date, reservation.end_date))
  const dailyRate = Number(reservation.daily_rate ?? (daysCount > 0 ? totalAmount / daysCount : 0))
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
    <p>A locação compreenderá o período de <strong>${formatDateRangeText(reservation.event_date, reservation.end_date)}</strong>, totalizando <strong>${daysCount} ${daysCount === 1 ? 'dia' : 'dias'}</strong>, com início diário às <strong>${reservation.period_start ?? '09:00'}</strong> e término às <strong>${reservation.period_end ?? '23:00'}</strong>.</p>

    <h2 style="margin-top: 24px;">3. Valores e pagamentos</h2>
    <ul>
      <li><strong>Valor da diária:</strong> ${formatCurrency(dailyRate)}</li>
      <li><strong>Quantidade de diárias:</strong> ${daysCount}</li>
      <li><strong>Valor total da locação:</strong> ${formatCurrency(totalAmount)}</li>
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

export function buildAddendumHtml(params: {
  reservation: ContractPdfReservation
  previousEndDate: string
  newEndDate: string
  extraDays: number
  amountPerDay: number
  extraAmount: number
  newTotalAmount: number
  notes?: string | null
}) {
  return `
  <article style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.7; max-width: 900px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 28px; margin-bottom: 8px;">TERMO ADITIVO DE LOCAÇÃO – 3DEventos</h1>
    <p>Documento gerado automaticamente pelo 3DReservas para formalizar a prorrogação da reserva.</p>

    <p><strong>LOCATÁRIO:</strong> ${params.reservation.customer_name}, telefone ${params.reservation.customer_phone}, CPF nº ${params.reservation.customer_document ?? 'não informado'}.</p>
    <p><strong>Período original:</strong> ${formatDateRangeText(params.reservation.event_date, params.previousEndDate)}</p>
    <p><strong>Novo período:</strong> ${formatDateRangeText(params.reservation.event_date, params.newEndDate)}</p>

    <h2 style="margin-top: 24px;">1. Prorrogação</h2>
    <p>Fica ajustada a prorrogação da locação por <strong>${params.extraDays} ${params.extraDays === 1 ? 'dia adicional' : 'dias adicionais'}</strong>, alterando a data final da reserva para <strong>${formatDateOnly(params.newEndDate)}</strong>.</p>

    <h2 style="margin-top: 24px;">2. Valores adicionais</h2>
    <ul>
      <li><strong>Valor por diária adicional:</strong> ${formatCurrency(params.amountPerDay)}</li>
      <li><strong>Valor adicional deste aditivo:</strong> ${formatCurrency(params.extraAmount)}</li>
      <li><strong>Novo valor total da reserva:</strong> ${formatCurrency(params.newTotalAmount)}</li>
    </ul>

    <h2 style="margin-top: 24px;">3. Ratificação</h2>
    <p>Permanecem válidas as demais cláusulas do contrato original que não conflitem com este aditivo.</p>

    <h2 style="margin-top: 24px;">4. Observações</h2>
    <p>${params.notes ?? 'Sem observações adicionais.'}</p>

    <div style="margin-top: 48px; display: grid; gap: 32px; grid-template-columns: 1fr 1fr;">
      <div>
        <p><strong>LOCADOR</strong></p>
        <p>___________________________________</p>
        <p>Douglas Soares de Souza Ferreira</p>
      </div>
      <div>
        <p><strong>LOCATÁRIO</strong></p>
        <p>___________________________________</p>
        <p>${params.reservation.customer_name}</p>
      </div>
    </div>
    <p style="margin-top: 40px; color: #6b7280;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  </article>
  `.trim()
}

function buildContractSections(reservation: ContractPdfReservation, contract: ContractPdfContract) {
  const totalAmount = Number(reservation.total_amount ?? 0)
  const entryAmount = Number(reservation.entry_amount ?? 0)
  const remainingAmount = Number(reservation.remaining_amount ?? totalAmount - entryAmount)
  const cleaningFee = Number(reservation.cleaning_fee ?? 100)
  const lessorName = contract.lessor_name ?? 'Douglas Soares de Souza Ferreira'
  const lessorDocument = contract.lessor_document ?? '708.321.121-35'
  const lessorAddress = contract.lessor_address ?? 'Estrada 114 QD3 LT 13, Chácara São Joaquim, Goiânia - GO'
  const forumCity = contract.forum_city ?? 'Goiânia - GO'

  const renderedHtml = stripHtml(contract.html_content)

  const sections = [
    {
      title: 'Partes',
      body: [
        `LOCADOR: ${lessorName}, CPF/CNPJ ${lessorDocument}, endereço ${lessorAddress}.`,
        `LOCATÁRIO: ${reservation.customer_name}, documento ${reservation.customer_document ?? 'não informado'}, endereço ${reservation.customer_address ?? 'não informado'}, telefone ${reservation.customer_phone}, e-mail ${reservation.customer_email ?? 'não informado'}.`,
      ].join(' '),
    },
    {
      title: 'Objeto e período',
      body: [
        `Locação do espaço 3Deventos em ${reservation.venue_address_snapshot ?? 'Jardim Bonanza, Goiânia - GO'} para ${reservation.event_type ?? 'evento privado'}.`,
        `Período da reserva: ${formatDateRangeText(reservation.event_date, reservation.end_date)}.`,
        `Quantidade de diárias: ${differenceInDaysInclusive(reservation.event_date, reservation.end_date)}. Horário diário: ${reservation.period_start ?? '09:00'} até ${reservation.period_end ?? '23:00'}.`,
      ].join(' '),
    },
    {
      title: 'Valores',
      body: [
        `Valor da diária: ${formatCurrency(Number(reservation.daily_rate ?? (differenceInDaysInclusive(reservation.event_date, reservation.end_date) > 0 ? totalAmount / differenceInDaysInclusive(reservation.event_date, reservation.end_date) : 0)))}.`,
        `Valor total: ${formatCurrency(totalAmount)}.`,
        `Entrada: ${formatCurrency(entryAmount)}.`,
        `Saldo restante: ${formatCurrency(remainingAmount)}.`,
        `Taxa de limpeza: ${formatCurrency(cleaningFee)} quando aplicável.`,
      ].join(' '),
    },
    {
      title: 'Regras principais',
      body: [
        `Capacidade máxima: ${reservation.capacity_snapshot ?? 100} pessoas.`,
        'É proibido som automotivo.',
        'O locatário deve respeitar limites de horário e volume de som.',
        'Danos ao imóvel ou mobiliário são de responsabilidade do locatário.',
      ].join(' '),
    },
    {
      title: 'Disposições gerais',
      body: [
        reservation.image_use_authorized === false
          ? 'O locatário não autoriza o uso de imagens do evento para divulgação.'
          : 'O locatário autoriza o uso de imagens do evento para divulgação, salvo oposição por escrito.',
        `Foro eleito: ${forumCity}.`,
        `Observações: ${reservation.notes ?? 'Sem observações adicionais.'}`,
      ].join(' '),
    },
  ]

  if (renderedHtml) {
    sections.push({
      title: 'Texto integral do contrato',
      body: renderedHtml,
    })
  }

  return sections
}

function splitText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }

    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines
}

function drawWrappedParagraph(page: PDFPage, font: PDFFont, text: string, size: number, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines = splitText(font, text, size, maxWidth)
  for (const line of lines) {
    page.drawText(line, {
      x,
      y,
      size,
      font,
      color: rgb(0.15, 0.23, 0.35),
    })
    y -= lineHeight
  }
  return y
}

function resolveSignatureDataUrl(signature: ContractPdfSignature) {
  const value = signature.evidence_json?.signature_data_url
  return typeof value === 'string' && value.startsWith('data:image') ? value : null
}

function normalizeBase64(dataUrl: string) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
}

export async function generateContractPdfBytes(params: {
  contract: ContractPdfContract
  reservation: ContractPdfReservation
  signatures: ContractPdfSignature[]
}) {
  const pdf = await PDFDocument.create()
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pageSize: [number, number] = [595.28, 841.89]
  const margin = 42
  const usableWidth = pageSize[0] - margin * 2

  let page = pdf.addPage(pageSize)
  let y = pageSize[1] - margin

  const ensureSpace = (needed = 80) => {
    if (y > margin + needed) return
    page = pdf.addPage(pageSize)
    y = pageSize[1] - margin
  }

  page.drawText('CONTRATO DE LOCAÇÃO DE ESPAÇO - 3DEventos', {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2),
  })
  y -= 26

  const metaLine = `Contrato #${params.contract.id.slice(0, 8)} • versão ${params.contract.version ?? 1} • status ${params.contract.status ?? 'liberado_assinatura'}`
  page.drawText(metaLine, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.52),
  })
  y -= 20

  for (const section of buildContractSections(params.reservation, params.contract)) {
    ensureSpace(100)
    page.drawText(section.title, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.11, 0.18, 0.31),
    })
    y -= 18
    y = drawWrappedParagraph(page, fontRegular, section.body, 10, margin, y, usableWidth, 14)
    y -= 12
  }

  ensureSpace(200)
  page.drawText('Assinaturas e evidências', {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.11, 0.18, 0.31),
  })
  y -= 22

  for (const signature of params.signatures) {
    ensureSpace(170)
    page.drawText(signature.signer_role === 'client' ? 'Locatário' : 'Administrador', {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    })
    y -= 16

    page.drawText(`${signature.signer_name}${signature.signer_document ? ` • ${signature.signer_document}` : ''}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.15, 0.23, 0.35),
    })
    y -= 14

    const audit = [
      `Data/hora: ${formatDateTime(signature.signed_at)}`,
      `IP: ${signature.ip_address ?? 'não identificado'}`,
      `Navegador: ${signature.user_agent ?? 'não identificado'}`,
      `Hash do documento: ${params.contract.document_hash ?? 'não informado'}`,
    ]

    for (const line of audit) {
      y = drawWrappedParagraph(page, fontRegular, line, 9, margin, y, usableWidth, 12)
    }

    const signatureDataUrl = resolveSignatureDataUrl(signature)
    if (signatureDataUrl) {
      try {
        const bytes = Uint8Array.from(atob(normalizeBase64(signatureDataUrl)), (char) => char.charCodeAt(0))
        const image = await pdf.embedPng(bytes)
        const scaled = image.scale(0.35)
        y -= 10
        page.drawRectangle({
          x: margin,
          y: y - scaled.height - 12,
          width: Math.min(scaled.width + 16, usableWidth),
          height: scaled.height + 12,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.82, 0.85, 0.9),
          borderWidth: 1,
        })
        page.drawImage(image, {
          x: margin + 8,
          y: y - scaled.height - 6,
          width: scaled.width,
          height: scaled.height,
        })
        y -= scaled.height + 24
      } catch {
        y -= 10
      }
    } else {
      y -= 12
    }
  }

  ensureSpace(80)
  page.drawText(`PDF atualizado em ${formatDateTime(new Date().toISOString())}`, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.42, 0.48, 0.58),
  })
  y -= 12
  page.drawText('Este arquivo contém selo de IP/data e evidencia o travamento da agenda após a assinatura.', {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.42, 0.48, 0.58),
  })

  return await pdf.save()
}

export async function uploadContractPdf(contractId: string, version: number | null | undefined, pdfBytes: Uint8Array) {
  const filePath = `${contractId}/contrato-v${version ?? 1}.pdf`
  const { error } = await adminClient.storage.from('contracts').upload(filePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (error) throw error

  const { data } = adminClient.storage.from('contracts').getPublicUrl(filePath)
  return {
    filePath,
    publicUrl: data.publicUrl,
  }
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

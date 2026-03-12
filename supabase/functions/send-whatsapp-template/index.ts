import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsHeaders, jsonResponse, queueOrSendWhatsapp } from '../_shared/index.ts'

const templateMap: Record<string, (variables?: Record<string, string>) => string> = {
  interest_received: (variables) => `Olá ${variables?.customer_name ?? ''}, recebemos seu interesse no 3Deventos e vamos retornar em breve.`,
  proposal_ready: (variables) => `Sua proposta está pronta: ${variables?.proposal_url ?? ''}`,
  payment_link: (variables) => `Seu link de pagamento está pronto: ${variables?.payment_url ?? ''}`,
  payment_confirmed: (variables) => `Pagamento aprovado. Acompanhe sua reserva aqui: ${variables?.status_url ?? ''}`,
  contract_ready: (variables) => `Seu contrato foi liberado: ${variables?.contract_url ?? ''}`,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const templateName = body.templateName as string
    const phone = body.phone as string
    const variables = body.variables as Record<string, string> | undefined

    if (!templateName || !phone) {
      return jsonResponse({ error: 'templateName e phone são obrigatórios.' }, 400)
    }

    const composer = templateMap[templateName] ?? (() => body.message ?? 'Mensagem do 3Deventos.')
    const result = await queueOrSendWhatsapp({
      reservationId: body.reservationId,
      leadId: body.leadId,
      phone,
      templateName,
      messageBody: composer(variables),
    })

    return jsonResponse(result)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

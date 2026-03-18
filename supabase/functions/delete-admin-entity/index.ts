import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  adminClient,
  corsHeaders,
  jsonResponse,
  requireAuthenticatedUser,
} from '../_shared/index.ts'

async function deleteContract(contractId: string) {
  await adminClient.from('signatures').delete().eq('contract_id', contractId)
  await adminClient.from('reservation_addendums').update({ contract_id: null }).eq('contract_id', contractId)
  const { error } = await adminClient.from('contracts').delete().eq('id', contractId)
  if (error) throw error
}

async function deleteReservation(reservationId: string) {
  const { data: contracts, error: contractsError } = await adminClient
    .from('contracts')
    .select('id')
    .eq('reservation_id', reservationId)

  if (contractsError) throw contractsError

  const contractIds = (contracts ?? []).map((item) => item.id)

  if (contractIds.length > 0) {
    await adminClient.from('signatures').delete().in('contract_id', contractIds)
    await adminClient.from('reservation_addendums').update({ contract_id: null }).in('contract_id', contractIds)
    await adminClient.from('contracts').delete().in('id', contractIds)
  }

  const { data: paymentOrders } = await adminClient
    .from('payment_orders')
    .select('id')
    .eq('reservation_id', reservationId)

  const paymentOrderIds = (paymentOrders ?? []).map((item) => item.id)
  if (paymentOrderIds.length > 0) {
    await adminClient.from('payment_events').delete().in('payment_order_id', paymentOrderIds)
    await adminClient.from('payment_orders').delete().in('id', paymentOrderIds)
  }

  await adminClient.from('payments').delete().eq('reservation_id', reservationId)
  await adminClient.from('secure_links').delete().eq('reservation_id', reservationId)
  await adminClient.from('whatsapp_messages').delete().eq('reservation_id', reservationId)
  await adminClient.from('reservation_addendums').delete().eq('reservation_id', reservationId)

  const { error } = await adminClient.from('reservations').delete().eq('id', reservationId)
  if (error) throw error
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireAuthenticatedUser(req)
    if (auth.error) return auth.error

    const { entity, id } = await req.json()
    if (!entity || !id) return jsonResponse({ error: 'entity e id são obrigatórios.' }, 400)

    if (entity === 'contract') {
      await deleteContract(id)
      return jsonResponse({ ok: true })
    }

    if (entity === 'reservation') {
      await deleteReservation(id)
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Entidade inválida.' }, 400)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500)
  }
})

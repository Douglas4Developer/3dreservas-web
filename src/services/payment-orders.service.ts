import { mockPaymentOrders } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreatePaymentOrderInput, PaymentOrder } from '../types/database'

export async function fetchPaymentOrders(): Promise<PaymentOrder[]> {
  if (!isSupabaseConfigured || !supabase) return mockPaymentOrders

  const { data, error } = await supabase.from('payment_orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PaymentOrder[]
}

export async function fetchPendingPaymentOrders(): Promise<PaymentOrder[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockPaymentOrders.filter((item) => item.status === 'pending')
  }

  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('status', 'pending')
    .order('expires_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as PaymentOrder[]
}

export async function createPaymentOrder(input: CreatePaymentOrderInput) {
  if (!isSupabaseConfigured || !supabase) {
    const order = {
      ...mockPaymentOrders[0],
      id: `po-${Date.now()}`,
      reservation_id: input.reservationId,
      amount: input.amount,
      expires_at: new Date(Date.now() + 1000 * 60 * (input.expiresInMinutes ?? 60)).toISOString(),
    }

    return {
      paymentOrder: order,
      paymentUrl: order.checkout_url,
    }
  }

  return invokeEdgeFunction<{ paymentOrder: PaymentOrder; paymentUrl?: string }>('create-payment-order', {
    body: input,
  })
}

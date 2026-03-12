import { mockPaymentOrders } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CheckoutType } from '../types/database'
import type { PaymentOrder } from '../types/database'

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

export async function createPaymentOrder(input: {
  reservationId: string
  amount: number
  expiresInMinutes?: number
  title?: string
  checkoutType?: CheckoutType
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      paymentUrl: '',
      checkoutType: input.checkoutType ?? 'all',
    }
  }

  return invokeEdgeFunction<{
    paymentUrl: string
    checkoutType: CheckoutType
    paymentOrder: unknown
  }>('create-payment-order', {
    body: {
      ...input,
      checkoutType: input.checkoutType ?? 'all',
    },
  })
}
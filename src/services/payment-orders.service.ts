import { mockPaymentOrders } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreatePaymentOrderInput, CreatePixPaymentInput, PaymentOrder } from '../types/database'

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
      checkout_type: input.checkoutType ?? 'card',
      expires_at: new Date(Date.now() + 1000 * 60 * (input.expiresInMinutes ?? 60)).toISOString(),
    }

    return {
      paymentOrder: order,
      paymentUrl: order.checkout_url,
    }
  }

  return invokeEdgeFunction<{ paymentOrder: PaymentOrder; paymentUrl?: string }>('create-payment-order', {
    body: {
      ...input,
      checkoutType: input.checkoutType ?? 'card',
    },
  })
}

export async function createPixPayment(input: CreatePixPaymentInput) {
  if (!isSupabaseConfigured || !supabase) {
    const order = {
      ...mockPaymentOrders[0],
      id: `po-pix-${Date.now()}`,
      reservation_id: input.reservationId,
      amount: input.amount,
      checkout_type: 'pix' as const,
      pix_copy_paste: '00020126580014BR.GOV.BCB.PIX0136pix-demo-3deventos5204000053039865405300.005802BR5920Douglas 3DEventos6009SaoPaulo62070503***6304ABCD',
      qr_code_base64: '',
      expires_at: new Date(Date.now() + 1000 * 60 * (input.expiresInMinutes ?? 30)).toISOString(),
    }

    return {
      paymentOrder: order,
      pixCopyPaste: order.pix_copy_paste,
      qrCodeBase64: order.qr_code_base64,
    }
  }

  return invokeEdgeFunction<{
    paymentOrder: PaymentOrder
    pixCopyPaste?: string | null
    qrCodeBase64?: string | null
  }>('create-pix-payment', {
    body: input,
  })
}

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

export async function createPixPayment(input: {
  reservationId: string
  amount: number
  expiresInMinutes?: number
  title?: string
}) {
  if (!isSupabaseConfigured || !supabase) {
    const order = {
      ...mockPaymentOrders[0],
      id: `po-${Date.now()}`,
      reservation_id: input.reservationId,
      amount: input.amount,
      checkout_type: 'pix',
      expires_at: new Date(Date.now() + 1000 * 60 * (input.expiresInMinutes ?? 60)).toISOString(),
      pix_qr_code: 'mock-qr-code',
      pix_copy_paste: 'mock-copy-paste',
    }

    return {
      paymentOrder: order,
      paymentId: 'mock-payment-id',
      qrCode: 'mock-qr-code',
      qrCodeBase64: 'mock-base64',
      pixCopyPaste: 'mock-copy-paste',
      ticketUrl: 'mock-url',
      statusUrl: 'mock-status-url',
    }
  }

  return invokeEdgeFunction<{
    paymentOrder: PaymentOrder
    paymentId: string
    qrCode: string
    qrCodeBase64: string
    pixCopyPaste: string
    ticketUrl: string
    statusUrl: string
  }>('create-pix-payment', { body: input })
}

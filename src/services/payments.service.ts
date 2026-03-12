import { mockPayments } from '../lib/mock'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Payment } from '../types/database'

export async function fetchPendingPayments(): Promise<Payment[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockPayments.filter((item) => item.status === 'pendente')
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pendente')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Payment[]
}

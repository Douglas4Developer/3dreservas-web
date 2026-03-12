import { mockContracts } from '../lib/mock'
import { invokeEdgeFunction, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Contract } from '../types/database'

export async function fetchContracts(): Promise<Contract[]> {
  if (!isSupabaseConfigured || !supabase) return mockContracts

  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Contract[]
}

export async function generateContract(reservationId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      contract: mockContracts[0],
      previewUrl: mockContracts[0]?.file_path,
    }
  }

  return invokeEdgeFunction<{ contract: Contract; previewUrl?: string }>('generate-contract', {
    body: { reservationId },
  })
}

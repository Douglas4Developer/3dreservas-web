import { mockContracts } from '../lib/mock'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Contract } from '../types/database'

export async function fetchContracts(): Promise<Contract[]> {
  if (!isSupabaseConfigured || !supabase) return mockContracts

  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Contract[]
}

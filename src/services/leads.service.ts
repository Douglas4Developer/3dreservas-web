import { mockLeads, mockSpace } from '../lib/mock'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateLeadInput, Lead } from '../types/database'

export async function getDefaultSpaceId(slug = '3deventos'): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return mockSpace.id

  const { data, error } = await supabase
    .from('spaces')
    .select('id, slug')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data.id as string
}

export async function fetchLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured || !supabase) return mockLeads

  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Lead[]
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: `lead-${Date.now()}`,
      customer_email: input.customer_email ?? null,
      message: input.message ?? null,
      source: 'site',
      status: 'novo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...input,
    }
  }

  const { data, error } = await supabase.from('leads').insert(input).select('*').single()
  if (error) throw error
  return data as Lead
}

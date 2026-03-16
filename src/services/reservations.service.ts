import { mockLookupByToken, mockReservations, mockSpace } from '../lib/mock'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateReservationInput, Reservation, ReservationLookup } from '../types/database'

export async function fetchReservations(): Promise<Reservation[]> {
  if (!isSupabaseConfigured || !supabase) return mockReservations

  const { data, error } = await supabase.from('reservations').select('*').order('event_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as Reservation[]
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: `res-${Date.now()}`,
      lead_id: null,
      customer_email: input.customer_email ?? null,
      customer_document: null,
      customer_address: null,
      event_type: null,
      period_start: '09:00',
      period_end: '23:00',
      guests_expected: null,
      total_amount: input.total_amount ?? null,
      entry_amount: input.entry_amount ?? null,
      remaining_amount: null,
      cleaning_fee: 100,
      entry_due_at: null,
      expires_at: null,
      status: input.status ?? 'interesse_enviado',
      public_link_token: `demo-token-${Date.now()}`,
      notes: input.notes ?? null,
      image_use_authorized: true,
      venue_address_snapshot: 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
      capacity_snapshot: 100,
      created_by: 'demo-admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...input,
    }
  }

  const payload = {
    space_id: input.space_id || mockSpace.id,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email ?? null,
    event_date: input.event_date,
    total_amount: input.total_amount ?? null,
    entry_amount: input.entry_amount ?? null,
    status: input.status ?? 'interesse_enviado',
    notes: input.notes ?? null,
  }

  const { data, error } = await supabase.from('reservations').insert(payload).select('*').single()
  if (error) throw error
  return data as Reservation
}

export async function updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
  if (!isSupabaseConfigured || !supabase) {
    const reservation = mockReservations.find(r => r.id === id)
    if (!reservation) throw new Error('Reservation not found')
    return { ...reservation, ...updates, updated_at: new Date().toISOString() }
  }

  const { data, error } = await supabase
    .from('reservations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Reservation
}

export async function fetchReservationLookupByToken(token: string): Promise<ReservationLookup | null> {
  if (!isSupabaseConfigured || !supabase) return mockLookupByToken(token)

  const { data, error } = await supabase.rpc('get_public_reservation_lookup', {
    p_token: token,
  })

  if (error) throw error
  if (!data) return null
  return data as ReservationLookup
}

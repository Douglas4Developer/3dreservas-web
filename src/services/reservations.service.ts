import { mockLookupByToken, mockReservations, mockSpace } from '../lib/mock'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CreateReservationInput, Reservation, ReservationLookup, UpdateReservationInput } from '../types/database'

export async function fetchReservations(): Promise<Reservation[]> {
  if (!isSupabaseConfigured || !supabase) return mockReservations

  const { data, error } = await supabase.from('reservations').select('*').order('event_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as Reservation[]
}

function mapReservationPayload(input: Partial<CreateReservationInput>) {
  return {
    space_id: input.space_id || mockSpace.id,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email ?? null,
    customer_document: input.customer_document ?? null,
    customer_address: input.customer_address ?? null,
    event_type: input.event_type ?? null,
    event_date: input.event_date,
    period_start: input.period_start ?? '09:00',
    period_end: input.period_end ?? '23:00',
    guests_expected: input.guests_expected ?? null,
    total_amount: input.total_amount ?? null,
    entry_amount: input.entry_amount ?? null,
    remaining_amount:
      input.remaining_amount ??
      (input.total_amount != null && input.entry_amount != null ? input.total_amount - input.entry_amount : null),
    cleaning_fee: input.cleaning_fee ?? 100,
    image_use_authorized: input.image_use_authorized ?? true,
    venue_address_snapshot: input.venue_address_snapshot ?? 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
    capacity_snapshot: input.capacity_snapshot ?? 100,
    status: input.status ?? 'interesse_enviado',
    notes: input.notes ?? null,
  }
}

async function assertReservationScheduleUnlocked(input: UpdateReservationInput) {
  if (!supabase) return

  const scheduleChanged = 'event_date' in input || 'period_start' in input || 'period_end' in input
  if (!scheduleChanged) return

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, status, signed_at')
    .eq('reservation_id', input.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (contractError) throw contractError
  if (!contract) return

  const { count, error: signaturesError } = await supabase
    .from('signatures')
    .select('*', { count: 'exact', head: true })
    .eq('contract_id', contract.id)

  if (signaturesError) throw signaturesError

  const isLocked = Boolean(contract.signed_at) || (count ?? 0) > 0
  if (isLocked) {
    throw new Error('A data e os horários desta reserva estão bloqueados porque o contrato já possui assinatura registrada.')
  }
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: `res-${Date.now()}`,
      lead_id: null,
      customer_email: input.customer_email ?? null,
      customer_document: input.customer_document ?? null,
      customer_address: input.customer_address ?? null,
      event_type: input.event_type ?? null,
      period_start: input.period_start ?? '09:00',
      period_end: input.period_end ?? '23:00',
      guests_expected: input.guests_expected ?? null,
      total_amount: input.total_amount ?? null,
      entry_amount: input.entry_amount ?? null,
      remaining_amount: input.remaining_amount ?? null,
      cleaning_fee: input.cleaning_fee ?? 100,
      image_use_authorized: input.image_use_authorized ?? true,
      venue_address_snapshot: input.venue_address_snapshot ?? 'Rua RB 10 QD 7 LT 10, Jardim Bonanza, Goiânia - GO',
      capacity_snapshot: input.capacity_snapshot ?? 100,
      entry_due_at: null,
      expires_at: null,
      status: input.status ?? 'interesse_enviado',
      public_link_token: `demo-token-${Date.now()}`,
      notes: input.notes ?? null,
      created_by: 'demo-admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...input,
    }
  }

  const payload = mapReservationPayload(input)

  const { data, error } = await supabase.from('reservations').insert(payload).select('*').single()
  if (error) throw error
  return data as Reservation
}

export async function updateReservation(input: UpdateReservationInput): Promise<Reservation> {
  if (!isSupabaseConfigured || !supabase) {
    const current = mockReservations.find((item) => item.id === input.id)
    if (!current) throw new Error('Reserva não encontrada.')
    return {
      ...current,
      ...input,
      updated_at: new Date().toISOString(),
    }
  }

  await assertReservationScheduleUnlocked(input)
  const payload = mapReservationPayload(input)
  const { data, error } = await supabase.from('reservations').update(payload).eq('id', input.id).select('*').single()
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
